// DemoGo v0.9.32 - Shared utility functions for server modules

import fs from "node:fs/promises";

/** Check if a file or directory exists */
export async function exists(filePath) {
  try { await fs.access(filePath); return true; } catch { return false; }
}

/** Promise-based sleep */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Human-readable byte size */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  const decimals = index <= 1 ? 0 : 1;
  return value.toFixed(decimals) + units[index];
}

/** Remove UTF-8 BOM from string */
export function stripBom(content) {
  return String(content || "").replace(/^\uFEFF/, "");
}