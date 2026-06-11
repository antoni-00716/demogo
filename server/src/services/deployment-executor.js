// DemoGo v0.9.30 - Deployment Executor Service
// Shared deployment logic used by both server.js (sync fallback) and worker (async queue).
// Handles: extraction, build (Docker/host), save, audit log.

import crypto from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { readJson, writeJson } from "../lib/data-access.js";
import { writeAuditLog } from "../lib/audit-log.js";
import { calculateQuota } from "./quota-service.js";
import {
  dataDir, demoRoot, publicBaseUrl,
  buildTimeoutMs, dockerImage, dockerMemory, dockerCpus, maxZipSizeMb
} from "../config.js";
import logger from "../lib/logger.js";
import { exists } from "../lib/utils.js";

const demosFile = path.join(dataDir, "demos.json");

async function commandAvailable(cmd) {
  try { await runCommand(cmd, ["--version"], "/tmp", 5000); return true; } catch { return false; }
}

function runCommand(command, args, cwd, timeout = buildTimeoutMs) {
  return new Promise((resolve, reject) => {
    execFile(command, args, {
      cwd,
      shell: process.platform === "win32",
      timeout,
      maxBuffer: 1024 * 1024 * 4,
      env: { ...process.env, CI: "true" }
    }, (error, stdout, stderr) => {
      const output = [`$ ${command} ${args.join(" ")}`, stdout, stderr].filter(Boolean).join("\n");
      if (error) {
        error.buildLog = output;
        reject(error);
      } else {
        resolve(output);
      }
    });
  });
}

export async function executeDeployment({
  uploadedFile, requestedName, user, clientIp, actor, deploySource, deploymentId,
  existingDemos
}) {
  const log = logger.child({ deploymentId, action: "create" });
  log.info({ fileName: uploadedFile.originalname }, "Starting deployment execution");

  let slug = "";
  let targetDir = "";

  try {
    // Quota check
    const quota = calculateQuota(user, existingDemos);
    if (quota.onlineDemos.used >= quota.onlineDemos.limit) {
      const err = new Error("当前套餐的在线试用项目数已达上限");
      err.statusCode = 403;
      throw err;
    }
    // Check storage quota (approx: maxZipSizeMb * 3 as rough estimate of extracted size)
    if (quota.storage.usedBytes + maxZipSizeMb * 3 * 1024 * 1024 > quota.storage.limitBytes) {
      const err = new Error(`存储空间不足。当前已使用 ${quota.storage.usedMB}MB，套餐上限 ${quota.storage.limitMB}MB。请删除旧的试用项目后重试。`);
      err.statusCode = 403;
      throw err;
    }

    // Generate slug
    slug = "try-" + crypto.randomBytes(4).toString("hex");
    while (await exists(path.join(demoRoot, slug))) {
      slug = "try-" + crypto.randomBytes(4).toString("hex");
    }
    targetDir = path.join(demoRoot, slug);
    const inferredName = requestedName || path.basename(uploadedFile.originalname, path.extname(uploadedFile.originalname));

    // Clean and create target
    await fs.rm(targetDir, { recursive: true, force: true });
    await fs.mkdir(targetDir, { recursive: true });

    // Extract archive
    log.info("Extracting archive");
    await extractArchive(uploadedFile.path, targetDir, uploadedFile.originalname);
    await flattenSingleDirectory(targetDir);

    // Build step (if applicable)
    let buildLog = "";
    let detectedType = "static";
    const hasPackageJson = await exists(path.join(targetDir, "package.json"));

    if (hasPackageJson) {
      const pkgRaw = await fs.readFile(path.join(targetDir, "package.json"), "utf8");
      const pkg = JSON.parse(pkgRaw.replace(/^\uFEFF/, ""));
      const hasBuildScript = !!(pkg.scripts && pkg.scripts.build);

      if (hasBuildScript) {
        log.info("Running build step");
        try {
          buildLog = await buildNodeProject(targetDir);
          detectedType = "source";
          log.info("Build completed");
        } catch (buildErr) {
          log.warn({ error: buildErr.message }, "Build failed, continuing with raw files");
          buildLog = buildErr.buildLog || buildErr.message;
        }

        // After build, promote output directory to targetDir
        const outputDir = await findPublishableOutput(targetDir);
        if (outputDir && outputDir !== targetDir) {
          await promoteDirectory(outputDir, targetDir);
        await fixAssetPaths(targetDir);
        }
      } else {
        // package.json without build script - check for pre-built output
        const outputDir = await findPublishableOutput(targetDir);
        if (outputDir && outputDir !== targetDir) {
          await promoteDirectory(outputDir, targetDir);
        await fixAssetPaths(targetDir);
        }
      }
    }

    // Determine hosting mode
    const hasHtml = await exists(path.join(targetDir, "index.html"));
    let hostingMode = hasHtml ? "static" : "unknown";

    // Re-check package.json — it may have been removed by promoteDirectory during build
    const finalHasPackageJson = await exists(path.join(targetDir, "package.json"));

    // Detect Node.js runtime capability
    if (finalHasPackageJson) {
      const pkgRaw = await fs.readFile(path.join(targetDir, "package.json"), "utf8");
      const pkg = JSON.parse(pkgRaw.replace(/^\uFEFF/, ""));
      if (pkg.scripts && (pkg.scripts.start || pkg.scripts.dev)) {
        hostingMode = "node_runtime";
      }
    }

    // Determine public URL
    const publicUrl = publicBaseUrl.replace(/\/$/, "") + "/d/" + slug + "/";
    const demoId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Calculate extracted storage size for quota tracking
    const storageBytes = await calculateDirectorySize(targetDir);

    // Create demo record
    const demo = {
      id: demoId,
      userId: user.id,
      userEmail: user.email,
      slug,
      name: inferredName,
      status: "published",
      publicUrl,
      deploySource: deploySource || "web",
      hostingMode,
      detectedType,
      architecture: { projectKind: hostingMode, hosting: { type: hostingMode } },
      createdAt: now,
      updatedAt: now,
      version: 1,
      deployEvents: [{ type: "create", at: now, status: "success" }],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      buildLog,
      storageBytes,
    };

    const demos = await readJson(demosFile, []);
    demos.unshift(demo);
    await writeJson(demosFile, demos);

    // Audit log
    try {
      await writeAuditLog({
        action: actor === "agent" ? "agent_deploy_demo" : "deploy_demo",
        actorType: actor === "agent" ? "agent" : "user",
        actorId: user.id,
        targetType: "demo",
        targetId: demo.id,
        ip: clientIp,
        metadata: { slug, hostingMode, detectedType, source: deploySource }
      });
    } catch (e) { log.warn("Audit log failed: " + e.message); }

    log.info({ slug, demoId, hostingMode }, "Deployment completed");

    return {
      ok: true,
      id: demoId,
      slug,
      status: "published",
      name: demo.name,
      projectName: demo.name,
      publicUrl,
      hostingMode: demo.hostingMode,
      detectedType,
      architecture: demo.architecture,
      deploymentEvents: demo.deployEvents,
      linkMode: slug.startsWith("try-") ? "random" : "readable",
      customDomainEligible: user?.plan === "pro",
      buildLog,
      quota: calculateQuota(user, demos),
    };
  } catch (error) {
    log.error({ error: error.message }, "Deployment failed");
    if (slug) {
      try { await fs.rm(path.join(demoRoot, slug), { recursive: true, force: true }); } catch {}
    }
    throw error;
  } finally {
    try { await fs.rm(uploadedFile.path, { force: true }); } catch {}
  }
}



async function fixAssetPaths(targetDir) {
  try {
    const indexPath = path.join(targetDir, 'index.html');
    if (!await exists(indexPath)) return;
    let html = await fs.readFile(indexPath, 'utf8');
    const fixed = html
      .replace(/src="\/assets\//g, 'src="./assets/')
      .replace(/href="\/assets\//g, 'href="./assets/');
    if (fixed !== html) {
      await fs.writeFile(indexPath, fixed, 'utf8');
      logger.info({ targetDir }, 'Fixed asset paths to relative');
    }
  } catch (err) {
    logger.warn({ error: err.message }, 'Asset path fix skipped');
  }
}
async function flattenSingleDirectory(targetDir) {
  try {
    const entries = await fs.readdir(targetDir);
    if (entries.length !== 1) return;
    const singlePath = path.join(targetDir, entries[0]);
    const stat = await fs.stat(singlePath);
    if (!stat.isDirectory()) return;

    logger.info({ targetDir, nestedDir: entries[0] }, 'Flattening single-directory archive');
    const subEntries = await fs.readdir(singlePath);
    for (const entry of subEntries) {
      await fs.rename(path.join(singlePath, entry), path.join(targetDir, entry));
    }
    await fs.rm(singlePath, { recursive: true, force: true });
  } catch (err) {
    logger.warn({ error: err.message }, 'Flatten skipped (non-critical)');
  }
}
// ====== Build ======

async function buildNodeProject(projectDir) {
  const useDocker = await commandAvailable("docker");
  if (useDocker) {
    return buildNodeProjectInDocker(projectDir);
  }
  return buildNodeProjectOnHost(projectDir);
}

async function buildNodeProjectOnHost(projectDir) {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const hasLock = await exists(path.join(projectDir, "package-lock.json"));
  const installCmd = hasLock ? ["ci"] : ["install"];
  const installLog = await runCommand(npmCmd, installCmd, projectDir);
  const buildResult = await runCommand(npmCmd, ["run", "build"], projectDir);
  return ["[host build]", installLog, buildResult].join("\n");
}

async function buildNodeProjectInDocker(projectDir) {
  const hasLock = await exists(path.join(projectDir, "package-lock.json"));
  const installCmd = hasLock ? "npm ci" : "npm install";
  const script = `${installCmd} && npm run build`;
  const args = [
    "run", "--rm", "--network=bridge",
    "--memory", dockerMemory,
    "--cpus", dockerCpus,
    "-v", `${path.resolve(projectDir)}:/workspace`,
    "-w", "/workspace",
    dockerImage,
    "sh", "-lc", script
  ];
  const log = await runCommand("docker", args, projectDir);
  return [`[docker build] image=${dockerImage} memory=${dockerMemory}`, log].join("\n");
}

async function findPublishableOutput(targetDir) {
  const candidates = [
    path.join(targetDir, "dist"),
    path.join(targetDir, "build"),
    path.join(targetDir, "out"),
  ];
  for (const dir of candidates) {
    if (await exists(path.join(dir, "index.html"))) return dir;
  }
  // Also check if index.html is at root
  if (await exists(path.join(targetDir, "index.html"))) return targetDir;
  return null;
}

async function promoteDirectory(sourceDir, targetDir) {
  if (sourceDir === targetDir) return;
  const staging = `${targetDir}-staging-${crypto.randomBytes(3).toString("hex")}`;
  await fs.rename(sourceDir, staging);
  // Remove old content (keep targetDir itself)
  const entries = await fs.readdir(targetDir);
  for (const entry of entries) {
    await fs.rm(path.join(targetDir, entry), { recursive: true, force: true });
  }
  // Move staged content in
  const staged = await fs.readdir(staging);
  for (const entry of staged) {
    await fs.rename(path.join(staging, entry), path.join(targetDir, entry));
  }
  await fs.rm(staging, { recursive: true, force: true });
}

// ====== Archive Extraction ======


async function extractArchive(filePath, targetDir, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const isTar = originalName.endsWith(".tar.gz") || originalName.endsWith(".tgz") || ext === ".tgz";
  const isZip = ext === ".zip";

  if (isTar) {
    const tar = await import("tar");
    await tar.x({ file: filePath, C: targetDir });
  } else if (isZip) {
    await extractZip(filePath, targetDir);
  } else {
    throw new Error("Unsupported archive format: use .zip, .tar.gz or .tgz");
  }
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

/** Recursively calculate total byte size of all files in a directory */
async function calculateDirectorySize(dir) {
  let total = 0;
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        total += await calculateDirectorySize(fullPath);
      } else {
        const stat = await fs.stat(fullPath);
        total += stat.size;
      }
    }
  } catch {
    // Directory may not exist yet or was cleaned up
  }
  return total;
}