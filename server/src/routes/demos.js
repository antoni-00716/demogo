// DemoGo v0.9.3 - Demo management routes (extracted from server.js)
// Covers: GET/POST /api/demos/* (user-facing demo CRUD + runtime management)

import { loadAllDemos, findUserDemo, saveAllDemos, saveAllDemosWithLock } from "../lib/demo-helpers.js";
import path from "node:path";
import { normalizeCustomSlug, canCustomizeSlug, isReservedSlug, isSlugClaimedByDemo, isExpired } from "../lib/slug-utils.js";

export function registerDemosRoutes(app, deps) {
  const {
    requireUser,
    readJson, writeJson, demosFile,
    getUserFromRequest, flushUsageStats,
    calculateQuota, publicUserDemo,
    readDeploymentEventsForDemo,
    demoRoot, exists, getArchivedDemoDir,
    stopRuntime, removeDemoFiles, deleteDemoFiles, startNodeRuntime,
    hostingConfig, runtimeEnvForDemo,
    writeAuditLog, writeTrialEvent, getClientIp,
    publicBaseUrl,
    expireDemoFiles,
    userDeployEvents,
    uploadProjectArchive,
    performUpdateDeployment,
    createDeploymentJob, findDeploymentJob, publicDeploymentJob, runDeploymentJob,
    restartDemoRuntime,
    mergeRuntimeEnv, createRuntimeConfigStatus, createExternalBackendConfigWithConnection,
    hasSupabaseProject, publicExternalBackend,
    createApplicationReadiness,
    publicRuntimeEnv,
    publicDemoDatabase, resetDemoDatabase,
    fs,
    path: pathModule,
  } = deps;

  // --- GET /api/demos ---
  app.get("/api/demos", async (req, res, next) => {
  try {
    await flushUsageStats();
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "请先登录" });
      return;
    }
    const demos = await loadAllDemos(readJson, demosFile);
    res.json({
      demos: demos.filter((demo) => demo.userId === user.id).map(publicUserDemo),
      quota: calculateQuota(user, demos)
    });
  } catch (error) {
    next(error);
  }
});

  // --- GET /api/demos/:id ---
  app.get("/api/demos/:id", requireUser, async (req, res, next) => {
  try {
    await flushUsageStats();
    const demos = await loadAllDemos(readJson, demosFile);
    const demo = demos.find((item) => item.id === req.params.id && item.userId === req.user.id);
    if (!demo) {
      res.status(404).json({ error: "未找到该 Demo" });
      return;
    }
    const events = await readDeploymentEventsForDemo(demo.id);
    res.json({
      demo: publicUserDemo(demo),
      events,
      inspection: demo.inspection || null
    });
  } catch (error) {
    next(error);
  }
});

  // --- GET /api/demos/:id/events ---
  app.get("/api/demos/:id/events", requireUser, async (req, res, next) => {
  try {
    const demos = await loadAllDemos(readJson, demosFile);
    const demo = demos.find((item) => item.id === req.params.id && item.userId === req.user.id);
    if (!demo) {
      res.status(404).json({ error: "未找到该 Demo" });
      return;
    }
    res.json({ events: await readDeploymentEventsForDemo(demo.id) });
  } catch (error) {
    next(error);
  }
});

  // --- GET /api/demos/:id/inspection ---
  app.get("/api/demos/:id/inspection", requireUser, async (req, res, next) => {
  try {
    const demos = await loadAllDemos(readJson, demosFile);
    const demo = demos.find((item) => item.id === req.params.id && item.userId === req.user.id);
    if (!demo) {
      res.status(404).json({ error: "未找到该 Demo" });
      return;
    }
    res.json({ inspection: demo.inspection || null });
  } catch (error) {
    next(error);
  }
});

  // --- GET /api/deploy-events ---
  app.get("/api/deploy-events", requireUser, async (req, res, next) => {
  try {
    const demos = await loadAllDemos(readJson, demosFile);
    res.json(userDeployEvents(req.user, demos, { limit: req.query?.limit }));
  } catch (error) {
    next(error);
  }
});

  // --- GET /api/deployment-jobs/:id ---
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

  // --- POST /api/demos/:id/offline ---
  app.post("/api/demos/:id/offline", requireUser, async (req, res, next) => {
  try {
    const demos = await loadAllDemos(readJson, demosFile);
    const found = findUserDemo(demos, req.params.id, req.user.id);
        if (!found) {
          res.status(404).json({ error: "未找到该 Demo" });
          return;
        }
    const demo = found.demo;
    const demoIndex = found.index;
    const _version0 = found.demo.updatedAt;
    if (demo.status !== "published") {
      res.json({ demo: publicUserDemo(demo), quota: calculateQuota(req.user, demos) });
      return;
    }

    await stopRuntime(demo.slug);
    await removeDemoFiles(demo.slug);
    demos[demoIndex] = {
      ...demo,
      status: "offline",
      offlineAt: new Date().toISOString(),
      offlineBy: "user"
    };
    await saveAllDemosWithLock(writeJson, demosFile, readJson, demo.id, _version0, (freshDemos, target) => {
      Object.assign(target, demos[demoIndex]);
    });
    await writeAuditLog({
      action: "user_offline_demo",
      actorType: "user",
      actorId: req.user.id,
      targetType: "demo",
      targetId: demo.id,
      metadata: { slug: demo.slug }
    });
    res.json({ demo: publicUserDemo(demos[demoIndex]), quota: calculateQuota(req.user, demos) });
  } catch (error) {
    next(error);
  }
});

  // --- POST /api/demos/:id/delete ---
  app.post("/api/demos/:id/delete", requireUser, async (req, res, next) => {
  try {
    const demos = await loadAllDemos(readJson, demosFile);
    const found = findUserDemo(demos, req.params.id, req.user.id);
        if (!found) {
          res.status(404).json({ error: "未找到该 Demo" });
          return;
        }
    const demo = found.demo;
    const demoIndex = found.index;
    if (demo.status === "published") {
      res.status(409).json({ error: "已发布 Demo 不能直接删除，请先下线" });
      return;
    }

    if (demo.status === "deleted") {
      res.json({ demo: publicUserDemo(demo), quota: calculateQuota(req.user, demos) });
      return;
    }

    await stopRuntime(demo.slug);
    await deleteDemoFiles(demo.slug);
    demos[demoIndex] = {
      ...demo,
      status: "deleted",
      deletedAt: new Date().toISOString(),
      deletedBy: "user"
    };
    await saveAllDemos(writeJson, demosFile, demos);
    await writeAuditLog({
      action: "user_delete_demo",
      actorType: "user",
      actorId: req.user.id,
      targetType: "demo",
      targetId: demo.id,
      metadata: { slug: demo.slug, previousStatus: demo.status }
    });
    res.json({ demo: publicUserDemo(demos[demoIndex]), quota: calculateQuota(req.user, demos) });
  } catch (error) {
    next(error);
  }
});

  // --- POST /api/demos/:id/slug ---
  app.post("/api/demos/:id/slug", requireUser, async (req, res, next) => {
  try {
    const requestedSlug = normalizeCustomSlug(req.body?.slug);
    if (!canCustomizeSlug(req.user.plan)) {
      res.status(403).json({ error: "当前套餐暂不支持修改链接后缀，请升级到 Lite 或 Pro。" });
      return;
    }
    if (!requestedSlug) {
      res.status(400).json({ error: "请输入 3-40 位小写英文、数字或短横线。" });
      return;
    }
    if (isReservedSlug(requestedSlug)) {
      res.status(400).json({ error: "这个链接后缀不能使用，请换一个。" });
      return;
    }

    const demos = await loadAllDemos(readJson, demosFile);
    const found = findUserDemo(demos, req.params.id, req.user.id);
        if (!found) {
          res.status(404).json({ error: "未找到该试用项目" });
          return;
        }
    const demo = found.demo;
    const demoIndex = found.index;
    if (demo.status !== "published") {
      res.status(409).json({ error: "只有在线试用项目可以修改链接后缀。" });
      return;
    }
    if (requestedSlug === demo.slug) {
      res.json({ demo: publicUserDemo(demo), quota: calculateQuota(req.user, demos) });
      return;
    }
    if (isSlugClaimedByDemo(requestedSlug, demos, demo.id)) {
      res.status(409).json({ error: "这个链接后缀已被占用，请换一个。" });
      return;
    }
    if (await exists(path.join(demoRoot, requestedSlug)) || await exists(getArchivedDemoDir(requestedSlug))) {
      res.status(409).json({ error: "这个链接后缀已被占用，请换一个。" });
      return;
    }

    const previousSlug = demo.slug;
    if (demo.hostingMode === "node_runtime") {
      await fs.rename(path.join(demoRoot, previousSlug), path.join(demoRoot, requestedSlug));
      await stopRuntime(previousSlug);
      const refreshedInspection = demo.inspection || {};
      const runtime = await startNodeRuntime({
        slug: requestedSlug,
        projectDir: path.join(demoRoot, requestedSlug),
        inspection: refreshedInspection,
        config: hostingConfig(),
        env: runtimeEnvForDemo(demo)
      });
      demo.runtime = {
        ...(demo.runtime || {}),
        ...runtime
      };
      demo.hosting = {
        ...(demo.hosting || {}),
        runtime: {
          ...(demo.hosting?.runtime || {}),
          ...runtime
        }
      };
      demo.inspection = {
        ...(demo.inspection || {}),
        runtime: {
          ...(demo.inspection?.runtime || {}),
          ...runtime
        },
        hosting: demo.hosting
      };
    } else {
      await fs.rename(path.join(demoRoot, previousSlug), path.join(demoRoot, requestedSlug));
    }
    const aliases = Array.from(new Set([...(demo.aliases || []), previousSlug]));
    const publicUrl = `${publicBaseUrl.replace(/\/$/, "")}/d/${requestedSlug}/`;
    const _slugPrevAt = demo.updatedAt;
    demos[demoIndex] = {
      ...demo,
      slug: requestedSlug,
      aliases,
      publicUrl,
      linkMode: "custom_path",
      updatedAt: new Date().toISOString()
    };
    await saveAllDemosWithLock(writeJson, demosFile, readJson, demo.id, _slugPrevAt, (freshDemos, target) => {
      target.slug = requestedSlug;
      target.aliases = aliases;
      target.publicUrl = publicUrl;
      target.linkMode = "custom_path";
      target.inspection = freshDemos[found.index].inspection;
      target.hosting = freshDemos[found.index].hosting;
    });
    await writeAuditLog({
      action: "update_demo_slug",
      actorType: "user",
      actorId: req.user.id,
      targetType: "demo",
      targetId: demo.id,
      ip: getClientIp(req),
      metadata: { previousSlug, nextSlug: requestedSlug }
    });
    res.json({ demo: publicUserDemo(demos[demoIndex]), quota: calculateQuota(req.user, demos) });
  } catch (error) {
    next(error);
  }
});

  // --- POST /api/demos/:id/restore ---
  app.post("/api/demos/:id/restore", requireUser, async (req, res, next) => {
  try {
    const demos = await loadAllDemos(readJson, demosFile);
    const found = findUserDemo(demos, req.params.id, req.user.id);
        if (!found) {
          res.status(404).json({ error: "未找到该 Demo" });
          return;
        }
    const demo = found.demo;
    const demoIndex = found.index;
    if (isExpired(demo)) {
      await expireDemoFiles(demo);
      demos[demoIndex] = {
        ...demo,
        status: "expired",
        expiredAt: new Date().toISOString()
      };
      await saveAllDemos(writeJson, demosFile, demos);
      await writeAuditLog({
        action: "expire_demo",
        actorType: "system",
        targetType: "demo",
        targetId: demo.id,
        metadata: { slug: demo.slug, source: "restore_attempt" }
      });
      res.status(409).json({ error: "已过期 Demo 不能重新上线，请重新上传发布" });
      return;
    }

    if (demo.status === "published") {
      res.json({ demo: publicUserDemo(demo), quota: calculateQuota(req.user, demos) });
      return;
    }

    if (demo.status === "deleted") {
      res.status(409).json({ error: "已删除 Demo 不能重新上线，请重新上传发布" });
      return;
    }

    if (demo.status === "expired") {
      res.status(409).json({ error: "已过期 Demo 不能重新上线，请重新上传发布" });
      return;
    }

    const quota = calculateQuota(req.user, demos);
    if (quota.onlineDemos.used >= quota.onlineDemos.limit) {
      res.status(403).json({ error: `当前套餐最多保留 ${quota.onlineDemos.limit} 个在线 Demo，请先下线其他 Demo 或升级套餐` });
      return;
    }

    const archiveDir = getArchivedDemoDir(demo.slug);
    if (!await exists(archiveDir)) {
      res.status(409).json({ error: "Demo 文件已被清理，无法重新上线，请重新上传发布" });
      return;
    }

    const liveDir = path.join(demoRoot, demo.slug);
    if (await exists(liveDir)) {
      res.status(409).json({ error: "该访问路径已被占用，无法重新上线，请重新上传发布" });
      return;
    }

    await fs.cp(archiveDir, liveDir, { recursive: true });
    let restoredRuntime = null;
    if (demo.hostingMode === "node_runtime") {
      restoredRuntime = await startNodeRuntime({
        slug: demo.slug,
        projectDir: liveDir,
        inspection: demo.inspection || {},
        config: hostingConfig(),
        env: runtimeEnvForDemo(demo)
      });
    }
    demos[demoIndex] = {
      ...demo,
      status: "published",
      restoredAt: new Date().toISOString(),
      runtime: restoredRuntime ? { ...(demo.runtime || {}), ...restoredRuntime } : demo.runtime,
      hosting: restoredRuntime ? {
        ...(demo.hosting || {}),
        runtime: {
          ...(demo.hosting?.runtime || {}),
          ...restoredRuntime
        }
      } : demo.hosting,
      inspection: restoredRuntime ? {
        ...(demo.inspection || {}),
        runtime: {
          ...(demo.inspection?.runtime || {}),
          ...restoredRuntime
        },
        hosting: {
          ...(demo.hosting || {}),
          runtime: {
            ...(demo.hosting?.runtime || {}),
            ...restoredRuntime
          }
        }
      } : demo.inspection
    };
    delete demos[demoIndex].offlineAt;
    delete demos[demoIndex].offlineBy;
    await saveAllDemos(writeJson, demosFile, demos);
    await writeAuditLog({
      action: "restore_demo",
      actorType: "user",
      actorId: req.user.id,
      targetType: "demo",
      targetId: demo.id,
      metadata: { slug: demo.slug }
    });
    res.json({ demo: publicUserDemo(demos[demoIndex]), quota: calculateQuota(req.user, demos) });
  } catch (error) {
    next(error);
  }
});


  // --- POST /api/demos/:id/runtime/restart ---
  app.post("/api/demos/:id/runtime/restart", requireUser, async (req, res, next) => {
  try {
    const demos = await loadAllDemos(readJson, demosFile);
    const found = findUserDemo(demos, req.params.id, req.user.id);
        if (!found) {
          res.status(404).json({ error: "未找到该试用项目" });
          return;
        }
    const demo = found.demo;
    const demoIndex = found.index;
    if (demo.status !== "published" || demo.hostingMode !== "node_runtime") {
      res.status(409).json({ error: "只有在线的 Node.js 试用项目可以重启运行环境。" });
      return;
    }
    await stopRuntime(demo.slug);
    const restarted = await restartDemoRuntime(demo);
    if (!restarted.runtime) {
      if (demoIndex >= 0 && restarted.demo) {
        demos[demoIndex] = restarted.demo;
        await saveAllDemos(writeJson, demosFile, demos);
      }
      res.status(400).json({
        error: restarted.error || "运行环境重启失败。",
        demo: publicUserDemo(restarted.demo),
        diagnosis: restarted.diagnosis || null
      });
      return;
    }
    demos[demoIndex] = restarted.demo;
    await saveAllDemos(writeJson, demosFile, demos);
    await writeAuditLog({
      action: "restart_demo_runtime",
      actorType: "user",
      actorId: req.user.id,
      targetType: "demo",
      targetId: demo.id,
      metadata: { slug: demo.slug, driver: restarted.runtime.driver }
    });
    res.json({ demo: publicUserDemo(restarted.demo), runtime: restarted.runtime });
  } catch (error) {
    next(error);
  }
});

  // --- POST /api/demos/:id/runtime-env ---
  app.post("/api/demos/:id/runtime-env", requireUser, async (req, res, next) => {
  try {
    const demos = await loadAllDemos(readJson, demosFile);
    const found = findUserDemo(demos, req.params.id, req.user.id);
        if (!found) {
          res.status(404).json({ error: "未找到该试用项目" });
          return;
        }
    const demo = found.demo;
    const demoIndex = found.index;
    if (demo.hostingMode !== "node_runtime" && !hasSupabaseProject(demo.inspection || {})) {
      res.status(409).json({ error: "这个项目没有识别到需要保存的运行配置或外部后端配置。" });
      return;
    }
    const saved = mergeRuntimeEnv(demo.runtimeEnv, req.body?.env || req.body || {});
    const runtimeConfigStatus = createRuntimeConfigStatus(demo.inspection || {}, saved, demo.database);
    const externalBackend = await createExternalBackendConfigWithConnection(demo.inspection || {}, saved, demo.externalBackend);
    const nextInspection = {
      ...(demo.inspection || {}),
      externalBackend
    };
    const _rtEnvVersion = demo.updatedAt;
    let nextDemo = {
      ...demo,
      runtimeEnv: saved,
      runtimeConfig: runtimeConfigStatus,
      externalBackend,
      inspection: nextInspection,
      updatedAt: new Date().toISOString()
    };
    nextDemo.applicationReadiness = createApplicationReadiness({ demo: nextDemo, inspection: nextDemo.inspection });
    nextDemo.inspection = {
      ...nextDemo.inspection,
      applicationReadiness: nextDemo.applicationReadiness
    };
    demos[demoIndex] = nextDemo;
    await saveAllDemosWithLock(writeJson, demosFile, readJson, demo.id, _rtEnvVersion, (freshDemos, target) => {
      Object.assign(target, demos[demoIndex]);
    });
    await writeAuditLog({
      action: "update_demo_runtime_env",
      actorType: "user",
      actorId: req.user.id,
      targetType: "demo",
      targetId: demo.id,
      metadata: {
        slug: demo.slug,
        keys: Object.keys(publicRuntimeEnv(saved))
      }
    });
    res.json({
      demo: publicUserDemo(nextDemo),
      runtimeConfig: runtimeConfigStatus,
      externalBackend: publicExternalBackend(externalBackend)
    });
  } catch (error) {
    next(error);
  }
});

  // --- POST /api/demos/:id/database/reset ---
  app.post("/api/demos/:id/database/reset", requireUser, async (req, res, next) => {
  try {
    const demos = await loadAllDemos(readJson, demosFile);
    const found = findUserDemo(demos, req.params.id, req.user.id);
        if (!found) {
          res.status(404).json({ error: "未找到该试用项目" });
          return;
        }
    const demo = found.demo;
    const demoIndex = found.index;
    if (!demo.database?.enabled) {
      res.status(409).json({ error: "这个项目没有 MySQL 试用数据库。" });
      return;
    }
    const liveDir = path.join(demoRoot, demo.slug);
    const database = await resetDemoDatabase(demo.database, {
      projectDir: liveDir,
      config: hostingConfig()
    });
    const nextDemo = {
      ...demo,
      database,
      updatedAt: new Date().toISOString()
    };
    nextDemo.applicationReadiness = createApplicationReadiness({ demo: nextDemo, inspection: nextDemo.inspection || {} });
    nextDemo.inspection = {
      ...(nextDemo.inspection || {}),
      applicationReadiness: nextDemo.applicationReadiness
    };
    demos[demoIndex] = nextDemo;
    await saveAllDemos(writeJson, demosFile, demos);
    await writeAuditLog({
      action: "reset_demo_database",
      actorType: "user",
      actorId: req.user.id,
      targetType: "demo",
      targetId: demo.id,
      metadata: {
        slug: demo.slug,
        databaseName: database.databaseName,
        schemaStatus: database.schema?.status || "skipped"
      }
    });
    res.json({ demo: publicUserDemo(nextDemo), database: publicDemoDatabase(database) });
  } catch (error) {
    next(error);
  }
});

  // --- POST /api/demos/:id/deployment-jobs ---
  app.post("/api/demos/:id/deployment-jobs", requireUser, uploadProjectArchive, async (req, res, next) => {
  const uploadedFile = req.file;
  if (!uploadedFile) {
    res.status(400).json({ error: "请上传 .zip、.tar.gz 或 .tgz 项目包" });
    return;
  }

  try {
    const job = await createDeploymentJob({
      user: req.user,
      action: "update",
      demoId: req.params.id,
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
      path: "/api/demos/:id/deployment-jobs",
      ip: getClientIp(req),
      metadata: {
        jobId: job.id,
        demoId: req.params.id,
        fileName: uploadedFile.originalname,
        action: "update"
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
