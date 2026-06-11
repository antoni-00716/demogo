// DemoGo v0.9.8 - demos routes (refactored: direct imports + deps for middleware only)
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { join as pathJoin } from "node:path";
import { dataDir, publicBaseUrl } from "../config.js";
import { readJson, writeJson } from "../lib/data-access.js";
import { calculateQuota } from "../services/quota-service.js";
import { writeAuditLog } from "../lib/audit-log.js";
import { findUserDemo } from "../lib/demo-helpers.js";
import { getClientIp } from "../lib/request-utils.js";
import { writeTrialEvent } from "../lib/trial-log.js";
import { publicUserDemo, mergeRuntimeEnv, createRuntimeConfigStatus, publicRuntimeEnv, runtimeEnvForDemo } from "../lib/admin-helpers.js";
import { createApplicationReadiness } from "../services/application-readiness-service.js";
import { normalizeCustomSlug, canCustomizeSlug, isReservedSlug, isSlugClaimedByDemo, platformHost, isExpired } from "../lib/slug-utils.js";
import { addDeploymentJob } from "../queue/queue.js";
import { publicDemoDatabase, resetDemoDatabase, queryDemoDatabaseTables, queryDemoDatabaseRows, exportDemoDatabaseCsv } from "../services/demo-database-service.js";
import { formatBytes } from "../services/build-service.js";
import { hasSupabaseProject, createExternalBackendConfigWithConnection, publicExternalBackend } from "../services/external-backend-service.js";
import { stopRuntime, startNodeRuntime } from "../services/runtime-service.js";

const demosFile = pathJoin(dataDir, "demos.json");
const usersFile = pathJoin(dataDir, "users.json");
const subdomainRequestsFile = pathJoin(dataDir, "subdomain-requests.json");

async function exists(filePath) {
  try { await fs.access(filePath); return true; } catch { return false; }
}

export function registerDemosRoutes(app, {
  requireUser,
  uploadProjectArchive,
  flushUsageStats,
  getUserFromRequest,
  svcReadDeploymentEventsForDemo,
  createDeploymentJob,
  runDeploymentJob,
  publicDeploymentJob,
  removeDemoFiles,
  deleteDemoFiles,
  performUpdateDeployment,
  demoRoot,
  getArchivedDemoDir,
  hostingConfig,
  expireDemoFiles,
  restartDemoRuntime,
  formsFile,
  formSubmissionsFile,
}) {
app.get("/api/demos", async (req, res, next) => {
  try {
    await flushUsageStats();
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "请先登录" });
      return;
    }
    const demos = await readJson(demosFile, []);
    res.json({
      demos: demos.filter((demo) => demo.userId === user.id).map(publicUserDemo),
      quota: calculateQuota(user, demos)
    });
  } catch (error) {
    next(error);
  }
});
  app.get("/api/demos/:id", requireUser, async (req, res, next) => {
  try {
    await flushUsageStats();
    const demos = await readJson(demosFile, []);
    const demo = demos.find((item) => item.id === req.params.id && item.userId === req.user.id);
    if (!demo) {
      res.status(404).json({ error: "未找到该 Demo" });
      return;
    }
    const events = await svcReadDeploymentEventsForDemo(demo.id);
    res.json({
      demo: publicUserDemo(demo),
      events,
      inspection: demo.inspection || null
    });
  } catch (error) {
    next(error);
  }
});
  app.get("/api/demos/:id/events", requireUser, async (req, res, next) => {
  try {
    const demos = await readJson(demosFile, []);
    const demo = demos.find((item) => item.id === req.params.id && item.userId === req.user.id);
    if (!demo) {
      res.status(404).json({ error: "未找到该 Demo" });
      return;
    }
    res.json({ events: await svcReadDeploymentEventsForDemo(demo.id) });
  } catch (error) {
    next(error);
  }
});
  app.get("/api/demos/:id/inspection", requireUser, async (req, res, next) => {
  try {
    const demos = await readJson(demosFile, []);
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
  app.post("/api/demos/:id/offline", requireUser, async (req, res, next) => {
  try {
    const demos = await readJson(demosFile, []);
    const demoIndex = demos.findIndex((demo) => demo.id === req.params.id && demo.userId === req.user.id);

    if (demoIndex === -1) {
      res.status(404).json({ error: "未找到该 Demo" });
      return;
    }

    const demo = demos[demoIndex];
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
    await writeJson(demosFile, demos);
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
  app.post("/api/demos/:id/delete", requireUser, async (req, res, next) => {
  try {
    const demos = await readJson(demosFile, []);
    const demoIndex = demos.findIndex((demo) => demo.id === req.params.id && demo.userId === req.user.id);

    if (demoIndex === -1) {
      res.status(404).json({ error: "未找到该 Demo" });
      return;
    }

    const demo = demos[demoIndex];
    if (demo.status === "published") {
      res.status(409).json({ error: "已发布 Demo 不能直接删除，请先下线" });
      return;
    }

    if (demo.status === "deleted") {
      res.json({ demo: publicUserDemo(demo), quota: calculateQuota(req.user, demos) });
      return;
    }

    await stopRuntime(demo.slug);
    await deleteDemoFiles(demo);
    demos[demoIndex] = {
      ...demo,
      status: "deleted",
      deletedAt: new Date().toISOString(),
      deletedBy: "user"
    };
    await writeJson(demosFile, demos);
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

    const demos = await readJson(demosFile, []);
    const demoIndex = demos.findIndex((demo) => demo.id === req.params.id && demo.userId === req.user.id);
    if (demoIndex === -1) {
      res.status(404).json({ error: "未找到该试用项目" });
      return;
    }
    const demo = demos[demoIndex];
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
    demos[demoIndex] = {
      ...demo,
      slug: requestedSlug,
      aliases,
      publicUrl,
      linkMode: "custom_path",
      updatedAt: new Date().toISOString()
    };
    await writeJson(demosFile, demos);
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
  app.post("/api/demos/:id/subdomain-requests", requireUser, async (req, res, next) => {
  try {
    if (String(req.user.plan || "free") !== "pro") {
      res.status(403).json({ error: "自定义二级域名是 Pro 权益，请升级后再申请。" });
      return;
    }
    const subdomain = normalizeCustomSlug(req.body?.subdomain);
    if (!subdomain) {
      res.status(400).json({ error: "请输入 3-40 位小写英文、数字或短横线。" });
      return;
    }
    if (isReservedSlug(subdomain)) {
      res.status(400).json({ error: "这个二级域名前缀不能使用，请换一个。" });
      return;
    }
    const demos = await readJson(demosFile, []);
    const demo = demos.find((item) => item.id === req.params.id && item.userId === req.user.id);
    if (!demo) {
      res.status(404).json({ error: "未找到该试用项目" });
      return;
    }
    const requests = await readJson(subdomainRequestsFile, []);
    if (requests.some((item) => item.subdomain === subdomain && ["open", "approved"].includes(item.status))) {
      res.status(409).json({ error: "这个二级域名已被申请，请换一个。" });
      return;
    }
    const now = new Date().toISOString();
    const request = {
      id: crypto.randomUUID(),
      userId: req.user.id,
      userEmail: req.user.email,
      demoId: demo.id,
      demoSlug: demo.slug,
      demoName: demo.name || demo.slug,
      subdomain,
      fullDomain: `${subdomain}.${platformHost()}`,
      status: "open",
      message: String(req.body?.message || "").trim().slice(0, 500),
      createdAt: now,
      updatedAt: now
    };
    requests.unshift(request);
    await writeJson(subdomainRequestsFile, requests.slice(0, 2000));
    await writeAuditLog({
      action: "create_subdomain_request",
      actorType: "user",
      actorId: req.user.id,
      targetType: "subdomain_request",
      targetId: request.id,
      ip: getClientIp(req),
      metadata: { subdomain, demoId: demo.id, demoSlug: demo.slug }
    });
    res.json({ request });
  } catch (error) {
    next(error);
  }
});
  app.post("/api/demos/:id/restore", requireUser, async (req, res, next) => {
  try {
    const demos = await readJson(demosFile, []);
    const demoIndex = demos.findIndex((demo) => demo.id === req.params.id && demo.userId === req.user.id);

    if (demoIndex === -1) {
      res.status(404).json({ error: "未找到该 Demo" });
      return;
    }

    const demo = demos[demoIndex];
    if (isExpired(demo)) {
      await expireDemoFiles(demo);
      demos[demoIndex] = {
        ...demo,
        status: "expired",
        expiredAt: new Date().toISOString()
      };
      await writeJson(demosFile, demos);
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
    await writeJson(demosFile, demos);
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
  app.post("/api/demos/:id/update", requireUser, uploadProjectArchive, async (req, res, next) => {
  const uploadedFile = req.file;
  const user = req.user;
  const clientIp = getClientIp(req);

  if (!uploadedFile) {
    res.status(400).json({ error: "请上传 .zip、.tar.gz 或 .tgz 项目包" });
    return;
  }

  try {
    res.json(await performUpdateDeployment({
      demoId: req.params.id,
      uploadedFile,
      user,
      clientIp
    }));
  } catch (error) {
    next(error);
  }
});
  app.post("/api/demos/:id/runtime/restart", requireUser, async (req, res, next) => {
  try {
    const demos = await readJson(demosFile, []);
    const demoIndex = demos.findIndex((demo) => demo.id === req.params.id && demo.userId === req.user.id);
    if (demoIndex === -1) {
      res.status(404).json({ error: "未找到该试用项目" });
      return;
    }
    const demo = demos[demoIndex];
    if (demo.status !== "published" || demo.hostingMode !== "node_runtime") {
      res.status(409).json({ error: "只有在线的 Node.js 试用项目可以重启运行环境。" });
      return;
    }
    await stopRuntime(demo.slug);
    const restarted = await restartDemoRuntime(demo);
    if (!restarted.runtime) {
      if (demoIndex >= 0 && restarted.demo) {
        demos[demoIndex] = restarted.demo;
        await writeJson(demosFile, demos);
      }
      res.status(400).json({
        error: restarted.error || "运行环境重启失败。",
        demo: publicUserDemo(restarted.demo),
        diagnosis: restarted.diagnosis || null
      });
      return;
    }
    demos[demoIndex] = restarted.demo;
    await writeJson(demosFile, demos);
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
  app.post("/api/demos/:id/runtime-env", requireUser, async (req, res, next) => {
  try {
    const demos = await readJson(demosFile, []);
    const demoIndex = demos.findIndex((demo) => demo.id === req.params.id && demo.userId === req.user.id);
    if (demoIndex === -1) {
      res.status(404).json({ error: "未找到该试用项目" });
      return;
    }
    const demo = demos[demoIndex];
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
    await writeJson(demosFile, demos);
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
  app.post("/api/demos/:id/database/reset", requireUser, async (req, res, next) => {
  try {
    const demos = await readJson(demosFile, []);
    const demoIndex = demos.findIndex((demo) => demo.id === req.params.id && demo.userId === req.user.id);
    if (demoIndex === -1) {
      res.status(404).json({ error: "未找到该试用项目" });
      return;
    }
    const demo = demos[demoIndex];
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
    await writeJson(demosFile, demos);
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

  // --- 数据库表浏览 ---
  app.get('/api/demos/:id/database/tables', requireUser, async (req, res, next) => {
    try {
      const demos = await readJson(demosFile, []);
      const demo = demos.find((d) => d.id === req.params.id && d.userId === req.user.id);
      if (!demo) {
        res.status(404).json({ error: '未找到该试用项目' });
        return;
      }
      if (!demo.database?.enabled) {
        res.status(409).json({ error: '这个项目没有 MySQL 试用数据库。' });
        return;
      }
      const tables = await queryDemoDatabaseTables(demo.database, hostingConfig());
      res.json({ tables });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/demos/:id/database/tables/:tableName/rows', requireUser, async (req, res, next) => {
    try {
      const demos = await readJson(demosFile, []);
      const demo = demos.find((d) => d.id === req.params.id && d.userId === req.user.id);
      if (!demo) {
        res.status(404).json({ error: '未找到该试用项目' });
        return;
      }
      if (!demo.database?.enabled) {
        res.status(409).json({ error: '这个项目没有 MySQL 试用数据库。' });
        return;
      }
      const tableName = req.params.tableName;
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
        res.status(400).json({ error: '无效的表名' });
        return;
      }
      const rows = await queryDemoDatabaseRows(demo.database, tableName, hostingConfig());
      res.json({ tableName, rows });
    } catch (error) {
      next(error);
    }
  });

  // --- 数据库表 CSV 导出 ---
  app.get('/api/demos/:id/database/tables/:tableName/export', requireUser, async (req, res, next) => {
    try {
      const demos = await readJson(demosFile, []);
      const demo = demos.find((d) => d.id === req.params.id && d.userId === req.user.id);
      if (!demo) {
        res.status(404).json({ error: '未找到该试用项目' });
        return;
      }
      if (!demo.database?.enabled) {
        res.status(409).json({ error: '这个项目没有 MySQL 试用数据库。' });
        return;
      }
      const tableName = req.params.tableName;
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
        res.status(400).json({ error: '无效的表名' });
        return;
      }
      const csv = await exportDemoDatabaseCsv(demo.database, tableName, hostingConfig());
      if (!csv) {
        res.status(404).json({ error: '该表暂无数据。' });
        return;
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="' + tableName + '.csv"');
      res.send('\uFEFF' + csv);
    } catch (error) {
      next(error);
    }
  });

  // --- 表单数据 CSV 导出 ---
  app.get('/api/demos/:id/forms/export', requireUser, async (req, res, next) => {
    try {
      const demos = await readJson(demosFile, []);
      const demo = demos.find((d) => d.id === req.params.id && d.userId === req.user.id);
      if (!demo) {
        res.status(404).json({ error: '未找到该试用项目' });
        return;
      }
      const forms = await readJson(formsFile, []);
      const demoForms = forms.filter((f) => f.demoId === demo.id);
      const submissions = await readJson(formSubmissionsFile, []);
      const demoSubmissions = submissions.filter((s) => demoForms.some((f) => f.id === s.formId));

      if (!demoSubmissions.length) {
        res.status(404).json({ error: '暂无表单提交数据。' });
        return;
      }

      // Build CSV: columns = [时间, form_name, field1, field2, ...]
      const allFieldNames = new Set();
      for (const sub of demoSubmissions) {
        if (sub.payload) Object.keys(sub.payload).forEach((k) => allFieldNames.add(k));
      }
      const headers = ['时间', '表单名称', ...allFieldNames];
      const csvLines = [headers.join(',')];
      for (const sub of demoSubmissions) {
        const form = demoForms.find((f) => f.id === sub.formId);
        const values = [
          sub.createdAt || '',
          (form?.name || '').replace(/,/g, '，'),
          ...[...allFieldNames].map((name) => {
            const v = sub.payload?.[name];
            if (v === null || v === undefined) return '';
            const s = String(v).replace(/,/g, '，').replace(/"/g, '""');
            return s.includes(',') ? '"' + s + '"' : s;
          })
        ];
        csvLines.push(values.join(','));
      }
      const csv = csvLines.join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="submissions.csv"');
      res.send('\uFEFF' + csv);
    } catch (error) {
      next(error);
    }
  });



  // --- 表单数据查看（用户端）---
  app.get('/api/demos/:id/forms', requireUser, async (req, res, next) => {
    try {
      const demos = await readJson(demosFile, []);
      const demo = demos.find((d) => d.id === req.params.id && d.userId === req.user.id);
      if (!demo) {
        res.status(404).json({ error: '未找到该试用项目' });
        return;
      }
      const forms = await readJson(formsFile, []);
      const demoForms = forms.filter((f) => f.demoId === demo.id);
      const submissions = await readJson(formSubmissionsFile, []);
      const demoSubmissions = submissions.filter((s) => demoForms.some((f) => f.id === s.formId));
      res.json({
        forms: demoForms.map((f) => ({
          ...f,
          submissionCount: demoSubmissions.filter((s) => s.formId === f.id).length
        })),
        submissions: demoSubmissions.slice(0, 100)
      });
    } catch (error) {
      next(error);
    }
  });


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
    addDeploymentJob({ jobId: job.id, action: job.action }).catch((error) => {
      logger.error({ err: error }, "Deployment job failed");
    });
  } catch (error) {
    next(error);
  }
});

  app.get("/api/demos/:id/analytics", requireUser, async (req, res, next) => {
    try {
      const demos = await readJson(demosFile, []);
      const demo = findUserDemo(demos, req.user.id, req.params.id);
      if (!demo) {
        res.status(404).json({ error: "未找到该试用项目" });
        return;
      }
      const forms = await readJson(formsFile, []);
      const feedbacks = await readJson(feedbackFile, []);
      const usage = demo.usage || {};
      const formSubmissions = forms.filter((item) => item.demoId === demo.id).length;
      const feedbackCount = feedbacks.filter((item) => item.demoId === demo.id).length;
      const estimatedBytes = usage.estimatedBytes || 0;
      res.json({
        demoId: demo.id,
        slug: demo.slug,
        visits: usage.visits || 0,
        visitors: usage.uniqueVisitorsEstimate || 0,
        estimatedBytes,
        estimatedBytesLabel: formatBytes(estimatedBytes),
        lastVisitedAt: usage.lastVisitedAt || null,
        formSubmissions,
        feedbackCount,
        conversionRate: usage.visits && usage.visits > 0
          ? Math.round(formSubmissions / usage.visits * 100) + "%"
          : "0%"
      });
    } catch (error) {
      next(error);
    }
  });

}