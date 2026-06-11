import fs from "node:fs/promises";
import path from "node:path";
import logger from "../lib/logger.js";
import { purgeCache } from "../lib/cdn.js";
import { putDirectory, deletePrefix, isMinioBackend } from "../lib/storage.js";
import { startNodeRuntime, stopRuntime } from "./runtime-service.js";
import { demoDatabaseBlockReason } from "./demo-database-service.js";
import { exists } from "../lib/utils.js";
import { getArchivedDemoDir } from "../lib/slug-utils.js";

export function createDemoLifecycleService(deps) {
  const {
    demoRoot, demosFile,
    readJson,
    hostingConfig, createConfigRequiredRuntime,
    deleteDemoDatabase,
    createRuntimeConfigStatus, runtimeEnvForDemo,
    createFailureDiagnosis,
    slugify,
  } = deps;

  // ---- Local helpers ----

  const archiveIgnoredPathParts = new Set(["node_modules"]);

  function demoSlug(value) {
    return typeof value === "string" ? value : value?.slug;
  }

  async function removePath(targetPath) {
    if (process.platform === "win32") {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    await fs.rm(targetPath, {
      recursive: true,
      force: true,
      maxRetries: 20,
      retryDelay: 1000
    });
  }

  function shouldCopyDemoArchivePath(sourcePath, rootDir) {
    const relativePath = path.relative(rootDir, path.resolve(sourcePath));
    if (!relativePath) return true;
    return !relativePath
      .split(path.sep)
      .filter(Boolean)
      .some((part) => archiveIgnoredPathParts.has(part));
  }

  async function copyDemoArchive(sourceDir, targetDir) {
    const rootDir = path.resolve(sourceDir);
    await fs.cp(sourceDir, targetDir, {
      recursive: true,
      filter: (sourcePath) => shouldCopyDemoArchivePath(sourcePath, rootDir)
    });
  }

  // ---- Storage sync ----

  async function syncDemoToStorage(slug) {
    if (!isMinioBackend()) return;
    const demoDir = path.join(demoRoot, slug);
    try {
      await putDirectory(`demos/${slug}`, demoDir);
      logger.info({ slug }, "Demo synced to object storage");
    } catch (err) {
      logger.warn({ slug, error: err.message }, "Failed to sync demo to object storage");
    }
  }

  async function deleteDemoFromStorage(slug) {
    if (!isMinioBackend()) return;
    try {
      await deletePrefix(`demos/${slug}`);
      logger.info({ slug }, "Demo deleted from object storage");
    } catch (err) {
      logger.warn({ slug, error: err.message }, "Failed to delete demo from object storage");
    }
  }

  // ---- Runtime restart ----

  async function restartDemoRuntime(demo) {
    if (!demo || demo.status !== "published" || demo.hostingMode !== "node_runtime") {
      const error = "\u5F53\u524D\u9879\u76EE\u4E0D\u662F Node.js \u8FD0\u884C\u65F6\u9879\u76EE\u3002";
      return { demo, runtime: null, error, diagnosis: createFailureDiagnosis({ message: error, inspection: demo?.inspection, runtime: demo?.runtime, database: demo?.database }) };
    }
    const liveDir = path.join(demoRoot, demo.slug);
    if (!await exists(liveDir)) {
      const error = "\u9879\u76EE\u6587\u4EF6\u4E0D\u5B58\u5728\uFF0C\u65E0\u6CD5\u91CD\u542F\u6216\u8BBF\u95EE\u3002";
      return { demo, runtime: null, error, diagnosis: createFailureDiagnosis({ message: error, category: "package", inspection: demo.inspection, runtime: demo.runtime, database: demo.database }) };
    }
    try {
      const runtimeConfigStatus = createRuntimeConfigStatus(demo.inspection || {}, demo.runtimeEnv, demo.database);
      if (runtimeConfigStatus.missing.length) {
        const diagnosis = createFailureDiagnosis({
          message: runtimeConfigStatus.nextAction || "\u8BF7\u5148\u8865\u5145\u6240\u9700\u914D\u7F6E\u3002",
          category: "runtime_env",
          inspection: demo.inspection,
          runtime: demo.runtime,
          database: demo.database
        });
        const runtime = createConfigRequiredRuntime(demo.runtime, runtimeConfigStatus, diagnosis);
        return {
          demo: {
            ...demo,
            runtime,
            failureDiagnosis: diagnosis,
            runtimeConfig: runtimeConfigStatus,
            updatedAt: new Date().toISOString()
          },
          runtime: null,
          error: runtimeConfigStatus.nextAction || "\u8BF7\u5148\u8865\u5145\u6240\u9700\u914D\u7F6E\u3002",
          diagnosis
        };
      }
      const runtime = await startNodeRuntime({
        slug: demo.slug,
        projectDir: liveDir,
        inspection: demo.inspection || {},
        config: hostingConfig(),
        env: runtimeEnvForDemo(demo)
      });
      const nextHosting = {
        ...(demo.hosting || {}),
        runtime: {
          ...(demo.hosting?.runtime || {}),
          ...runtime
        }
      };
      const nextInspection = {
        ...(demo.inspection || {}),
        runtime: {
          ...(demo.inspection?.runtime || {}),
          ...runtime
        },
        hosting: nextHosting
      };
      return {
        demo: {
          ...demo,
          runtime: {
            ...(demo.runtime || {}),
            ...runtime
          },
          hosting: nextHosting,
          inspection: nextInspection,
          runtimeConfig: runtimeConfigStatus,
          updatedAt: new Date().toISOString()
        },
        runtime,
        error: ""
      };
    } catch (error) {
      const diagnosis = createFailureDiagnosis({
        message: error instanceof Error ? error.message : "\u91CD\u542F\u8FD0\u884C\u65F6\u5931\u8D25\u3002",
        inspection: demo.inspection,
        runtime: demo.runtime,
        database: demo.database,
        logs: error?.logs || error?.message || ""
      });
      const failedRuntime = {
        ...(demo.runtime || {}),
        status: "failed",
        statusLabel: "\u542F\u52A8\u5931\u8D25",
        logSummary: diagnosis.evidence?.find((item) => item.startsWith("\u65E5\u5FD7\u6458\u8981\uFF1A"))?.replace("\u65E5\u5FD7\u6458\u8981\uFF1A", "") || demo.runtime?.logSummary || "",
        failureDiagnosis: diagnosis,
        lifecycle: {
          ...(demo.runtime?.lifecycle || {}),
          stage: "failed",
          stageLabel: "\u542F\u52A8\u5931\u8D25",
          stoppedAt: new Date().toISOString()
        }
      };
      return {
        demo: {
          ...demo,
          runtime: failedRuntime,
          failureDiagnosis: diagnosis,
          updatedAt: new Date().toISOString()
        },
        runtime: null,
        error: error instanceof Error ? error.message : "\u91CD\u542F\u8FD0\u884C\u65F6\u5931\u8D25\u3002",
        diagnosis
      };
    }
  }

  // ---- Demo file lifecycle ----

  async function removeDemoFiles(value) {
    const slug = demoSlug(value);
    if (!slug) return;
    await stopRuntime(slug);
    const liveDir = path.join(demoRoot, slug);
    const archiveDir = getArchivedDemoDir(slug);
    await removePath(archiveDir);
    if (await exists(liveDir)) {
      await fs.mkdir(path.dirname(archiveDir), { recursive: true });
      await copyDemoArchive(liveDir, archiveDir);
      await removePath(liveDir);
    }
  }

  async function expireDemoFiles(value) {
    const slug = demoSlug(value);
    if (!slug) return;
    await stopRuntime(slug);
    purgeCache(slug).catch(() => {});
    deleteDemoFromStorage(slug).catch(() => {});
    await removePath(path.join(demoRoot, slug));
    await removePath(getArchivedDemoDir(slug));
    if (typeof value === "object") {
      await deleteDemoDatabase(value.database, hostingConfig()).catch(() => null);
    }
  }

  async function deleteDemoFiles(value) {
    const slug = demoSlug(value);
    if (!slug) return;
    await stopRuntime(slug);
    await removePath(path.join(demoRoot, slug));
    await removePath(getArchivedDemoDir(slug));
    if (typeof value === "object") {
      await deleteDemoDatabase(value.database, hostingConfig()).catch(() => null);
    }
  }

  // ---- Alias redirect ----

  async function redirectDemoAlias(req, res) {
    const slug = slugify(req.params.slug);
    if (!slug) return false;
    const demos = await readJson(demosFile, []);
    const demo = demos.find((item) => Array.isArray(item.aliases) && item.aliases.includes(slug) && item.status === "published");
    if (!demo?.publicUrl) return false;
    res.redirect(302, demo.publicUrl);
    return true;
  }

  return {
    exists,
    getArchivedDemoDir,
    copyDemoArchive,
    expireDemoFiles,
    removeDemoFiles,
    deleteDemoFiles,
    restartDemoRuntime,
    syncDemoToStorage,
    redirectDemoAlias,
  };
}
