import crypto from "node:crypto";
import path from "node:path";
import { isMysqlConfigured, query, transaction } from "./mysql.js";

export { isMysqlConfigured };

const metadataActions = new Set([
  "deployment_job",
  "email_verification",
  "subdomain_request",
  "trial_event"
]);

export async function readDataFile(filePath, fallback) {
  if (!isMysqlConfigured()) return fallback;
  const collection = collectionFromPath(filePath);
  if (!collection) return fallback;

  if (collection === "users") return readUsers();
  if (collection === "sessions") return readSessions();
  if (collection === "demos") return readDemos();
  if (collection === "deploymentEvents") return readDeploymentEvents();
  if (collection === "deploymentJobs") return readDeploymentJobs();
  if (collection === "auditLogs") return readAuditLogs();
  if (collection === "feedback") return readFeedback();
  if (collection === "forms") return readForms();
  if (collection === "formSubmissions") return readFormSubmissions();
  if (collection === "planUpgradeRequests") return readPlanUpgradeRequests();
  if (collection === "contentReviews") return readContentReviews();
  if (collection === "emailVerifications") return readMetadataCollection("email_verification", 1000);
  if (collection === "subdomainRequests") return readMetadataCollection("subdomain_request", 1000);
  if (collection === "trialEvents") return readMetadataCollection("trial_event", 5000);
  return fallback;
}

export async function writeDataFile(filePath, value) {
  if (!isMysqlConfigured()) return false;
  const collection = collectionFromPath(filePath);
  if (!collection) return false;

  if (collection === "users") {
    await replaceUsers(value);
    return true;
  }
  if (collection === "sessions") {
    await replaceSessions(value);
    return true;
  }
  if (collection === "demos") {
    await replaceDemos(value);
    return true;
  }
  if (collection === "deploymentEvents") {
    await replaceDeploymentEvents(value);
    return true;
  }
  if (collection === "deploymentJobs") {
    await replaceDeploymentJobs(value);
    return true;
  }
  if (collection === "auditLogs") {
    await replaceAuditLogs(value);
    return true;
  }
  if (collection === "feedback") {
    await replaceFeedback(value);
    return true;
  }
  if (collection === "forms") {
    await replaceForms(value);
    return true;
  }
  if (collection === "formSubmissions") {
    await replaceFormSubmissions(value);
    return true;
  }
  if (collection === "planUpgradeRequests") {
    await replacePlanUpgradeRequests(value);
    return true;
  }
  if (collection === "contentReviews") {
    await replaceContentReviews(value);
    return true;
  }
  if (collection === "emailVerifications") {
    await replaceMetadataCollection("email_verification", value);
    return true;
  }
  if (collection === "subdomainRequests") {
    await replaceMetadataCollection("subdomain_request", value);
    return true;
  }
  if (collection === "trialEvents") {
    await replaceMetadataCollection("trial_event", value);
    return true;
  }
  return false;
}

function collectionFromPath(filePath) {
  const name = path.basename(filePath);
  if (name === "users.json") return "users";
  if (name === "sessions.json") return "sessions";
  if (name === "demos.json") return "demos";
  if (name === "deployment-events.json") return "deploymentEvents";
  if (name === "deployment-jobs.json") return "deploymentJobs";
  if (name === "audit-logs.json") return "auditLogs";
  if (name === "feedback.json") return "feedback";
  if (name === "forms.json") return "forms";
  if (name === "form-submissions.json") return "formSubmissions";
  if (name === "plan-upgrade-requests.json") return "planUpgradeRequests";
  if (name === "content-reviews.json") return "contentReviews";
  if (name === "email-verifications.json") return "emailVerifications";
  if (name === "subdomain-requests.json") return "subdomainRequests";
  if (name === "trial-events.json") return "trialEvents";
  return null;
}

async function readUsers() {
  const rows = await query("SELECT * FROM users ORDER BY created_at ASC");
  return rows.map((row) => {
    const metadata = parseJson(row.metadata_json, {});
    return {
      ...metadata,
      id: row.id,
      email: row.email,
      phone: row.phone || metadata.phone,
      plan: row.plan_code || metadata.plan || "free",
      role: row.role || metadata.role || "user",
      status: row.status || metadata.status || "active",
      passwordHash: row.password_hash,
      createdAt: toIso(row.created_at) || metadata.createdAt,
      updatedAt: toIso(row.updated_at) || metadata.updatedAt,
      lastLoginAt: toIso(row.last_login_at) || metadata.lastLoginAt
    };
  });
}

async function replaceUsers(users) {
  await transaction(async (connection) => {
    await connection.execute("DELETE FROM users");
    for (const user of Array.isArray(users) ? users : []) {
      await connection.execute(`
        INSERT INTO users (
          id, email, phone, password_hash, role, status, plan_code,
          created_at, updated_at, last_login_at, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user.id,
        user.email,
        user.phone || null,
        user.passwordHash || user.password_hash || "",
        user.role || "user",
        user.status || "active",
        user.plan || user.planCode || "free",
        dateOrNull(user.createdAt) || new Date(),
        dateOrNull(user.updatedAt) || dateOrNull(user.createdAt) || new Date(),
        dateOrNull(user.lastLoginAt),
        stringifyJson(sanitizeUserMetadata(user))
      ]);
    }
  });
}

async function readSessions() {
  const rows = await query("SELECT * FROM sessions ORDER BY created_at ASC");
  return rows.map((row) => ({
    token: row.token,
    userId: row.user_id,
    createdAt: toIso(row.created_at),
    expiresAt: toIso(row.expires_at),
    ip: row.ip || undefined,
    userAgent: row.user_agent || undefined
  }));
}

async function replaceSessions(sessions) {
  await transaction(async (connection) => {
    await connection.execute("DELETE FROM sessions");
    for (const session of Array.isArray(sessions) ? sessions : []) {
      await connection.execute(`
        INSERT INTO sessions (token, user_id, created_at, expires_at, ip, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        session.token,
        session.userId || session.user_id,
        dateOrNull(session.createdAt) || new Date(),
        dateOrNull(session.expiresAt),
        session.ip || null,
        session.userAgent || session.user_agent || null
      ]);
    }
  });
}

async function readDemos() {
  const [demoRows, versionRows, inspectionRows] = await Promise.all([
    query("SELECT * FROM demos ORDER BY created_at DESC"),
    query("SELECT * FROM demo_versions ORDER BY created_at ASC"),
    query("SELECT * FROM project_inspections ORDER BY created_at DESC")
  ]);
  const versionsByDemo = groupBy(versionRows, "demo_id");
  const inspectionsByDemo = groupBy(inspectionRows, "demo_id");

  return demoRows.map((row) => {
    const metadata = parseJson(row.metadata_json, {});
    const usage = {
      ...(metadata.usage || {}),
      visits: Number(row.visits || 0),
      estimatedBytes: Number(row.estimated_bytes || 0),
      uniqueVisitorsEstimate: Number(row.unique_visitors_estimate || 0),
      lastVisitedAt: toIso(row.last_visited_at) || metadata.usage?.lastVisitedAt || null
    };
    const deployEvents = versionsByDemo.get(row.id)?.map((version) => ({
      type: version.action || "update",
      at: toIso(version.created_at)
    })) || metadata.deployEvents || [];
    const inspection = metadata.inspection || inspectionFromRow(inspectionsByDemo.get(row.id)?.[0]);

    return {
      ...metadata,
      id: row.id,
      userId: row.user_id,
      userEmail: row.user_email || metadata.userEmail,
      slug: row.slug,
      name: row.name,
      status: row.status,
      publicUrl: row.public_url,
      version: Number(row.current_version || metadata.version || 1),
      projectType: row.project_type || metadata.projectType,
      detectedType: row.detected_type || metadata.detectedType,
      entryFile: row.entry_file || metadata.entryFile,
      fileCount: Number(row.file_count || metadata.fileCount || 0),
      extractedBytes: Number(row.total_bytes || metadata.extractedBytes || 0),
      sourceZipPath: row.source_zip_path || metadata.sourceZipPath,
      outputPath: row.output_path || metadata.outputPath,
      expiresAt: toIso(row.expires_at) || metadata.expiresAt,
      createdAt: toIso(row.created_at) || metadata.createdAt,
      updatedAt: toIso(row.updated_at) || metadata.updatedAt,
      offlineAt: toIso(row.offline_at) || metadata.offlineAt,
      deletedAt: toIso(row.deleted_at) || metadata.deletedAt,
      usage,
      deployEvents,
      inspection
    };
  });
}

async function replaceDemos(demos) {
  await transaction(async (connection) => {
    await connection.execute("DELETE FROM project_inspections");
    await connection.execute("DELETE FROM demo_versions");
    await connection.execute("DELETE FROM demos");

    for (const demo of Array.isArray(demos) ? demos : []) {
      await connection.execute(`
        INSERT INTO demos (
          id, user_id, user_email, slug, name, status, public_url,
          current_version, project_type, detected_type, entry_file, file_count,
          total_bytes, source_zip_path, output_path, expires_at, created_at,
          updated_at, offline_at, deleted_at, visits, estimated_bytes,
          unique_visitors_estimate, last_visited_at, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        demo.id,
        demo.userId || demo.user_id,
        demo.userEmail || null,
        demo.slug,
        demo.name || demo.slug,
        demo.status || "published",
        demo.publicUrl || null,
        Number(demo.version || demo.currentVersion || 1),
        demo.projectType || null,
        demo.detectedType || null,
        demo.entryFile || demo.inspection?.entryFile || null,
        Number(demo.fileCount || 0),
        Number(demo.extractedBytes || demo.totalBytes || 0),
        demo.sourceZipPath || null,
        demo.outputPath || `/var/www/demogo-preview/d/${demo.slug}`,
        dateOrNull(demo.expiresAt),
        dateOrNull(demo.createdAt) || new Date(),
        dateOrNull(demo.updatedAt) || dateOrNull(demo.createdAt) || new Date(),
        dateOrNull(demo.offlineAt),
        dateOrNull(demo.deletedAt),
        Number(demo.usage?.visits || 0),
        Number(demo.usage?.estimatedBytes || 0),
        Number(demo.usage?.uniqueVisitorsEstimate || 0),
        dateOrNull(demo.usage?.lastVisitedAt),
        stringifyJson(demo)
      ]);

      await insertDemoVersions(connection, demo);
      if (demo.inspection) {
        await insertProjectInspection(connection, demo);
      }
    }
  });
}

async function insertDemoVersions(connection, demo) {
  const events = Array.isArray(demo.deployEvents) && demo.deployEvents.length
    ? demo.deployEvents
    : [{ type: "create", at: demo.createdAt }];
  let index = 1;
  for (const event of events.filter(Boolean)) {
    await connection.execute(`
      INSERT INTO demo_versions (
        id, demo_id, version, action, status, detected_type, file_count,
        total_bytes, build_status, build_log, inspection_id, created_at, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      crypto.randomUUID(),
      demo.id,
      index,
      event.type || "update",
      "success",
      demo.detectedType || null,
      Number(demo.fileCount || 0),
      Number(demo.extractedBytes || 0),
      demo.buildLog ? "success" : null,
      demo.buildLog || null,
      null,
      dateOrNull(event.at) || dateOrNull(demo.createdAt) || new Date(),
      stringifyJson(event)
    ]);
    index += 1;
  }
}

async function insertProjectInspection(connection, demo) {
  const inspection = demo.inspection || {};
  await connection.execute(`
    INSERT INTO project_inspections (
      id, user_id, demo_id, deployment_job_id, can_publish, detected_type,
      entry_file, has_package_json, has_build_script, publishable_file_count,
      publishable_bytes, ignored_files_json, blocked_files_json, api_calls_json,
      form_fields_json, issues_json, recommendations_json, rule_report_json,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?)
  `, [
    crypto.randomUUID(),
    demo.userId || demo.user_id,
    demo.id,
    null,
    inspection.canPublish ? 1 : 0,
    inspection.detectedType || demo.detectedType || null,
    inspection.entryFile || null,
    inspection.hasPackageJson ? 1 : 0,
    inspection.hasBuildScript ? 1 : 0,
    Number(inspection.publishableFileCount || demo.fileCount || 0),
    Number(inspection.publishableBytes || demo.extractedBytes || 0),
    stringifyJson(inspection.ignoredFiles || []),
    stringifyJson(inspection.blockedFiles || []),
    stringifyJson(inspection.apiCalls || []),
    stringifyJson(inspection.formFields || []),
    stringifyJson(inspection.issues || []),
    stringifyJson(inspection.suggestions || inspection.recommendations || []),
    stringifyJson(inspection.ruleReport || null),
    dateOrNull(demo.updatedAt) || dateOrNull(demo.createdAt) || new Date()
  ]);
}

async function readDeploymentEvents() {
  const rows = await query("SELECT * FROM deployment_events ORDER BY created_at DESC LIMIT 5000");
  return rows.map((row) => ({
    id: row.id,
    demoId: row.demo_id || null,
    userId: row.user_id || null,
    deploymentId: row.deployment_id || null,
    eventType: row.event_type,
    status: row.status,
    message: row.message || "",
    detail: parseJson(row.detail_json, {}),
    createdAt: toIso(row.created_at)
  }));
}

async function replaceDeploymentEvents(events) {
  await transaction(async (connection) => {
    await connection.execute("DELETE FROM deployment_events");
    for (const event of Array.isArray(events) ? events : []) {
      await connection.execute(`
        INSERT INTO deployment_events (
          id, demo_id, user_id, deployment_id, event_type, status,
          message, detail_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        event.id || crypto.randomUUID(),
        event.demoId || event.demo_id || null,
        event.userId || event.user_id || null,
        event.deploymentId || event.deployment_id || null,
        event.eventType || event.event_type || "unknown",
        event.status || "success",
        event.message || "",
        stringifyJson(event.detail || event.detail_json || {}),
        dateOrNull(event.createdAt || event.created_at) || new Date()
      ]);
    }
  });
}

async function readDeploymentJobs() {
  const rows = await query(`
    SELECT * FROM audit_logs
    WHERE action = 'deployment_job'
    ORDER BY created_at DESC
    LIMIT 1000
  `);
  return rows.map((row) => parseJson(row.metadata_json, null)).filter(Boolean);
}

async function replaceDeploymentJobs(jobs) {
  await transaction(async (connection) => {
    await connection.execute("DELETE FROM audit_logs WHERE action = 'deployment_job'");
    for (const job of Array.isArray(jobs) ? jobs : []) {
      await connection.execute(`
        INSERT INTO audit_logs (
          id, action, actor_type, actor_id, target_type, target_id,
          ip, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `job-${job.id || crypto.randomUUID()}`,
        "deployment_job",
        job.actor || "user",
        job.userId || null,
        "deployment_job",
        job.id || null,
        job.ip || null,
        stringifyJson(job),
        dateOrNull(job.updatedAt || job.createdAt) || new Date()
      ]);
    }
  });
}

async function readAuditLogs() {
  const rows = await query(`
    SELECT * FROM audit_logs
    WHERE action NOT IN ('deployment_job', 'email_verification', 'subdomain_request', 'trial_event')
    ORDER BY created_at DESC
    LIMIT 1000
  `);
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    actorType: row.actor_type,
    actorId: row.actor_id || undefined,
    targetType: row.target_type,
    targetId: row.target_id || undefined,
    ip: row.ip || undefined,
    metadata: parseJson(row.metadata_json, {}),
    createdAt: toIso(row.created_at)
  }));
}

async function replaceAuditLogs(logs) {
  await transaction(async (connection) => {
    await connection.execute(`
      DELETE FROM audit_logs
      WHERE action NOT IN ('deployment_job', 'email_verification', 'subdomain_request', 'trial_event')
    `);
    for (const log of Array.isArray(logs) ? logs : []) {
      if (metadataActions.has(log.action)) continue;
      await connection.execute(`
        INSERT INTO audit_logs (
          id, action, actor_type, actor_id, target_type, target_id,
          ip, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        log.id || crypto.randomUUID(),
        log.action || "unknown",
        log.actorType || log.actor_type || "system",
        log.actorId || log.actor_id || null,
        log.targetType || log.target_type || "unknown",
        log.targetId || log.target_id || null,
        log.ip || null,
        stringifyJson(log.metadata || {}),
        dateOrNull(log.createdAt) || new Date()
      ]);
    }
  });
}

async function readMetadataCollection(action, limit = 1000) {
  const rows = await query(`
    SELECT * FROM audit_logs
    WHERE action = ?
    ORDER BY created_at DESC
    LIMIT ${Number(limit) || 1000}
  `, [action]);
  return rows.map((row) => parseJson(row.metadata_json, null)).filter(Boolean);
}

async function replaceMetadataCollection(action, items) {
  await transaction(async (connection) => {
    await connection.execute("DELETE FROM audit_logs WHERE action = ?", [action]);
    for (const item of Array.isArray(items) ? items : []) {
      await connection.execute(`
        INSERT INTO audit_logs (
          id, action, actor_type, actor_id, target_type, target_id,
          ip, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `${action}-${item.id || crypto.randomUUID()}`,
        action,
        item.actorType || "system",
        item.userId || null,
        action,
        item.id || null,
        item.ip || null,
        stringifyJson(item),
        dateOrNull(item.updatedAt || item.createdAt) || new Date()
      ]);
    }
  });
}

async function readFeedback() {
  const rows = await query("SELECT * FROM feedback ORDER BY created_at DESC LIMIT 2000");
  return rows.map((row) => {
    const metadata = parseJson(row.metadata_json, {});
    return {
      ...metadata,
      id: row.id,
      userId: row.user_id,
      userEmail: row.user_email || metadata.userEmail,
      demoId: row.demo_id || null,
      demoSlug: row.demo_slug || null,
      type: row.type || metadata.type || "other",
      message: row.message,
      contact: row.contact || "",
      status: row.status || "open",
      ip: row.ip || undefined,
      createdAt: toIso(row.created_at) || metadata.createdAt,
      updatedAt: toIso(row.updated_at) || metadata.updatedAt
    };
  });
}

async function replaceFeedback(items) {
  await transaction(async (connection) => {
    await connection.execute("DELETE FROM feedback");
    for (const item of Array.isArray(items) ? items : []) {
      await connection.execute(`
        INSERT INTO feedback (
          id, user_id, user_email, demo_id, demo_slug, type, message,
          contact, status, ip, created_at, updated_at, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        item.id || crypto.randomUUID(),
        item.userId || item.user_id,
        item.userEmail || item.user_email || null,
        item.demoId || item.demo_id || null,
        item.demoSlug || item.demo_slug || null,
        item.type || "other",
        item.message || "",
        item.contact || null,
        item.status || "open",
        item.ip || null,
        dateOrNull(item.createdAt) || new Date(),
        dateOrNull(item.updatedAt) || dateOrNull(item.createdAt) || new Date(),
        stringifyJson(item)
      ]);
    }
  });
}

async function readForms() {
  const rows = await query("SELECT * FROM forms ORDER BY created_at DESC LIMIT 2000");
  return rows.map((row) => {
    const metadata = parseJson(row.metadata_json, {});
    return {
      ...metadata,
      id: row.id,
      userId: row.user_id,
      userEmail: row.user_email || metadata.userEmail,
      demoId: row.demo_id || null,
      demoSlug: row.demo_slug || null,
      demoName: row.demo_name || metadata.demoName || "",
      publicToken: row.public_token,
      name: row.name,
      status: row.status || "active",
      fields: parseJson(row.fields_json, metadata.fields || []),
      submissionCount: Number(row.submission_count || metadata.submissionCount || 0),
      createdAt: toIso(row.created_at) || metadata.createdAt,
      updatedAt: toIso(row.updated_at) || metadata.updatedAt
    };
  });
}

async function replaceForms(items) {
  await transaction(async (connection) => {
    await connection.execute("DELETE FROM forms");
    for (const item of Array.isArray(items) ? items : []) {
      await connection.execute(`
        INSERT INTO forms (
          id, user_id, user_email, demo_id, demo_slug, demo_name,
          public_token, name, status, fields_json, submission_count,
          created_at, updated_at, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        item.id || crypto.randomUUID(),
        item.userId || item.user_id,
        item.userEmail || item.user_email || null,
        item.demoId || item.demo_id || null,
        item.demoSlug || item.demo_slug || null,
        item.demoName || item.demo_name || null,
        item.publicToken || item.public_token || crypto.randomBytes(24).toString("hex"),
        item.name || "DemoGo 表单",
        item.status || "active",
        stringifyJson(item.fields || []),
        Number(item.submissionCount || item.submission_count || 0),
        dateOrNull(item.createdAt) || new Date(),
        dateOrNull(item.updatedAt) || dateOrNull(item.createdAt) || new Date(),
        stringifyJson(item)
      ]);
    }
  });
}

async function readFormSubmissions() {
  const rows = await query("SELECT * FROM form_submissions ORDER BY created_at DESC LIMIT 5000");
  return rows.map((row) => {
    const metadata = parseJson(row.metadata_json, {});
    return {
      ...metadata,
      id: row.id,
      formId: row.form_id,
      userId: row.user_id,
      userEmail: row.user_email || metadata.userEmail,
      demoId: row.demo_id || null,
      demoSlug: row.demo_slug || null,
      payload: parseJson(row.payload_json, metadata.payload || {}),
      ip: row.ip || undefined,
      userAgent: row.user_agent || undefined,
      createdAt: toIso(row.created_at) || metadata.createdAt
    };
  });
}

async function replaceFormSubmissions(items) {
  await transaction(async (connection) => {
    await connection.execute("DELETE FROM form_submissions");
    for (const item of Array.isArray(items) ? items : []) {
      await connection.execute(`
        INSERT INTO form_submissions (
          id, form_id, user_id, user_email, demo_id, demo_slug,
          payload_json, ip, user_agent, created_at, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        item.id || crypto.randomUUID(),
        item.formId || item.form_id,
        item.userId || item.user_id,
        item.userEmail || item.user_email || null,
        item.demoId || item.demo_id || null,
        item.demoSlug || item.demo_slug || null,
        stringifyJson(item.payload || {}),
        item.ip || null,
        item.userAgent || item.user_agent || null,
        dateOrNull(item.createdAt) || new Date(),
        stringifyJson(item)
      ]);
    }
  });
}

async function readPlanUpgradeRequests() {
  const rows = await query("SELECT * FROM plan_upgrade_requests ORDER BY created_at DESC LIMIT 2000");
  return rows.map((row) => {
    const metadata = parseJson(row.metadata_json, {});
    return {
      ...metadata,
      id: row.id,
      userId: row.user_id,
      userEmail: row.user_email || metadata.userEmail,
      currentPlan: row.current_plan || metadata.currentPlan || "free",
      requestedPlan: row.requested_plan || metadata.requestedPlan,
      status: row.status || metadata.status || "open",
      contact: row.contact || "",
      message: row.message || "",
      adminNote: row.admin_note || "",
      handledBy: row.handled_by || "",
      handledAt: toIso(row.handled_at) || metadata.handledAt || null,
      createdAt: toIso(row.created_at) || metadata.createdAt,
      updatedAt: toIso(row.updated_at) || metadata.updatedAt
    };
  });
}

async function replacePlanUpgradeRequests(items) {
  await transaction(async (connection) => {
    await connection.execute("DELETE FROM plan_upgrade_requests");
    for (const item of Array.isArray(items) ? items : []) {
      await connection.execute(`
        INSERT INTO plan_upgrade_requests (
          id, user_id, user_email, current_plan, requested_plan, status,
          contact, message, admin_note, handled_by, handled_at,
          created_at, updated_at, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        item.id || crypto.randomUUID(),
        item.userId || item.user_id,
        item.userEmail || item.user_email || null,
        item.currentPlan || item.current_plan || "free",
        item.requestedPlan || item.requested_plan,
        item.status || "open",
        item.contact || null,
        item.message || null,
        item.adminNote || item.admin_note || null,
        item.handledBy || item.handled_by || null,
        dateOrNull(item.handledAt || item.handled_at),
        dateOrNull(item.createdAt) || new Date(),
        dateOrNull(item.updatedAt) || dateOrNull(item.createdAt) || new Date(),
        stringifyJson(item)
      ]);
    }
  });
}

async function readContentReviews() {
  const rows = await query("SELECT * FROM content_reviews ORDER BY created_at DESC LIMIT 5000");
  return rows.map((row) => {
    const metadata = parseJson(row.metadata_json, {});
    return {
      ...metadata,
      id: row.id,
      userId: row.user_id || metadata.userId || null,
      userEmail: row.user_email || metadata.userEmail || "",
      demoId: row.demo_id || metadata.demoId || null,
      demoSlug: row.demo_slug || metadata.demoSlug || "",
      deploymentId: row.deployment_id || metadata.deploymentId || null,
      action: row.action || metadata.action || "",
      actorType: row.actor_type || metadata.actorType || "",
      status: row.status || metadata.status || "passed",
      provider: row.provider || metadata.provider || "local_rules",
      engine: row.engine || metadata.engine || "local_rules",
      summary: row.summary || metadata.summary || "",
      reviewedFileCount: Number(row.reviewed_file_count || metadata.reviewedFileCount || 0),
      findings: parseJson(row.findings_json, metadata.findings || []),
      reviewedFiles: parseJson(row.reviewed_files_json, metadata.reviewedFiles || []),
      projectName: row.project_name || metadata.projectName || "",
      fileName: row.file_name || metadata.fileName || "",
      detectedType: row.detected_type || metadata.detectedType || "",
      resolutionStatus: row.resolution_status || metadata.resolutionStatus || defaultContentReviewResolution(row.status || metadata.status),
      adminNote: row.admin_note || metadata.adminNote || "",
      handledBy: row.handled_by || metadata.handledBy || "",
      handledAt: toIso(row.handled_at) || metadata.handledAt || null,
      createdAt: toIso(row.created_at) || metadata.createdAt
    };
  });
}

async function replaceContentReviews(items) {
  await transaction(async (connection) => {
    await connection.execute("DELETE FROM content_reviews");
    for (const item of Array.isArray(items) ? items : []) {
      await connection.execute(`
        INSERT INTO content_reviews (
          id, user_id, user_email, demo_id, demo_slug, deployment_id,
          action, actor_type, status, provider, engine, summary,
          reviewed_file_count, findings_json, reviewed_files_json,
          project_name, file_name, detected_type, resolution_status,
          admin_note, handled_by, handled_at, created_at, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        item.id || crypto.randomUUID(),
        item.userId || item.user_id || null,
        item.userEmail || item.user_email || null,
        item.demoId || item.demo_id || null,
        item.demoSlug || item.demo_slug || null,
        item.deploymentId || item.deployment_id || null,
        item.action || "create",
        item.actorType || item.actor_type || "user",
        item.status || "passed",
        item.provider || "local_rules",
        item.engine || "local_rules",
        item.summary || "",
        Number(item.reviewedFileCount || item.reviewed_file_count || 0),
        stringifyJson(item.findings || []),
        stringifyJson(item.reviewedFiles || []),
        item.projectName || item.project_name || null,
        item.fileName || item.file_name || null,
        item.detectedType || item.detected_type || null,
        item.resolutionStatus || item.resolution_status || defaultContentReviewResolution(item.status),
        item.adminNote || item.admin_note || null,
        item.handledBy || item.handled_by || null,
        dateOrNull(item.handledAt || item.handled_at),
        dateOrNull(item.createdAt || item.created_at) || new Date(),
        stringifyJson(item)
      ]);
    }
  });
}

function defaultContentReviewResolution(status) {
  return ["blocked", "review_required", "failed"].includes(String(status || "")) ? "pending" : "resolved";
}

function inspectionFromRow(row) {
  if (!row) return undefined;
  return {
    canPublish: Boolean(row.can_publish),
    detectedType: row.detected_type,
    entryFile: row.entry_file,
    hasPackageJson: Boolean(row.has_package_json),
    hasBuildScript: Boolean(row.has_build_script),
    publishableFileCount: Number(row.publishable_file_count || 0),
    publishableBytes: Number(row.publishable_bytes || 0),
    ignoredFiles: parseJson(row.ignored_files_json, []),
    blockedFiles: parseJson(row.blocked_files_json, []),
    apiCalls: parseJson(row.api_calls_json, []),
    formFields: parseJson(row.form_fields_json, []),
    issues: parseJson(row.issues_json, []),
    suggestions: parseJson(row.recommendations_json, []),
    ruleReport: parseJson(row.rule_report_json, null)
  };
}

function groupBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const value = row[key];
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(row);
  }
  return map;
}

function parseJson(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function stringifyJson(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function sanitizeUserMetadata(user) {
  const metadata = { ...(user || {}) };
  delete metadata.passwordHash;
  delete metadata.password_hash;
  return metadata;
}

function dateOrNull(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
