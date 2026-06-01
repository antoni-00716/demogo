// DemoGo v0.9.11 - Deployment job service
// Canonical implementation for deployment job CRUD, steps, and execution.
// Migrated from server.js inline functions (v0.9.10 ? v0.9.11).

import crypto from "node:crypto";

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

  function createDeploymentSteps(context = {}) {
    const now = new Date().toISOString();
    const steps = [
      ["receive", "success", "??????"],
      ["extract", "pending", "????????"],
      ["security_check", "pending", "??????"],
      ["inspect", "pending", "????????"],
      ["build", "pending", "??????"],
      ["content_review", "pending", "????????"],
      ["form_hosting", "pending", "????????"],
      ["publish", "pending", "??????"],
      ["success", "pending", "????????"]
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
    const message = error instanceof Error ? error.message : "????";
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
    if (status === "queued") return "????";
    if (status === "running") return "????";
    if (status === "success") return "???";
    if (status === "failed") return "????";
    return "????";
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
      statusLabel: "????",
      message: "??????????????",
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
      statusLabel: "????",
      message: "DemoGo ???????????????????",
      startedAt: new Date().toISOString()
    });

    try {
      const users = await readJson(usersFile, []);
      const user = users.find((item) => item.id === job.userId);
      if (!user) {
        const err = new Error("?????????????????");
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
        statusLabel: "???",
        message: job.action === "update" ? "?????????????????" : "?????????????????",
        result,
        inspection: result.inspection || null,
        contentReview: result.contentReview || null,
        steps: result.deploymentEvents || job.steps,
        diagnosis: null,
        finishedAt: new Date().toISOString()
      });
      return finished;
    } catch (error) {
      const message = error instanceof Error ? error.message : "????????????????";
      const events = error.deploymentEvents || await readDeploymentEventsForDeployment(jobId);
      const diagnosis = attachErrorDiagnosis ? attachErrorDiagnosis(error, {
        fileName: job.originalName,
        actor: job.actor,
        action: job.action,
        deploySource: job.deploySource
      }) : null;
      await updateDeploymentJob(jobId, {
        status: "failed",
        statusLabel: "????",
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
