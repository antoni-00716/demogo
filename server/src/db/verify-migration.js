import fs from "node:fs/promises";
import path from "node:path";
import { closePool, isMysqlConfigured, query } from "./mysql.js";
import { readDataFile } from "./mysql-store.js";

const dataDir = process.env.DEMOGO_DATA_DIR || "/var/lib/demogo/data";
const migrationStatusFile = path.join(dataDir, "mysql-migration-status.json");
const businessTables = [
  "users",
  "sessions",
  "demos",
  "demo_versions",
  "deployment_events",
  "project_inspections",
  "content_reviews",
  "audit_logs",
  "feedback",
  "forms",
  "form_submissions",
  "plan_upgrade_requests"
];

if (!isMysqlConfigured()) {
  console.error("Missing DEMOGO_DB_* environment variables.");
  process.exit(1);
}

async function main() {
  const migrationStatus = await readJsonFile(migrationStatusFile, null);
  if (migrationStatus?.status === "skipped-existing-data") {
    await verifyMysqlReadable();
    return;
  }

  const checks = [
    ["users.json", "users"],
    ["sessions.json", "sessions"],
    ["demos.json", "demos"],
    ["deployment-events.json", "deploymentEvents"],
    ["content-reviews.json", "contentReviews"],
    ["audit-logs.json", "auditLogs"],
    ["feedback.json", "feedback"],
    ["forms.json", "forms"],
    ["form-submissions.json", "formSubmissions"],
    ["plan-upgrade-requests.json", "planUpgradeRequests"]
  ];

  let failed = false;
  for (const [fileName, label] of checks) {
    const filePath = path.join(dataDir, fileName);
    const jsonRows = await readJson(fileName, []);
    const mysqlRows = await readDataFile(filePath, []);
    const ok = jsonRows.length === mysqlRows.length;
    console.log(`${label}: json=${jsonRows.length} mysql=${mysqlRows.length} ${ok ? "OK" : "MISMATCH"}`);
    if (!ok) failed = true;
  }

  if (failed) {
    process.exitCode = 1;
  }
}

async function verifyMysqlReadable() {
  for (const table of businessTables) {
    const rows = await query(`SELECT COUNT(*) AS count FROM ${table}`);
    console.log(`${table}: mysql=${Number(rows[0]?.count || 0)} OK`);
  }
}

async function readJson(fileName, fallback) {
  return readJsonFile(path.join(dataDir, fileName), fallback);
}

async function readJsonFile(filePath, fallback) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(stripBom(content));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

function stripBom(content) {
  return String(content || "").replace(/^\uFEFF/, "");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
