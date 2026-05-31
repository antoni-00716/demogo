// DemoGo v0.9.3 - 管理后台辅助函数（从 server.js 提取）
import { join as pathJoin } from "node:path";
import { dataDir, publicBaseUrl, plans } from "../config.js";
import { readDataFile, writeDataFile } from "../db/mysql-store.js";
import { isExpired, platformHost } from "./slug-utils.js";
import { createExternalBackendConfigStatus, isUnsafeExternalSecretKey, externalBackendEnvValues, externalBackendEnvKeys, publicExternalBackend } from "../services/external-backend-service.js";
import { demoDatabaseEnv, publicDemoDatabase } from "../services/demo-database-service.js";
import { createApplicationReadiness, publicApplicationReadiness } from "../services/application-readiness-service.js";
import { contentReviewStatusLabel } from "../services/content-review-service.js";
import { deploySourceLabel } from "./deploy-helpers.js";
const demosFile = pathJoin(dataDir, "demos.json");
const usersFile = pathJoin(dataDir, "users.json");

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function filterAdminDemos(demos, filters) {
  const search = String(filters.search || "").toLowerCase();
  const status = String(filters.status || "");
  return demos.filter((demo) => {
    if (status && demo.status !== status) return false;
    if (!search) return true;
    return [
      demo.name,
      demo.slug,
      demo.userEmail,
      demo.publicUrl
    ].some((value) => String(value || "").toLowerCase().includes(search));
  });
}

export function publicUserDemo(demo) {
  if (!demo) return demo;
  const runtime = demo.runtime || demo.inspection?.runtime || demo.hosting?.runtime || null;
  const externalBackend = demo.externalBackend || createExternalBackendConfigStatus(demo.inspection || {}, demo.runtimeEnv || {}, demo.externalBackend);
  const enrichedDemo = {
    ...demo,
    runtime,
    externalBackend
  };
  const applicationReadiness = demo.applicationReadiness || createApplicationReadiness({ demo: enrichedDemo, inspection: demo.inspection || {} });
  return {
    ...demo,
    runtime,
    failureDiagnosis: demo.failureDiagnosis || runtime?.failureDiagnosis || demo.inspection?.failureDiagnosis || null,
    database: publicDemoDatabase(demo.database),
    runtimeEnv: publicRuntimeEnv(demo.runtimeEnv),
    runtimeConfig: demo.runtimeConfig || createRuntimeConfigStatus(demo.inspection || {}, demo.runtimeEnv, demo.database),
    externalBackend: publicExternalBackend(externalBackend),
    applicationReadiness: publicApplicationReadiness(applicationReadiness)
  };
}

export function adminDemoSummary(demo) {
  const architecture = demo.architecture || demo.inspection?.projectArchitecture || null;
  const hosting = demo.hosting || demo.inspection?.hosting || architecture?.hosting || null;
  const externalBackend = demo.externalBackend || createExternalBackendConfigStatus(demo.inspection || {}, demo.runtimeEnv || {}, demo.externalBackend);
  const enrichedDemo = {
    ...demo,
    architecture,
    hosting,
    externalBackend
  };
  const applicationReadiness = demo.applicationReadiness || createApplicationReadiness({ demo: enrichedDemo, inspection: demo.inspection || {} });
  return {
    ...demo,
    architecture,
    hosting,
    hostingMode: demo.hostingMode || demo.inspection?.hostingMode || architecture?.projectKind || hosting?.mode || "",
    hostingModeLabel: demo.hostingModeLabel || demo.inspection?.hostingModeLabel || architecture?.projectKindLabel || hosting?.modeLabel || "",
    runtime: demo.runtime || demo.inspection?.runtime || hosting?.runtime || null,
    failureDiagnosis: demo.failureDiagnosis || demo.runtime?.failureDiagnosis || demo.inspection?.failureDiagnosis || null,
    database: publicDemoDatabase(demo.database),
    runtimeEnv: publicRuntimeEnv(demo.runtimeEnv),
    runtimeConfig: demo.runtimeConfig || createRuntimeConfigStatus(demo.inspection || {}, demo.runtimeEnv, demo.database),
    externalBackend: publicExternalBackend(externalBackend),
    applicationReadiness: publicApplicationReadiness(applicationReadiness),
    projectProfile: demo.projectProfile || demo.inspection?.projectProfile || null,
    projectCategory: demo.projectCategory || demo.inspection?.projectCategory || demo.inspection?.projectProfile?.label || "",
    deploySourceLabel: demo.deploySourceLabel || deploySourceLabel(demo.deploySource || "web"),
    riskSummary: summarizeDemoRisks(demo)
  };
}

export function mergeRuntimeEnv(existing = {}, input = {}) {
  const current = sanitizeStoredRuntimeEnv(existing);
  for (const [rawKey, rawValue] of Object.entries(input || {})) {
    const key = normalizeEnvKey(rawKey);
    if (!key || isPlatformEnvKey(key)) continue;
    if (isUnsafeExternalSecretKey(key)) {
      throw createHttpError("Supabase service_role 是高权限密钥，不能保存到 DemoGo。请使用 anon key。", 400);
    }
    const value = String(rawValue ?? "").trim();
    if (!value) {
      delete current[key];
      continue;
    }
    current[key] = {
      value,
      updatedAt: new Date().toISOString()
    };
  }
  return current;
}

export function sanitizeStoredRuntimeEnv(value = {}) {
  const result = {};
  for (const [rawKey, rawRecord] of Object.entries(value || {})) {
    const key = normalizeEnvKey(rawKey);
    if (!key || isPlatformEnvKey(key) || isUnsafeExternalSecretKey(key)) continue;
    const storedValue = typeof rawRecord === "object" && rawRecord !== null ? rawRecord.value : rawRecord;
    if (storedValue === undefined || storedValue === null || String(storedValue) === "") continue;
    result[key] = {
      value: String(storedValue),
      updatedAt: typeof rawRecord === "object" && rawRecord !== null ? rawRecord.updatedAt || null : null
    };
  }
  return result;
}

export function runtimeEnvValues(value = {}) {
  return Object.fromEntries(
    Object.entries(sanitizeStoredRuntimeEnv(value)).map(([key, record]) => [key, record.value])
  );
}

export function publicRuntimeEnv(value = {}) {
  return Object.fromEntries(
    Object.entries(sanitizeStoredRuntimeEnv(value)).map(([key, record]) => [key, {
      configured: true,
      maskedValue: maskSecretValue(record.value),
      updatedAt: record.updatedAt || null
    }])
  );
}

export function createRuntimeConfigStatus(inspection = {}, runtimeEnv = {}, database = null) {
  const required = Array.from(new Set([
    ...((inspection.projectAssessment?.environmentVariables?.required || [])),
    ...((inspection.projectProfile?.environmentVariables?.required || [])),
    ...externalBackendEnvKeys(inspection)
  ].map(normalizeEnvKey).filter(Boolean)));
  const provided = new Set([
    ...Object.keys(publicRuntimeEnv(runtimeEnv)),
    ...Object.keys(demoDatabaseEnv(database || {}))
  ]);
  const missing = required.filter((key) => !isPlatformEnvKey(key) && !provided.has(key));
  return {
    required,
    configured: required.filter((key) => provided.has(key)),
    missing,
    canStart: missing.length === 0,
    status: missing.length ? "missing" : "ready",
    statusLabel: missing.length ? "缺少运行配置" : "运行配置已就绪",
    nextAction: missing.length ? `请补充运行配置：${missing.join("、")}` : "运行配置已满足当前识别结果。"
  };
}

export function runtimeEnvForDemo(demo = {}) {
  return {
    ...demoDatabaseEnv(demo.database),
    ...runtimeEnvValues(demo.runtimeEnv),
    ...externalBackendEnvValues(demo.inspection || {}, demo.runtimeEnv)
  };
}

export function normalizeEnvKey(value) {
  const key = String(value || "").trim().toUpperCase();
  return /^[A-Z_][A-Z0-9_]*$/.test(key) ? key : "";
}

export function isPlatformEnvKey(key) {
  return ["PORT", "NODE_ENV"].includes(String(key || "").toUpperCase());
}

export function maskSecretValue(value) {
  const text = String(value || "");
  if (!text) return "";
  if (text.length <= 6) return "***";
  return `${text.slice(0, 3)}***${text.slice(-3)}`;
}

export function adminRuntimeDemoSummary(demo) {
  const summary = adminDemoSummary(demo);
  return {
    id: summary.id,
    slug: summary.slug,
    name: summary.name,
    userEmail: summary.userEmail,
    status: summary.status,
    publicUrl: summary.publicUrl,
    hostingMode: summary.hostingMode,
    hostingModeLabel: summary.hostingModeLabel,
    runtime: summary.runtime,
    database: summary.database,
    updatedAt: summary.updatedAt,
    createdAt: summary.createdAt,
    expiresAt: summary.expiresAt
  };
}

export function summarizeRuntimeOps(demos = [], runtimeRecords = []) {
  const nodeDemos = demos.filter((demo) => demo.hostingMode === "node_runtime");
  const databaseDemos = demos.filter((demo) => demo.database?.enabled && demo.database?.status !== "deleted");
  return {
    nodeProjects: nodeDemos.length,
    runningRuntimes: runtimeRecords.length,
    stoppedRuntimes: nodeDemos.filter((demo) => {
      const status = String(demo.runtime?.status || demo.hosting?.runtime?.status || "").toLowerCase();
      const stage = String(demo.runtime?.lifecycle?.stage || demo.hosting?.runtime?.lifecycle?.stage || "").toLowerCase();
      return status === "stopped" || stage === "stopped";
    }).length,
    mysqlDatabases: databaseDemos.length,
    mysqlReady: databaseDemos.filter((demo) => demo.database?.status === "ready").length
  };
}

export function summarizeDemoRisks(demo) {
  const inspection = demo.inspection || {};
  const contentReview = demo.contentReview || inspection.contentReview || {};
  const apiCalls = Array.isArray(inspection.apiCalls) ? inspection.apiCalls : [];
  const formFields = Array.isArray(inspection.formFields) ? inspection.formFields : [];
  const blockedFiles = Array.isArray(inspection.blockedFiles) ? inspection.blockedFiles : [];
  const risks = [];

  if (contentReview.status && contentReview.status !== "passed") {
    risks.push({
      type: "content",
      label: contentReviewStatusLabel(contentReview.status)
    });
  }

  if (filterAutoHostableFormFields(formFields).length) {
    risks.push({
      type: "form",
      label: `表单 ${formFields.length} 个字段`
    });
  } else if (formFields.length) {
    risks.push({
      type: "controls",
      label: `填写控件 ${formFields.length} 个`
    });
  }

  if (apiCalls.some((item) => item.isLocal)) {
    risks.push({
      type: "api",
      label: "本地 API"
    });
  }

  const externalBackend = demo.externalBackend || inspection.externalBackend || null;
  if (externalBackend?.provider === "supabase") {
    risks.push({
      type: externalBackend.status === "ready" ? "external_backend" : "external_backend_warning",
      label: externalBackend.statusLabel || "Supabase"
    });
  }

  if (inspection.hasPackageJson && !inspection.hasBuildScript && !inspection.entryFile) {
    risks.push({
      type: "build",
      label: "缺少 build"
    });
  }

  if (blockedFiles.length || inspection.status === "blocked") {
    risks.push({
      type: "blocked",
      label: "曾被阻止"
    });
  }

  return risks;
}
