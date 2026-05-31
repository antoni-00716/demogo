// DemoGo v0.9.5 - Periodic cleanup service
import fs from "node:fs/promises";
import path from "node:path";
import logger from "../lib/logger.js";

const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours for temp files

export function startCleanupService(dirs = []) {
  async function run() {
    logger.info("Starting periodic cleanup");
    for (const dir of dirs) {
      if (!dir) continue;
      try {
        await cleanDir(dir);
      } catch (error) {
        logger.error({ err: error, dir }, "Cleanup failed for directory");
      }
    }
    logger.info("Periodic cleanup completed");
  }

  async function cleanDir(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return; // Directory doesn"t exist, skip
    }
    const now = Date.now();
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(dir, entry.name);
      try {
        const stat = await fs.stat(fullPath);
        if (now - stat.mtimeMs > MAX_AGE_MS) {
          await fs.rm(fullPath, { recursive: true, force: true });
          logger.debug({ path: fullPath }, "Cleaned up expired item");
        }
      } catch {
        // Skip items that can"t be accessed
      }
    }
  }

  // Run immediately, then on interval
  run().catch(() => {});
  const interval = setInterval(run, CLEANUP_INTERVAL_MS);
  interval.unref();
  return interval;
}
