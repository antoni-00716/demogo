// DemoGo - Audit log writer
import crypto from "node:crypto";
import { join as pathJoin } from "node:path";
import { dataDir } from "../config.js";
import { readJson, writeJson } from "./data-access.js";

const auditLogsFile = pathJoin(dataDir, "audit-logs.json");

export async function writeAuditLog(log) {
  const logs = await readJson(auditLogsFile, []);
  logs.unshift({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...log
  });
  await writeJson(auditLogsFile, logs.slice(0, 1000));
}
