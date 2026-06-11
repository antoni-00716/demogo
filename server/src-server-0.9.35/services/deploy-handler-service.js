export function createDeployHandlerService(deps) {
  const {
    getClientIp,
    detectDeploySource,
    writeTrialEvent,
    inspectProjectArchive,
    createDeploymentJob,
    addDeploymentJob,
    performCreateDeployment,
    performUpdateDeployment,
    resolveAgentUpdateDemoId,
    attachErrorDiagnosis,
  } = deps;

  async function recordDeployFailure(error, ctx) {
    const { user, uploadedFile, actor, action, deploySource, pathLabel } = ctx;
    const diagnosis = attachErrorDiagnosis(error, {
      fileName: uploadedFile.originalname,
      actor,
      action,
      deploySource
    });
    await writeTrialEvent({
      eventType: 'deploy_failed',
      userId: user.id,
      userEmail: user.email,
      source: deploySource,
      path: pathLabel,
      ip: ctx.clientIp,
      metadata: {
        fileName: uploadedFile.originalname,
        actor,
        action,
        message: error instanceof Error ? error.message : '',
        statusCode: error.statusCode || 500,
        failureCategory: diagnosis.category
      }
    });
  }

  async function handleCreateDeployment(req, res, next, options = {}) {
    const uploadedFile = req.file;
    const requestedName = String(req.body?.name || "").trim();
    const user = req.user;
    const clientIp = getClientIp(req);
    const actor = options.actor || "user";
    const deploySource = detectDeploySource(req, actor);
  
    if (!uploadedFile) {
      res.status(400).json({ error: "请上传 .zip、.tar.gz 或 .tgz 项目包" });
      return;
    }
  
    try {
      await writeTrialEvent({
        eventType: "deploy_upload_started",
        userId: user.id,
        userEmail: user.email,
        source: deploySource,
        path: actor === "agent" ? "/api/agent/deploy" : "/api/deploy",
        ip: clientIp,
        metadata: {
          fileName: uploadedFile.originalname,
          actor
        }
      });
      // Quick pre-inspection before queuing (fail fast for invalid projects)
      const preInspection = await inspectProjectArchive(uploadedFile.path, uploadedFile.originalname);
      if (!preInspection.canPublish) {
        const err = new Error(preInspection.summary || "项目检查未通过，请根据检查结果修改后重新上传。");
        err.statusCode = 400;
        err.inspection = preInspection;
        throw err;
      }
  
      const job = await createDeploymentJob({
      user,
      action: "create",
      requestedName,
      file: uploadedFile,
      ip: clientIp,
      actor,
      deploySource
    });
    if (globalThis.__demogoQueueAvailable) {
      await addDeploymentJob({ jobId: job.id, action: "create" });
      res.json({ jobId: job.id, status: "queued", message: "项目包已提交，正在后台处理" });
    } else {
      res.json(await performCreateDeployment({
        uploadedFile,
        requestedName,
        user,
        clientIp,
        actor,
        deploySource
      }));
    }
    } catch (error) {
      await recordDeployFailure(error, { user, uploadedFile, actor, action: "create", deploySource, pathLabel: actor === "agent" ? "/api/agent/deploy" : "/api/deploy", clientIp });
      next(error);
    }
  }

  async function handleUpdateDeployment(req, res, next, options = {}) {
    const uploadedFile = req.file;
    const user = req.user;
    const clientIp = getClientIp(req);
    const actor = options.actor || "user";
    const deploySource = detectDeploySource(req, actor);
    const pathLabel = actor === "agent" ? "/api/agent/update" : "/api/demos/:id/update";
  
    if (!uploadedFile) {
      res.status(400).json({ error: "请上传 .zip、.tar.gz 或 .tgz 项目包" });
      return;
    }
  
    try {
      const demoId = actor === "agent"
        ? await resolveAgentUpdateDemoId({
            user,
            demoRef: options.demoRef || req.body?.demoId || req.body?.id || req.body?.slug || req.body?.link || req.body?.url
          })
        : options.demoRef || req.params.id;
  
      await writeTrialEvent({
        eventType: "deploy_upload_started",
        userId: user.id,
        userEmail: user.email,
        source: deploySource,
        path: pathLabel,
        ip: clientIp,
        metadata: {
          demoId,
          fileName: uploadedFile.originalname,
          actor,
          action: "update"
        }
      });
  
      const result = await performUpdateDeployment({
        demoId,
        uploadedFile,
        user,
        clientIp,
        actor,
        deploySource
      });
  
      await writeTrialEvent({
        eventType: "deploy_success",
        userId: user.id,
        userEmail: user.email,
        source: deploySource,
        path: pathLabel,
        ip: clientIp,
        metadata: {
          demoId,
          demoSlug: result.slug,
          actor,
          action: "update",
          deploySource,
          detectedType: result.detectedType,
          databaseEngine: result.database?.engine || ""
        }
      });
  
      if (actor === "agent") {
        result.message = "更新成功！原来的访问链接保持不变。";
        result.nextStep = "请将原来的访问链接发送给用户，用户刷新页面即可看到最新版本。";
      }
  
      res.json(result);
    } catch (error) {
      await recordDeployFailure(error, { user, uploadedFile, actor, action: "update", deploySource, pathLabel, clientIp });
      next(error);
    }
  }

  return {
    handleCreateDeployment,
    handleUpdateDeployment,
  };
}
