// DemoGo v0.9.30 - Deployment processor for BullMQ worker
// Pre-inspection is done by server.js before queuing.
// This processor handles extraction and demo record creation.

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createDeploymentJobService } from "../services/deployment-job-service.js";
import { readJson, writeJson } from "../lib/data-access.js";
import { writeTrialEvent } from "../lib/trial-log.js";
import { calculateQuota } from "../services/quota-service.js";
import { attachErrorDiagnosis } from "../services/trial-analytics-service.js";
import { publicContentReview } from "../services/content-review-service.js";
import logger from "../lib/logger.js";
import { dataDir, demoRoot, publicBaseUrl } from "../config.js";

const demosFile = path.join(dataDir, "demos.json");
const usersFile = path.join(dataDir, "users.json");
const deploymentJobsFile = path.join(dataDir, "deployment-jobs.json");
const deploymentEventsFile = path.join(dataDir, "deployment-events.json");

async function exists(filePath) {
  try { await fs.access(filePath); return true; } catch { return false; }
}

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

  const existingDemos = await readJson(demosFile, []);
  let targetDir = "";

  log.info({ fileName: uploadedFile.originalname }, "Processing create deployment");

  // Quota check
  const quota = calculateQuota(user, existingDemos);
  if (quota.onlineDemos.used >= quota.onlineDemos.limit) {
    const err = new Error("当前套餐在线试用项目已达上限");
    err.statusCode = 403;
    throw err;
  }

  // Generate slug
  let slug = "try-" + crypto.randomBytes(4).toString("hex");
  while (await exists(path.join(demoRoot, slug))) {
    slug = "try-" + crypto.randomBytes(4).toString("hex");
  }
  targetDir = path.join(demoRoot, slug);

  // Extract project
  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });

  await extractArchive(uploadedFile.path, targetDir, uploadedFile.originalname);

  // Determine hosting mode
  const hasHtml = await exists(path.join(targetDir, "index.html"));
  const publicUrl = publicBaseUrl.replace(/\/$/, "") + "/d/" + slug + "/";
  const demoId = crypto.randomUUID();

  // Create demo record
  const demo = {
    id: demoId,
    userId: user.id,
    userEmail: user.email,
    slug,
    name: requestedName || path.basename(uploadedFile.originalname, path.extname(uploadedFile.originalname)),
    status: "published",
    publicUrl,
    deploySource: deploySource || "web",
    hostingMode: hasHtml ? "static" : "unknown",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const demos = await readJson(demosFile, []);
  demos.push(demo);
  await writeJson(demosFile, demos);

  log.info({ slug, demoId, hostingMode: demo.hostingMode }, "Demo created successfully");

  return {
    id: demoId,
    slug,
    publicUrl,
    name: demo.name,
    hostingMode: demo.hostingMode,
    message: "发布成功",
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
  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });
  await extractArchive(uploadedFile.path, targetDir, uploadedFile.originalname);

  demo.updatedAt = new Date().toISOString();
  const idx = demos.findIndex((d) => d.id === demoId);
  demos[idx] = demo;
  await writeJson(demosFile, demos);

  log.info("Demo updated successfully");
  return {
    id: demo.id,
    slug: demo.slug,
    publicUrl: demo.publicUrl,
    message: "更新成功，原试用链接保持不变",
  };
}

async function extractArchive(filePath, targetDir, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const isTar = originalName.endsWith(".tar.gz") || originalName.endsWith(".tgz") || ext === ".tgz";
  const isZip = ext === ".zip";

  if (isTar) {
    const tar = await import("tar");
    await tar.x({ file: filePath, C: targetDir });
  } else if (isZip) {
    const { createReadStream } = await import("node:fs");
    const unzipper = await import("unzipper");
    await new Promise((resolve, reject) => {
      createReadStream(filePath)
        .pipe(unzipper.Extract({ path: targetDir }))
        .on("close", resolve)
        .on("error", reject);
    });
  } else {
    throw new Error("不支持的文件格式，请上传 .zip、.tar.gz 或 .tgz 文件");
  }
}
