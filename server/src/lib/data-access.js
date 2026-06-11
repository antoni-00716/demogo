// DemoGo - Data access helpers (wrappers around mysql-store with JSON fallback)
// Includes a simple per-file mutex to prevent concurrent write data loss.
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { dirname } from "node:path";
import crypto from "node:crypto";
import { readDataFile, writeDataFile, isMysqlConfigured } from "../db/mysql-store.js";

// Per-file mutex: ensures concurrent writeJson calls don't interleave
const writeLocks = new Map();

async function acquireLock(key) {
  while (writeLocks.get(key)) {
    await new Promise((r) => setTimeout(r, 5));
  }
  writeLocks.set(key, true);
}

function releaseLock(key) {
  writeLocks.delete(key);
}

export async function readJson(filePath, fallback) {
  if (isMysqlConfigured()) {
    return readDataFile(filePath, fallback);
  }
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content.replace(/^\uFEFF/, ""));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

export async function writeJson(filePath, value) {
  if (isMysqlConfigured()) {
    const handled = await writeDataFile(filePath, value);
    if (handled) return;
  }
  await acquireLock(filePath);
  try {
    // Backup previous file before overwriting
    try {
      const bakFile = filePath + ".bak";
      await rename(filePath, bakFile);
    } catch {
      // No previous file, skip backup
    }
    const tempFile = filePath + "." + crypto.randomBytes(4).toString("hex") + ".tmp";
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(tempFile, JSON.stringify(value, null, 2), "utf8");
    await rename(tempFile, filePath);
  } finally {
    releaseLock(filePath);
  }
}
