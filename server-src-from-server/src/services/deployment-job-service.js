// DemoGo v0.9.34 - Deployment job service
// Canonical implementation for deployment job CRUD, steps, and execution.
// Step functions are shared with server.js via ./lib/deployment-steps.js to avoid duplication.

import crypto from "node:crypto";
import {
  createDeploymentSteps,
  markDeploymentStep,
  completeDeploymentSteps,
  failedDeploymentSteps
} from "../lib/deployment-steps.js";

export function createDeploymentJobService(deps) {
  const {
    readJson, writeJson,
    deploymentJobsFile, deploymentEventsFile, usersFile,
    writeTrialEvent, attachErrorDiagnosis, publicContentReview
  } = deps;

  // handlerRegistry lets server.js wire performCreateDeployment / performUpdateDeployment
  // without creating a circular dependency.
  const handlerRegistry = { processCreateJob: null, processUpdateJob: null };

  // ============ Deployment Steps ============
  // createDeploymentSteps, markDeploymentStep, completeDeploymentSteps, failedDeploymentSteps
  // are now imported from ../lib/deployment-steps.js (shared with server.js)

  // ============ Deployment Events ============

  async function appendDeploymentEvents(events) {
    const items = Array.isArray(events) ? events.filter(Boolean) : [];
    if (!items.length) return;
    const existing = await readJson(deploymentEventsFile, []);
    await writeJson(deploymentEventsFile, [...items, ...existing].slice(0, 5000));
  }

  async function readDeploymentEventsForDemo(demoId) {
    const events = await readJson(deploymentEventsFile, []);
    return events
      .filter((event) => event.demoId === demoId)
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  }

  async function readDeploymentEventsForDeployment(deploymentId) {
    const events = await readJson(deploymentEventsFile, []);
    return events
      .filter((event) => event.deploymentId === deploymentId)
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  }

  // ============ Job Helpers ============

  function sanitizeDeploymentJob(job) {
    if (!job) return null;
    return {
      id: job.id,
      userId: job.userId,
      userEmail: job.userEmail || "",
      action: job.action,
      demoId: job.demoId || null,
      requestedName: job.requestedName || "",
      filePath: job.filePath || "",
      originalName: job.originalName || "",
      actor: job.actor || "user",
      deploySource: job.deploySource || "web",
      ip: job.ip || "",
      status: job.status,
      statusLabel: job.statusLabel || deploymentJobStatusLabel(job.status),
      message: job.message || "",
      steps: Array.isArray(job.steps) ? job.steps : [],
      result: job.result || null,
      inspection: job.inspection || job.result?.inspection || null,
      contentReview: job.contentReview || job.result?.contentReview || null,
      error: job.error || null,
      diagnosis: job.diagnosis || job.error?.diagnosis || null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      startedAt: job.startedAt || null,
      finishedAt: job.finishedAt || null
    };
  }

  function deploymentJobStatusLabel(status) {
    if (status === "queued") return "排队中";
    if (status === "running") return "执行中";
    if (status === "success") return "成功";
    if (status === "failed") return "失败";
    return "未知";
  }

  function publicDeploymentJob(job) {
    if (!job) return null;
    return sanitizeDeploymentJob(job);
  }

  function markJobStepsFailed(steps, message) {
    const items = Array.isArray(steps) ? steps : [];
    let failedMarked = false;
    return completeDeploymentSteps(items).map((step) => {
      if (!failedMarked && step.status === "skipped") {
        failedMarked = true;
        return { ...step, status: "failed", message };
      }
      return step;
    });
  }

  // ============ Job Persistence ============

  async function saveDeploymentJob(job) {
    const cleanJob = sanitizeDeploymentJob(job);
    const jobs = await readJson(deploymentJobsFile, []);
    const index = jobs.findIndex((j) => j.id === cleanJob.id);
    if (index >= 0) {
      jobs[index] = cleanJob;
    } else {
      jobs.unshift(cleanJob);
    }
    await writeJson(deploymentJobsFile, jobs.slice(0, 1000));
    return cleanJob;
  }

  async function updateDeploymentJob(jobId, patch) {
    const jobs = await readJson(deploymentJobsFile, []);
    const index = jobs.findIndex((j) => j.id === jobId);
    if (index < 0) return null;
    const next = sanitizeDeploymentJob({
      ...jobs[index],
      ...patch,
      updatedAt: new Date().toISOString()
    });
    jobs[index] = next;
    await writeJson(deploymentJobsFile, jobs);
    return next;
  }

  async function findDeploymentJob(jobId) {
    const jobs = await readJson(deploymentJobsFile, []);
    return jobs.find((j) => j.id === jobId) || null;
  }

  // ============ Job Creation & Execution ============

  async function createDeploymentJob({ user, action, demoId = "", requestedName = "", file, ip = "", actor = "user", deploySource = "web" }) {
    const now = new Date().toISOString();
    const job = {
      id: crypto.randomUUID(),
      userId: user.id,
      userEmail: user.email,
      action,
      demoId: demoId || null,
      requestedName,
      filePath: file.path,
      originalName: file.originalname,
      actor,
      deploySource,
      ip,
      status: "queued",
      statusLabel: "排队中",
      message: "任务已提交，等待服务器处理",
      steps: createDeploymentSteps({ demoId: demoId || null, userId: user.id, deploymentId: "", action }).map((step) => ({
        ...step,
        deploymentId: null
      })),
      result: null,
      error: null,
      inspection: null,
      contentReview: null,
      diagnosis: null,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      finishedAt: null
    };
    job.steps = job.steps.map((step) => ({ ...step, deploymentId: job.id }));
    await saveDeploymentJob(job);
    return job;
  }

  async function runDeploymentJob(jobId) {
    let job = await findDeploymentJob(jobId);
    if (!job || job.status !== "queued") return;
    job = await updateDeploymentJob(jobId, {
      status: "running",
      statusLabel: "执行中",
      message: "DemoGo 正在处理你的项目，请稍候",
      startedAt: new Date().toISOString()
    });

    try {
      const users = await readJson(usersFile, []);
      const user = users.find((item) => item.id === job.userId);
      if (!user) {
        const err = new Error("未找到用户信息，无法继续部署");
        err.statusCode = 404;
        throw err;
      }
      const uploadedFile = {
        path: job.filePath,
        originalname: job.originalName
      };
      let result;
      if (job.action === "update" && handlerRegistry.processUpdateJob) {
        result = await handlerRegistry.processUpdateJob({
          demoId: job.demoId,
          uploadedFile,
          user,
          clientIp: job.ip,
          actor: job.actor,
          deploySource: job.deploySource,
          deploymentId: job.id
        });
      } else if (handlerRegistry.processCreateJob) {
        result = await handlerRegistry.processCreateJob({
          uploadedFile,
          requestedName: job.requestedName,
          user,
          clientIp: job.ip,
          actor: job.actor,
          deploySource: job.deploySource,
          deploymentId: job.id
        });
      }
      const finished = await updateDeploymentJob(jobId, {
        status: "success",
        statusLabel: "成功",
        message: job.action === "update" ? "项目更新成功，链接已刷新" : "项目部署成功，链接已生成",
        result,
        inspection: result.inspection || null,
        contentReview: result.contentReview || null,
        steps: result.deploymentEvents || job.steps,
        diagnosis: null,
        finishedAt: new Date().toISOString()
      });
      return finished;
    } catch (error) {
      const message = error instanceof Error ? error.message : "部署失败，请查看诊断信息";
      const events = error.deploymentEvents || await readDeploymentEventsForDeployment(jobId);
      const diagnosis = attachErrorDiagnosis ? attachErrorDiagnosis(error, {
        fileName: job.originalName,
        actor: job.actor,
        action: job.action,
        deploySource: job.deploySource
      }) : null;
      await updateDeploymentJob(jobId, {
        status: "failed",
        statusLabel: "失败",
        message,
        error: {
          message,
          statusCode: error.statusCode || 500,
          diagnosis
        },
        inspection: error.inspection || null,
        contentReview: publicContentReview ? publicContentReview(error.contentReview) || null : null,
        diagnosis,
        steps: events?.length ? events : markJobStepsFailed(job.steps, message),
        finishedAt: new Date().toISOString()
      });
      if (writeTrialEvent) {
        await writeTrialEvent({
          eventType: "deploy_failed",
          userId: job.userId,
          userEmail: job.userEmail,
          source: job.deploySource || job.actor || "web",
          path: job.action === "update" ? "/api/demos/:id/deployment-jobs" : "/api/deployment-jobs",
          ip: job.ip,
          metadata: {
            jobId,
            demoId: job.demoId,
            action: job.action,
            statusCode: error.statusCode || 500,
            message,
            failureCategory: diagnosis?.category
          }
        });
      }
      return null;
    }
  }

  // ============ Public API ============

  return {
    // Steps
    createDeploymentSteps, markDeploymentStep, completeDeploymentSteps, failedDeploymentSteps,
    // Events
    appendDeploymentEvents, readDeploymentEventsForDemo, readDeploymentEventsForDeployment,
    // Helpers
    sanitizeDeploymentJob, deploymentJobStatusLabel, publicDeploymentJob, markJobStepsFailed,
    // Persistence
    saveDeploymentJob, updateDeploymentJob, findDeploymentJob,
    // Execution
    createDeploymentJob, runDeploymentJob,
    // Handler wiring
    setHandlers: (h) => { if (h) Object.assign(handlerRegistry, h); }
  };
}
