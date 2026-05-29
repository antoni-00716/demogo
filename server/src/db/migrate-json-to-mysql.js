import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closePool, getPool, isMysqlConfigured } from "./mysql.js";
import { writeDataFile } from "./mysql-store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
  await applySchema();
  const existingCounts = await countExistingBusinessRows();
  const existingTotal = Object.values(existingCounts).reduce((sum, value) => sum + value, 0);

  if (existingTotal > 0 && process.env.DEMOGO_MIGRATION_FORCE !== "1") {
    await writeMigrationStatus({
      status: "skipped-existing-data",
      existingCounts,
      createdAt: new Date().toISOString()
    });
    console.log("Schema is ready. Existing MySQL business data found, skip JSON import.");
    console.log(JSON.stringify(existingCounts));
    console.log("Set DEMOGO_MIGRATION_FORCE=1 only if you intentionally want to overwrite MySQL from JSON backup.");
    return;
  }

  const backupDir = await backupJsonData();

  const users = await readJson("users.json", []);
  const sessions = await readJson("sessions.json", []);
  const demos = await readJson("demos.json", []);
  const deploymentEvents = await readJson("deployment-events.json", []);
  const contentReviews = await readJson("content-reviews.json", []);
  const auditLogs = await readJson("audit-logs.json", []);
  const feedback = await readJson("feedback.json", []);
  const forms = await readJson("forms.json", []);
  const formSubmissions = await readJson("form-submissions.json", []);
  const planUpgradeRequests = await readJson("plan-upgrade-requests.json", []);
  const emailVerifications = await readJson("email-verifications.json", []);
  const subdomainRequests = await readJson("subdomain-requests.json", []);
  const trialEvents = await readJson("trial-events.json", []);

  await writeDataFile(path.join(dataDir, "users.json"), users);
  await writeDataFile(path.join(dataDir, "sessions.json"), sessions);
  await writeDataFile(path.join(dataDir, "demos.json"), demos);
  await writeDataFile(path.join(dataDir, "deployment-events.json"), deploymentEvents);
  await writeDataFile(path.join(dataDir, "content-reviews.json"), contentReviews);
  await writeDataFile(path.join(dataDir, "audit-logs.json"), auditLogs);
  await writeDataFile(path.join(dataDir, "feedback.json"), feedback);
  await writeDataFile(path.join(dataDir, "forms.json"), forms);
  await writeDataFile(path.join(dataDir, "form-submissions.json"), formSubmissions);
  await writeDataFile(path.join(dataDir, "plan-upgrade-requests.json"), planUpgradeRequests);
  await writeDataFile(path.join(dataDir, "email-verifications.json"), emailVerifications);
  await writeDataFile(path.join(dataDir, "subdomain-requests.json"), subdomainRequests);
  await writeDataFile(path.join(dataDir, "trial-events.json"), trialEvents);

  await writeMigrationStatus({
    status: "imported",
    backupDir,
    counts: {
      users: users.length,
      sessions: sessions.length,
      demos: demos.length,
      deploymentEvents: deploymentEvents.length,
      contentReviews: contentReviews.length,
      auditLogs: auditLogs.length,
      feedback: feedback.length,
      forms: forms.length,
      formSubmissions: formSubmissions.length,
      planUpgradeRequests: planUpgradeRequests.length,
      emailVerifications: emailVerifications.length,
      subdomainRequests: subdomainRequests.length,
      trialEvents: trialEvents.length
    },
    createdAt: new Date().toISOString()
  });

  console.log(`Migration complete.`);
  console.log(`Backup: ${backupDir}`);
  console.log(`users=${users.length}`);
  console.log(`sessions=${sessions.length}`);
  console.log(`demos=${demos.length}`);
  console.log(`deploymentEvents=${deploymentEvents.length}`);
  console.log(`contentReviews=${contentReviews.length}`);
  console.log(`auditLogs=${auditLogs.length}`);
  console.log(`feedback=${feedback.length}`);
  console.log(`forms=${forms.length}`);
  console.log(`formSubmissions=${formSubmissions.length}`);
  console.log(`planUpgradeRequests=${planUpgradeRequests.length}`);
  console.log(`emailVerifications=${emailVerifications.length}`);
  console.log(`subdomainRequests=${subdomainRequests.length}`);
  console.log(`trialEvents=${trialEvents.length}`);
}

async function applySchema() {
  const schema = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");
  const statements = splitSqlStatements(schema);
  const pool = getPool();
  for (const statement of statements) {
    if (/^INSERT\s+INTO\s+plans\b/i.test(statement)) {
      await ensurePlanFormColumns(pool);
    }
    await pool.query(statement);
  }
  await ensureContentReviewColumns(pool);
  await ensureAuditLogColumns(pool);
}

async function ensurePlanFormColumns(pool) {
  const columns = await readTableColumns(pool, "plans");
  if (!columns.has("max_forms")) {
    await pool.query("ALTER TABLE plans ADD COLUMN max_forms INT NOT NULL DEFAULT 0 AFTER max_zip_size_mb");
  }
  if (!columns.has("max_form_submissions")) {
    await pool.query("ALTER TABLE plans ADD COLUMN max_form_submissions INT NOT NULL DEFAULT 0 AFTER max_forms");
  }
}

async function ensureContentReviewColumns(pool) {
  const columns = await readTableColumns(pool, "content_reviews");
  if (!columns.has("resolution_status")) {
    await pool.query("ALTER TABLE content_reviews ADD COLUMN resolution_status VARCHAR(32) NOT NULL DEFAULT 'resolved' AFTER detected_type");
    await pool.query("UPDATE content_reviews SET resolution_status = 'pending' WHERE status IN ('blocked', 'review_required', 'failed')");
  }
  if (!columns.has("admin_note")) {
    await pool.query("ALTER TABLE content_reviews ADD COLUMN admin_note TEXT NULL AFTER resolution_status");
  }
  if (!columns.has("handled_by")) {
    await pool.query("ALTER TABLE content_reviews ADD COLUMN handled_by VARCHAR(255) NULL AFTER admin_note");
  }
  if (!columns.has("handled_at")) {
    await pool.query("ALTER TABLE content_reviews ADD COLUMN handled_at DATETIME NULL AFTER handled_by");
  }
}

async function ensureAuditLogColumns(pool) {
  const columns = await readTableColumnDetails(pool, "audit_logs");
  const id = columns.get("id");
  const type = String(id?.Type || "").toLowerCase();
  const match = type.match(/varchar\((\d+)\)/);
  const length = match ? Number(match[1]) : 0;
  if (length > 0 && length < 96) {
    await pool.query("ALTER TABLE audit_logs MODIFY COLUMN id VARCHAR(96) NOT NULL");
  }
}

async function readTableColumns(pool, tableName) {
  if (!/^[a-z0-9_]+$/i.test(tableName)) {
    throw new Error(`Unsafe table name: ${tableName}`);
  }
  const [rows] = await pool.query(`SHOW COLUMNS FROM \`${tableName}\``);
  return new Set(rows.map((row) => String(row.Field || "").toLowerCase()));
}

async function readTableColumnDetails(pool, tableName) {
  if (!/^[a-z0-9_]+$/i.test(tableName)) {
    throw new Error(`Unsafe table name: ${tableName}`);
  }
  const [rows] = await pool.query(`SHOW COLUMNS FROM \`${tableName}\``);
  return new Map(rows.map((row) => [String(row.Field || "").toLowerCase(), row]));
}

async function countExistingBusinessRows() {
  const pool = getPool();
  const counts = {};
  for (const table of businessTables) {
    const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM ${table}`);
    counts[table] = Number(rows[0]?.count || 0);
  }
  return counts;
}

async function backupJsonData() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(dataDir, `backup-before-mysql-${stamp}`);
  await fs.mkdir(backupDir, { recursive: true });
  for (const fileName of ["users.json", "sessions.json", "demos.json", "deployment-events.json", "content-reviews.json", "audit-logs.json", "feedback.json", "forms.json", "form-submissions.json", "plan-upgrade-requests.json", "email-verifications.json", "subdomain-requests.json", "trial-events.json"]) {
    const source = path.join(dataDir, fileName);
    try {
      await fs.copyFile(source, path.join(backupDir, fileName));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      await fs.writeFile(path.join(backupDir, fileName), "[]\n", "utf8");
    }
  }
  return backupDir;
}

async function readJson(fileName, fallback) {
  try {
    const content = await fs.readFile(path.join(dataDir, fileName), "utf8");
    return JSON.parse(stripBom(content));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeMigrationStatus(status) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(migrationStatusFile, `${JSON.stringify(status, null, 2)}\n`, "utf8");
}

function splitSqlStatements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
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
