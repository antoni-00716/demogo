// DemoGo v0.9.3 - 归档分析器（从 server.js 提取）
// 负责：ZIP/TAR 解包、路径安全分类、条目检测、表单字段提取

import crypto from "node:crypto";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import * as tar from "tar";
import unzipper from "unzipper";
import { uploadDir, maxZipSizeMb } from "../config.js";
import { blockedExactNames, ignoredPathParts, ignoredExactNames, ignoredExtensions, archiveIgnoredPathParts, blockedExtensions } from "./security-rules.js";
import { cleanProjectName, stripHtml } from "./project-utils.js";
export { stripHtml, cleanProjectName } from "./project-utils.js";
import { readZipEntryText, readArchiveEntryText } from "./archive-utils.js";
import { isCollectableFormField, isNonCollectableControl, filterAutoHostableFormFields } from "./form-field-utils.js";
import { exists } from "./utils.js";

// Re-export for backward compat (deployment-pipeline-service.js imports from here)
export { readZipEntryText, readArchiveEntryText } from "./archive-utils.js";
export { isCollectableFormField, isNonCollectableControl } from "./form-field-utils.js";

export async function promoteSingleHtmlEntry(targetDir, entryFile) {
  if (!entryFile || entryFile === "index.html" || entryFile.includes("/")) return false;
  const source = path.join(targetDir, entryFile);
  const destination = path.join(targetDir, "index.html");
  if (!await exists(source) || await exists(destination)) return false;
  await fs.copyFile(source, destination);
  return true;
}

export function isSupportedArchiveName(fileName) {
  const lower = String(fileName || "").toLowerCase();
  return lower.endsWith(".zip") || lower.endsWith(".tar.gz") || lower.endsWith(".tgz");
}

export function detectArchiveType(fileName) {
  const lower = String(fileName || "").toLowerCase();
  if (lower.endsWith(".tar.gz") || lower.endsWith(".tgz")) return "tar.gz";
  return "zip";
}

export function looksLikeAssetRequest(requestPath) {
  const lastPart = String(requestPath || "").split("/").pop() || "";
  return /\.[a-z0-9]{1,12}$/i.test(lastPart);
}

export function stripArchiveExtension(fileName) {
  return String(fileName || "")
    .replace(/\.html?$/i, "")
    .replace(/\.tar\.gz$/i, "")
    .replace(/\.tgz$/i, "")
    .replace(/\.zip$/i, "");
}

export async function analyzeArchiveEntries(archivePath, fileName = "", options = {}) {
  const archiveType = detectArchiveType(fileName || archivePath);
  return archiveType === "tar.gz"
    ? analyzeTarEntries(archivePath, options)
    : analyzeZipEntries(archivePath);
}

export async function cleanupArchiveAnalysis(analysis) {
  if (analysis?.archiveType === "tar.gz" && analysis.tempDir) {
    await fs.rm(analysis.tempDir, { recursive: true, force: true });
  }
}

export async function writeArchiveEntry(item, destination) {
  if (item.archiveType === "tar.gz") {
    await fs.copyFile(item.tempPath, destination);
    return;
  }
  await new Promise((resolve, reject) => {
    item.entry
      .stream()
      .pipe(createWriteStream(destination))
      .on("finish", resolve)
      .on("error", reject);
  });
}

export function normalizeZipPath(zipEntryPath) {
  return zipEntryPath.replace(/\\/g, "/").replace(/^\/+/, "");
}

export function findCommonRoot(paths) {
  const firstParts = paths[0]?.split("/") || [];
  if (firstParts.length <= 1) return "";
  const root = firstParts[0];
  return paths.every((item) => item.startsWith(`${root}/`)) ? root : "";
}

export function stripCommonRoot(entryPath, commonRoot) {
  if (!commonRoot) return entryPath;
  return entryPath === commonRoot ? "" : entryPath.slice(commonRoot.length + 1);
}

export function emptyArchiveAnalysis(archiveType = "zip") {
  return {
    archiveType,
    rawFileCount: 0,
    rawBytes: 0,
    publishableEntries: [],
    publishableFileCount: 0,
    publishableBytes: 0,
    ignoredFiles: [],
    blockedFiles: [],
    rootEntries: [],
    commonRoot: "",
    paths: [],
    entryFile: null,
    projectTitle: "",
    pageHeading: "",
    hasPackageJson: false,
    hasBuildScript: false,
    formFields: [],
    apiCalls: []
  };
}

export async function analyzeZipEntries(zipPath) {
  let directory;
  try {
    directory = await unzipper.Open.file(zipPath);
  } catch (error) {
    throw createProjectError(createInvalidZipInspection(error), "压缩包不完整或格式异常，DemoGo 无法读取项目文件。");
  }
  const rawFiles = directory.files.filter((entry) => entry.type === "File");

  if (rawFiles.length === 0) {
    return {
      ...emptyArchiveAnalysis("zip")
    };
  }

  const unsafeEntry = rawFiles.find((entry) => !isSafeArchivePath(entry.path));
  if (unsafeEntry) {
    const inspection = createInvalidArchiveInspection("ZIP", `压缩包包含不安全条目：${unsafeEntry.path}`);
    throw createProjectError(inspection, "压缩包包含不安全路径，DemoGo 已拒绝处理。");
  }

  const normalizedPaths = rawFiles.map((entry) => normalizeZipPath(entry.path));
  const commonRoot = findCommonRoot(normalizedPaths);
  const publishableEntries = [];
  const ignoredFiles = [];
  const blockedFiles = [];
  const textEntries = [];
  let packageJsonInfo = { hasPackageJson: false, hasBuildScript: false };
  let rawBytes = 0;
  let publishableBytes = 0;

  for (const entry of rawFiles) {
    const normalized = normalizeZipPath(entry.path);
    const relativePath = stripCommonRoot(normalized, commonRoot);
    const bytes = Number(entry.uncompressedSize || 0);
    rawBytes += bytes;

    if (!relativePath || relativePath.endsWith("/")) {
      continue;
    }

    const pathIssue = classifyEntryPath(relativePath);
    if (pathIssue.action === "block") {
      blockedFiles.push({ path: relativePath, reason: pathIssue.reason });
      continue;
    }
    if (pathIssue.action === "ignore") {
      ignoredFiles.push({ path: relativePath, reason: pathIssue.reason });
      continue;
    }

    publishableEntries.push({ archiveType: "zip", entry, relativePath, bytes });
    publishableBytes += bytes;
    if (shouldAnalyzeTextFile(relativePath, bytes)) {
      textEntries.push({ archiveType: "zip", entry, relativePath, bytes });
    }
  }

  const paths = publishableEntries.map((item) => item.relativePath);
  const textAnalysis = await analyzeTextEntries(textEntries);
  const envHints = await analyzeEnvironmentVariableHints(publishableEntries);  if (paths.includes("package.json")) {
    packageJsonInfo = await analyzePackageJson(publishableEntries.find((item) => item.relativePath === "package.json"));
  }
  return {
    rawFileCount: rawFiles.length,
    archiveType: "zip",
    rawBytes,
    publishableEntries,
    publishableFileCount: publishableEntries.length,
    publishableBytes,
    ignoredFiles: summarizePathIssues(ignoredFiles),
    blockedFiles: summarizePathIssues(blockedFiles),
    rootEntries: summarizeRootEntries(paths),
    commonRoot,
    paths,
    entryFile: detectEntryFile(paths),
    hasPackageJson: packageJsonInfo.hasPackageJson,
    hasBuildScript: packageJsonInfo.hasBuildScript,
    packageScripts: packageJsonInfo.scripts,
    packageDependencies: packageJsonInfo.dependencies,
    envHints,
    projectTitle: textAnalysis.projectTitle,
    pageHeading: textAnalysis.pageHeading,
    formFields: textAnalysis.formFields,
    apiCalls: textAnalysis.apiCalls
  };
}

export async function analyzeTarEntries(tarPath, options = {}) {
  const tempDir = path.join(uploadDir, `tar-scan-${crypto.randomBytes(5).toString("hex")}`);
  let keepTempDir = false;
  await fs.mkdir(tempDir, { recursive: true });
  try {
    const entries = [];
    await tar.t({
      file: tarPath,
      gzip: true,
      onentry(entry) {
        entries.push({
          path: entry.path,
          type: entry.type,
          size: Number(entry.size || 0)
        });
      }
    });

    const unsafeEntry = entries.find((entry) => !isSafeArchivePath(entry.path) || isUnsafeTarEntryType(entry.type));
    if (unsafeEntry) {
      const inspection = createInvalidArchiveInspection("tar.gz", `压缩包包含不安全条目：${unsafeEntry.path}`);
      throw createProjectError(inspection, "压缩包包含不安全路径、链接或特殊文件，DemoGo 已拒绝处理。");
    }

    await tar.x({
      file: tarPath,
      cwd: tempDir,
      gzip: true,
      preservePaths: false,
      strict: true,
      filter: (entryPath, entry) => isSafeArchivePath(entryPath) && !isUnsafeTarEntryType(entry.type)
    });

    const rawFiles = [];
    await collectExtractedFiles(tempDir, tempDir, rawFiles);
    if (!rawFiles.length) return emptyArchiveAnalysis("tar.gz");

    const normalizedPaths = rawFiles.map((entry) => normalizeArchivePath(entry.relativePath));
    const commonRoot = findCommonRoot(normalizedPaths);
    const publishableEntries = [];
    const ignoredFiles = [];
    const blockedFiles = [];
    const textEntries = [];
    let packageJsonInfo = { hasPackageJson: false, hasBuildScript: false };
    let rawBytes = 0;
    let publishableBytes = 0;

    for (const entry of rawFiles) {
      const normalized = normalizeArchivePath(entry.relativePath);
      const relativePath = stripCommonRoot(normalized, commonRoot);
      const bytes = Number(entry.bytes || 0);
      rawBytes += bytes;

      if (!relativePath || relativePath.endsWith("/")) continue;

      const pathIssue = classifyEntryPath(relativePath);
      if (pathIssue.action === "block") {
        blockedFiles.push({ path: relativePath, reason: pathIssue.reason });
        continue;
      }
      if (pathIssue.action === "ignore") {
        ignoredFiles.push({ path: relativePath, reason: pathIssue.reason });
        continue;
      }

      publishableEntries.push({ archiveType: "tar.gz", tempPath: entry.fullPath, relativePath, bytes });
      publishableBytes += bytes;
      if (shouldAnalyzeTextFile(relativePath, bytes)) {
        textEntries.push({ archiveType: "tar.gz", tempPath: entry.fullPath, relativePath, bytes });
      }
    }

    const paths = publishableEntries.map((item) => item.relativePath);
    const textAnalysis = await analyzeTextEntries(textEntries);
    const envHints = await analyzeEnvironmentVariableHints(publishableEntries);    if (paths.includes("package.json")) {
      packageJsonInfo = await analyzePackageJson(publishableEntries.find((item) => item.relativePath === "package.json"));
    }

    keepTempDir = Boolean(options.keepTempFiles);
    return {
      rawFileCount: rawFiles.length,
      archiveType: "tar.gz",
      rawBytes,
      publishableEntries,
      publishableFileCount: publishableEntries.length,
      publishableBytes,
      ignoredFiles: summarizePathIssues(ignoredFiles),
      blockedFiles: summarizePathIssues(blockedFiles),
      rootEntries: summarizeRootEntries(paths),
      commonRoot,
      paths,
      entryFile: detectEntryFile(paths),
      hasPackageJson: packageJsonInfo.hasPackageJson,
      hasBuildScript: packageJsonInfo.hasBuildScript,
      packageScripts: packageJsonInfo.scripts,
      packageDependencies: packageJsonInfo.dependencies,
      envHints,
      projectTitle: textAnalysis.projectTitle,
      pageHeading: textAnalysis.pageHeading,
      formFields: textAnalysis.formFields,
      apiCalls: textAnalysis.apiCalls,
      tempDir: options.keepTempFiles ? tempDir : null
    };
  } catch (error) {
    if (error.statusCode) throw error;
    throw createProjectError(createInvalidArchiveInspection("tar.gz", error.message), "压缩包不完整或格式异常，DemoGo 无法读取项目文件。");
  } finally {
    if (!keepTempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
}

export async function collectExtractedFiles(rootDir, currentDir, result) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, "/");
    if (entry.isSymbolicLink()) {
      result.push({ fullPath, relativePath, bytes: 0, unsafe: true });
      continue;
    }
    if (entry.isDirectory()) {
      await collectExtractedFiles(rootDir, fullPath, result);
      continue;
    }
    if (!entry.isFile()) continue;
    const stat = await fs.stat(fullPath);
    result.push({ fullPath, relativePath, bytes: stat.size });
  }
}

export function normalizeArchivePath(entryPath) {
  return String(entryPath || "").replace(/\\/g, "/").replace(/^\/+/, "").replace(/^\.\//, "");
}

export function isSafeArchivePath(entryPath) {
  const normalized = String(entryPath || "").replace(/\\/g, "/");
  if (!normalized || normalized.startsWith("/") || /^[a-zA-Z]:\//.test(normalized)) return false;
  return !normalized.split("/").some((part) => part === "..");
}

export function isUnsafeTarEntryType(type) {
  return ["SymbolicLink", "Link", "CharacterDevice", "BlockDevice", "FIFO"].includes(String(type || ""));
}

export function classifyEntryPath(relativePath) {
  const parts = relativePath.split("/").filter(Boolean);

  if (parts.some((part) => part === "..")) {
    return { action: "block", reason: "包含不安全路径" };
  }

  for (const part of parts) {
    const lower = part.toLowerCase();
    const ext = path.extname(lower);
    if (isAllowedEnvTemplateName(lower)) {
      continue;
    }

    if (ignoredPathParts.has(lower) || ignoredExactNames.has(part) || ignoredExactNames.has(lower) || ignoredExtensions.has(ext)) {
      return { action: "ignore", reason: "本地依赖、缓存或日志文件，已自动忽略" };
    }

    if (blockedExactNames.has(lower) || blockedExtensions.has(ext)) {
      return { action: "block", reason: "包含敏感或不支持发布的文件" };
    }
  }

  return { action: "publish" };
}

export function isAllowedEnvTemplateName(name) {
  return name === ".env.example" ||
    name === ".env.template" ||
    name === ".env.local.example" ||
    name.endsWith(".env.example") ||
    name.endsWith(".env.template");
}

export function summarizePathIssues(items, limit = 8) {
  return items.slice(0, limit).map((item) => item.path);
}

export function summarizeRootEntries(paths) {
  const entries = new Set();
  for (const entryPath of paths) {
    const [first] = entryPath.split("/");
    if (first) entries.add(first);
  }
  return Array.from(entries).slice(0, 12);
}

export function detectEntryFile(paths) {
  if (paths.includes("index.html")) return "index.html";
  if (paths.includes("dist/index.html")) return "dist/index.html";
  if (paths.includes("build/index.html")) return "build/index.html";
  if (paths.includes("out/index.html")) return "out/index.html";
  if (paths.includes("public/index.html")) return "public/index.html";
  return detectSingleHtmlEntry(paths);
}

export function detectSingleHtmlEntry(paths) {
  const rootHtmlFiles = (paths || []).filter((entryPath) => (
    /^[^/]+\.html?$/i.test(String(entryPath || "")) &&
    !/^admin\.html$/i.test(entryPath) &&
    !/^login\.html$/i.test(entryPath)
  ));
  if (rootHtmlFiles.length === 1) return rootHtmlFiles[0];
  return null;
}

export function hasSourceProjectIndicators(paths) {
  return paths.some((entryPath) => {
    const lower = String(entryPath || "").replace(/\\/g, "/").toLowerCase();
    return [
      "vite.config.js",
      "vite.config.ts",
      "vite.config.mjs",
      "webpack.config.js",
      "webpack.config.ts",
      "webpack.config.mjs",
      "rollup.config.js",
      "rollup.config.ts",
      "next.config.js",
      "next.config.mjs",
      "nuxt.config.js",
      "nuxt.config.ts",
      "svelte.config.js"
    ].includes(lower) || /^src\/(main|index|app)\.(js|jsx|ts|tsx|vue|svelte)$/.test(lower);
  });
}

export function hasBackendIndicators(paths, packageScripts = {}) {
  const normalized = paths.map((entryPath) => String(entryPath || "").replace(/\\/g, "/").toLowerCase());
  if (normalized.some((entryPath) => [
    "server.js",
    "app.js",
    "src/server.js",
    "src/app.js",
    "main.py",
    "app.py",
    "requirements.txt",
    "manage.py"
  ].includes(entryPath))) return true;
  const startScript = String(packageScripts.start || "").toLowerCase();
  return /\b(node|nodemon|tsx|ts-node|nest)\b/.test(startScript) && !/\b(vite|webpack|parcel|react-scripts)\b/.test(startScript);
}

export function hasNodeRuntimeDependency(analysis = {}) {
  const dependencies = Object.keys(analysis.packageDependencies || {}).map((name) => name.toLowerCase());
  return dependencies.some((name) => ["express", "koa", "fastify", "hono", "@nestjs/core"].includes(name));
}

export function hasSsrIndicators(paths) {
  const normalized = paths.map((entryPath) => String(entryPath || "").replace(/\\/g, "/").toLowerCase());
  const hasSsrConfig = normalized.some((entryPath) => [
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "nuxt.config.js",
    "nuxt.config.ts",
    "remix.config.js",
    "remix.config.ts",
    "svelte.config.js",
    "svelte.config.ts",
    "astro.config.js",
    "astro.config.mjs",
    "astro.config.ts",
    "vinxi.config.js",
    "vinxi.config.ts",
    "app.config.ts"
  ].includes(entryPath));
  if (!hasSsrConfig) return false;
  return !(normalized.includes("out/index.html") || normalized.includes("dist/index.html") || normalized.includes("build/index.html"));
}

export function shouldAnalyzeTextFile(relativePath, bytes) {
  if (bytes > 256 * 1024) return false;
  const lower = relativePath.toLowerCase();
  return [".html", ".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte"].some((ext) => lower.endsWith(ext));
}

export async function analyzeTextEntries(entries) {
  const formFields = new Map();
  const apiCalls = new Map();
  const pageTitles = [];
  const pageHeadings = [];

  for (const item of entries.slice(0, 80)) {
    const content = await readArchiveEntryText(item);
    const title = extractHtmlTitle(content);
    const heading = extractHtmlHeading(content);
    if (title) pageTitles.push({ value: title, sourceFile: item.relativePath });
    if (heading) pageHeadings.push({ value: heading, sourceFile: item.relativePath });
    for (const field of extractFormFields(content, item.relativePath)) {
      const key = `${field.name || field.label}`;
      if (!formFields.has(key)) formFields.set(key, field);
    }
    for (const apiCall of extractApiCalls(content, item.relativePath)) {
      const key = `${apiCall.method}:${apiCall.url}`;
      if (!apiCalls.has(key)) apiCalls.set(key, apiCall);
    }
  }

  return {
    formFields: Array.from(formFields.values()).slice(0, 20),
    apiCalls: Array.from(apiCalls.values()).slice(0, 20),
    projectTitle: pickTextSignal(pageTitles),
    pageHeading: pickTextSignal(pageHeadings)
  };
}

export function pickTextSignal(items) {
  const preferred = items.find((item) => ["index.html", "dist/index.html", "build/index.html", "out/index.html", "public/index.html"].includes(item.sourceFile));
  return cleanProjectName(preferred?.value || items[0]?.value || "");
}

export function extractHtmlTitle(content) {
  const match = String(content || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return cleanProjectName(stripHtml(match?.[1] || ""));
}

export function extractHtmlHeading(content) {
  const match = String(content || "").match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return cleanProjectName(stripHtml(match?.[1] || ""));
}

export async function analyzePackageJson(entry) {
  if (!entry) return { hasPackageJson: false, hasBuildScript: false, scripts: {}, dependencies: {} };
  try {
    const content = await readArchiveEntryText(entry);
    const packageJson = JSON.parse(content.replace(/^\uFEFF/, ""));
    return {
      hasPackageJson: true,
      hasBuildScript: Boolean(packageJson.scripts?.build),
      scripts: packageJson.scripts || {},
      dependencies: {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {})
      }
    };
  } catch {
    return { hasPackageJson: true, hasBuildScript: false, scripts: {}, dependencies: {} };
  }
}

export async function analyzeEnvironmentVariableHints(entries = []) {
  const names = new Set();
  const envEntries = entries.filter((item) => {
    const file = String(item.relativePath || "").toLowerCase();
    return file === ".env.example" ||
      file === ".env.template" ||
      file === ".env.local.example" ||
      file.endsWith("/.env.example") ||
      file.endsWith("/.env.template") ||
      file.endsWith("/.env.local.example");
  }).slice(0, 5);
  for (const entry of envEntries) {
    const content = await readArchiveEntryText(entry);
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z][A-Z0-9_]{2,})\s*=/);
      if (match) names.add(match[1]);
    }
  }
  return Array.from(names).slice(0, 40);
}

export function extractFormFields(content, sourceFile) {
  const fields = [];
  const inputPattern = /<(input|textarea|select)\b([^>]*)>/gi;
  let match;
  while ((match = inputPattern.exec(content))) {
    const tag = match[1].toLowerCase();
    const attrs = parseHtmlAttributes(match[2] || "");
    const type = attrs.type || (tag === "textarea" ? "textarea" : tag === "select" ? "select" : "text");
    if (["hidden", "submit", "button", "reset", "file", "image"].includes(type.toLowerCase())) continue;
    const name = attrs.name || attrs.id || attrs["v-model"] || attrs["formcontrolname"] || "";
    const label = inferFieldLabel(name || attrs.placeholder || attrs["aria-label"] || type);
    if (!name && !label) continue;
    fields.push({
      name,
      label,
      type,
      required: Object.prototype.hasOwnProperty.call(attrs, "required"),
      sourceFile,
      autoHostEligible: isCollectableFormField({ name, label, type, sourceFile })
    });
  }

  for (const fieldName of inferFieldNamesFromCode(content)) {
    fields.push({
      name: fieldName,
      label: inferFieldLabel(fieldName),
      type: inferFieldType(fieldName),
      required: false,
      sourceFile,
      autoHostEligible: isCollectableFormField({
        name: fieldName,
        label: inferFieldLabel(fieldName),
        type: inferFieldType(fieldName),
        sourceFile
      })
    });
  }

  return fields;
}

export function parseHtmlAttributes(text) {
  const attrs = {};
  const pattern = /([:@\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let match;
  while ((match = pattern.exec(text))) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attrs;
}

export function inferFieldNamesFromCode(content) {
  const names = new Set();
  const patterns = [
    /\b(name|phone|mobile|tel|email|company|message|remark|remarks|contact|address|wechat)\s*:/gi,
    /\bset(Name|Phone|Mobile|Email|Company|Message|Remark|Address)\b/g
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content))) {
      names.add((match[1] || "").toString().replace(/^[A-Z]/, (value) => value.toLowerCase()));
    }
  }
  return Array.from(names).filter(Boolean).slice(0, 12);
}

export function inferFieldType(name) {
  const lower = String(name || "").toLowerCase();
  if (lower.includes("phone") || lower.includes("mobile") || lower.includes("tel")) return "phone";
  if (lower.includes("email")) return "email";
  if (lower.includes("count") || lower.includes("quantity") || lower.includes("number")) return "number";
  if (lower.includes("message") || lower.includes("remark")) return "textarea";
  return "text";
}

export function inferFieldLabel(name) {
  const lower = String(name || "").toLowerCase();
  const labels = [
    ["phone", "手机号"],
    ["mobile", "手机号"],
    ["tel", "电话"],
    ["email", "邮箱"],
    ["company", "公司"],
    ["message", "留言"],
    ["remark", "备注"],
    ["address", "地址"],
    ["quantity", "数量"],
    ["count", "人数"],
    ["name", "姓名"]
  ];
  return labels.find(([key]) => lower.includes(key))?.[1] || String(name || "").trim();
}

export function extractApiCalls(content, sourceFile) {
  const calls = [];
  const patterns = [
    { type: "fetch", regex: /fetch\s*\(\s*(['"`])([^'"`]+)\1/gi },
    { type: "axios", regex: /axios\.(get|post|put|patch|delete)\s*\(\s*(['"`])([^'"`]+)\2/gi }
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.regex.exec(content))) {
      const method = pattern.type === "axios" ? match[1].toUpperCase() : "UNKNOWN";
      const url = pattern.type === "axios" ? match[3] : match[2];
      if (!url || url.startsWith("data:")) continue;
      calls.push({
        type: pattern.type,
        method,
        url,
        isLocal: isLocalApiUrl(url),
        sourceFile
      });
    }
  }

  return calls;
}

export function isLocalApiUrl(url) {
  return /^\/api\//.test(url) || /^api\//.test(url) || /^\.\.?\/api\//.test(url);
}


export function createInvalidZipInspection(error) {
  const technicalReason = error instanceof Error ? error.message : "";
  return createInvalidArchiveInspection("ZIP", technicalReason);
}


export function createInvalidArchiveInspection(archiveType, technicalReason = "") {
  return {
    status: "blocked",
    canPublish: false,
    summary: "压缩包不完整或格式异常，DemoGo 无法读取项目文件。",
    analysis: {
      detectedType: "unknown",
      label: "暂未识别",
      hasPackageJson: false,
      hasBuildScript: false,
      hasBackend: false,
      hasSsr: false,
    },
    presentation: {
      issues: [
        `压缩包缺少完整的 ${archiveType} 目录信息，可能是生成、下载或上传过程中被截断。`
      ],
      suggestions: [
        "请从原项目文件夹重新压缩后上传，不要上传正在生成或传输未完成的文件。",
        "如果文件来自其他工具导出，请先在本地解压验证，确认能正常打开后再上传。"
      ],
      ruleReport: {
        projectCategory: "暂未识别",
        publishability: "暂时无法发布",
        risks: technicalReason ? [`${archiveType} 读取失败：${technicalReason}`] : [],
        recommendations: [
          "重新打包后再上传。"
        ],
        fixPrompt: "请重新导出或重新压缩项目，确保生成的是完整 .zip、.tar.gz 或 .tgz 文件，且压缩包内包含 index.html、dist/index.html 或 build/index.html。"
      },
    },
    files: {
      rawFileCount: 0,
      publishableFileCount: 0,
      rawBytes: 0,
      publishableBytes: 0,
      ignoredFileCount: 0,
      ignoredFiles: [],
      blockedFiles: [],
      rootEntries: [],
    },
    forms: {
      formFields: [],
      apiCalls: [],
    },
    entries: {
      entryFile: null,
      projectTitle: "",
      pageHeading: "",
    },
  };
}


export function createProjectError(inspection, message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.inspection = {
    ...inspection,
    status: "blocked",
    canPublish: false,
    summary: message
  };
  return error;
}

