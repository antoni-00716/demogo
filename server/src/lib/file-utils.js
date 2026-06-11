// DemoGo v0.9.3 - File utility functions (extracted from server.js and demo-lifecycle-service.js)

import fs from "node:fs/promises";
import path from "node:path";

const archiveIgnoredPathParts = new Set(["node_modules"]);

export async function removePath(targetPath) {
  if (process.platform === "win32") {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  await fs.rm(targetPath, { recursive: true, force: true, maxRetries: 20, retryDelay: 1000 });
}

export function shouldCopyDemoArchivePath(sourcePath, rootDir) {
  const relativePath = path.relative(rootDir, path.resolve(sourcePath));
  if (!relativePath) return true;
  return !relativePath.split(path.sep).filter(Boolean).some((part) => archiveIgnoredPathParts.has(part));
}

export async function copyDemoArchive(sourceDir, targetDir) {
  const rootDir = path.resolve(sourceDir);
  await fs.cp(sourceDir, targetDir, { recursive: true, filter: (s) => shouldCopyDemoArchivePath(s, rootDir) });
}
