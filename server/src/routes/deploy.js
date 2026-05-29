// DemoGo v0.9.3 - Deploy & inspect routes (extracted from server.js)
// Covers: POST /api/inspect, POST /api/deployment-jobs

export function registerDeployRoutes(app, deps) {
  const {
    requireUser,
    uploadProjectArchive,
    inspectProjectArchive,
    classifyFailureMessage,
    writeTrialEvent, getClientIp,
    fs: fsPromises,
    createDeploymentJob,
    publicDeploymentJob,
    runDeploymentJob,
  } = deps;

  // --- POST /api/inspect ---
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

  // --- POST /api/deployment-jobs ---
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
    runDeploymentJob(job.id).catch((error) => {
      console.error("Deployment job failed", error);
    });
  } catch (error) {
    next(error);
  }
});

}
