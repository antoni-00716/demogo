import { join as pathJoin } from "node:path";
import fs from "node:fs/promises";
import { dataDir } from "../config.js";
import logger from "../lib/logger.js";
import { readJson } from "../lib/data-access.js";
import { userDeployEvents } from "../services/deploy-event-service.js";
// findDeploymentJob, createDeploymentJob, runDeploymentJob, publicDeploymentJob - passed via deps (server-local)
// inspectProjectArchive - passed via deps (server-local)
import { addDeploymentJob } from "../queue/queue.js";
import { classifyFailureMessage } from "../services/trial-analytics-service.js";
import { getClientIp } from "../lib/request-utils.js";
import { writeTrialEvent } from "../lib/trial-log.js";

const demosFile = pathJoin(dataDir, "demos.json");

export function registerDeployRoutes(app, { requireUser, uploadProjectArchive, handleCreateDeployment, findDeploymentJob, createDeploymentJob, runDeploymentJob, publicDeploymentJob, inspectProjectArchive }) {
  app.get("/api/deploy-events", requireUser, async (req, res, next) => {
    try {
      const demos = await readJson(demosFile, []);
      res.json(userDeployEvents(req.user, demos, { limit: req.query?.limit }));
    } catch (error) {
      next(error);
    }
  });
  app.get("/api/deployment-jobs/:id", requireUser, async (req, res, next) => {
    try {
      const job = await findDeploymentJob(req.params.id);
      if (!job || job.userId !== req.user.id) {
        res.status(404).json({ error: "未找到这次生成任务" });
        return;
      }
      res.json({ job: publicDeploymentJob(job) });
    } catch (error) {
      next(error);
    }
  });
  app.get("/api/jobs/:id", requireUser, async (req, res, next) => {
    try {
      const job = await findDeploymentJob(req.params.id);
      if (!job || job.userId !== req.user.id) {
        res.status(404).json({ error: "Job not found" });
        return;
      }
      res.json({ job: publicDeploymentJob(job) });
    } catch (error) {
      next(error);
    }
  });
  app.post("/api/inspect", requireUser, uploadProjectArchive, async (req, res, next) => {
    const uploadedFile = req.file;
    if (!uploadedFile) {
      res.status(400).json({ error: "请上传 .zip、.tar.gz 或 .tgz 项目包" });
      return;
    }

    try {
      const inspection = await inspectProjectArchive(uploadedFile.path, uploadedFile.originalname);
      await writeTrialEvent({
        eventType: inspection.canPublish ? "project_inspect_passed" : "project_inspect_failed",
        userId: req.user.id,
        userEmail: req.user.email,
        source: "web",
        path: "/api/inspect",
        ip: getClientIp(req),
        metadata: {
          fileName: uploadedFile.originalname,
          detectedType: inspection.detectedType,
          canPublish: Boolean(inspection.canPublish),
          failureCategory: inspection.canPublish ? "" : classifyFailureMessage(`${inspection.summary || ""} ${(inspection.issues || []).join(" ")}`)
        }
      });
      res.json({ inspection });
    } catch (error) {
      next(error);
    } finally {
      await fs.rm(uploadedFile.path, { force: true });
    }
  });
  app.post("/api/deployment-jobs", requireUser, uploadProjectArchive, async (req, res, next) => {
    const uploadedFile = req.file;
    if (!uploadedFile) {
      res.status(400).json({ error: "请上传 .zip、.tar.gz 或 .tgz 项目包" });
      return;
    }

    try {
      const job = await createDeploymentJob({
        user: req.user,
        action: "create",
        requestedName: String(req.body?.name || "").trim(),
        file: uploadedFile,
        ip: getClientIp(req),
        actor: "user",
        deploySource: "web"
      });
      await writeTrialEvent({
        eventType: "deploy_upload_started",
        userId: req.user.id,
        userEmail: req.user.email,
        source: "web",
        path: "/api/deployment-jobs",
        ip: getClientIp(req),
        metadata: {
          jobId: job.id,
          fileName: uploadedFile.originalname
        }
      });
      res.status(202).json({ job: publicDeploymentJob(job) });
      if (process.env.DEMOGO_DEPLOYMENT_SYNC_MODE === "1") {
        try {
          await runDeploymentJob(job.id);
        } catch (error) {
          logger.error({ err: error }, "Sync deployment job failed");
        }
      } else {
        addDeploymentJob({ jobId: job.id, action: job.action }).catch((error) => {
          logger.error({ err: error }, "Deployment job failed");
        });
      }
    } catch (error) {
      next(error);
    }
  });
  app.post("/api/deploy", requireUser, uploadProjectArchive, async (req, res, next) => {
    return handleCreateDeployment(req, res, next, { actor: "user" });
  });
}
