import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
const fsPromises = fs;
import path from "node:path";
const pathModule = path;
import process from "node:process";
import cookieParser from "cookie-parser";
import express from "express";
import multer from "multer";
import * as tar from "tar";
import unzipper from "unzipper";
import {
  adminPassword,
  adminUser,
  buildMode,
  buildTimeoutMs,
  contentReviewFailClosed,
  contentReviewExternalEndpoint,
  contentReviewExternalToken,
  contentReviewMaxTextBytes,
  contentReviewMode,
  dataDir,
  demoRoot,
  deployRateLimit,
  deployRateWindowMs,
  dockerCpus,
  dockerImage,
  dockerMemory,
  maxExtractedBytes,
  maxExtractedFiles,
  maxZipSizeMb,
  plans,
  port,
  publicBaseUrl,
  serviceVersion,
  uploadDir,
  usageFlushIntervalMs,
  smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, smtpSecure,
  emailVerificationEnabled
} from "./config.js";
import { isMysqlConfigured, readDataFile, writeDataFile } from "./db/mysql-store.js";
import {
  userDeployEvents
} from "./services/deploy-event-service.js";
import {
  filterFeedback,
  normalizeFeedbackStatus,
  normalizeFeedbackType,
  publicFeedback
} from "./services/feedback-service.js";
import {
  calculateFormQuota,
  defaultFormFields,
  filterAdminForms,
  normalizeFormFields,
  normalizeFormStatus,
  publicForm,
  publicFormSubmission,
  sanitizeSubmissionPayload
} from "./services/form-service.js";
import {
  filterPlanRequests,
  normalizePlanRequestStatus,
  normalizeRequestedPlan,
  publicPlanRequest
} from "./services/plan-request-service.js";
import { calculateQuota as calculateUserQuota, getDeployEvents } from "./services/quota-service.js";
import { adminUserSummary, filterAdminUsers, publicUser } from "./services/user-service.js";
import {
  contentReviewStatusLabel,
  createContentReviewError,
  publicContentReview,
  reviewArchiveContent,
  reviewDirectoryContent
} from "./services/content-review-service.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { createDeploymentJobService } from "./services/deployment-job-service.js";
import { createContentReviewWrappers } from "./services/content-review-wrapper.js";
import { createInspectionBuilder } from "./lib/inspection-builder.js";
import { createBuildService } from "./services/build-service.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerAgentRoutes } from "./routes/agent.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerDemosRoutes } from "./routes/demos.js";
import { registerDeployRoutes } from "./routes/deploy.js";
import { registerFeedbackRoutes } from "./routes/feedback.js";
import { registerFormRoutes } from "./routes/forms.js";
import { registerMiscRoutes } from "./routes/misc.js";
import { registerPlanRoutes } from "./routes/plan-upgrade.js";
import { registerSubdomainRoutes } from "./routes/subdomain.js";
import {
  publicUserDemo, publicRuntimeEnv, mergeRuntimeEnv,
  createRuntimeConfigStatus, runtimeEnvForDemo, summarizeRuntimeOps,
} from "./lib/admin-helpers.js";
import {
  summarizeFailureReasons, summarizeTrialFunnel, summarizeDeploySources,
  countBy, classifyFailureMessage, writeTrialEvent, filterSubdomainRequests,
} from "./services/trial-analytics-service.js";
import { demoSlug } from "./lib/slug-utils.js";
import { readArchiveEntryText } from "./lib/archive-utils.js";
import { createHostingCapabilities } from "./services/hosting-architecture-service.js";
import { stopRuntime, startNodeRuntime } from "./services/runtime-service.js";
import {
  createExternalBackendConfigWithConnection, hasSupabaseProject, publicExternalBackend,
} from "./services/external-backend-service.js";
import { createApplicationReadiness } from "./services/application-readiness-service.js";
import { publicDemoDatabase, resetDemoDatabase } from "./services/demo-database-service.js";
import { createTransport } from "nodemailer";



const app = express();

const blockedExactNames = new Set([
  ".env",
  ".env.local",
  ".env.production",
  "id_rsa",
  "id_dsa"
]);

const ignoredPathParts = new Set([
  ".git",
  ".hg",
  ".svn",
  ".cache",
  ".microcompact",
  ".parcel-cache",
  ".turbo",
  ".next",
  ".nuxt",
  ".vite",
  ".vscode",
  "coverage",
  "node_modules"
]);

const ignoredExactNames = new Set([
  ".DS_Store",
  "Thumbs.db",
  "npm-debug.log",
  "yarn-error.log",
  "pnpm-debug.log"
]);

const ignoredExtensions = new Set([
  ".log",
  ".tmp"
]);

const blockedExtensions = new Set([
  ".key",
  ".pem",
  ".p12",
  ".pfx",
  ".exe",
  ".dll",
  ".sh",
  ".bat",
  ".cmd",
  ".ps1"
]);

await fs.mkdir(uploadDir, { recursive: true });
await fs.mkdir(demoRoot, { recursive: true });
await fs.mkdir(dataDir, { recursive: true });

const usersFile = path.join(dataDir, "users.json");
const sessionsFile = path.join(dataDir, "sessions.json");
const demosFile = path.join(dataDir, "demos.json");
const auditLogsFile = path.join(dataDir, "audit-logs.json");
const feedbackFile = path.join(dataDir, "feedback.json");
const formsFile = path.join(dataDir, "forms.json");
const formSubmissionsFile = path.join(dataDir, "form-submissions.json");
const planRequestsFile = path.join(dataDir, "plan-upgrade-requests.json");
const deploymentEventsFile = path.join(dataDir, "deployment-events.json");
const deploymentJobsFile = path.join(dataDir, "deployment-jobs.json");
const contentReviewsFile = path.join(dataDir, "content-reviews.json");
const emailVerificationsFile = path.join(dataDir, "email-verifications.json");
const trialEventsFile = path.join(dataDir, "trial-events.json");
const subdomainRequestsFile = path.join(dataDir, "subdomain-requests.json");
const verificationCodeTtlMs = 10 * 60 * 1000;
const verificationResendMs = 60 * 1000;

const {
  requireUser, requireAgentToken, requireAdmin,
  readBearerToken, getUserFromRequest, getUserFromAgentToken,
  createSession, createAgentTokenRecord, publicAgentToken,
  parseAgentToken, verifyAgentToken, hashAgentTokenSecret,
  setSessionCookie, normalizeEmail,
  checkLoginFailureRate, recordLoginFailure, clearLoginFailures
} = createAuthMiddleware({ readJson, writeJson, sessionsFile, usersFile, adminUser, adminPassword });

const deploySvc = createDeploymentJobService({ readJson, writeJson, deploymentJobsFile, deploymentEventsFile });
const {
  createDeploymentSteps, markDeploymentStep, completeDeploymentSteps, failedDeploymentSteps,
  appendDeploymentEvents, readDeploymentEventsForDemo,
  findDeploymentJob, publicDeploymentJob,
  createDeploymentJob, runDeploymentJob
} = deploySvc;

const crWrappers = createContentReviewWrappers({
  readJson, writeJson, contentReviewsFile,
  contentReviewMode, contentReviewMaxTextBytes,
  contentReviewExternalEndpoint, contentReviewExternalToken
});
const {
  createAndPersistContentReview, persistPreflightContentReview,
  attachContentReviewToInspection,
  contentReviewResolutionStatus, normalizeContentReviewResolutionStatus,
  publicAdminContentReview, contentReviewResolutionStatusLabel
} = crWrappers;

const inspBuilder = createInspectionBuilder({
  isSupportedArchiveName, detectArchiveType
});
const {
  createInspectionSummary, createProjectError,
  createInvalidZipInspection, createInvalidArchiveInspection,
  inspectionTypeLabel, createUserFacingInspection,
  extractFormFields, extractApiCalls, isCollectableFormField
} = inspBuilder;

const buildSvc = createBuildService({
  exists, createProjectError, inspectionTypeLabel, createUserFacingInspection
});
const {
  detectBuildAndNormalizeOutput, findPublishableOutput,
  summarizePublishedDirectory, promoteDirectory,
  ensureAutoHostedForm, filterAutoHostableFormFields, injectAutoFormScript,
  buildNodeProject, buildNodeProjectOnHost, buildNodeProjectInDocker,
  runCommand, commandAvailable, explainBuildError,
  injectTrackingScript, recordDemoVisit, flushUsageStats,
  formatBytes, stripBom
} = buildSvc;

const hostingConfig = createHostingCapabilities();

const deploySourceLabels = {
  web: "网页上传",
  cli: "DemoGo CLI",
  mcp: "DemoGo MCP",
  agent_api: "AI 助手 API"
};

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: maxZipSizeMb * 1024 * 1024,
    files: 1
  },
  fileFilter: (_req, file, cb) => {
    const isSupported = isSupportedArchiveName(file.originalname);
    cb(isSupported ? null : new Error("当前仅支持 .zip、.tar.gz、.tgz 项目包"), isSupported);
  }
});

const uploadProjectArchive = [
  upload.fields([
    { name: "project", maxCount: 1 },
    { name: "file", maxCount: 1 },
    { name: "package", maxCount: 1 }
  ]),
  (req, _res, next) => {
    req.file = req.files?.project?.[0] || req.files?.file?.[0] || req.files?.package?.[0] || null;
    next();
  }
];

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use("/d", express.static(demoRoot));


// --- Runtime helpers ---

async function restartDemoRuntime(demo) {
  if (!demo) throw new Error("未找到项目");
  try {
    await stopRuntime(demo.slug);
  } catch { /* ignore stop errors */ }
  const runtime = await startNodeRuntime(demo, hostingConfig);
  return { demo, runtime };
}

// --- Deployment handler functions (v0.9.3) ---

async function handleCreateDeployment(req, res, next, opts = {}) {
  const { actor = "user" } = opts;
  const uploadedFile = req.file;
  if (!uploadedFile) {
    return res.status(400).json({ error: "请上传 .zip、.tar.gz 或 .tgz 项目包" });
  }
  try {
    const job = await createDeploymentJob({
      user: req.user,
      action: "create",
      requestedName: String(req.body?.name || "").trim(),
      file: uploadedFile,
      ip: getClientIp(req),
      actor,
      deploySource: detectDeploySource(req, actor)
    });
    await writeTrialEvent({
      eventType: "deploy_upload_started",
      userId: req.user.id,
      userEmail: req.user.email,
      source: detectDeploySource(req, actor),
      path: req.path,
      ip: getClientIp(req),
      metadata: { jobId: job.id, fileName: uploadedFile.originalname }
    });
    res.status(202).json({ job: publicDeploymentJob(job) });
    runDeploymentJob(job.id).catch((error) => {
      console.error("Deployment job failed", error);
    });
  } catch (error) {
    next(error);
  }
}

async function handleUpdateDeployment(req, res, next, opts = {}) {
  const { actor = "user", demoRef = "" } = opts;
  const uploadedFile = req.file;
  if (!uploadedFile) {
    return res.status(400).json({ error: "请上传 .zip、.tar.gz 或 .tgz 项目包" });
  }
  try {
    const demoId = demoRef || req.params.id || "";
    const job = await createDeploymentJob({
      user: req.user,
      action: "update",
      demoId,
      requestedName: "",
      file: uploadedFile,
      ip: getClientIp(req),
      actor,
      deploySource: detectDeploySource(req, actor)
    });
    await writeTrialEvent({
      eventType: "deploy_update_started",
      userId: req.user.id,
      userEmail: req.user.email,
      source: detectDeploySource(req, actor),
      path: req.path,
      ip: getClientIp(req),
      metadata: { jobId: job.id, demoId, fileName: uploadedFile.originalname }
    });
    res.status(202).json({ job: publicDeploymentJob(job) });
    runDeploymentJob(job.id).catch((error) => {
      console.error("Deployment job failed", error);
    });
  } catch (error) {
    next(error);
  }
}

async function performUpdateDeployment({ demoId, uploadedFile, user, clientIp }) {
  const job = await createDeploymentJob({
    user,
    action: "update",
    demoId,
    requestedName: "",
    file: uploadedFile,
    ip: clientIp,
    actor: "user",
    deploySource: "web"
  });
  await writeTrialEvent({
    eventType: "deploy_update_started",
    userId: user.id,
    userEmail: user.email,
    source: "web",
    path: "/api/demos/" + demoId,
    ip: clientIp,
    metadata: { jobId: job.id, demoId, fileName: uploadedFile.originalname }
  });
  runDeploymentJob(job.id).catch((error) => {
    console.error("Deployment job failed", error);
  });
  return { job: publicDeploymentJob(job) };
}

// --- End route registrations ---
// --- Route module registrations (v0.9.3) ---
registerAdminRoutes(app, { requireAdmin, readJson, writeJson, usersFile, demosFile, feedbackFile, planRequestsFile, formsFile, formSubmissionsFile, contentReviewsFile, auditLogsFile, deploymentEventsFile, trialEventsFile, flushUsageStats, filterAdminUsers, filterAdminDemos, filterAdminForms, filterSubdomainRequests, adminUserSummary, adminDemoSummary, calculateQuota: calculateUserQuota, publicUserDemo, publicDeploymentJob, publicForm, publicFeedback, publicAdminContentReview, publicRuntimeEnv, publicBaseUrl, summarizeFailureReasons, summarizeDeploySources, summarizeTrialFunnel, summarizeRuntimeOps, contentReviewResolutionStatus, countBy, demoSlug, removeDemoFiles, deleteDemoFiles, writeAuditLog, writeTrialEvent, getClientIp, readDeploymentEventsForDemo, findDeploymentJob });
registerAgentRoutes(app, { requireAgentToken, uploadProjectArchive, inspectProjectArchive, handleCreateDeployment, handleUpdateDeployment, readJson, writeJson, demosFile, deploymentJobsFile, getClientIp, classifyFailureMessage, createContentReviewRecord: createAndPersistContentReview, contentReviewResolutionStatus: crWrappers.contentReviewResolutionStatus, publicContentReview: crWrappers.publicAdminContentReview, writeAuditLog, writeTrialEvent, readDeploymentEventsForDemo, publicUserDemo });
registerAuthRoutes(app, { requireUser, requireAgentToken, emailVerificationEnabled, verificationCodeTtlMs, verificationResendMs, readJson, writeJson, usersFile, sessionsFile, emailVerificationsFile, demosFile, isEmailConfigured, normalizeEmail, hashPassword, verifyPassword, hashVerificationCode, verifyEmailCode, markEmailCodeUsed, sendVerificationEmail, createSession, setSessionCookie, checkLoginFailureRate, recordLoginFailure, clearLoginFailures, createAgentTokenRecord, publicAgentToken, getUserFromRequest, getClientIp, writeTrialEvent, writeAuditLog, publicUser, publicUserDemo, calculateQuota: calculateUserQuota });
registerDemosRoutes(app, { requireUser, readJson, writeJson, demosFile, getUserFromRequest, flushUsageStats, calculateQuota: calculateUserQuota, publicUserDemo, readDeploymentEventsForDemo, demoRoot, exists, getArchivedDemoDir, stopRuntime, removeDemoFiles, deleteDemoFiles, startNodeRuntime, hostingConfig, runtimeEnvForDemo, writeAuditLog, writeTrialEvent, getClientIp, publicBaseUrl, expireDemoFiles, userDeployEvents, uploadProjectArchive, performUpdateDeployment, createDeploymentJob, findDeploymentJob, publicDeploymentJob, runDeploymentJob, restartDemoRuntime, mergeRuntimeEnv, createRuntimeConfigStatus, createExternalBackendConfigWithConnection, hasSupabaseProject, publicExternalBackend, createApplicationReadiness, publicRuntimeEnv, publicDemoDatabase, resetDemoDatabase, fs: fsPromises });
registerDeployRoutes(app, { requireUser, uploadProjectArchive, inspectProjectArchive, classifyFailureMessage, writeTrialEvent, getClientIp, fs: fsPromises, createDeploymentJob, publicDeploymentJob, runDeploymentJob });
registerFeedbackRoutes(app, { requireUser, readJson, writeJson, feedbackFile, writeAuditLog, getClientIp });
registerFormRoutes(app, { requireUser, readJson, writeJson, formsFile, formSubmissionsFile, demosFile, writeAuditLog, getClientIp, publicBaseUrl, writeTrialEvent });
registerMiscRoutes(app);
registerPlanRoutes(app, { requireUser, readJson, writeJson, planRequestsFile, writeAuditLog, getClientIp });
registerSubdomainRoutes(app, { requireUser, readJson, writeJson, subdomainRequestsFile, demosFile, writeAuditLog, getClientIp, publicBaseUrl });

app.post("/api/deploy", requireUser, uploadProjectArchive, async (req, res, next) => {
  return handleCreateDeployment(req, res, next, { actor: "user" });
});

app.use((error, _req, res, _next) => {
  let message = error instanceof Error ? error.message : "发布失败";
  let statusCode = error.statusCode || (message.includes("仅支持") || message.includes("不支持") || message.includes("超出") ? 400 : 500);
  if (error instanceof multer.MulterError) {
    statusCode = 400;
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      message = "上传字段不正确。请把项目包放在 project 字段中；为兼容 AI 工具，file 和 package 字段也可以使用。";
    } else if (error.code === "LIMIT_FILE_SIZE") {
      message = `项目包体积过大，当前最多支持 ${maxZipSizeMb}MB。`;
    } else {
      message = "项目包上传失败，请确认只上传一个 .zip、.tar.gz 或 .tgz 文件。";
    }
  }
  res.status(statusCode).json({
    error: message,
    inspection: error.inspection,
    contentReview: publicContentReview(error.contentReview),
    deploymentEvents: error.deploymentEvents || undefined
  });
});

app.listen(port, () => {
  console.log(`DemoGo server listening on ${port}`);
});

async function createAvailableSlug(input, existingDemos = [], options = {}) {
  const base = slugBaseForPlan(input, options.planCode);
  let slug = base;
  let index = 1;
  const reservedSlugs = new Set(existingDemos.map((demo) => demo.slug).filter(Boolean));

  while (reservedSlugs.has(slug) || await exists(path.join(demoRoot, slug)) || await exists(getArchivedDemoDir(slug))) {
    index += 1;
    slug = `${base}-${index}`;
  }

  return slug;
}

function slugBaseForPlan(input, planCode = "free") {
  if (!canUseReadableSlug(planCode)) return `try-${crypto.randomBytes(4).toString("hex")}`;
  return slugify(input) || `demo-${crypto.randomBytes(3).toString("hex")}`;
}

function canUseReadableSlug(planCode = "free") {
  return ["lite", "pro"].includes(String(planCode || "free").toLowerCase());
}

function canUseCustomDomain(planCode = "free") {
  return String(planCode || "free").toLowerCase() === "pro";
}

function linkModeForPlan(planCode = "free") {
  return canUseReadableSlug(planCode) ? "readable" : "random";
}

function inferProjectDisplayName({ requestedName, uploadedFileName, inspection }) {
  const candidates = [
    requestedName,
    inspection?.projectTitle,
    inspection?.pageHeading,
    stripArchiveExtension(inspection?.singleHtmlEntry || ""),
    stripArchiveExtension(uploadedFileName)
  ].map(cleanProjectName).filter(Boolean);

  const strong = candidates.find((name) => !isGenericProjectName(name));
  return (strong || candidates[0] || "DemoGo 试用项目").slice(0, 80);
}

function cleanProjectName(value) {
  return decodeHtmlEntities(String(value || ""))
    .replace(/\s+/g, " ")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .trim();
}

function isGenericProjectName(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u4e00-\u9fa5-]+/g, "");
  return [
    "demogo",
    "demo",
    "project",
    "test",
    "app",
    "site",
    "website",
    "dist",
    "build",
    "out",
    "public",
    "my-app",
    "react-app",
    "vite-project"
  ].includes(normalized);
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
}

function slugify(input) {
  return String(input)
    .toLowerCase()
    .replace(/\.zip$/i, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}





function detectDeploySource(req, actor = "user") {
  if (actor !== "agent") return "web";
  const requested = normalizeDeploySource(req.body?.source || req.get("x-demogo-deploy-source"));
  if (requested) return requested;
  const userAgent = String(req.get("user-agent") || "").toLowerCase();
  if (userAgent.includes("demogo-mcp")) return "mcp";
  if (userAgent.includes("demogo-cli")) return "cli";
  return "agent_api";
}

function normalizeDeploySource(value) {
  const source = String(value || "").trim().toLowerCase();
  return ["web", "cli", "mcp", "agent_api"].includes(source) ? source : "";
}

function deploySourceLabel(source) {
  return deploySourceLabels[source] || deploySourceLabels.agent_api;
}


function loginFailureKey(email, ip) {
  return `${email || "unknown"}|${ip || "unknown"}`;
}


function filterAdminDemos(demos, filters) {
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

function adminDemoSummary(demo) {
  return {
    ...demo,
    deploySourceLabel: demo.deploySourceLabel || deploySourceLabel(demo.deploySource || "web"),
    riskSummary: summarizeDemoRisks(demo)
  };
}

function summarizeDemoRisks(demo) {
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


function mergeContentReviews(sourceReview, outputReview) {
  if (!outputReview) return { ...sourceReview, scope: "source_archive" };
  const findings = [
    ...(sourceReview.findings || []).map((item) => ({ ...item, scope: "source_archive" })),
    ...(outputReview.findings || []).map((item) => ({ ...item, scope: "published_output" }))
  ];
  const status = findings.some((item) => item.severity === "block")
    ? "blocked"
    : findings.some((item) => item.severity === "review")
      ? "review_required"
      : "passed";
  return {
    ...sourceReview,
    id: sourceReview.id || crypto.randomUUID(),
    status,
    summary: status === "passed"
      ? "内容检查通过，可以继续生成试用链接。"
      : summarizeMergedContentReview(status, findings),
    findings,
    reviewedFiles: Array.from(new Set([...(sourceReview.reviewedFiles || []), ...(outputReview.reviewedFiles || [])])).slice(0, 120),
    reviewedFileCount: Number(sourceReview.reviewedFileCount || 0) + Number(outputReview.reviewedFileCount || 0),
    scannedTextBytes: Number(sourceReview.scannedTextBytes || 0) + Number(outputReview.scannedTextBytes || 0),
    scope: "source_and_output"
  };
}

function summarizeMergedContentReview(status, findings) {
  const categories = Array.from(new Set(findings.map((item) => item.category))).slice(0, 3).join("、");
  if (status === "blocked") return `内容检查未通过，发现 ${categories || "高风险内容"}。`;
  return `内容需要人工确认，发现 ${categories || "疑似风险内容"}。`;
}

async function persistContentReview(record) {
  const reviews = await readJson(contentReviewsFile, []);
  reviews.unshift(record);
  await writeJson(contentReviewsFile, reviews.slice(0, 5000));
  if (record.status !== "passed") {
    await writeAuditLog({
      action: "content_review_blocked",
      actorType: record.actorType || "system",
      actorId: record.userId || null,
      targetType: "content_review",
      targetId: record.id,
      metadata: {
        status: record.status,
        summary: record.summary,
        demoId: record.demoId,
        demoSlug: record.demoSlug,
        projectName: record.projectName,
        categories: Array.from(new Set((record.findings || []).map((item) => item.category))).slice(0, 5)
      }
    });
  }
}


function createContentReviewFixPrompt(review) {
  if (!review || review.status === "passed") return "";
  const findings = (review.findings || []).slice(0, 5);
  return [
    "请帮我修改这个页面，使它适合公开分享和试用。",
    "要求：删除或改写可能涉及诈骗、博彩、色情低俗、违法交易、恶意下载、敏感信息收集、诱导私聊或真实支付的内容。",
    findings.length ? `本次检查提示：${findings.map((item) => `${item.category}${item.sourceFile ? `（${item.sourceFile}）` : ""}`).join("、")}。` : "",
    "修改后重新打包上传到 DemoGo。"
  ].filter(Boolean).join("\n");
}

function contentReviewUserSummary(review) {
  if (review?.status === "review_required") {
    return "这个页面包含需要平台确认的内容，暂时不能公开分享。请先按提示修改，或联系平台处理。";
  }
  if (review?.status === "failed") {
    return "发布前内容检查没有完成，为避免风险，暂时不能生成公开链接。请稍后重试或联系平台处理。";
  }
  return "这个页面包含不适合公开分享的高风险内容，请先修改后再重新上传。";
}

function defaultContentReviewResolutionStatus(status) {
  return ["blocked", "review_required", "failed"].includes(String(status || "")) ? "pending" : "resolved";
}


function calculateQuota(user, allDemos) {
  return calculateUserQuota(user, allDemos, isExpired);
}

function canUpgradePlan(currentPlan, requestedPlan) {
  const rank = { free: 0, lite: 1, pro: 2 };
  return (rank[requestedPlan] ?? 0) > (rank[currentPlan || "free"] ?? 0);
}

async function expireDemos() {
  const demos = await readJson(demosFile, []);
  let changed = false;

  for (const demo of demos) {
    if ((demo.status === "published" || demo.status === "offline") && isExpired(demo)) {
      await expireDemoFiles(demo.slug);
      demo.status = "expired";
      demo.expiredAt = new Date().toISOString();
      changed = true;
      await writeAuditLog({
        action: "expire_demo",
        actorType: "system",
        targetType: "demo",
        targetId: demo.id,
        metadata: { slug: demo.slug }
      });
    }
  }

  if (changed) {
    await writeJson(demosFile, demos);
  }
}

function isExpired(demo) {
  return demo.expiresAt && new Date(demo.expiresAt) <= new Date();
}

async function removeDemoFiles(slug) {
  const liveDir = path.join(demoRoot, slug);
  const archiveDir = getArchivedDemoDir(slug);
  await fs.rm(archiveDir, { recursive: true, force: true });
  if (await exists(liveDir)) {
    await fs.mkdir(path.dirname(archiveDir), { recursive: true });
    await fs.cp(liveDir, archiveDir, { recursive: true });
    await fs.rm(liveDir, { recursive: true, force: true });
  }
}

async function expireDemoFiles(slug) {
  await fs.rm(path.join(demoRoot, slug), { recursive: true, force: true });
  await fs.rm(getArchivedDemoDir(slug), { recursive: true, force: true });
}

async function deleteDemoFiles(slug) {
  await fs.rm(path.join(demoRoot, slug), { recursive: true, force: true });
  await fs.rm(getArchivedDemoDir(slug), { recursive: true, force: true });
}

function getArchivedDemoDir(slug) {
  return path.join(dataDir, "offline-demos", slug);
}

async function checkDeployRateLimit(user, ip) {
  const logs = await readJson(auditLogsFile, []);
  const cutoff = Date.now() - deployRateWindowMs;
  const recent = logs.filter((log) => {
    if (log.action !== "deploy_demo" && log.action !== "update_demo") return false;
    if (new Date(log.createdAt).getTime() < cutoff) return false;
    return log.actorId === user.id || log.ip === ip;
  });
  return {
    allowed: recent.length < deployRateLimit,
    used: recent.length,
    limit: deployRateLimit
  };
}

async function writeAuditLog(log) {
  const logs = await readJson(auditLogsFile, []);
  logs.unshift({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...log
  });
  await writeJson(auditLogsFile, logs.slice(0, 1000));
}


function getClientIp(req) {
  return String(req.get("x-forwarded-for") || req.socket.remoteAddress || "")
    .split(",")[0]
    .trim();
}

function isEmailConfigured() {
  return Boolean(smtpHost && smtpUser && smtpPass && smtpFrom);
}

async function sendVerificationEmail(email, code) {
  if (!isEmailConfigured()) throw new Error("邮件服务未配置");
  const transport = createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: { user: smtpUser, pass: smtpPass }
  });
  await transport.sendMail({
    from: smtpFrom,
    to: email,
    subject: "DemoGo 邮箱验证码",
    text: "您的 DemoGo 验证码是：" + code + "，有效期 10 分钟。"
  });
}

async function verifyPassword(password, storedHash) {
  try {
    const [salt, hash] = storedHash.split(":");
    const attempt = await scrypt(password, salt);
    return attempt === hash;
  } catch {
    return false;
  }
}

async function hashVerificationCode(code, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(code, salt, 64, (error, key) => {
      if (error) reject(error);
      else resolve(key.toString("hex"));
    });
  });
}

async function verifyEmailCode(email, code, purpose = "register") {
  const records = await readJson(emailVerificationsFile, []);
  const now = Date.now();
  const found = records.find((item) =>
    item.email === email && item.purpose === purpose && !item.usedAt && new Date(item.expiresAt).getTime() > now
  );
  if (!found) return { ok: false, error: "验证码无效或已过期" };
  const hash = await hashVerificationCode(code, found.salt);
  if (hash !== found.codeHash) return { ok: false, error: "验证码错误" };
  return { ok: true };
}

async function markEmailCodeUsed(email, code, purpose = "register") {
  const records = await readJson(emailVerificationsFile, []);
  const now = Date.now();
  const index = records.findIndex((item) =>
    item.email === email && item.purpose === purpose && !item.usedAt && new Date(item.expiresAt).getTime() > now
  );
  if (index < 0) return;
  records[index].usedAt = new Date().toISOString();
  await writeJson(emailVerificationsFile, records);
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt);
  return `${salt}:${hash}`;
}

function scrypt(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => {
      if (error) reject(error);
      else resolve(key.toString("hex"));
    });
  });
}

async function readJson(filePath, fallback) {
  if (isMysqlConfigured()) {
    return readDataFile(filePath, fallback);
  }

  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(stripBom(content));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson(filePath, value) {
  if (isMysqlConfigured()) {
    const handled = await writeDataFile(filePath, value);
    if (handled) return;
  }

  const tempFile = `${filePath}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(tempFile, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tempFile, filePath);
}

async function inspectProjectArchive(archivePath, fileName = "") {
  const analysis = await analyzeArchiveEntries(archivePath, fileName, { keepTempFiles: true });
  try {
    const inspection = createInspectionSummary(analysis);
    const review = await reviewArchiveContent(analysis, {
      mode: contentReviewMode,
      maxTextBytes: contentReviewMaxTextBytes,
      externalEndpoint: contentReviewExternalEndpoint,
      externalToken: contentReviewExternalToken,
      readText: readArchiveEntryText
    });
    return attachContentReviewToInspection(inspection, review);
  } finally {
    await cleanupArchiveAnalysis(analysis);
  }
}

async function extractStaticDemo(archivePath, targetDir, options = {}) {
  const steps = options.steps || [];
  const analysis = await analyzeArchiveEntries(archivePath, options.fileName, { keepTempFiles: true });
  try {
  markDeploymentStep(steps, "extract", "success", `解压文件完成，识别到 ${analysis.rawFileCount} 个文件`, { archiveType: analysis.archiveType });
  markDeploymentStep(steps, "security_check", analysis.blockedFiles.length ? "failed" : "success", analysis.blockedFiles.length ? "安全检查未通过" : "安全检查通过", {
    ignoredFiles: analysis.ignoredFiles,
    blockedFiles: analysis.blockedFiles
  });
  const inspection = createInspectionSummary(analysis);
  markDeploymentStep(steps, "inspect", inspection.canPublish ? "success" : "failed", inspection.summary, {
    detectedType: inspection.detectedType,
    entryFile: inspection.entryFile
  });
  const files = analysis.publishableEntries;

  if (!inspection.canPublish) {
    throw createProjectError(inspection, inspection.issues[0] || inspection.summary);
  }

  if (files.length === 0) {
    throw createProjectError(inspection, "压缩包内没有可发布文件");
  }

  if (files.length > maxExtractedFiles) {
    throw createProjectError(inspection, `项目包内需要发布的文件过多，当前最多支持 ${maxExtractedFiles} 个文件。请删除无关资源后重新上传。`);
  }

  const commonRoot = analysis.commonRoot;
  let extractedBytes = 0;
  let fileCount = 0;

  for (const item of files) {
    const entry = item.entry;
    const relativePath = item.relativePath;

    if (!relativePath || relativePath.endsWith("/")) {
      continue;
    }

    extractedBytes += Number(item.bytes || entry?.uncompressedSize || 0);

    if (extractedBytes > maxExtractedBytes) {
      throw createProjectError(inspection, `项目包体积过大，当前最多支持 ${formatBytes(maxExtractedBytes)}。请压缩图片或删除无关文件后重新上传。`);
    }

    const destination = path.resolve(targetDir, relativePath);
    const targetRoot = path.resolve(targetDir);

    if (!destination.startsWith(`${targetRoot}${path.sep}`)) {
      throw new Error("压缩包包含不安全路径");
    }

    await fs.mkdir(path.dirname(destination), { recursive: true });
    await writeArchiveEntry(item, destination);
    fileCount += 1;
  }

  const result = await detectBuildAndNormalizeOutput(targetDir, inspection);
  markDeploymentStep(steps, "build", result.buildLog ? "success" : "skipped", result.buildLog ? "自动构建完成" : "无需构建，直接发布静态文件", { detectedType: result.detectedType });
  const publishableStats = await summarizePublishedDirectory(targetDir);
  const finalInspection = {
    ...inspection,
    detectedType: result.detectedType,
    label: inspectionTypeLabel(result.detectedType),
    entryFile: result.detectedType === "single-html" ? "index.html" : inspection.entryFile,
    publishableFileCount: publishableStats.fileCount || fileCount,
    publishableBytes: publishableStats.totalBytes || extractedBytes,
    ...createUserFacingInspection({
      ...inspection,
      status: "pass",
      detectedType: result.detectedType,
      issues: inspection.issues || []
    })
  };
  const contentReview = await createAndPersistContentReview({
    analysis,
    inspection: finalInspection,
    fileName: options.fileName,
    actor: options.actor,
    action: options.action,
    user: options.user,
    demo: options.demo,
    projectName: options.projectName,
    deploymentId: options.deploymentId,
    targetDir
  });
  finalInspection.contentReview = publicContentReview(contentReview);
  markDeploymentStep(
    steps,
    "content_review",
    contentReview.status === "passed" ? "success" : "failed",
    contentReview.summary,
    { contentReviewId: contentReview.id, contentReviewStatus: contentReview.status }
  );
  if (contentReview.status !== "passed" && contentReviewFailClosed) {
    const error = createProjectError(finalInspection, contentReview.summary);
    error.contentReview = contentReview;
    throw error;
  }
  await injectTrackingScript(targetDir, result.detectedType);
  markDeploymentStep(steps, "publish", "success", "发布文件准备完成", { fileCount, extractedBytes });
  markDeploymentStep(steps, "success", "success", "发布成功，访问地址已生成");
  return {
    detectedType: result.detectedType,
    buildLog: result.buildLog,
    fileCount: publishableStats.fileCount || fileCount,
    extractedBytes: publishableStats.totalBytes || extractedBytes,
    ignoredFiles: analysis.ignoredFiles,
    contentReview,
    inspection: finalInspection
  };
  } finally {
    await cleanupArchiveAnalysis(analysis);
  }
}

async function promoteSingleHtmlEntry(targetDir, entryFile) {
  if (!entryFile || entryFile === "index.html" || entryFile.includes("/")) return false;
  const source = path.join(targetDir, entryFile);
  const destination = path.join(targetDir, "index.html");
  if (!await exists(source) || await exists(destination)) return false;
  await fs.copyFile(source, destination);
  return true;
}

function isSupportedArchiveName(fileName) {
  const lower = String(fileName || "").toLowerCase();
  return lower.endsWith(".zip") || lower.endsWith(".tar.gz") || lower.endsWith(".tgz");
}

function detectArchiveType(fileName) {
  const lower = String(fileName || "").toLowerCase();
  if (lower.endsWith(".tar.gz") || lower.endsWith(".tgz")) return "tar.gz";
  return "zip";
}

function looksLikeAssetRequest(requestPath) {
  const lastPart = String(requestPath || "").split("/").pop() || "";
  return /\.[a-z0-9]{1,12}$/i.test(lastPart);
}

function stripArchiveExtension(fileName) {
  return String(fileName || "")
    .replace(/\.html?$/i, "")
    .replace(/\.tar\.gz$/i, "")
    .replace(/\.tgz$/i, "")
    .replace(/\.zip$/i, "");
}

async function analyzeArchiveEntries(archivePath, fileName = "", options = {}) {
  const archiveType = detectArchiveType(fileName || archivePath);
  return archiveType === "tar.gz"
    ? analyzeTarEntries(archivePath, options)
    : analyzeZipEntries(archivePath);
}

async function cleanupArchiveAnalysis(analysis) {
  if (analysis?.archiveType === "tar.gz" && analysis.tempDir) {
    await fs.rm(analysis.tempDir, { recursive: true, force: true });
  }
}

async function writeArchiveEntry(item, destination) {
  if (item.archiveType === "tar.gz") {
    await fs.copyFile(item.tempPath, destination);
    return;
  }
  await new Promise((resolve, reject) => {
    item.entry
      .stream()
      .pipe(createWriteStream(destination))
      .on("finish", resolve)
      .on("error", reject);
  });
}

function normalizeZipPath(zipEntryPath) {
  return zipEntryPath.replace(/\\/g, "/").replace(/^\/+/, "");
}

function findCommonRoot(paths) {
  const firstParts = paths[0]?.split("/") || [];
  if (firstParts.length <= 1) return "";
  const root = firstParts[0];
  return paths.every((item) => item.startsWith(`${root}/`)) ? root : "";
}

function stripCommonRoot(entryPath, commonRoot) {
  if (!commonRoot) return entryPath;
  return entryPath === commonRoot ? "" : entryPath.slice(commonRoot.length + 1);
}

function emptyArchiveAnalysis(archiveType = "zip") {
  return {
    archiveType,
    rawFileCount: 0,
    rawBytes: 0,
    publishableEntries: [],
    publishableFileCount: 0,
    publishableBytes: 0,
    ignoredFiles: [],
    blockedFiles: [],
    rootEntries: [],
    commonRoot: "",
    paths: [],
    entryFile: null,
    projectTitle: "",
    pageHeading: "",
    hasPackageJson: false,
    hasBuildScript: false,
    formFields: [],
    apiCalls: []
  };
}

async function analyzeZipEntries(zipPath) {
  let directory;
  try {
    directory = await unzipper.Open.file(zipPath);
  } catch (error) {
    throw createProjectError(createInvalidZipInspection(error), "压缩包不完整或格式异常，DemoGo 无法读取项目文件。");
  }
  const rawFiles = directory.files.filter((entry) => entry.type === "File");

  if (rawFiles.length === 0) {
    return {
      ...emptyArchiveAnalysis("zip")
    };
  }

  const unsafeEntry = rawFiles.find((entry) => !isSafeArchivePath(entry.path));
  if (unsafeEntry) {
    const inspection = createInvalidArchiveInspection("ZIP", `压缩包包含不安全条目：${unsafeEntry.path}`);
    throw createProjectError(inspection, "压缩包包含不安全路径，DemoGo 已拒绝处理。");
  }

  const normalizedPaths = rawFiles.map((entry) => normalizeZipPath(entry.path));
  const commonRoot = findCommonRoot(normalizedPaths);
  const publishableEntries = [];
  const ignoredFiles = [];
  const blockedFiles = [];
  const textEntries = [];
  let packageJsonInfo = { hasPackageJson: false, hasBuildScript: false };
  let rawBytes = 0;
  let publishableBytes = 0;

  for (const entry of rawFiles) {
    const normalized = normalizeZipPath(entry.path);
    const relativePath = stripCommonRoot(normalized, commonRoot);
    const bytes = Number(entry.uncompressedSize || 0);
    rawBytes += bytes;

    if (!relativePath || relativePath.endsWith("/")) {
      continue;
    }

    const pathIssue = classifyEntryPath(relativePath);
    if (pathIssue.action === "block") {
      blockedFiles.push({ path: relativePath, reason: pathIssue.reason });
      continue;
    }
    if (pathIssue.action === "ignore") {
      ignoredFiles.push({ path: relativePath, reason: pathIssue.reason });
      continue;
    }

    publishableEntries.push({ archiveType: "zip", entry, relativePath, bytes });
    publishableBytes += bytes;
    if (shouldAnalyzeTextFile(relativePath, bytes)) {
      textEntries.push({ archiveType: "zip", entry, relativePath, bytes });
    }
  }

  const paths = publishableEntries.map((item) => item.relativePath);
  const textAnalysis = await analyzeTextEntries(textEntries);
  if (paths.includes("package.json")) {
    packageJsonInfo = await analyzePackageJson(publishableEntries.find((item) => item.relativePath === "package.json"));
  }
  return {
    rawFileCount: rawFiles.length,
    archiveType: "zip",
    rawBytes,
    publishableEntries,
    publishableFileCount: publishableEntries.length,
    publishableBytes,
    ignoredFiles: summarizePathIssues(ignoredFiles),
    blockedFiles: summarizePathIssues(blockedFiles),
    rootEntries: summarizeRootEntries(paths),
    commonRoot,
    paths,
    entryFile: detectEntryFile(paths),
    hasPackageJson: packageJsonInfo.hasPackageJson,
    hasBuildScript: packageJsonInfo.hasBuildScript,
    packageScripts: packageJsonInfo.scripts,
    packageDependencies: packageJsonInfo.dependencies,
    projectTitle: textAnalysis.projectTitle,
    pageHeading: textAnalysis.pageHeading,
    formFields: textAnalysis.formFields,
    apiCalls: textAnalysis.apiCalls
  };
}

async function analyzeTarEntries(tarPath, options = {}) {
  const tempDir = path.join(uploadDir, `tar-scan-${crypto.randomBytes(5).toString("hex")}`);
  let keepTempDir = false;
  await fs.mkdir(tempDir, { recursive: true });
  try {
    const entries = [];
    await tar.t({
      file: tarPath,
      gzip: true,
      onentry(entry) {
        entries.push({
          path: entry.path,
          type: entry.type,
          size: Number(entry.size || 0)
        });
      }
    });

    const unsafeEntry = entries.find((entry) => !isSafeArchivePath(entry.path) || isUnsafeTarEntryType(entry.type));
    if (unsafeEntry) {
      const inspection = createInvalidArchiveInspection("tar.gz", `压缩包包含不安全条目：${unsafeEntry.path}`);
      throw createProjectError(inspection, "压缩包包含不安全路径、链接或特殊文件，DemoGo 已拒绝处理。");
    }

    await tar.x({
      file: tarPath,
      cwd: tempDir,
      gzip: true,
      preservePaths: false,
      strict: true,
      filter: (entryPath, entry) => isSafeArchivePath(entryPath) && !isUnsafeTarEntryType(entry.type)
    });

    const rawFiles = [];
    await collectExtractedFiles(tempDir, tempDir, rawFiles);
    if (!rawFiles.length) return emptyArchiveAnalysis("tar.gz");

    const normalizedPaths = rawFiles.map((entry) => normalizeArchivePath(entry.relativePath));
    const commonRoot = findCommonRoot(normalizedPaths);
    const publishableEntries = [];
    const ignoredFiles = [];
    const blockedFiles = [];
    const textEntries = [];
    let packageJsonInfo = { hasPackageJson: false, hasBuildScript: false };
    let rawBytes = 0;
    let publishableBytes = 0;

    for (const entry of rawFiles) {
      const normalized = normalizeArchivePath(entry.relativePath);
      const relativePath = stripCommonRoot(normalized, commonRoot);
      const bytes = Number(entry.bytes || 0);
      rawBytes += bytes;

      if (!relativePath || relativePath.endsWith("/")) continue;

      const pathIssue = classifyEntryPath(relativePath);
      if (pathIssue.action === "block") {
        blockedFiles.push({ path: relativePath, reason: pathIssue.reason });
        continue;
      }
      if (pathIssue.action === "ignore") {
        ignoredFiles.push({ path: relativePath, reason: pathIssue.reason });
        continue;
      }

      publishableEntries.push({ archiveType: "tar.gz", tempPath: entry.fullPath, relativePath, bytes });
      publishableBytes += bytes;
      if (shouldAnalyzeTextFile(relativePath, bytes)) {
        textEntries.push({ archiveType: "tar.gz", tempPath: entry.fullPath, relativePath, bytes });
      }
    }

    const paths = publishableEntries.map((item) => item.relativePath);
    const textAnalysis = await analyzeTextEntries(textEntries);
    if (paths.includes("package.json")) {
      packageJsonInfo = await analyzePackageJson(publishableEntries.find((item) => item.relativePath === "package.json"));
    }

    keepTempDir = Boolean(options.keepTempFiles);
    return {
      rawFileCount: rawFiles.length,
      archiveType: "tar.gz",
      rawBytes,
      publishableEntries,
      publishableFileCount: publishableEntries.length,
      publishableBytes,
      ignoredFiles: summarizePathIssues(ignoredFiles),
      blockedFiles: summarizePathIssues(blockedFiles),
      rootEntries: summarizeRootEntries(paths),
      commonRoot,
      paths,
      entryFile: detectEntryFile(paths),
      hasPackageJson: packageJsonInfo.hasPackageJson,
      hasBuildScript: packageJsonInfo.hasBuildScript,
      packageScripts: packageJsonInfo.scripts,
      packageDependencies: packageJsonInfo.dependencies,
      projectTitle: textAnalysis.projectTitle,
      pageHeading: textAnalysis.pageHeading,
      formFields: textAnalysis.formFields,
      apiCalls: textAnalysis.apiCalls,
      tempDir: options.keepTempFiles ? tempDir : null
    };
  } catch (error) {
    if (error.statusCode) throw error;
    throw createProjectError(createInvalidArchiveInspection("tar.gz", error.message), "压缩包不完整或格式异常，DemoGo 无法读取项目文件。");
  } finally {
    if (!keepTempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
}

async function collectExtractedFiles(rootDir, currentDir, result) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, "/");
    if (entry.isSymbolicLink()) {
      result.push({ fullPath, relativePath, bytes: 0, unsafe: true });
      continue;
    }
    if (entry.isDirectory()) {
      await collectExtractedFiles(rootDir, fullPath, result);
      continue;
    }
    if (!entry.isFile()) continue;
    const stat = await fs.stat(fullPath);
    result.push({ fullPath, relativePath, bytes: stat.size });
  }
}

function normalizeArchivePath(entryPath) {
  return String(entryPath || "").replace(/\\/g, "/").replace(/^\/+/, "").replace(/^\.\//, "");
}

function isSafeArchivePath(entryPath) {
  const normalized = String(entryPath || "").replace(/\\/g, "/");
  if (!normalized || normalized.startsWith("/") || /^[a-zA-Z]:\//.test(normalized)) return false;
  return !normalized.split("/").some((part) => part === "..");
}

function isUnsafeTarEntryType(type) {
  return ["SymbolicLink", "Link", "CharacterDevice", "BlockDevice", "FIFO"].includes(String(type || ""));
}

function classifyEntryPath(relativePath) {
  const parts = relativePath.split("/").filter(Boolean);

  if (parts.some((part) => part === "..")) {
    return { action: "block", reason: "包含不安全路径" };
  }

  for (const part of parts) {
    const lower = part.toLowerCase();
    const ext = path.extname(lower);

    if (ignoredPathParts.has(lower) || ignoredExactNames.has(part) || ignoredExactNames.has(lower) || ignoredExtensions.has(ext)) {
      return { action: "ignore", reason: "本地依赖、缓存或日志文件，已自动忽略" };
    }

    if (blockedExactNames.has(lower) || blockedExtensions.has(ext)) {
      return { action: "block", reason: "包含敏感或不支持发布的文件" };
    }
  }

  return { action: "publish" };
}

function summarizePathIssues(items, limit = 8) {
  return items.slice(0, limit).map((item) => item.path);
}

function summarizeRootEntries(paths) {
  const entries = new Set();
  for (const entryPath of paths) {
    const [first] = entryPath.split("/");
    if (first) entries.add(first);
  }
  return Array.from(entries).slice(0, 12);
}

function detectEntryFile(paths) {
  if (paths.includes("index.html")) return "index.html";
  if (paths.includes("dist/index.html")) return "dist/index.html";
  if (paths.includes("build/index.html")) return "build/index.html";
  if (paths.includes("out/index.html")) return "out/index.html";
  if (paths.includes("public/index.html")) return "public/index.html";
  return detectSingleHtmlEntry(paths);
}

function detectSingleHtmlEntry(paths) {
  const rootHtmlFiles = (paths || []).filter((entryPath) => (
    /^[^/]+\.html?$/i.test(String(entryPath || "")) &&
    !/^admin\.html$/i.test(entryPath) &&
    !/^login\.html$/i.test(entryPath)
  ));
  if (rootHtmlFiles.length === 1) return rootHtmlFiles[0];
  return null;
}

function hasSourceProjectIndicators(paths) {
  return paths.some((entryPath) => {
    const lower = String(entryPath || "").replace(/\\/g, "/").toLowerCase();
    return [
      "vite.config.js",
      "vite.config.ts",
      "vite.config.mjs",
      "webpack.config.js",
      "webpack.config.ts",
      "webpack.config.mjs",
      "rollup.config.js",
      "rollup.config.ts",
      "next.config.js",
      "next.config.mjs",
      "nuxt.config.js",
      "nuxt.config.ts",
      "svelte.config.js"
    ].includes(lower) || /^src\/(main|index|app)\.(js|jsx|ts|tsx|vue|svelte)$/.test(lower);
  });
}

function hasBackendIndicators(paths, packageScripts = {}) {
  const normalized = paths.map((entryPath) => String(entryPath || "").replace(/\\/g, "/").toLowerCase());
  if (normalized.some((entryPath) => [
    "server.js",
    "app.js",
    "src/server.js",
    "src/app.js",
    "main.py",
    "app.py",
    "requirements.txt",
    "manage.py"
  ].includes(entryPath))) return true;
  const startScript = String(packageScripts.start || "").toLowerCase();
  return /\b(node|nodemon|tsx|ts-node|nest)\b/.test(startScript) && !/\b(vite|webpack|parcel|react-scripts)\b/.test(startScript);
}

function hasSsrIndicators(paths) {
  const normalized = paths.map((entryPath) => String(entryPath || "").replace(/\\/g, "/").toLowerCase());
  return normalized.some((entryPath) => [
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "nuxt.config.js",
    "nuxt.config.ts",
    "remix.config.js"
  ].includes(entryPath));
}

function shouldAnalyzeTextFile(relativePath, bytes) {
  if (bytes > 256 * 1024) return false;
  const lower = relativePath.toLowerCase();
  return [".html", ".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte"].some((ext) => lower.endsWith(ext));
}

async function analyzeTextEntries(entries) {
  const formFields = new Map();
  const apiCalls = new Map();
  const pageTitles = [];
  const pageHeadings = [];

  for (const item of entries.slice(0, 80)) {
    const content = await readArchiveEntryText(item);
    const title = extractHtmlTitle(content);
    const heading = extractHtmlHeading(content);
    if (title) pageTitles.push({ value: title, sourceFile: item.relativePath });
    if (heading) pageHeadings.push({ value: heading, sourceFile: item.relativePath });
    for (const field of extractFormFields(content, item.relativePath)) {
      const key = `${field.name || field.label}`;
      if (!formFields.has(key)) formFields.set(key, field);
    }
    for (const apiCall of extractApiCalls(content, item.relativePath)) {
      const key = `${apiCall.method}:${apiCall.url}`;
      if (!apiCalls.has(key)) apiCalls.set(key, apiCall);
    }
  }

  return {
    formFields: Array.from(formFields.values()).slice(0, 20),
    apiCalls: Array.from(apiCalls.values()).slice(0, 20),
    projectTitle: pickTextSignal(pageTitles),
    pageHeading: pickTextSignal(pageHeadings)
  };
}

function pickTextSignal(items) {
  const preferred = items.find((item) => ["index.html", "dist/index.html", "build/index.html", "out/index.html", "public/index.html"].includes(item.sourceFile));
  return cleanProjectName(preferred?.value || items[0]?.value || "");
}

function extractHtmlTitle(content) {
  const match = String(content || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return cleanProjectName(stripHtml(match?.[1] || ""));
}

function extractHtmlHeading(content) {
  const match = String(content || "").match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return cleanProjectName(stripHtml(match?.[1] || ""));
}

function stripHtml(value) {
  return decodeHtmlEntities(String(value || "").replace(/<[^>]+>/g, " "));
}

async function analyzePackageJson(entry) {
  if (!entry) return { hasPackageJson: false, hasBuildScript: false, scripts: {}, dependencies: {} };
  try {
    const content = await readArchiveEntryText(entry);
    const packageJson = JSON.parse(content.replace(/^\uFEFF/, ""));
    return {
      hasPackageJson: true,
      hasBuildScript: Boolean(packageJson.scripts?.build),
      scripts: packageJson.scripts || {},
      dependencies: {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {})
      }
    };
  } catch {
    return { hasPackageJson: true, hasBuildScript: false, scripts: {}, dependencies: {} };
  }
}

function readZipEntryText(entry) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    entry.stream()
      .on("data", (chunk) => {
        total += chunk.length;
        if (total <= 256 * 1024) chunks.push(chunk);
      })
      .on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
      .on("error", reject);
  });
}


function isNonCollectableControl(text) {
  return /price|cost|fee|amount|total|rate|toggle|switch|slider|model|deepseek|gpt|claude|gemini|token|temperature|quantity|count|number|calculator|calc|预算|价格|费用|金额|总价|费率|模型|开关|数量|人数|计算/.test(String(text || "").toLowerCase());
}

function parseHtmlAttributes(text) {
  const attrs = {};
  const pattern = /([:@\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let match;
  while ((match = pattern.exec(text))) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attrs;
}

function inferFieldNamesFromCode(content) {
  const names = new Set();
  const patterns = [
    /\b(name|phone|mobile|tel|email|company|message|remark|remarks|contact|address|wechat)\s*:/gi,
    /\bset(Name|Phone|Mobile|Email|Company|Message|Remark|Address)\b/g
  ];
  for (const pattern of patterns) {
    let match;
}
}

function inferFieldLabel(name) {
  const lower = String(name || "").toLowerCase();
  const labels = [
    ["phone", "手机号"],
    ["mobile", "手机号"],
    ["tel", "电话"],
    ["email", "邮箱"],
    ["company", "公司"],
    ["message", "留言"],
    ["remark", "备注"],
    ["address", "地址"],
    ["quantity", "数量"],
    ["count", "人数"],
    ["name", "姓名"]
  ];
  return labels.find(([key]) => lower.includes(key))?.[1] || String(name || "").trim();
}


function isLocalApiUrl(url) {
  return /^\/api\//.test(url) || /^api\//.test(url) || /^\.\.?\/api\//.test(url);
}

function createRuleReport(context) {
  const hasForms = context.formFields.length > 0;
  const localApis = context.apiCalls.filter((item) => item.isLocal);
  const risks = [];
  const recommendations = [];
  let projectCategory = inspectionTypeLabel(context.detectedType);

  const autoHostableFields = filterAutoHostableFormFields(context.formFields);
  if (autoHostableFields.length) {
    projectCategory = inferProjectCategoryFromFields(context.formFields);
    recommendations.push("页面可以生成试用链接；DemoGo 会在生成链接时自动识别并开启基础表单收集。");
  } else if (hasForms) {
    recommendations.push("页面可以生成试用链接；检测到的填写控件不像报名、预约或留言表单，DemoGo 不会自动收集这些内容。");
  }

  if (localApis.length) {
    risks.push("这个项目里有提交或保存数据的功能，需要接入可用的收集入口。DemoGo 不会自动运行项目自带的后台接口。");
    recommendations.push("如果是报名、预约或留言这类基础收集，DemoGo 会尝试自动接管；如果是完整业务后台、订单、支付或登录，当前暂不支持。");
  }

  if (context.hasPackageJson && !context.hasBuildScript && !context.entryFile) {
    risks.push("这个项目像是 AI 生成的网页源码，但缺少生成网页的命令。");
    recommendations.push("请让 AI 编程工具补充生成命令，并确保生成可访问的网页文件。");
  }

  return {
    projectCategory,
    publishability: context.status === "blocked" ? "暂不支持" : (risks.length ? "页面支持，提交功能需要接入" : "支持"),
    risks,
    recommendations,
    fixPrompt: createFixPrompt({ ...context, risks, recommendations })
  };
}

function inferProjectCategoryFromFields(fields) {
  const names = fields.map((field) => `${field.name} ${field.label}`.toLowerCase()).join(" ");
  if (names.includes("company") || names.includes("公司") || names.includes("phone") || names.includes("手机号")) return "报名/预约/留资页面";
  if (names.includes("message") || names.includes("留言")) return "留言反馈页面";
  return "包含表单的页面";
}

function createFixPrompt(context) {
  const parts = [];
  const localApis = context.localApis || context.apiCalls?.filter((item) => item.isLocal) || [];
  if (localApis.length) {
    parts.push("请检查当前项目中的表单提交或数据保存逻辑。项目发布到 DemoGo 后，不会自动运行 /api/ 开头的自定义后台接口。基础报名、预约或留言表单可以由 DemoGo 自动接管；完整业务后台需要后续后端托管能力。");
  }
  if (context.hasPackageJson && !context.hasBuildScript && !context.entryFile) {
    parts.push("请把这个项目整理成可发布的网页版本：补充标准 npm run build 命令，并确保执行后生成 dist/index.html、build/index.html 或 out/index.html。");
  }
  if (context.formFields?.length) {
    const autoHostableFields = filterAutoHostableFormFields(context.formFields);
    if (autoHostableFields.length) {
      parts.push(`项目中疑似报名/留言字段包括：${context.formFields.slice(0, 8).map((field) => field.name || field.label).join("、")}。请确认字段命名清晰，避免把报名、预约或留言表单做成必须依赖自定义后台接口才能提交。`);
    } else {
      parts.push(`项目中检测到填写控件：${context.formFields.slice(0, 8).map((field) => field.name || field.label).join("、")}。如果这些只是计算器、价格配置或开关控件，不需要改成提交表单；如果确实要收集报名/留言，请补充姓名、手机号、邮箱或留言字段。`);
    }
  }
  if (!parts.length) {
    parts.push("请把这个项目整理成 DemoGo 可发布的网页版本：确保压缩包内包含 index.html，或项目可以通过 npm run build 生成 dist/index.html、build/index.html 或 out/index.html。不要把 .env、node_modules、密钥文件打包进去。");
  }
  return parts.join("\n\n");
}


function determineInspectionStatus(analysis, flags) {
  if (analysis.rawFileCount === 0 || analysis.blockedFiles.length > 0) return "blocked";
  if (analysis.publishableFileCount > maxExtractedFiles || analysis.publishableBytes > maxExtractedBytes) return "blocked";
  if (flags.hasBackend && !flags.hasDistIndex && !flags.hasBuildIndex && !flags.hasOutIndex) return "blocked";
  if (flags.hasSsr && !flags.hasOutIndex) return "blocked";
  if (flags.hasRootIndex || flags.hasDistIndex || flags.hasBuildIndex || flags.hasOutIndex || flags.hasPublicIndex || flags.singleHtmlEntry) return analysis.ignoredFiles.length ? "warning" : "pass";
  if (flags.hasPackageJson && !flags.hasBuildScript) return "blocked";
  if (flags.hasPackageJson) return "warning";
  return "blocked";
}

function detectInspectionType(flags) {
  if (flags.hasOutIndex) return "out";
  if (flags.hasSsr) return "runtime";
  if (flags.hasBackend && !flags.hasDistIndex && !flags.hasBuildIndex) return "backend";
  if (flags.hasPackageJson && flags.hasBuildScript && flags.hasSourceIndicators && flags.hasRootIndex) return "source";
  if (flags.hasRootIndex) return "static-root";
  if (flags.hasDistIndex) return "dist";
  if (flags.hasBuildIndex) return "build";
  if (flags.hasPublicIndex) return "public";
  if (flags.singleHtmlEntry) return "single-html";
  if (flags.hasPackageJson) return "source";
  return "unknown";
}


function inspectionSummary(status, type) {
  if (status === "blocked") return "项目暂时无法发布，请根据提示调整后重新上传。";
  if (type === "source") return "已识别为 AI 生成的网页项目，DemoGo 会自动生成网页后发布。";
  if (type === "single-html") return "已识别为单个网页文件，DemoGo 会自动作为首页发布。";
  if (status === "warning") return "项目可以发布，系统会自动忽略部分无关文件。";
  return "项目检测通过，可以继续发布。";
}
