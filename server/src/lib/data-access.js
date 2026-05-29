// DemoGo - Data access helpers (wrappers around mysql-store with JSON fallback)
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { dirname } from "node:path";
import crypto from "node:crypto";
import { readDataFile, writeDataFile, isMysqlConfigured } from "../db/mysql-store.js";

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
  const tempFile = filePath + "." + crypto.randomBytes(4).toString("hex") + ".tmp";
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(tempFile, JSON.stringify(value, null, 2), "utf8");
  await rename(tempFile, filePath);
}
