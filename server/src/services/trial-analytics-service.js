// DemoGo v0.9.3 - 璇曠敤鍒嗘瀽鏈嶅姟锛堜粠 server.js 鎻愬彇锛?
import { join as pathJoin } from "node:path";
import { dataDir } from "../config.js";
import { readDataFile, writeDataFile } from "../db/mysql-store.js";
import { classifyFailureCategory, createFailureDiagnosis } from "./failure-diagnosis-service.js";
import crypto from "node:crypto";

const trialEventsFile = pathJoin(dataDir, "trial-events.json");

export function summarizeFailureReasons(events, contentReviews) {
  const counts = {
    content: contentReviews.filter((item) => item.status === "blocked" || item.status === "review_required").length,
    quota: 0,
    unsupported: 0,
    build: 0,
    other: 0
  };
  for (const event of events || []) {
    const text = `${event.message || ""} ${JSON.stringify(event.detail || {})}`;
    if (/额度|套餐|次数|在线试用项目/.test(text)) counts.quota += 1;
    else if (/暂不支持|后端|数据库|支付|登录|WebSocket|SSR|服务端/.test(text)) counts.unsupported += 1;
    else if (/build|构建|生成命令|npm/.test(text)) counts.build += 1;
    else if (/内容|风险|拦截|人工确认/.test(text)) counts.content += 1;
    else counts.other += 1;
  }
  return counts;
}

export function summarizeTrialFunnel(trialEvents = [], deploymentEvents = [], auditLogs = [], users = []) {
  trialEvents = trialEvents || []; deploymentEvents = deploymentEvents || [];
  const eventCounts = countBy(trialEvents, (item) => item.eventType);
  const deploySuccesses = deploymentEvents.filter((item) => item.eventType === "success" && item.status === "success").length;
  const deployFailures = deploymentEvents.filter((item) => item.status === "failed").length;
  return {
    homeVisits: eventCounts.home_view || 0,
    registerStarts: eventCounts.register_view || 0,
    registerSuccesses: Math.max(eventCounts.register_success || 0, users.length),
    uploadStarts: eventCounts.upload_view || 0,
    inspectPassed: eventCounts.project_inspect_passed || 0,
    inspectFailed: eventCounts.project_inspect_failed || 0,
    deployStarts: eventCounts.deploy_upload_started || 0,
    deploySuccesses: Math.max(eventCounts.deploy_success || 0, deploySuccesses),
    deployFailures: Math.max(eventCounts.deploy_failed || 0, deployFailures),
    aiPublishViews: eventCounts.ai_publish_view || 0,
    aiDeploys: auditLogs.filter((item) => item.action === "agent_deploy_demo" || item.action === "agent_update_demo").length
  };
}

export function summarizeDeploySources(auditLogs = [], demos = []) {
  const counts = {};
  for (const demo of demos || []) {
    const source = demo.deploySource || "web";
    counts[source] = (counts[source] || 0) + 1;
  }
  for (const log of auditLogs || []) {
    const source = log.metadata?.source;
    if (!source || counts[source]) continue;
    counts[source] = 0;
  }
  return counts;
}

export function countBy(items, getter) {
  const resolve = typeof getter === "function" ? getter : (item) => item?.[getter];
  return (Array.isArray(items) ? items : []).reduce((acc, item) => {
    const key = resolve(item);
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export function normalizeTrialEventType(value) {
  const eventType = String(value || "").trim().toLowerCase();
  return new Set([
    "home_view",
    "register_view",
    "register_success",
    "upload_view",
    "ai_publish_view",
    "project_inspect_passed",
    "project_inspect_failed",
    "deploy_upload_started",
    "deploy_success",
    "deploy_failed"
  ]).has(eventType) ? eventType : "";
}

export async function writeTrialEvent(event) {
  const eventType = normalizeTrialEventType(event?.eventType);
  if (!eventType) return;
  const events = await readDataFile(trialEventsFile, []);
  events.unshift({
    id: crypto.randomUUID(),
    eventType,
    userId: event.userId || null,
    userEmail: event.userEmail || null,
    source: String(event.source || "").slice(0, 64),
    path: String(event.path || "").slice(0, 500),
    ip: event.ip || "",
    metadata: sanitizeTrialMetadata(event.metadata),
    createdAt: new Date().toISOString()
  });
  await writeDataFile(trialEventsFile, events.slice(0, 5000));
}

export function sanitizeTrialMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const clean = {};
  for (const [key, item] of Object.entries(value)) {
    if (!/^[a-zA-Z0-9_:-]{1,48}$/.test(key)) continue;
    if (typeof item === "string") clean[key] = item.slice(0, 500);
    else if (typeof item === "number" || typeof item === "boolean" || item === null) clean[key] = item;
  }
  return clean;
}

export function classifyFailureMessage(message = "") {
  return classifyFailureCategory({ message });
}

export function normalizeSubdomainRequestStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  return ["open", "approved", "rejected", "canceled"].includes(status) ? status : "";
}

export function subdomainRequestStatusLabel(status) {
  return {
    open: "待处理",
    approved: "已通过",
    rejected: "已拒绝",
    canceled: "已取消"
  }[status] || "待处理";
}

export function filterSubdomainRequests(requests, filters = {}) {
  const status = normalizeSubdomainRequestStatus(filters.status);
  return (requests || [])
    .filter((item) => !status || item.status === status)
    .map((item) => ({
      ...item,
      statusLabel: subdomainRequestStatusLabel(item.status)
    }));
}

export function summarizeResponseLimits(quota) {
  if (!quota) return null;
  return {
    plan: quota.plan?.name || quota.plan?.code || "",
    onlineDemos: quota.onlineDemos || null,
    monthlyDeploys: quota.monthlyDeploys || null
  };
}


export function attachErrorDiagnosis(error, context = {}) {
  if (!error || typeof error !== "object") {
    return createFailureDiagnosis({ message: "发布失败，请根据提示调整后重试。", ...context });
  }
  const diagnosis = createFailureDiagnosis({
    message: error instanceof Error ? error.message : context.message,
    statusCode: error.statusCode || context.statusCode,
    inspection: error.inspection || context.inspection,
    runtime: error.runtime || context.runtime || error.inspection?.runtime,
    database: error.database || context.database,
    contentReview: error.contentReview || context.contentReview,
    externalBackend: error.externalBackend || context.externalBackend || error.inspection?.externalBackend,
    logs: error.logs || error.buildLog || context.logs,
    databaseError: error.databaseError || context.databaseError,
    ...context
  });
  error.diagnosis = diagnosis;
  if (error.inspection) {
    error.inspection = attachDiagnosisToInspection(error.inspection, diagnosis);
  }
  return diagnosis;
}

export function attachDiagnosisToInspection(inspection, diagnosis) {
  if (!inspection || !diagnosis) return inspection;
  return {
    ...inspection,
    failureDiagnosis: diagnosis,
    fixPrompt: inspection.fixPrompt || diagnosis.aiPrompt,
    ruleReport: {
      ...(inspection.ruleReport || {}),
      fixPrompt: inspection.ruleReport?.fixPrompt || diagnosis.aiPrompt,
      aiPrompt: inspection.ruleReport?.aiPrompt || diagnosis.aiPrompt
    }
  };
}
