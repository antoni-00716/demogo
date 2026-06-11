// DemoGo v0.9.30 - Deployment processor for BullMQ worker
// Pre-inspection is done by server.js before queuing.
// Uses shared deployment-executor for full deployment logic.

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createDeploymentJobService } from "../services/deployment-job-service.js";
import { readJson, writeJson } from "../lib/data-access.js";
import { writeTrialEvent } from "../lib/trial-log.js";
import { calculateQuota } from "../services/quota-service.js";
import { attachErrorDiagnosis } from "../services/trial-analytics-service.js";
import { publicContentReview } from "../services/content-review-service.js";
import { executeDeployment } from "../services/deployment-executor.js";
import logger from "../lib/logger.js";
import { dataDir, demoRoot, publicBaseUrl } from "../config.js";
import { exists } from "../lib/utils.js";

const demosFile = path.join(dataDir, "demos.json");
const usersFile = path.join(dataDir, "users.json");
const deploymentJobsFile = path.join(dataDir, "deployment-jobs.json");
const deploymentEventsFile = path.join(dataDir, "deployment-events.json");



const deploymentJobService = createDeploymentJobService({
  readJson, writeJson,
  deploymentJobsFile, deploymentEventsFile, usersFile,
  writeTrialEvent, attachErrorDiagnosis, publicContentReview
});

deploymentJobService.setHandlers({
  processCreateJob: processCreateDeployment,
  processUpdateJob: processUpdateDeployment,
});

export async function processDeploymentJob(jobId) {
  const processorLog = logger.child({ jobId, module: "deployment-processor" });
  processorLog.info("Starting deployment job processing");
  return deploymentJobService.runDeploymentJob(jobId);
}

async function processCreateDeployment({ uploadedFile, requestedName, user, clientIp, actor, deploySource, deploymentId }) {
  const log = logger.child({ deploymentId, action: "create" });

  if (!uploadedFile || !uploadedFile.path) {
    const err = new Error("缺少上传文件");
    err.statusCode = 400;
    throw err;
  }

  log.info({ fileName: uploadedFile.originalname }, "Processing create deployment via shared executor");

  const existingDemos = await readJson(demosFile, []);

  // Use shared deployment executor for full build+save+CDN flow
  const result = await executeDeployment({
    uploadedFile,
    requestedName,
    user,
    clientIp,
    actor,
    deploySource,
    deploymentId,
    existingDemos,
  });

  log.info({ slug: result.slug, demoId: result.id }, "Deployment completed via executor");

  return {
    ok: result.ok,
    id: result.id,
    slug: result.slug,
    status: result.status,
    name: result.name || requestedName,
    projectName: result.projectName || result.name || requestedName,
    publicUrl: result.publicUrl,
    hostingMode: result.hostingMode,
    detectedType: result.detectedType,
    architecture: result.architecture,
    contentReviewStatus: "passed",
    linkMode: result.linkMode || "random",
    customDomainEligible: result.customDomainEligible || false,
    deploymentEvents: result.deploymentEvents || [],
    buildLog: result.buildLog,
    quota: result.quota,
    message: "发布成功",
    inspection: result.inspection,
  };
}

async function processUpdateDeployment({ demoId, uploadedFile, user, clientIp, actor, deploySource, deploymentId }) {
  const log = logger.child({ deploymentId, demoId, action: "update" });
  log.info("Processing update deployment");

  const demos = await readJson(demosFile, []);
  const demo = demos.find((d) => d.id === demoId);
  if (!demo) {
    const err = new Error("未找到该试用项目");
    err.statusCode = 404;
    throw err;
  }
  const targetDir = path.join(demoRoot, demo.slug);
  const backupDir = targetDir + ".update-" + crypto.randomBytes(3).toString("hex");
  let hadBackup = false;
  if (await exists(targetDir)) {
    await fs.rename(targetDir, backupDir);
    hadBackup = true;
  }
  await fs.mkdir(targetDir, { recursive: true });

  try {
// Extract archive
  const ext = path.extname(uploadedFile.originalname).toLowerCase();
  if (ext === ".zip") {
    const { createReadStream } = await import("node:fs");
    const unzipper = await import("unzipper");
    await new Promise((resolve, reject) => {
      createReadStream(uploadedFile.path)
        .pipe(unzipper.Extract({ path: targetDir }))
        .on("close", resolve)
        .on("error", reject);
    });
  } else {
    const tar = await import("tar");
    await tar.x({ file: uploadedFile.path, C: targetDir });
  }
  } catch (extractError) {
    // Rollback: restore old demo directory, delete partial new one
    try { await fs.rm(targetDir, { recursive: true, force: true }); } catch {}
    if (hadBackup) {
      try { await fs.rename(backupDir, targetDir); } catch {}
    }
    throw extractError;
  } finally {
    // Clean up backup directory if it still exists (shouldn't after rollback, but safe)
    try { await fs.rm(backupDir, { recursive: true, force: true }); } catch {}
    // Clean up uploaded file
    try { await fs.rm(uploadedFile.path, { force: true }); } catch {}
  }

  demo.updatedAt = new Date().toISOString();
  const idx = demos.findIndex((d) => d.id === demoId);
  demos[idx] = demo;
  await writeJson(demosFile, demos);

  // Clean up uploaded file
  try { await fs.rm(uploadedFile.path, { force: true }); } catch {}

  log.info("Demo updated successfully");
  return {
    id: demo.id,
    slug: demo.slug,
    publicUrl: demo.publicUrl,
    message: "更新成功，原试用链接保持不变",
  };
}
async function extractZip(filePath, targetDir) {
  // Attempt 1: unzipper (streaming, fast)
  try {
    const { createReadStream } = await import("node:fs");
    const unzipper = await import("unzipper");
    await new Promise((resolve, reject) => {
      createReadStream(filePath)
        .pipe(unzipper.Extract({ path: targetDir }))
        .on("close", resolve)
        .on("error", reject);
    });
    return;
  } catch (err) {
    logger.warn({ error: err.message, file: filePath }, "unzipper failed, falling back to adm-zip");
  }

  // Attempt 2: adm-zip (more format-tolerant)
  const AdmZip = (await import("adm-zip")).default;
  const zip = new AdmZip(filePath);
  zip.extractAllTo(targetDir, true);
}