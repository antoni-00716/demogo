import { gzipSync } from "node:zlib";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export const VERSION = "0.2.5";
export const MAX_FILES = 800;
export const MAX_BYTES = 50 * 1024 * 1024;

const EXCLUDED_DIRS = new Set([
  ".git",
  ".hg",
  ".svn",
  ".next",
  ".nuxt",
  ".output",
  ".cache",
  ".turbo",
  ".vite",
  "node_modules",
  "coverage",
  "tmp",
  "temp"
]);

const EXCLUDED_FILES = new Set([
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".npmrc",
  ".yarnrc",
  ".DS_Store",
  "Thumbs.db"
]);

const SENSITIVE_EXTENSIONS = [
  ".pem",
  ".key",
  ".p12",
  ".pfx",
  ".crt",
  ".cer"
];

export async function assertDirectory(dir) {
  try {
    const stats = await stat(dir);
    if (!stats.isDirectory()) throw new Error(`不是项目目录：${dir}`);
  } catch {
    throw new Error(`找不到项目目录：${dir}`);
  }
}

export async function collectFiles(rootDir) {
  const files = [];
  let totalBytes = 0;

  async function walk(currentDir, relativeDir = "") {
    const entries = await readdir(currentDir, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = toPosixPath(path.join(relativeDir, entry.name));
      if (shouldExclude(entry, relativePath)) continue;
      if (entry.isDirectory()) {
        await walk(fullPath, relativePath);
        continue;
      }
      if (!entry.isFile()) continue;
      const stats = await stat(fullPath);
      totalBytes += stats.size;
      if (files.length >= MAX_FILES) throw new Error(`项目文件超过 ${MAX_FILES} 个，请精简后再发布。`);
      if (totalBytes > MAX_BYTES) throw new Error("项目文件超过 50MB，请删除大文件后再发布。");
      files.push({ fullPath, relativePath, size: stats.size });
    }
  }

  await walk(rootDir);
  return files;
}

export function summarizeProject(projectDir, files) {
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const hasReadyPage = files.some((file) => [
    "index.html",
    "dist/index.html",
    "build/index.html",
    "out/index.html",
    "public/index.html"
  ].includes(file.relativePath));
  const singleHtmlEntry = inferSingleHtmlEntry(files)?.relativePath || "";
  const hasPackageJson = files.some((file) => file.relativePath === "package.json");
  return {
    projectDir,
    fileCount: files.length,
    totalBytes,
    hasReadyPage,
    singleHtmlEntry,
    hasPackageJson
  };
}

export async function createProjectArchive(rootDir, fileList, archivePath) {
  const chunks = [];
  const htmlEntry = inferSingleHtmlEntry(fileList);
  for (const file of fileList) {
    const data = await readFile(file.fullPath);
    const archivePathName = htmlEntry && file.relativePath === htmlEntry.relativePath ? "index.html" : file.relativePath;
    chunks.push(...createTarHeaders(archivePathName, data.length, 0o644));
    chunks.push(data);
    chunks.push(Buffer.alloc(padLength(data.length)));
  }
  chunks.push(Buffer.alloc(1024));
  await mkdir(path.dirname(archivePath), { recursive: true });
  await writeFile(archivePath, gzipSync(Buffer.concat(chunks)));
}

function inferSingleHtmlEntry(files) {
  const hasIndex = files.some((file) => file.relativePath === "index.html");
  if (hasIndex) return null;
  const rootHtmlFiles = files.filter((file) => (
    /^[^/]+\.html?$/i.test(file.relativePath) &&
    !/^admin\.html$/i.test(file.relativePath) &&
    !/^login\.html$/i.test(file.relativePath)
  ));
  return rootHtmlFiles.length === 1 ? rootHtmlFiles[0] : null;
}

export async function deployArchive({ apiBase, token, archivePath, projectName, source = "cli", userAgent = `demogo-cli/${VERSION}` }) {
  const formData = new FormData();
  formData.set("name", projectName);
  formData.set("source", source);
  formData.set(
    "project",
    new Blob([await readFile(archivePath)], { type: "application/gzip" }),
    path.basename(archivePath)
  );

  let response;
  try {
    response = await fetch(`${normalizeApiBase(apiBase)}/api/agent/deploy`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": userAgent,
        "X-DemoGo-Deploy-Source": source
      },
      body: formData
    });
  } catch {
    throw new Error(`无法连接 DemoGo：${normalizeApiBase(apiBase)}。请检查 API 地址是否正确，或稍后再试。`);
  }

  const text = await response.text();
  const payload = parseJson(text);
  if (!response.ok) {
    const message = payload?.error || readableHttpError(response.status, text);
    const shouldShowFixPrompt = response.status === 400 || payload?.inspection?.canPublish === false;
    const fixPrompt = shouldShowFixPrompt
      ? payload?.inspection?.fixPrompt || payload?.inspection?.ruleReport?.fixPrompt || ""
      : "";
    const details = fixPrompt ? `\n\n给 AI 工具的修改建议：\n${fixPrompt}` : "";
    throw new Error(`${message}${details}`);
  }
  return payload;
}

export async function checkApiHealth(apiBase) {
  let response;
  try {
    response = await fetch(`${normalizeApiBase(apiBase)}/api/health`, {
      method: "GET",
      headers: { "User-Agent": `demogo-cli/${VERSION}` }
    });
  } catch {
    throw new Error(`无法连接 DemoGo：${normalizeApiBase(apiBase)}。请检查平台地址。`);
  }
  const text = await response.text();
  const payload = parseJson(text);
  if (!response.ok || !payload?.ok) {
    throw new Error(`DemoGo 平台地址不可用：HTTP ${response.status}`);
  }
  return payload;
}

export function normalizeApiBase(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

export function safeArchiveName(value) {
  return String(value || "demogo-project").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "demogo-project";
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function shouldExclude(entry, relativePath) {
  const name = entry.name;
  if (entry.isDirectory() && EXCLUDED_DIRS.has(name)) return true;
  if (EXCLUDED_FILES.has(name)) return true;
  if (name.endsWith(".log")) return true;
  if (SENSITIVE_EXTENSIONS.some((extension) => name.toLowerCase().endsWith(extension))) return true;
  if (relativePath.startsWith("dist/") && relativePath.includes("/server-package/")) return true;
  return false;
}

function createTarHeaders(name, size, mode) {
  const normalizedName = toPosixPath(name);
  const ustarPath = splitUstarPath(normalizedName);
  if (ustarPath && isAscii(normalizedName)) {
    return [createTarHeader({ name: ustarPath.name, prefix: ustarPath.prefix, size, mode })];
  }

  const paxBody = Buffer.from(createPaxRecord("path", normalizedName), "utf8");
  const fallbackName = safeTarName(normalizedName);
  return [
    createTarHeader({ name: `PaxHeaders/${fallbackName}`.slice(0, 100), size: paxBody.length, mode: 0o644, type: "x" }),
    paxBody,
    Buffer.alloc(padLength(paxBody.length)),
    createTarHeader({ name: fallbackName, size, mode })
  ];
}

function createTarHeader({ name, size, mode, type = "0", prefix = "" }) {
  const buffer = Buffer.alloc(512, 0);
  writeString(buffer, name, 0, 100);
  writeOctal(buffer, mode, 100, 8);
  writeOctal(buffer, 0, 108, 8);
  writeOctal(buffer, 0, 116, 8);
  writeOctal(buffer, size, 124, 12);
  writeOctal(buffer, Math.floor(Date.now() / 1000), 136, 12);
  buffer.fill(0x20, 148, 156);
  buffer[156] = type.charCodeAt(0);
  writeString(buffer, "ustar", 257, 6);
  writeString(buffer, "00", 263, 2);
  writeString(buffer, prefix, 345, 155);
  const checksum = buffer.reduce((sum, value) => sum + value, 0);
  writeOctal(buffer, checksum, 148, 8);
  return buffer;
}

function writeString(buffer, value, offset, length) {
  const data = Buffer.from(String(value), "utf8");
  data.subarray(0, length).copy(buffer, offset);
}

function writeOctal(buffer, value, offset, length) {
  const text = value.toString(8).padStart(length - 1, "0").slice(0, length - 1);
  buffer.write(text, offset, length - 1, "ascii");
  buffer[offset + length - 1] = 0;
}

function padLength(size) {
  return (512 - (size % 512)) % 512;
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function splitUstarPath(name) {
  if (Buffer.byteLength(name, "utf8") <= 100) return { name, prefix: "" };
  const parts = name.split("/");
  for (let index = parts.length - 1; index > 0; index -= 1) {
    const prefix = parts.slice(0, index).join("/");
    const entryName = parts.slice(index).join("/");
    if (Buffer.byteLength(entryName, "utf8") <= 100 && Buffer.byteLength(prefix, "utf8") <= 155) {
      return { name: entryName, prefix };
    }
  }
  return null;
}

function createPaxRecord(key, value) {
  let record = ` ${key}=${value}\n`;
  let length = Buffer.byteLength(record, "utf8") + String(Buffer.byteLength(record, "utf8")).length;
  while (true) {
    const next = `${length}${record}`;
    const nextLength = Buffer.byteLength(next, "utf8");
    if (nextLength === length) return next;
    length = nextLength;
  }
}

function safeTarName(value) {
  const baseName = path.posix.basename(String(value || "file")) || "file";
  const safe = safeArchiveName(baseName) || "file";
  if (Buffer.byteLength(safe, "utf8") <= 100) return safe;
  return safe.slice(0, 80) || "file";
}

function isAscii(value) {
  return /^[\x00-\x7F]*$/.test(value);
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function readableHttpError(status, text) {
  if (status === 401) return "AI 发布口令无效或已被重置。";
  if (status === 403) return "当前账号额度不足，无法生成新的试用链接。";
  if (status === 413) return "项目包太大，请压缩或删除大文件后重试。";
  if (status === 400) return "项目暂时不能发布，请根据 DemoGo 返回的提示修改后再试。";
  if (text?.trim().startsWith("<")) return "服务器返回了异常页面，本次发布没有完成。";
  return `DemoGo 发布失败：HTTP ${status}`;
}

