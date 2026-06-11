// DemoGo v0.9.30 - System health check service
import { promisify } from "node:util";
import { exec } from "node:child_process";
import fs from "node:fs/promises";
import { serviceVersion, demoRoot, storageBackend, s3Endpoint } from "../config.js";
import { getPool } from "../db/mysql.js";
import logger from "../lib/logger.js";

const execAsync = promisify(exec);

export async function getSystemHealth() {
  const checks = {
    mysql: false,
    redis: false,
    docker: false,
    disk: { ok: true, usagePercent: 0, path: demoRoot },
    queueSize: 0,
    uptime: process.uptime(),
    version: serviceVersion,
    timestamp: new Date().toISOString(),
  };

  // MySQL check
  try {
    const pool = getPool();
    await pool.execute("SELECT 1");
    checks.mysql = true;
  } catch { /* unavailable */ }

  // Redis check
  try {
    const { deploymentQueue } = await import("../queue/queue.js");
    await deploymentQueue.getJobCounts();
    const counts = await deploymentQueue.getJobCounts();
    checks.redis = true;
    checks.queueSize = (counts.waiting || 0) + (counts.active || 0) + (counts.delayed || 0);
  } catch { /* unavailable */ }

  // Docker check
  try {
    await execAsync("docker info", { timeout: 5000 });
    checks.docker = true;
  } catch { /* unavailable */ }

  // Disk check
  try { await fs.stat(demoRoot); checks.disk.ok = true; } catch { checks.disk.ok = false; }

  // CDN info
  let cdn = { backend: "local" };
  try {
    const cdnModule = await import("../lib/cdn.js");
    cdn = cdnModule.getCdnInfo();
  } catch { /* cdn module unavailable */ }


  // MinIO check (when configured)
  if (storageBackend === "minio") {
    let minioOk = false;
    try {
      const resp = await fetch(`${s3Endpoint}/minio/health/live`, { signal: AbortSignal.timeout(3000) });
      minioOk = resp.ok;
    } catch { /* unavailable */ }
    checks.minio = minioOk;
    checks.minioEndpoint = s3Endpoint;
  }
  const allOk = checks.mysql;
  const status = allOk ? "healthy" : "degraded";

  return { status, checks, cdn };
}
