import { execFile, spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import fs from "node:fs/promises";
import path from "node:path";

const runtimeProcesses = new Map();
let nextHostPort = 43100;

import { join as pathJoin } from "node:path";
import { dataDir } from "../config.js";

const RUNTIME_STATE_FILE = pathJoin(dataDir, "runtime-state.json");

// Persistence helpers
async function loadRuntimeState() {
  try {
    const raw = await fs.readFile(RUNTIME_STATE_FILE, "utf8");
    const entries = JSON.parse(raw);
    for (const [slug, record] of Object.entries(entries)) {
      if (record.driver === "docker" && record.containerId) {
        record.status = "unknown"; // Will be verified on health check
      } else {
        record.status = "stopped"; // Host processes don't survive restart
      }
      record.process = null; // Can't serialize child processes
      record.restoredFromDisk = true;
      runtimeProcesses.set(slug, record); saveRuntimeState().catch(() => {});
    }
    return Object.keys(entries).length;
  } catch {
    return 0;
  }
}

async function saveRuntimeState() {
  const state = {};
  for (const [slug, record] of runtimeProcesses.entries()) {
    state[slug] = {
      slug: record.slug,
      status: record.status,
      driver: record.driver,
      port: record.port,
      containerId: record.containerId || null,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
      projectDir: record.projectDir,
    };
  }
  await fs.mkdir(pathJoin(dataDir), { recursive: true });
  await fs.writeFile(RUNTIME_STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

// Load persisted state on startup
const restoredCount = await loadRuntimeState();
if (restoredCount > 0) {
  // Log restored records - using dynamic import to avoid circular deps
  import("./logger.js").then(m => {
    m.default?.info?.({ restoredCount }, "Restored runtime state from disk");
  }).catch(() => {});
}



// ===== Runtime Detection Functions (migrated from server.js) =====

export function detectRuntimeWarnings({ dependencies = [], scripts = {}, paths = [] }) {
  const text = [
    dependencies.join(" "),
    Object.values(scripts).join(" "),
    paths.join(" ")
  ].join(" ").toLowerCase();
  const mysqlPatterns = ["mysql","mysql2","sequelize","typeorm","drizzle-orm"];
  const postgresPatterns = ["pg","postgres","postgresql"];
  const mongoPatterns = ["mongodb","mongoose"];
  const redisPatterns = ["redis","ioredis"];
  const otherDatabasePatterns = ["prisma"];
  const usesSupabase = text.includes("supabase");
  const requiresMysql = mysqlPatterns.some((item) => text.includes(item));
  const requiresPostgres = postgresPatterns.some((item) => text.includes(item)) && !usesSupabase;
  const requiresMongo = mongoPatterns.some((item) => text.includes(item));
  const requiresRedis = redisPatterns.some((item) => text.includes(item));
  const requiresOtherDatabase = otherDatabasePatterns.some((item) => text.includes(item));
  const requiresDatabase = requiresMysql || requiresPostgres || requiresMongo || requiresRedis || requiresOtherDatabase;
  const requiresWebSocket = /\b(ws|socket\.io|websocket)\b/.test(text);
  const warnings = [];
  const unsupportedReasons = [];
  if (requiresMysql) { warnings.push("检测到 MySQL 依赖，发布时会分配空的试用数据库"); }
  if (usesSupabase) { warnings.push("检测到 Supabase 外部后端，需在项目详情页填写 Supabase URL 和 anon key"); }
  if (requiresRedis) { warnings.push("检测到 Redis 依赖"); unsupportedReasons.push("当前暂不支持 Redis 试用环境"); }
  if (requiresMongo) { warnings.push("检测到 MongoDB 依赖"); unsupportedReasons.push("当前暂不支持 MongoDB 试用环境"); }
  if (requiresPostgres) { warnings.push("检测到 PostgreSQL 依赖"); unsupportedReasons.push("当前暂不支持 PostgreSQL 试用环境"); }
  if (requiresOtherDatabase && !requiresMysql) { warnings.push("检测到数据库 ORM 或迁移工具"); unsupportedReasons.push("当前只支持 MySQL 空试用数据库，不自动执行 ORM 迁移"); }
  if (requiresWebSocket) { warnings.push("检测到 WebSocket 依赖"); unsupportedReasons.push("当前不支持 WebSocket 试用链路"); }
  return { requiresDatabase, requiresMysql, requiresPostgres, requiresMongo, requiresRedis, requiresOtherDatabase, databaseEngine: requiresMysql ? "mysql" : "", requiresWebSocket, warnings, unsupportedReasons };
}

export function shouldBuildBeforeNodeStart(scripts = {}) {
  const start = String(scripts.start || "").toLowerCase();
  if (!scripts.build) return false;
  if (scripts["start:prod"]) return false;
  if (/\bnext start\b|\bnuxt\b|\bvinxi start\b|\btanstack\b/.test(start)) return true;
  if (/dist\/|build\/|node dist|node build|node \.output/.test(start)) return true;
  if (/ts-node|tsx|nodemon/.test(start)) return true;
  return false;
}

export function inferRuntimeEngine(paths = [], dependencies = {}, flags = {}) {
  const normalized = paths.map((entryPath) => String(entryPath || "").replace(/\\/g, "/").toLowerCase());
  if (normalized.some((entryPath) => ["requirements.txt","main.py","app.py","manage.py"].includes(entryPath))) return "python";
  if (normalized.some((entryPath) => ["pom.xml","build.gradle","build.gradle.kts"].includes(entryPath))) return "java";
  if (normalized.some((entryPath) => ["go.mod","main.go"].includes(entryPath))) return "go";
  if (flags.hasBackend || Object.keys(dependencies || {}).length) return "node";
  return "";
}

export function inferNodeFramework(dependencies = {}, paths = []) {
  const names = Object.keys(dependencies || {}).map((name) => name.toLowerCase());
  if (names.includes("next")) return "next";
  if (names.includes("nuxt")) return "nuxt";
  if (names.includes("@tanstack/react-start") || names.includes("@tanstack/start")) return "tanstack_start";
  if (names.includes("express")) return "express";
  if (names.includes("koa")) return "koa";
  if (names.includes("fastify")) return "fastify";
  if (names.includes("@nestjs/core")) return "nestjs";
  if (names.includes("hono")) return "hono";
  if ((paths || []).some((item) => String(item || "").toLowerCase().includes("server.js"))) return "node";
  return "";
}

export function formatRuntimeFramework(value) {
  const labels = { express: "Express", koa: "Koa", fastify: "Fastify", nestjs: "NestJS", hono: "Hono", next: "Next.js", nuxt: "Nuxt", tanstack_start: "TanStack Start", node: "Node.js" };
  return labels[value] || "Node.js";
}

export function isSingleServiceSsrProfile(profile = {}) {
  if (profile?.type !== "fullstack_framework") return false;
  const frameworks = [profile.framework, ...(profile.frontendFrameworks || []).map((item) => item.code)].filter(Boolean).map((item) => String(item).toLowerCase());
  return frameworks.some((item) => ["next","nuxt","tanstack_start"].includes(item));
}

export function detectInspectionType(flags) {
  if (flags.hasOutIndex) return "out";
  if (flags.hasSsr) return "runtime";
  if (flags.hasBackend && !flags.hasDistIndex && !flags.hasBuildIndex && !flags.hasOutIndex && !flags.hasPublicIndex) return "backend";
  if (flags.hasPackageJson && flags.hasBuildScript && flags.hasSourceIndicators && flags.hasRootIndex) return "source";
  if (flags.hasRootIndex) return "static-root";
  if (flags.hasDistIndex) return "dist";
  if (flags.hasBuildIndex) return "build";
  if (flags.hasPublicIndex) return "public";
  if (flags.singleHtmlEntry) return "single-html";
  if (flags.hasPackageJson) return "source";
  return "unknown";
}

export function detectRuntimeMetadata(analysis, flags = {}) {
  const startCommand = String(analysis.packageScripts?.start || "").trim();
  const dependencies = analysis.packageDependencies || {};
  const paths = analysis.paths || [];
  const scripts = analysis.packageScripts || {};
  const dependencyNames = Object.keys(dependencies || {}).map((name) => name.toLowerCase());
  const runtimeWarnings = detectRuntimeWarnings({ dependencies: dependencyNames, scripts, paths });
  const framework = inferNodeFramework(dependencies, paths);
  return {
    engine: inferRuntimeEngine(paths, dependencies, flags),
    hasStartScript: Boolean(startCommand), startCommand, scripts,
    hasBuildScript: Boolean(scripts.build),
    hasStartProdScript: Boolean(scripts["start:prod"]),
    selectedStartCommand: scripts["start:prod"] ? "npm run start:prod" : "npm start",
    buildBeforeStart: shouldBuildBeforeNodeStart(scripts),
    packageManager: analysis.paths?.includes("pnpm-lock.yaml") ? "pnpm" : analysis.paths?.includes("yarn.lock") ? "yarn" : "npm",
    framework, frameworkLabel: formatRuntimeFramework(framework),
    requiresServer: Boolean(flags.hasBackend || flags.hasSsr),
    requiresDatabase: runtimeWarnings.requiresDatabase,
    requiresMysql: runtimeWarnings.requiresMysql,
    requiresPostgres: runtimeWarnings.requiresPostgres,
    requiresMongo: runtimeWarnings.requiresMongo,
    requiresRedis: runtimeWarnings.requiresRedis,
    requiresOtherDatabase: runtimeWarnings.requiresOtherDatabase,
    databaseEngine: runtimeWarnings.databaseEngine,
    requiresWebSocket: runtimeWarnings.requiresWebSocket,
    warnings: runtimeWarnings.warnings,
    unsupportedReasons: runtimeWarnings.unsupportedReasons
  };
}


export function createRuntimeConfig(config = {}) {
  return {
    enabled: Boolean(config.runtimeEnabled),
    nodeEnabled: Boolean(config.runtimeNodeEnabled),
    driver: String(config.runtimeDriver || "docker").toLowerCase(),
    rootDir: config.runtimeRootDir || path.join(config.dataDir || ".", "runtime-projects"),
    dockerImage: config.runtimeDockerImage || "node:20-alpine",
    memory: config.runtimeMemory || "512m",
    cpus: config.runtimeCpus || "1",
    ttlMinutes: Number(config.runtimeTtlMinutes || 120),
    startTimeoutSeconds: Number(config.runtimeStartTimeoutSeconds || 45),
    maxInstances: Number(config.runtimeMaxInstances || 10),
    demoDatabaseReady: Boolean(config.demoDatabaseReady),
    env: config.env || {}
  };
}

export function canStartNodeRuntime(inspection = {}, config = {}) {
  const runtime = inspection.runtime || {};
  const profile = inspection.projectProfile || {};
  const supportedSsrRuntime = isSupportedSingleServiceSsr(inspection);
  const externalBackend = inspection.externalBackend || {};
  const usesSupabaseExternalBackend = profileUsesSupabase(profile) || externalBackend.provider === "supabase";
  const assessment = inspection.projectAssessment || {};
  const requiredEnv = assessment.environmentVariables?.required || [];
  const providedEnvKeys = Object.keys(config.env || {});
  const missingEnv = requiredEnv.filter((key) => !providedEnvKeys.includes(key.toUpperCase()) && key.toUpperCase() !== "PORT");
  if (missingEnv.length > 0) {
    return { ok: false, configRequired: true, missing: missingEnv, reason: "missing env config: " + missingEnv.join(", ") };
  }
  if (!config.enabled || !config.nodeEnabled) {
    return { ok: false, reason: "Node.js 运行器尚未开启。" };
  }
  if ((inspection.hasSsr || profile.type === "fullstack_framework") && !supportedSsrRuntime) {
    return { ok: false, reason: "当前只支持 Next.js、Nuxt、TanStack Start 这类单服务 SSR 项目，其他全栈框架暂不支持运行态。" };
  }
  if (!(inspection.hasBackend || inspection.detectedType === "backend" || profile.type === "node_service" || supportedSsrRuntime)) {
    return { ok: false, reason: "该项目不需要 Node.js 运行器。" };
  }
  if (!runtime.startCommand) {
    return { ok: false, reason: "Node.js 项目必须提供 start 命令。" };
  }
  if (runtime.requiresRedis) {
    return { ok: false, reason: "检测到项目依赖 Redis。当前 DemoGo 暂不支持 Redis 试用环境。" };
  }
  if (runtime.requiresMongo) {
    return { ok: false, reason: "检测到项目依赖 MongoDB。当前 DemoGo 暂不支持 MongoDB 试用环境。" };
  }
  if (runtime.requiresPostgres && !usesSupabaseExternalBackend) {
    return { ok: false, reason: "检测到项目依赖 PostgreSQL。当前 DemoGo 暂不支持 PostgreSQL 试用环境。" };
  }
  if ((runtime.requiresOtherDatabase && !runtime.requiresMysql && !usesSupabaseExternalBackend) || (runtime.requiresDatabase && !runtime.requiresMysql && !usesSupabaseExternalBackend)) {
    return { ok: false, reason: "检测到暂未支持的数据库依赖。当前 DemoGo 只支持 MySQL 试用数据库。" };
  }
  if (runtime.requiresMysql && !config.demoDatabaseReady) {
    return { ok: false, reason: "检测到项目需要 MySQL，但当前平台尚未开启 MySQL 试用数据库。" };
  }
  if (runtime.requiresWebSocket) {
    return { ok: false, reason: "检测到项目依赖 WebSocket。当前 DemoGo Node.js 运行器暂不支持 WebSocket 试用链路。" };
  }
  return { ok: true, reason: "" };
}

export function profileUsesSupabase(profile = {}) {
  const values = [
    ...(profile.databases || []).map((item) => `${item.code || ""} ${item.label || ""}`),
    ...(profile.environmentVariables?.required || []),
    ...(profile.signals || [])
  ].join(" ").toLowerCase();
  return values.includes("supabase");
}

function createRuntimeEnvFailureDiagnosis(inspection, missing = []) {
  const assessment = inspection.projectAssessment || {};
  return {
    category: "runtime_env",
    severity: "warning",
    title: "运行时环境变量缺失",
    summary: "项目需要运行时环境变量，但未在项目中找到对应的配置",
    evidence: missing.length ? ["缺少环境变量: " + missing.join(", ")] : [],
    userActions: [
      "请在项目中添加环境变量配置",
      "参考 .env.example 文件补充所需的环境变量",
      "确保 .env 文件包含正确的变量值"
    ],
    aiPrompt: "请补充以下环境变量: " + (missing.length ? missing.join(", ") : "?") + "。在项目根目录创建或更新 .env.example 文件",
    createdAt: new Date().toISOString()
  };
}

export function isSupportedSingleServiceSsr(inspection = {}) {
  const profile = inspection.projectProfile || {};
  const frameworks = [
    profile.framework,
    ...(profile.frontendFrameworks || []).map((item) => item.code)
  ].filter(Boolean).map((item) => String(item).toLowerCase());
  return Boolean(
    inspection.hasSsr &&
    profile.type === "fullstack_framework" &&
    frameworks.some((item) => ["next", "nuxt", "tanstack_start"].includes(item))
  );
}

export async function startNodeRuntime({ slug, projectDir, inspection, config, env = {} }) {
  const runtimeConfig = createRuntimeConfig({ ...config, env });
  const eligibility = canStartNodeRuntime(inspection, runtimeConfig);
  if (!eligibility.ok) {
    if (eligibility.configRequired) {
      return {
        status: "config_required",
        statusLabel: "需要配置环境变量",
        failureDiagnosis: createRuntimeEnvFailureDiagnosis(inspection, eligibility.missing || [])
      };
    }
    throw createRuntimeError(eligibility.reason);
  }
  await stopRuntime(slug);
  const existingCount = Array.from(runtimeProcesses.values()).filter((item) => item.status === "running").length;
  if (existingCount >= runtimeConfig.maxInstances) {
    throw createRuntimeError(`当前运行实例已达到上限 ${runtimeConfig.maxInstances} 个，请稍后再试。`);
  }
  const driver = runtimeConfig.driver === "host" ? "host" : "docker";
  const record = driver === "host"
    ? await startHostRuntime({ slug, projectDir, inspection, runtimeConfig, runtimeEnv: env })
    : await startDockerRuntime({ slug, projectDir, inspection, runtimeConfig, runtimeEnv: env });
  runtimeProcesses.set(slug, record); saveRuntimeState().catch(() => {});
  return await publicRuntimeRecord(record, runtimeConfig);
}

export async function stopRuntime(slug) {
  const record = runtimeProcesses.get(slug);
  if (!record) return null;
  runtimeProcesses.delete(slug); saveRuntimeState().catch(() => {});
  if (record.driver === "host" && record.process && !record.process.killed) {
    await stopHostProcessTree(record.process);
  }
  if (record.driver === "docker" && record.containerName) {
    try {
      await execDocker(["rm", "-f", record.containerName], { timeoutMs: 15000 });
    } catch {
      // Container may have already stopped.
    }
  }
  return { ...record, status: "stopped", stoppedAt: new Date().toISOString() };
}

export async function stopExpiredRuntimes() {
  const now = Date.now();
  for (const [slug, record] of runtimeProcesses.entries()) {
    if (record.expiresAt && new Date(record.expiresAt).getTime() <= now) {
      await stopRuntime(slug);
    }
  }
}

export function findRuntime(slug) {
  return runtimeProcesses.get(slug) || null;
}

export async function listRuntimeRecords(config = {}) {
  const runtimeConfig = createRuntimeConfig(config);
  const records = Array.from(runtimeProcesses.values());
  return Promise.all(records.map((record) => publicRuntimeRecord(record, runtimeConfig)));
}

export function proxyRuntimeRequest(req, res, runtime) {
  const targetPort = runtime?.port;
  if (!targetPort) {
    res.status(502).send("DemoGo runtime is not ready.");
    return;
  }
  const prefix = `/d/${runtime.slug}`;
  let targetPath = req.originalUrl.startsWith(prefix)
    ? req.originalUrl.slice(prefix.length)
    : req.url;
  if (!targetPath || targetPath[0] !== "/") targetPath = `/${targetPath || ""}`;

  const proxyReq = http.request({
    hostname: "127.0.0.1",
    port: targetPort,
    method: req.method,
    path: targetPath,
    headers: {
      ...req.headers,
      host: `127.0.0.1:${targetPort}`,
      "x-demogo-slug": runtime.slug,
      "x-forwarded-prefix": prefix
    }
  }, (proxyRes) => {
    res.statusCode = proxyRes.statusCode || 502;
    for (const [key, value] of Object.entries(proxyRes.headers)) {
      if (value !== undefined) res.setHeader(key, value);
    }
    proxyRes.pipe(res);
  });
  proxyReq.on("error", () => {
    res.status(502).send("DemoGo runtime is unavailable.");
  });
  req.pipe(proxyReq);
}

export async function prepareRuntimeProject({ archiveEntries, targetDir, maxFiles, maxBytes, writeEntry }) {
  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });
  let extractedBytes = 0;
  let fileCount = 0;
  for (const item of archiveEntries || []) {
    const relativePath = item.relativePath;
    if (!relativePath || relativePath.endsWith("/")) continue;
    extractedBytes += Number(item.bytes || item.entry?.uncompressedSize || 0);
    if (fileCount + 1 > maxFiles) throw createRuntimeError(`项目文件过多，当前最多支持 ${maxFiles} 个文件。`);
    if (extractedBytes > maxBytes) throw createRuntimeError(`项目包体积过大，当前最多支持 ${formatBytes(maxBytes)}。`);
    const destination = path.resolve(targetDir, relativePath);
    const targetRoot = path.resolve(targetDir);
    if (!destination.startsWith(`${targetRoot}${path.sep}`)) {
      throw createRuntimeError("压缩包包含不安全路径。");
    }
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await writeEntry(item, destination);
    fileCount += 1;
  }
  return { fileCount, extractedBytes };
}

async function startHostRuntime({ slug, projectDir, inspection, runtimeConfig, runtimeEnv = {} }) {
  const port = await allocateHostPort();
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const runtimeCommand = selectRuntimeCommand(inspection);
  const installArgs = await selectNpmInstallArgs(projectDir, runtimeCommand);
  const logs = [await runCommand(npmCommand, installArgs, projectDir, runtimeConfig.startTimeoutSeconds * 1000)];
  if (runtimeCommand.buildBeforeStart) {
    logs.push(await runCommand(npmCommand, ["run", "build"], projectDir, runtimeConfig.startTimeoutSeconds * 1000));
  }
  const child = spawn(npmCommand, runtimeCommand.args, {
    cwd: projectDir,
    shell: process.platform === "win32",
    env: {
      ...process.env,
      ...sanitizeRuntimeEnv(runtimeEnv),
      NODE_ENV: "production",
      PORT: String(port)
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  attachRuntimeLogs(child, logs);
  const now = new Date();
  const record = {
    id: `host-${slug}-${Date.now()}`,
    slug,
    driver: "host",
    process: child,
    pid: child.pid,
    port,
    status: "running",
    statusLabel: "运行中",
    startCommand: runtimeCommand.label,
    logs,
    startedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + runtimeConfig.ttlMinutes * 60 * 1000).toISOString()
  };
  try {
    await waitForRuntimeReady(child, port, runtimeConfig.startTimeoutSeconds * 1000, logs);
  } catch (error) {
    await stopHostProcessTree(child);
    throw error;
  }
  return record;
}

async function startDockerRuntime({ slug, projectDir, inspection, runtimeConfig, runtimeEnv = {} }) {
  await ensureDockerAvailable();
  const containerName = `demogo-${slug}`;
  const port = await allocateHostPort();
  const runtimeCommand = selectRuntimeCommand(inspection);
  const installCommand = await selectNpmInstallShell(projectDir, runtimeCommand);
  const buildCommand = runtimeCommand.buildBeforeStart ? "npm run build && " : "";
  const script = `${installCommand} && ${buildCommand}${runtimeCommand.shell}`;
  await execDocker(["rm", "-f", containerName], { timeoutMs: 15000 }).catch(() => "");
  const runtimeEnvArgs = Object.entries({
    ...sanitizeRuntimeEnv(runtimeEnv),
    NODE_ENV: "production",
    PORT: "3000"
  }).flatMap(([key, value]) => ["-e", `${key}=${value}`]);
  const args = [
    "run",
    "-d",
    "--name",
    containerName,
    "--network=bridge",
    "--memory",
    runtimeConfig.memory,
    "--cpus",
    runtimeConfig.cpus,
    ...runtimeEnvArgs,
    "-p",
    `127.0.0.1:${port}:3000`,
    "-v",
    `${path.resolve(projectDir)}:/workspace`,
    "-w",
    "/workspace",
    runtimeConfig.dockerImage,
    "sh",
    "-lc",
    script
  ];
  const containerId = (await execDocker(args, { timeoutMs: 30000 })).trim();
  const now = new Date();
  const record = {
    id: containerId || containerName,
    slug,
    driver: "docker",
    containerName,
    containerId,
    port,
    status: "running",
    statusLabel: "运行中",
    startCommand: runtimeCommand.label,
    logs: [`[docker runtime] image=${runtimeConfig.dockerImage} memory=${runtimeConfig.memory} cpus=${runtimeConfig.cpus}`],
    startedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + runtimeConfig.ttlMinutes * 60 * 1000).toISOString()
  };
  try {
    await waitForDockerRuntimeReady(record, runtimeConfig.startTimeoutSeconds * 1000);
    await refreshDockerLogs(record);
  } catch (error) {
    await refreshDockerLogs(record);
    await execDocker(["rm", "-f", containerName], { timeoutMs: 15000 }).catch(() => "");
    const output = formatRuntimeLogs(record.logs, 3000);
    throw createRuntimeError(`${error.message}${output ? `\n\n运行日志摘要：\n${output}` : ""}`);
  }
  return record;
}

function selectRuntimeCommand(inspection = {}) {
  const runtime = inspection.runtime || {};
  const scripts = runtime.scripts || {};
  const framework = String(runtime.framework || inspection.projectProfile?.framework || "").toLowerCase();
  if (scripts["start:prod"]) {
    return {
      args: ["run", "start:prod"],
      shell: "npm run start:prod",
      label: "npm run start:prod",
      buildBeforeStart: false
    };
  }
  if (framework === "nuxt" && !scripts.start && runtime.startCommand) {
    return {
      args: ["start"],
      shell: "npm start",
      label: "npm start",
      buildBeforeStart: Boolean(runtime.buildBeforeStart)
    };
  }
  return {
    args: ["start"],
    shell: "npm start",
    label: runtime.startCommand ? `npm start (${runtime.startCommand})` : "npm start",
    buildBeforeStart: Boolean(runtime.buildBeforeStart)
  };
}

async function selectNpmInstallArgs(projectDir, runtimeCommand) {
  const hasLock = await exists(path.join(projectDir, "package-lock.json"));
  if (runtimeCommand.buildBeforeStart) return hasLock ? ["ci"] : ["install"];
  return hasLock ? ["ci", "--omit=dev"] : ["install", "--omit=dev"];
}

async function selectNpmInstallShell(projectDir, runtimeCommand) {
  const args = await selectNpmInstallArgs(projectDir, runtimeCommand);
  return `npm ${args.join(" ")}`;
}

function sanitizeRuntimeEnv(env = {}) {
  const result = {};
  for (const [key, value] of Object.entries(env || {})) {
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) continue;
    result[key] = String(value ?? "");
  }
  return result;
}

async function publicRuntimeRecord(record, runtimeConfig) {
  if (record?.driver === "docker") {
    await refreshDockerLogs(record).catch(() => null);
  }
  const logs = formatRuntimeLogs(record.logs, 4000);
  return {
    instanceId: record.id,
    slug: record.slug,
    driver: record.driver,
    containerId: record.containerId || "",
    containerName: record.containerName || "",
    pid: record.pid || null,
    port: record.port,
    status: record.status,
    statusLabel: record.statusLabel,
    startCommand: record.startCommand,
    logs,
    logSummary: summarizeRuntimeLogs(logs),
    lifecycle: {
      stage: "running",
      stageLabel: "运行中",
      startedAt: record.startedAt,
      expiresAt: record.expiresAt,
      stoppedAt: null
    },
    limits: {
      memory: runtimeConfig.memory,
      cpus: runtimeConfig.cpus,
      ttlMinutes: runtimeConfig.ttlMinutes,
      startTimeoutSeconds: runtimeConfig.startTimeoutSeconds,
      maxInstances: runtimeConfig.maxInstances
    }
  };
}

async function refreshDockerLogs(record) {
  if (!record?.containerName) return;
  const output = await execDocker(["logs", "--tail", "80", record.containerName], { timeoutMs: 10000 });
  record.logs = [
    `[docker runtime] container=${record.containerName} port=${record.port}`,
    output
  ].filter(Boolean);
  trimLogs(record.logs);
}

function formatRuntimeLogs(logs = [], maxLength = 4000) {
  return (logs || [])
    .join("\n")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .join("\n")
    .slice(-maxLength);
}

function summarizeRuntimeLogs(logs = "") {
  const lines = String(logs || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.slice(-8).join("\n");
}

function attachRuntimeLogs(child, logs) {
  child.stdout?.on("data", (chunk) => {
    logs.push(chunk.toString("utf8"));
    trimLogs(logs);
  });
  child.stderr?.on("data", (chunk) => {
    logs.push(chunk.toString("utf8"));
    trimLogs(logs);
  });
  child.on("exit", (code, signal) => {
    logs.push(`[runtime exit] code=${code ?? ""} signal=${signal || ""}`);
    trimLogs(logs);
  });
}

function trimLogs(logs) {
  while (logs.join("\n").length > 8000 && logs.length > 1) {
    logs.shift();
  }
}

async function allocateHostPort() {
  for (let count = 0; count < 200; count += 1) {
    const candidate = nextHostPort;
    nextHostPort += 1;
    if (nextHostPort > 43999) nextHostPort = 43100;
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw createRuntimeError("没有可用的运行端口，请稍后再试。");
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function waitForRuntimePort(port, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await canConnectToPort(port)) return;
    await sleep(300);
  }
  throw createRuntimeError("运行环境启动超时。请确认项目会监听 process.env.PORT。");
}

async function waitForDockerRuntimeReady(record, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const state = await inspectDockerContainerState(record.containerName).catch(() => null);
    if (state && !state.running) {
      await refreshDockerLogs(record).catch(() => null);
      const output = formatRuntimeLogs(record.logs, 3000);
      throw createRuntimeError(`运行环境启动失败。请检查依赖安装、start 命令和 PORT 监听。${output ? `\n${output}` : ""}`);
    }
    if (await canGetHttpResponse(record.port)) return;
    await sleep(500);
  }
  await refreshDockerLogs(record).catch(() => null);
  const output = formatRuntimeLogs(record.logs, 3000);
  throw createRuntimeError(`运行环境启动超时。请确认项目会监听 process.env.PORT。${output ? `\n${output}` : ""}`);
}

async function waitForRuntimeReady(child, port, timeoutMs, logs = []) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await canGetHttpResponse(port)) return;
    if (child.exitCode !== null || child.signalCode) {
      const output = logs.join("\n").slice(-3000);
      throw createRuntimeError(`运行环境启动失败。请检查 start 命令和 PORT 监听。${output ? `\n${output}` : ""}`);
    }
    await sleep(300);
  }
  const output = logs.join("\n").slice(-3000);
  throw createRuntimeError(`运行环境启动超时。请确认项目会监听 process.env.PORT。${output ? `\n${output}` : ""}`);
}

function canConnectToPort(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 500);
    socket.once("connect", () => {
      clearTimeout(timer);
      socket.end();
      resolve(true);
    });
    socket.once("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

function canGetHttpResponse(port) {
  return new Promise((resolve) => {
    const request = http.request({
      hostname: "127.0.0.1",
      port,
      method: "GET",
      path: "/",
      timeout: 800
    }, (response) => {
      response.resume();
      response.on("end", () => resolve(true));
      response.on("error", () => resolve(true));
    });
    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => resolve(false));
    request.end();
  });
}

async function ensureDockerAvailable() {
  try {
    await execDocker(["version", "--format", "{{.Server.Version}}"], { timeoutMs: 10000 });
  } catch {
    throw createRuntimeError("服务器未检测到可用 Docker，Node.js 运行器无法启动。");
  }
}

function execDocker(args, options = {}) {
  return runCommand("docker", args, process.cwd(), options.timeoutMs || 30000);
}

async function inspectDockerContainerState(containerName) {
  const output = await execDocker(["inspect", "--format", "{{.State.Running}} {{.State.ExitCode}} {{.State.Error}}", containerName], { timeoutMs: 10000 });
  const [running, exitCode, ...errorParts] = output.trim().split(/\s+/);
  return {
    running: running === "true",
    exitCode: Number(exitCode || 0),
    error: errorParts.join(" ")
  };
}

function runCommand(command, args, cwd, timeoutMs) {
  return new Promise((resolve, reject) => {
    execFile(command, args, {
      cwd,
      shell: process.platform === "win32",
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024 * 2
    }, (error, stdout, stderr) => {
      const output = [stdout, stderr].filter(Boolean).join("\n");
      if (error) {
        const commandError = createRuntimeError(`${command} ${args.join(" ")} 执行失败：${error.message}${output ? `\n${output}` : ""}`);
        commandError.code = error.code;
        commandError.signal = error.signal;
        commandError.killed = error.killed;
        reject(commandError);
        return;
      }
      resolve(output);
    });
  });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForProcessExit(child, timeoutMs) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null || child.signalCode) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function stopHostProcessTree(child) {
  if (!child || child.exitCode !== null || child.signalCode) return;
  const exited = waitForProcessExit(child, 5000);
  if (process.platform === "win32") {
    await runCommand("taskkill", ["/pid", String(child.pid), "/T", "/F"], process.cwd(), 5000).catch(() => null);
  } else {
    child.kill("SIGTERM");
  }
  await exited.catch(() => null);
}

function createRuntimeError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)}${units[index]}`;
}
