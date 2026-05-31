// DemoGo v0.9.3 - Deployment job service (extracted from server.js)
import crypto from "node:crypto";

export function createDeploymentJobService(deps) {
  const { readJson, writeJson, deploymentJobsFile, deploymentEventsFile } = deps;
  const handlerRegistry = { processCreateJob: null, processUpdateJob: null };

  // --- Deployment steps ---

  function createDeploymentSteps(context = {}) {
    const now = new Date().toISOString();
    const steps = [
      ["receive", "success", "接收文件完成"],
      ["extract", "pending", "等待解压项目文件"],
      ["security_check", "pending", "等待安全检查"],
      ["inspect", "pending", "等待检测项目类型"],
      ["build", "pending", "等待构建检查"],
      ["content_review", "pending", "等待内容安全检查"],
      ["form_hosting", "pending", "等待表单收集检查"],
      ["publish", "pending", "等待发布文件"],
      ["success", "pending", "等待生成访问地址"]
    ];
    return steps.map(([eventType, status, message]) => ({
      id: crypto.randomUUID(),
      demoId: context.demoId || null,
      userId: context.userId || null,
      deploymentId: context.deploymentId || null,
      eventType,
      status,
      message,
      detail: { action: context.action || "create" },
      createdAt: now
    }));
  }

  function markDeploymentStep(steps, eventType, status, message, detail = {}) {
    if (!Array.isArray(steps)) return;
    const step = steps.find((item) => item.eventType === eventType);
    if (!step) return;
    step.status = status;
    step.message = message || step.message;
    step.detail = { ...(step.detail || {}), ...detail };
    step.createdAt = new Date().toISOString();
  }

  function completeDeploymentSteps(steps, context = {}) {
    const now = new Date().toISOString();
    return (Array.isArray(steps) ? steps : []).map((step) => ({
      ...step,
      demoId: step.demoId || context.demoId || null,
      userId: step.userId || context.userId || null,
      deploymentId: step.deploymentId || context.deploymentId || null,
      status: step.status === "pending" ? "skipped" : step.status,
      createdAt: step.createdAt || now
    }));
  }

  function failedDeploymentSteps(error, steps = [], context = {}) {
    const message = error instanceof Error ? error.message : "发布失败";
    const existing = completeDeploymentSteps(steps, context);
    const hasFailed = existing.some((step) => step.status === "failed");
    return [
      ...existing,
      ...(hasFailed ? [] : [{
        id: crypto.randomUUID(),
        demoId: context.demoId || null,
        userId: context.userId || null,
        deploymentId: context.deploymentId || null,
        eventType: "failed",
        status: "failed",
        message,
        detail: {},
        createdAt: new Date().toISOString()
      }])
    ];
  }

  // --- Deployment events ---

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

  // --- Job helpers ---

  function sanitizeDeploymentJob(job) {
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
      diagnosis: job.diagnosis || null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      startedAt: job.startedAt || null,
      finishedAt: job.finishedAt || null
    };
  }

  function deploymentJobStatusLabel(status) {
    if (status === "queued") return "等待开始";
    if (status === "running") return "正在生成";
    if (status === "success") return "已生成";
    if (status === "failed") return "生成失败";
    return "未知状态";
  }

  function publicDeploymentJob(job) {
    if (!job) return null;
    return {
      id: job.id,
      action: job.action,
      demoId: job.demoId || null,
      status: job.status,
      statusLabel: job.statusLabel || deploymentJobStatusLabel(job.status),
      message: job.message || "",
      originalName: job.originalName || "",
      result: job.result || null,
      inspection: job.inspection || job.result?.inspection || null,
      contentReview: job.contentReview || job.result?.contentReview || null,
      steps: Array.isArray(job.steps) ? job.steps : [],
      error: job.error || null,
      diagnosis: job.diagnosis || null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      startedAt: job.startedAt || null,
      finishedAt: job.finishedAt || null
    };
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

  // --- Job CRUD ---

  async function saveDeploymentJob(job) {
    const cleanJob = sanitizeDeploymentJob(job);
    const jobs = await readJson(deploymentJobsFile, []);
    const index = jobs.findIndex((j) => j.id === cleanJob.id);
    if (index >= 0) {
      jobs[index] = cleanJob;
    } else {
      jobs.push(cleanJob);
    }
    await writeJson(deploymentJobsFile, jobs);
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

  // --- Job creation and execution ---

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
      statusLabel: "等待开始",
      message: "已接收项目包，正在排队处理。",
      steps: createDeploymentSteps({ demoId: demoId || null, userId: user.id, deploymentId: "", action }).map((step) => ({
        ...step,
        deploymentId: null
      })),
      result: null,
      error: null,
      inspection: null,
      contentReview: null,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      finishedAt: null
    };
    await saveDeploymentJob(job);
    return job;
  }

  async function runDeploymentJob(jobId) {
    let job = await findDeploymentJob(jobId);
    if (!job) return;
    job = await updateDeploymentJob(jobId, {
      status: "running",
      statusLabel: "正在生成",
      startedAt: new Date().toISOString()
    });
    try {
      let result;
      if (job.action === "update" && handlerRegistry.processUpdateJob) {
        result = await handlerRegistry.processUpdateJob(job);
      } else if (handlerRegistry.processCreateJob) {
        result = await handlerRegistry.processCreateJob(job);
      }
      if (result) {
          markDeploymentStep(job.steps, "success", "success", "试用链接已生成。");
          const steps = completeDeploymentSteps(job.steps || [], { demoId: result.id || job.demoId });
        await appendDeploymentEvents(steps);
        await updateDeploymentJob(jobId, {
          status: "success",
          statusLabel: "已生成",
          message: "试用链接已生成。",
          result,
          steps,
          inspection: result.inspection || null,
          contentReview: result.contentReview || null,
          finishedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "发布失败";
      const events = error.deploymentEvents || await readDeploymentEventsForDeployment(jobId);
      const diagnosis = error.inspection?.failureDiagnosis || error.diagnosis || null;
      await updateDeploymentJob(jobId, {
        status: "failed",
        statusLabel: "生成失败",
        message,
        error: { message, stack: error.stack?.slice(0, 1024) || "" },
        finishedAt: new Date().toISOString(),
        steps: events?.length ? events : markJobStepsFailed(job.steps, message),
        inspection: error.inspection || job.inspection || null,
        contentReview: error.contentReview || job.contentReview || null,
        diagnosis
      });
    }
  }

  return {
    createDeploymentSteps, markDeploymentStep, completeDeploymentSteps, failedDeploymentSteps,
    appendDeploymentEvents, readDeploymentEventsForDemo, readDeploymentEventsForDeployment,
    sanitizeDeploymentJob, deploymentJobStatusLabel, publicDeploymentJob, markJobStepsFailed,
    saveDeploymentJob, updateDeploymentJob, findDeploymentJob,
    createDeploymentJob, runDeploymentJob,
    setHandlers: (h) => { if (h) Object.assign(handlerRegistry, h); }
  };
}