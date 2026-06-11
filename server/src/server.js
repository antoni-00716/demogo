import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
  demoDbAdminHost,
  demoDbAdminPassword,
  demoDbAdminPort,
  demoDbAdminUser,
  demoDbEnabled,
  demoDbHost,
  demoDbMock,
  demoDbPort,
  demoRoot,
  deployRateLimit,
  deployRateWindowMs,
  dockerCpus,
  dockerImage,
  dockerMemory,
  emailVerificationEnabled,
  maxExtractedBytes,
  maxExtractedFiles,
  maxZipSizeMb,
  plans,
  port,
  publicBaseUrl,
  runtimeCpus,
  runtimeDriver,
  runtimeDockerImage,
  runtimeEnabled,
  runtimeRootDir,
  runtimeMaxInstances,
  runtimeMemory,
  runtimeNodeEnabled,
  runtimeStartTimeoutSeconds,
  runtimeTtlMinutes,
  serviceVersion,
  smtpFrom,
  smtpHost,
  smtpPass,
  smtpPort,
  smtpSecure,
  smtpUser,
  uploadDir,
  usageFlushIntervalMs
} from "./config.js";
import logger from "./lib/logger.js";
import { isMysqlConfigured, readDataFile, writeDataFile } from "./db/mysql-store.js";
import { closePool } from "./db/mysql.js";
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
  classifyFailureCategory,
  createFailureDiagnosis
} from "./services/failure-diagnosis-service.js";
import {
  createExternalBackendConfigStatus,
  createExternalBackendConfigWithConnection,
  externalBackendEnvKeys,
  externalBackendEnvValues,
  hasSupabaseProject,
  isUnsafeExternalSecretKey,
  publicExternalBackend
} from "./services/external-backend-service.js";
import {
  createApplicationReadiness,
  publicApplicationReadiness
} from "./services/application-readiness-service.js";
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
import { publicUserDemo, createRuntimeConfigStatus, publicRuntimeEnv, runtimeEnvForDemo, mergeRuntimeEnv } from "./lib/admin-helpers.js";
import {
  createHostingCapabilities,
  createProjectArchitecture
} from "./services/hosting-architecture-service.js";
import {
  classifyProject
} from "./services/project-classifier-service.js";
import {
  createDemoDatabase,
  deleteDemoDatabase,
  demoDatabaseBlockReason,
  demoDatabaseEnv,
  initializeDemoDatabase,
  isDemoDatabaseReady,
  needsMysqlDatabase,
  publicDemoDatabase,
  resetDemoDatabase
} from "./services/demo-database-service.js";
import {
  canStartNodeRuntime,
  createRuntimeConfig,
  detectInspectionType,
  detectRuntimeMetadata,
  detectRuntimeWarnings,
  findRuntime,
  formatRuntimeFramework,
  inferNodeFramework,
  inferRuntimeEngine,
  isSingleServiceSsrProfile,
  listRuntimeRecords,
  prepareRuntimeProject,
  proxyRuntimeRequest,
  shouldBuildBeforeNodeStart,
  startNodeRuntime,
  stopExpiredRuntimes,
  stopRuntime
} from "./services/runtime-service.js";
import { hashPassword, verifyPassword, hashVerificationCode, createVerifyEmailCode } from "./lib/password-utils.js";
import { normalizeEmail, createLoginRateLimiter } from "./lib/login-rate-limiter.js";
import { createSessionStore, setSessionCookie, createAgentTokenRecord, publicAgentToken, verifyAgentToken, parseAgentToken } from "./lib/session-store.js";
import { createDeployRateLimiter } from "./lib/deploy-rate-limiter.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { securityHeadersMiddleware } from "./middleware/security.js";
import { createRateLimiter, createStrictRateLimiter } from "./middleware/rate-limiter.js";
import { isEmailConfigured, sendVerificationEmail, createSmtpMailer, sendExpirationReminderEmail } from "./email/mailer.js";
import { checkAndRemindExpiringDemos } from "./services/demo-expiration-service.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { csrfMiddleware } from "./middleware/csrf.js";
import { apiVersionMiddleware } from "./middleware/api-version.js";
import { createErrorHandler } from "./middleware/error-handler.js";
import { createDeploymentJobService } from "./services/deployment-job-service.js";
import { createBuildService } from "./services/build-service.js";

import { registerAgentRoutes } from "./routes/agent.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerFeedbackRoutes } from "./routes/feedback.js";
import { registerSubdomainRoutes } from "./routes/subdomain.js";
import { registerPlanUpgradeRoutes } from "./routes/plan-upgrade.js";
import { registerFormsRoutes } from "./routes/forms.js";
import { registerMiscRoutes } from "./routes/misc.js";
import { registerDeployRoutes } from "./routes/deploy.js";
import { registerDemosRoutes } from "./routes/demos.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { detectDeploySource, deploySourceLabel, normalizeDeploySource } from "./lib/deploy-helpers.js";
import { cleanProjectName, isGenericProjectName, slugify } from "./lib/project-utils.js";

import {
  promoteSingleHtmlEntry,
  isSupportedArchiveName,
  detectArchiveType,
  looksLikeAssetRequest,
  stripArchiveExtension,
  analyzeArchiveEntries,
  cleanupArchiveAnalysis,
  writeArchiveEntry,
  normalizeZipPath,
  findCommonRoot,
  stripCommonRoot,
  emptyArchiveAnalysis,
  analyzeZipEntries,
  analyzeTarEntries,
  collectExtractedFiles,
  normalizeArchivePath,
  isSafeArchivePath,
  isUnsafeTarEntryType,
  classifyEntryPath,
  isAllowedEnvTemplateName,
  summarizePathIssues,
  summarizeRootEntries,
  detectEntryFile,
  detectSingleHtmlEntry,
  hasSourceProjectIndicators,
  hasBackendIndicators,
  hasNodeRuntimeDependency,
  hasSsrIndicators,
  shouldAnalyzeTextFile,
  analyzeTextEntries,
  pickTextSignal,
  extractHtmlTitle,
  extractHtmlHeading,
  stripHtml,
  analyzePackageJson,
  analyzeEnvironmentVariableHints,
  readZipEntryText,
  readArchiveEntryText,
  extractFormFields,
  isCollectableFormField,
  isNonCollectableControl,
  parseHtmlAttributes,
  inferFieldNamesFromCode,
  inferFieldType,
  inferFieldLabel,
  extractApiCalls,
  isLocalApiUrl,
  createInvalidZipInspection,
  createInvalidArchiveInspection,
  createProjectError
} from "./lib/archive-analyzer.js";

import { readJson, writeJson } from "./lib/data-access.js";
import { exists } from "./lib/utils.js";
import {
  isSlugClaimedByDemo,
  canUseCustomDomain,
  canCustomizeSlug,
  normalizeCustomSlug,
  isReservedSlug,
  platformHost,
  isExpired,
  getArchivedDemoDir,
  demoSlug,
  extractDemoSlug,
} from "./lib/slug-utils.js";
import {
  createDeploymentSteps,
  markDeploymentStep,
  completeDeploymentSteps,
  failedDeploymentSteps,
} from "./lib/deployment-steps.js";
import { removePath, copyDemoArchive, shouldCopyDemoArchivePath } from "./lib/file-utils.js";
import { getClientIp } from "./lib/request-utils.js";
import { writeAuditLog } from "./lib/audit-log.js";
import {
  summarizeFailureReasons,
  summarizeTrialFunnel,
  summarizeDeploySources,
  countBy,
  normalizeTrialEventType,
  writeTrialEvent,
  sanitizeTrialMetadata,
  classifyFailureMessage,
  normalizeSubdomainRequestStatus,
  subdomainRequestStatusLabel,
  filterSubdomainRequests,
  summarizeResponseLimits,
  attachErrorDiagnosis,
  attachDiagnosisToInspection,
} from "./services/trial-analytics-service.js";
import {
  publicContentReview,
  reviewArchiveContent,
  attachContentReviewToInspection,
  contentReviewUserSummary,
  publicAdminContentReview,
  createAndPersistContentReview,
  persistPreflightContentReview,
  mergeContentReviews,
  summarizeMergedContentReview,
  persistContentReview,
  createContentReviewFixPrompt,
  defaultContentReviewResolutionStatus,
  contentReviewResolutionStatus,
  normalizeContentReviewResolutionStatus,
  contentReviewResolutionStatusLabel,
  createHttpError,
  contentReviewStatusLabel,
  createContentReviewError,
} from "./services/content-review-service.js";
import {
  createRuleReport,
  inferProjectCategoryFromFields,
  createFixPrompt,
  createInspectionSummary,
  determineInspectionStatus,
  inspectionTypeLabel,
  inspectionSummary,
  createUserFacingInspection,
} from "./services/failure-diagnosis-service.js";

import { putFile, putDirectory, deletePrefix, isMinioBackend } from "./lib/storage.js";
import { purgeCache, getCacheHeaders, getCdnInfo } from "./lib/cdn.js";
import { addDeploymentJob, deploymentQueue, closeQueue } from "./queue/queue.js";
import { registerDemoTrackRoutes } from "./routes/demo-track.js";

const app = express();

const blockedExactNames = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  ".env.test",
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
const subdomainRequestsFile = path.join(dataDir, "subdomain-requests.json");
const trialEventsFile = path.join(dataDir, "trial-events.json");
const loginFailureBuckets = new Map();

const loginFailureWindowMs = 10 * 60 * 1000;
const loginFailureLimit = 5;
const verificationCodeTtlMs = 10 * 60 * 1000;
const verificationResendMs = 60 * 1000;
const verificationMaxAttempts = 5;

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

app.use("/d/:slug", routeRuntimeDemo);
app.use(securityHeadersMiddleware);
app.use("/api/auth/login", createStrictRateLimiter({ maxRequests: parseInt(process.env.DEMOGO_LOGIN_RATE_LIMIT || "10") }).middleware);
app.use("/api/auth/send-verification-code", createStrictRateLimiter({ maxRequests: parseInt(process.env.DEMOGO_VERIFY_RATE_LIMIT || "3") }).middleware);
app.use("/api", createRateLimiter({ maxRequests: parseInt(process.env.DEMOGO_API_RATE_LIMIT || "60") }).middleware);

// --- Extracted module initializations ---
const loginRateLimiter = createLoginRateLimiter({ loginFailureLimit, loginFailureWindowMs, persistPath: path.join(dataDir, "login-rate-limiter.json") });
const checkLoginFailureRate = loginRateLimiter.checkLoginFailureRate;
const recordLoginFailure = loginRateLimiter.recordLoginFailure;
const clearLoginFailures = loginRateLimiter.clearLoginFailures;
const sessionStore = createSessionStore({ readJson, writeJson, sessionsFile });
const createSession = sessionStore.createSession;
const deployRateLimiter = createDeployRateLimiter({ readJson, auditLogsFile, deployRateLimit, deployRateWindowMs });
const checkDeployRateLimit = deployRateLimiter.checkDeployRateLimit;
const verifyEmailCodeModule = createVerifyEmailCode({ readJson, writeJson, emailVerificationsFile, verificationMaxAttempts });
const verifyEmailCode = verifyEmailCodeModule.verifyEmailCode;
const markEmailCodeUsed = verifyEmailCodeModule.markEmailCodeUsed;
const mailer = createSmtpMailer({ smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, smtpSecure, publicBaseUrl });
const sendSmtpMail = mailer.sendSmtpMail;
const authMiddleware = createAuthMiddleware({
  getUserFromRequest,
  getUserFromAgentToken,
  adminUser,
  adminPassword,
  readJson,
  usersFile,
  readBearerToken
});
const requireUser = authMiddleware.requireUser;
const requireAgentToken = authMiddleware.requireAgentToken;
const requireAdmin = authMiddleware.requireAdmin;


// --- Deployment job service (canonical) ---
const deploymentJobService = createDeploymentJobService({
  readJson, writeJson,
  deploymentJobsFile, deploymentEventsFile, usersFile,
  writeTrialEvent, attachErrorDiagnosis, publicContentReview
});
const { findDeploymentJob, createDeploymentJob, runDeploymentJob, publicDeploymentJob,
  readDeploymentEventsForDemo: svcReadDeploymentEventsForDemo,
} = deploymentJobService;

// Wire up deployment job handlers
deploymentJobService.setHandlers({ processCreateJob: performCreateDeployment, processUpdateJob: performUpdateDeployment });

// --- Build service (canonical) ---
const buildService = createBuildService({
  exists, createProjectError, inspectionTypeLabel, createUserFacingInspection,
  readJson, writeJson, formsFile, formSubmissionsFile,
  writeAuditLog, publicForm, publicBaseUrl, calculateFormQuota,
  demosFile
});
const { detectBuildAndNormalizeOutput, findPublishableOutput,
  summarizePublishedDirectory, promoteDirectory,
  ensureAutoHostedForm, filterAutoHostableFormFields, injectAutoFormScript,
  buildNodeProject, buildNodeProjectWithEnv, buildNodeProjectOnHost, buildNodeProjectInDocker,
  runCommand, commandAvailable, explainBuildError,
  injectTrackingScript, recordDemoVisit, flushUsageStats,
  formatBytes, stripBom
} = buildService;

// --- Agent route module ---
app.use(requestIdMiddleware);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());
app.use(csrfMiddleware);
app.use(apiVersionMiddleware);
registerAgentRoutes(app, {
  requireAgentToken,
  readJson, writeJson, demosFile,
  svcReadDeploymentEventsForDemo, publicUserDemo,
  uploadProjectArchive,
  handleCreateDeployment,
  handleUpdateDeployment,
  getClientIp
});

// --- Auth route module ---
registerAuthRoutes(app, {
  requireUser,
  requireAgentToken,
  emailVerificationEnabled,
  verificationCodeTtlMs,
  verificationResendMs,
  readJson,
  writeJson,
  usersFile,
  sessionsFile,
  emailVerificationsFile,
  demosFile,
  isEmailConfigured,
  smtpHost,
  smtpPort,
  smtpUser,
  smtpPass,
  smtpFrom,
  normalizeEmail,
  hashPassword,
  verifyPassword,
  hashVerificationCode,
  verifyEmailCode,
  markEmailCodeUsed,
  sendVerificationEmail,
  sendSmtpMail,
  createSession,
  setSessionCookie,
  checkLoginFailureRate,
  recordLoginFailure,
  clearLoginFailures,
  createAgentTokenRecord,
  publicAgentToken,
  getUserFromRequest,
  getClientIp,
  writeTrialEvent,
  writeAuditLog,
  publicUser,
  publicUserDemo,
  calculateQuota,
});

// --- Feedback route module ---
registerFeedbackRoutes(app, { requireUser });

// --- Subdomain route module ---
registerSubdomainRoutes(app, { requireUser });

// --- Plan upgrade route module ---
registerPlanUpgradeRoutes(app, { requireUser });

// --- Forms route module ---
registerFormsRoutes(app, { requireUser });

// --- Misc route module ---
registerMiscRoutes(app, {
  express,
  normalizeTrialEventType,
  getUserFromRequest,
  writeTrialEvent: writeTrialEvent,
  redirectDemoAlias,
  looksLikeAssetRequest,
  hostingCapabilities,
});

// --- Deploy route module ---
registerDeployRoutes(app, {
  requireUser,
  uploadProjectArchive,
  handleCreateDeployment,
  inspectProjectArchive,
  findDeploymentJob,
  createDeploymentJob,
  runDeploymentJob,
  publicDeploymentJob,
});

// --- Demos route module ---
registerDemosRoutes(app, {
  requireUser,
  uploadProjectArchive,
  flushUsageStats,
  getUserFromRequest,
  svcReadDeploymentEventsForDemo,
  createDeploymentJob,
  runDeploymentJob,
  publicDeploymentJob,
  removeDemoFiles,
    deleteDemoFiles,
    performUpdateDeployment,
    demoRoot,
    getArchivedDemoDir,
    hostingConfig,
    expireDemoFiles,
    restartDemoRuntime,
    writeTrialEvent: writeTrialEvent,
  });

// --- Admin route module ---
registerAdminRoutes(app, {
  requireAdmin,
  flushUsageStats,
  svcReadDeploymentEventsForDemo,
  removeDemoFiles,
  deleteDemoFiles,
  hostingConfig,
  writeTrialEvent: writeTrialEvent,
});


// --- Demo track route module ---
registerDemoTrackRoutes(app, { recordDemoVisit });

// ===== STATIC FILE SERVING & HEALTH =====

async function routeRuntimeDemo(req, res, next) {
  try {
    const slug = slugify(req.params.slug);
    if (!slug) return next();
    if (await redirectDemoAlias(req, res)) return;
    const demos = await readJson(demosFile, []);
    const demoIndex = demos.findIndex((item) => item.slug === slug && item.status === "published");
    const demo = demos[demoIndex];
    if (demo?.hostingMode !== "node_runtime") return next();
    let runtime = findRuntime(slug);
    if (!runtime) {
      const restarted = await restartDemoRuntime(demo);
      if (!restarted.runtime) {
        if (demoIndex >= 0 && restarted.demo) {
          demos[demoIndex] = restarted.demo;
          await writeJson(demosFile, demos);
          syncDemoToStorage(slug).catch(() => {});
        }
        res.status(503).send(restarted.error || "DemoGo runtime is not running.");
        return;
      }
      runtime = restarted.runtime;
      if (demoIndex >= 0) {
        demos[demoIndex] = restarted.demo;
        await writeJson(demosFile, demos);
      }
    }
    proxyRuntimeRequest(req, res, runtime);
  } catch (error) {
    next(error);
  }
}


await expireDemos();
setInterval(() => {
  expireDemos().catch((error) => logger.error({ err: error }, "Failed to expire demos"));
}, 60 * 60 * 1000);

setInterval(() => {
  flushUsageStats().catch((error) => logger.error({ err: error }, "Failed to flush usage stats"));
}, usageFlushIntervalMs);

setInterval(() => {
  stopExpiredRuntimes().catch((error) => logger.error({ err: error }, "Failed to stop expired runtimes"));
}, 60 * 1000);

app.get("/api/demo-track/:slug", async (req, res) => {
  try {
    const slug = slugify(req.params.slug);
    if (slug) {
      recordDemoVisit(slug, Number(req.query?.bytes || 0), getClientIp(req));
    }
    res.type("application/javascript").send("");
  } catch {
    res.type("application/javascript").send("");
  }
});


// ===== USER DEPLOY =====

async function handleCreateDeployment(req, res, next, options = {}) {
  const uploadedFile = req.file;
  const requestedName = String(req.body?.name || "").trim();
  const user = req.user;
  const clientIp = getClientIp(req);
  const actor = options.actor || "user";
  const deploySource = detectDeploySource(req, actor);

  if (!uploadedFile) {
    res.status(400).json({ error: "请上传 .zip、.tar.gz 或 .tgz 项目包" });
    return;
  }

  try {
    await writeTrialEvent({
      eventType: "deploy_upload_started",
      userId: user.id,
      userEmail: user.email,
      source: deploySource,
      path: actor === "agent" ? "/api/agent/deploy" : "/api/deploy",
      ip: clientIp,
      metadata: {
        fileName: uploadedFile.originalname,
        actor
      }
    });
    res.json(await performCreateDeployment({
      uploadedFile,
      requestedName,
      user,
      clientIp,
      actor,
      deploySource
    }));
  } catch (error) {
    const diagnosis = attachErrorDiagnosis(error, {
      fileName: uploadedFile.originalname,
      actor,
      action: "create",
      deploySource
    });
    await writeTrialEvent({
      eventType: "deploy_failed",
      userId: user.id,
      userEmail: user.email,
      source: deploySource,
      path: actor === "agent" ? "/api/agent/deploy" : "/api/deploy",
      ip: clientIp,
      metadata: {
        fileName: uploadedFile.originalname,
        actor,
        message: error instanceof Error ? error.message : "发布失败",
        statusCode: error.statusCode || 500,
        failureCategory: diagnosis.category
      }
    });
    next(error);
  }
}

async function handleUpdateDeployment(req, res, next, options = {}) {
  const uploadedFile = req.file;
  const user = req.user;
  const clientIp = getClientIp(req);
  const actor = options.actor || "user";
  const deploySource = detectDeploySource(req, actor);
  const pathLabel = actor === "agent" ? "/api/agent/update" : "/api/demos/:id/update";

  if (!uploadedFile) {
    res.status(400).json({ error: "请上传 .zip、.tar.gz 或 .tgz 项目包" });
    return;
  }

  try {
    const demoId = actor === "agent"
      ? await resolveAgentUpdateDemoId({
          user,
          demoRef: options.demoRef || req.body?.demoId || req.body?.id || req.body?.slug || req.body?.link || req.body?.url
        })
      : options.demoRef || req.params.id;

    await writeTrialEvent({
      eventType: "deploy_upload_started",
      userId: user.id,
      userEmail: user.email,
      source: deploySource,
      path: pathLabel,
      ip: clientIp,
      metadata: {
        demoId,
        fileName: uploadedFile.originalname,
        actor,
        action: "update"
      }
    });

    const result = await performUpdateDeployment({
      demoId,
      uploadedFile,
      user,
      clientIp,
      actor,
      deploySource
    });

    await writeTrialEvent({
      eventType: "deploy_success",
      userId: user.id,
      userEmail: user.email,
      source: deploySource,
      path: pathLabel,
      ip: clientIp,
      metadata: {
        demoId,
        demoSlug: result.slug,
        actor,
        action: "update",
        deploySource,
        detectedType: result.detectedType,
        databaseEngine: result.database?.engine || ""
      }
    });

    if (actor === "agent") {
      result.message = "更新成功，原试用链接保持不变。";
      result.nextStep = "请把原访问链接发给用户，并提醒用户刷新页面检查最新版本。";
    }

    res.json(result);
  } catch (error) {
    const diagnosis = attachErrorDiagnosis(error, {
      fileName: uploadedFile.originalname,
      actor,
      action: "update",
      deploySource
    });
    await writeTrialEvent({
      eventType: "deploy_failed",
      userId: user.id,
      userEmail: user.email,
      source: deploySource,
      path: pathLabel,
      ip: clientIp,
      metadata: {
        fileName: uploadedFile.originalname,
        actor,
        action: "update",
        message: error instanceof Error ? error.message : "更新失败",
        statusCode: error.statusCode || 500,
        failureCategory: diagnosis.category
      }
    });
    next(error);
  }
}

async function performCreateDeployment({ uploadedFile, requestedName = "", user, clientIp = "", actor = "user", deploySource = "web", deploymentId = "" }) {
  if (!uploadedFile) {
    throw createHttpError("请上传 .zip、.tar.gz 或 .tgz 项目包", 400);
  }

  const existingDemos = await readJson(demosFile, []);
  let slug = "";
  let targetDir = "";
  let createdDatabase = null;
  const currentDeploymentId = deploymentId || crypto.randomUUID();
  const steps = createDeploymentSteps({ userId: user.id, deploymentId: currentDeploymentId, action: "create" });

  try {
    const rate = await checkDeployRateLimit(user, clientIp);
    if (!rate.allowed) {
      throw createHttpError("上传过于频繁，请稍后再试", 429);
    }
    const preInspection = await inspectProjectArchive(uploadedFile.path, uploadedFile.originalname);
    const canPublishRuntime = canPublishNodeRuntimeInspection(preInspection);
    if ((isNodeRuntimeInspection(preInspection) && !canPublishRuntime) || (!preInspection.canPublish && !canPublishRuntime)) {
      const persistedReview = await persistPreflightContentReview({
        inspection: preInspection,
        user,
        fileName: uploadedFile.originalname,
        projectName: inferProjectDisplayName({
          requestedName,
          uploadedFileName: uploadedFile.originalname,
          inspection: preInspection
        }),
        actor,
        action: "create",
        deploymentId: currentDeploymentId
      });
      if (persistedReview) {
        preInspection.contentReview = publicContentReview(persistedReview);
      }
      markDeploymentStep(steps, "inspect", "failed", preInspection.summary || "项目检查未通过", {
        detectedType: preInspection.detectedType,
        contentReviewStatus: preInspection.contentReview?.status
      });
      const error = createProjectError(preInspection, nodeRuntimeBlockReason(preInspection) || preInspection.issues?.[0] || preInspection.summary || "这个项目暂时无法生成试用链接，请根据提示调整后重试。");
      error.statusCode = 400;
      error.contentReview = preInspection.contentReview || null;
      error.deploymentEvents = completeDeploymentSteps(steps, { userId: user.id, deploymentId: currentDeploymentId });
      await appendDeploymentEvents(failedDeploymentSteps(error, steps, { userId: user.id, deploymentId: currentDeploymentId }));
      throw error;
    }
    const inferredName = inferProjectDisplayName({
      requestedName,
      uploadedFileName: uploadedFile.originalname,
      inspection: preInspection
    });
    slug = await createAvailableSlug(inferredName, existingDemos);
    targetDir = path.join(demoRoot, slug);
    const quota = calculateQuota(user, existingDemos);
    if (quota.onlineDemos.used >= quota.onlineDemos.limit) {
      const error = createHttpError(`当前套餐最多保留 ${quota.onlineDemos.limit} 个在线试用项目。这个项目本身已通过检查，请先下线旧项目或升级套餐后再生成链接。`, 403);
      error.inspection = preInspection;
      error.contentReview = preInspection.contentReview || null;
      throw error;
    }
    if (quota.monthlyDeploys.used >= quota.monthlyDeploys.limit) {
      const error = createHttpError("本月生成/更新次数已用完。这个项目本身已通过检查，请升级套餐或下月再试。", 403);
      error.inspection = preInspection;
      error.contentReview = preInspection.contentReview || null;
      throw error;
    }

    await fs.rm(targetDir, { recursive: true, force: true });
    await fs.mkdir(targetDir, { recursive: true });

    const result = canPublishRuntime
      ? await extractRuntimeDemo(uploadedFile.path, targetDir, {
          fileName: uploadedFile.originalname,
          steps,
          actor,
          action: "create",
          user,
          projectName: inferredName,
          deploymentId: currentDeploymentId,
          slug,
          startRuntime: false
        })
      : await extractStaticDemo(uploadedFile.path, targetDir, {
          fileName: uploadedFile.originalname,
          steps,
          actor,
          action: "create",
          user,
          projectName: inferredName,
          deploymentId: currentDeploymentId
    });
    const architecture = attachArchitectureToInspection(result.inspection);
    if (result.runtime) {
      architecture.projectArchitecture.hosting.runtime = {
        ...(architecture.projectArchitecture.hosting.runtime || {}),
        ...result.runtime
      };
      architecture.inspection.runtime = {
        ...(architecture.inspection.runtime || {}),
        ...result.runtime
      };
      architecture.inspection.hosting = architecture.projectArchitecture.hosting;
      architecture.inspection.projectArchitecture = architecture.projectArchitecture;
    }
    result.inspection = architecture.inspection;
    if (result.contentReview?.status !== "passed") {
      throw createContentReviewError(result.contentReview);
    }
    const now = new Date().toISOString();
    const publicUrl = `${publicBaseUrl.replace(/\/$/, "")}/d/${slug}/`;
    const demoId = crypto.randomUUID();
    let demoDatabase = null;
    let runtime = result.runtime || null;
    if (canPublishRuntime && needsMysqlDatabase(result.inspection)) {
      markDeploymentStep(steps, "database", "pending", "正在创建 MySQL 试用数据库");
      demoDatabase = await createDemoDatabase({
        slug,
        demoId,
        inspection: result.inspection,
        config: hostingConfig()
      });
      demoDatabase = await initializeDemoDatabase(demoDatabase, {
        projectDir: targetDir,
        config: hostingConfig()
      });
      createdDatabase = demoDatabase;
      if (demoDatabase.schema?.status === "failed") {
        const error = createHttpError(`MySQL 试用数据库已创建，但初始化脚本执行失败：${demoDatabase.schema.error}`, 400);
        error.inspection = result.inspection;
        error.database = demoDatabase;
        error.databaseError = demoDatabase.schema.error;
        throw error;
      }
      markDeploymentStep(steps, "database", "success", demoDatabase.schema?.status === "ready" ? "MySQL 试用数据库已创建并完成初始化" : "MySQL 试用数据库已创建", {
        engine: demoDatabase.engine,
        databaseName: demoDatabase.databaseName,
        schemaStatus: demoDatabase.schema?.status || "skipped"
      });
    } else {
      markDeploymentStep(steps, "database", "skipped", "这个项目不需要试用数据库");
    }
    if (canPublishRuntime && (!runtime || runtime.status === "ready" || runtime.lifecycle?.stage === "ready_to_start")) {
      const runtimeConfigStatus = createRuntimeConfigStatus(result.inspection, {}, demoDatabase);
      if (runtimeConfigStatus.missing.length) {
        const diagnosis = createFailureDiagnosis({
          message: runtimeConfigStatus.nextAction,
          category: "runtime_env",
          inspection: result.inspection,
          runtime,
          database: demoDatabase
        });
        runtime = createConfigRequiredRuntime(runtime, runtimeConfigStatus, diagnosis);
        result.runtime = runtime;
        result.inspection = attachRuntimeToInspection(result.inspection, runtime);
        result.inspection = attachDiagnosisToInspection(result.inspection, diagnosis);
        architecture.projectArchitecture.hosting.runtime = {
          ...(architecture.projectArchitecture.hosting.runtime || {}),
          ...runtime
        };
        architecture.inspection = result.inspection;
        architecture.inspection.projectArchitecture = architecture.projectArchitecture;
        markDeploymentStep(steps, "publish", "skipped", "项目已保存，需补充运行配置后再启动", { missingEnv: runtimeConfigStatus.missing });
        markDeploymentStep(steps, "success", "success", "试用项目已创建，补充运行配置后即可启动");
      } else {
        markDeploymentStep(steps, "publish", "pending", "正在启动 Node.js 试用环境，首次安装依赖可能需要 1-3 分钟");
        runtime = await startNodeRuntime({
          slug,
          projectDir: targetDir,
          inspection: result.inspection,
          config: hostingConfig(),
          env: {
            ...demoDatabaseEnv(demoDatabase),
            ...externalBackendEnvValues(result.inspection, {})
          }
        });
        result.runtime = runtime;
        result.buildLog = runtime.logs || result.buildLog || "";
        result.inspection = attachRuntimeToInspection(result.inspection, runtime);
        architecture.projectArchitecture.hosting.runtime = {
          ...(architecture.projectArchitecture.hosting.runtime || {}),
          ...runtime
        };
        architecture.inspection = result.inspection;
        architecture.inspection.projectArchitecture = architecture.projectArchitecture;
        markDeploymentStep(steps, "publish", "success", "运行环境已启动，试用链接和接口已可访问", { runtimeStatus: runtime.status, driver: runtime.driver });
        markDeploymentStep(steps, "success", "success", "发布成功，访问地址已生成");
      }
    }
    const demo = {
      id: demoId,
      userId: user.id,
      userEmail: user.email,
      slug,
      name: inferredName,
      linkMode: "random",
      customDomainEligible: canUseCustomDomain(user.plan),
      status: "published",
      publicUrl,
      deploySource,
      deploySourceLabel: deploySourceLabel(deploySource),
      architecture: architecture.projectArchitecture,
      hosting: architecture.projectArchitecture.hosting,
      hostingMode: architecture.projectArchitecture.projectKind,
      hostingModeLabel: architecture.projectArchitecture.projectKindLabel,
      runtime: architecture.projectArchitecture.hosting.runtime,
      database: demoDatabase || null,
      runtimeEnv: {},
      runtimeConfig: createRuntimeConfigStatus(result.inspection, {}, demoDatabase),
      externalBackend: createExternalBackendConfigStatus(result.inspection, {}, null),
      projectProfile: result.inspection.projectProfile || null,
      projectCategory: result.inspection.projectCategory || result.inspection.projectProfile?.label || "",
      detectedType: result.detectedType,
      fileCount: result.fileCount,
      extractedBytes: result.extractedBytes,
      ignoredFiles: result.ignoredFiles,
      inspection: result.inspection,
      contentReview: publicContentReview(result.contentReview),
      sourceFileName: uploadedFile.originalname,
      usage: {
        visits: 0,
        estimatedBytes: 0,
        lastVisitedAt: null
      },
      version: 1,
      createdAt: now,
      deployEvents: [{ type: "create", at: now, status: "success" }],
      expiresAt: new Date(Date.now() + quota.plan.demoRetentionDays * 24 * 60 * 60 * 1000).toISOString()
    };
    demo.inspection = {
      ...demo.inspection,
      externalBackend: demo.externalBackend
    };
    const autoForm = demo.hostingMode === "node_runtime"
      ? { reason: "Node.js 运行项目暂不自动接管页面表单" }
      : await ensureAutoHostedForm({
          user,
          demo,
          inspection: result.inspection,
          targetDir,
          now
        });
    if (autoForm?.form) {
      demo.autoFormId = autoForm.form.id;
      demo.inspection = {
        ...demo.inspection,
        autoFormEnabled: true,
        autoFormId: autoForm.form.id,
        autoFormSubmitUrl: publicForm(autoForm.form, { publicBaseUrl }).submitUrl
      };
      result.inspection = demo.inspection;
      markDeploymentStep(steps, "form_hosting", "success", "已自动开启表单收集", { formId: autoForm.form.id });
    } else if (autoForm?.reason) {
      demo.inspection = {
        ...demo.inspection,
        autoFormEnabled: false,
        autoFormReason: autoForm.reason
      };
      result.inspection = demo.inspection;
      markDeploymentStep(steps, "form_hosting", "skipped", autoForm.reason);
    }
    demo.externalBackend = createExternalBackendConfigStatus(demo.inspection, demo.runtimeEnv, demo.externalBackend);
    demo.inspection = {
      ...demo.inspection,
      externalBackend: demo.externalBackend
    };
    demo.applicationReadiness = createApplicationReadiness({ demo, inspection: demo.inspection });
    demo.inspection = {
      ...demo.inspection,
      applicationReadiness: demo.applicationReadiness
    };
    result.inspection = demo.inspection;
    for (const step of steps) {
      step.demoId = demo.id;
      step.userId = user.id;
    }
    const demos = await readJson(demosFile, []);
    demos.unshift(demo);
    await writeJson(demosFile, demos);
    await writeAuditLog({
      action: actor === "agent" ? "agent_deploy_demo" : "deploy_demo",
      actorType: actor === "agent" ? "agent" : "user",
      actorId: user.id,
      targetType: "demo",
      targetId: demo.id,
      ip: clientIp,
      metadata: {
        slug,
        sourceFileName: uploadedFile.originalname,
        detectedType: result.detectedType,
        buildLog: result.buildLog,
        extractedBytes: result.extractedBytes,
        contentReviewId: result.contentReview?.id,
        contentReviewStatus: result.contentReview?.status,
        databaseEngine: demoDatabase?.engine || "",
        source: deploySource
      }
    });
    const deploymentEvents = completeDeploymentSteps(steps, { demoId: demo.id, userId: user.id, deploymentId: currentDeploymentId });
    await appendDeploymentEvents(deploymentEvents);

    const response = {
      ok: true,
      id: demo.id,
      slug,
      status: "published",
      name: demo.name,
      projectName: demo.name,
      publicUrl,
      linkMode: demo.linkMode,
      customDomainEligible: demo.customDomainEligible,
      deploySource,
      deploySourceLabel: demo.deploySourceLabel,
      architecture: demo.architecture,
      hosting: demo.hosting,
      hostingMode: demo.hostingMode,
      hostingModeLabel: demo.hostingModeLabel,
      runtime: demo.runtime,
      database: publicDemoDatabase(demo.database),
      runtimeEnv: publicRuntimeEnv(demo.runtimeEnv),
      runtimeConfig: demo.runtimeConfig,
      externalBackend: publicExternalBackend(demo.externalBackend),
      applicationReadiness: publicApplicationReadiness(demo.applicationReadiness),
      projectProfile: demo.projectProfile,
      projectCategory: demo.projectCategory,
      detectedType: result.detectedType,
      autoFormEnabled: Boolean(result.inspection?.autoFormEnabled),
      autoFormSubmitUrl: result.inspection?.autoFormSubmitUrl || "",
      contentReviewStatus: result.contentReview?.status || "",
      fileCount: result.fileCount,
      extractedBytes: result.extractedBytes,
      ignoredFiles: result.ignoredFiles,
      inspection: result.inspection,
      contentReview: publicContentReview(result.contentReview),
      buildLog: result.buildLog,
      deploymentEvents,
      version: demo.version,
      quota: calculateQuota(user, demos),
      limits: summarizeResponseLimits(calculateQuota(user, demos))
    };
    if (actor === "agent") {
      response.message = "发布成功，已生成可试用链接。";
      response.nextStep = "请把访问链接发给用户，并提醒用户打开检查页面是否符合预期。";
    }
    await writeTrialEvent({
      eventType: "deploy_success",
      userId: user.id,
      userEmail: user.email,
      source: deploySource,
      path: actor === "agent" ? "/api/agent/deploy" : "/api/deploy",
      ip: clientIp,
      metadata: {
        demoId: demo.id,
        demoSlug: slug,
        actor,
        deploySource,
        detectedType: result.detectedType,
        databaseEngine: demoDatabase?.engine || ""
      }
    });
    return response;
  } catch (error) {
    if (!error.deploymentEvents) {
      await appendDeploymentEvents(failedDeploymentSteps(error, steps, { userId: user.id, deploymentId: currentDeploymentId }));
    }
    if (slug) {
      await stopRuntime(slug);
    }
    if (createdDatabase) {
      await deleteDemoDatabase(createdDatabase, hostingConfig()).catch(() => null);
    }
    if (targetDir) {
      await fs.rm(targetDir, { recursive: true, force: true });
    }
    throw error;
  } finally {
    await fs.rm(uploadedFile.path, { force: true });
  }
}

async function performUpdateDeployment({ demoId, uploadedFile, user, clientIp = "", actor = "user", deploySource = "", deploymentId = "" }) {
  if (!uploadedFile) {
    throw createHttpError("请上传 .zip、.tar.gz 或 .tgz 项目包", 400);
  }

  const currentDeploymentId = deploymentId || crypto.randomUUID();
  const stagingDir = path.join(dataDir, "update-staging", `${demoId}-${crypto.randomBytes(4).toString("hex")}`);
  const backupDir = path.join(dataDir, "update-backups", `${demoId}-${crypto.randomBytes(4).toString("hex")}`);
  const steps = createDeploymentSteps({ demoId, userId: user.id, deploymentId: currentDeploymentId, action: "update" });
  let createdDatabase = null;

  try {
    const demos = await readJson(demosFile, []);
    const demoIndex = demos.findIndex((demo) => demo.id === demoId && demo.userId === user.id);

    if (demoIndex === -1) {
      throw createHttpError("未找到该 Demo", 404);
    }

    const demo = demos[demoIndex];
    if (isExpired(demo)) {
      await expireDemoFiles(demo);
      demos[demoIndex] = {
        ...demo,
        status: "expired",
        expiredAt: new Date().toISOString()
      };
      await writeJson(demosFile, demos);
      throw createHttpError("已过期 Demo 不能更新，请重新上传发布", 409);
    }

    if (demo.status !== "published") {
      throw createHttpError("只有已发布的 Demo 可以更新，请先重新上线或新建 Demo", 409);
    }

    const rate = await checkDeployRateLimit(user, clientIp);
    if (!rate.allowed) {
      throw createHttpError("上传过于频繁，请稍后再试", 429);
    }

    const quota = calculateQuota(user, demos);
    if (quota.monthlyDeploys.used >= quota.monthlyDeploys.limit) {
      throw createHttpError("本月发布/更新次数已用完，请升级套餐或下月再试", 403);
    }

    await fs.mkdir(stagingDir, { recursive: true });
    const preInspection = await inspectProjectArchive(uploadedFile.path, uploadedFile.originalname);
    const canPublishRuntime = canPublishNodeRuntimeInspection(preInspection);
    if ((isNodeRuntimeInspection(preInspection) && !canPublishRuntime) || (!preInspection.canPublish && !canPublishRuntime)) {
      const persistedReview = await persistPreflightContentReview({
        inspection: preInspection,
        user,
        fileName: uploadedFile.originalname,
        projectName: demo.name || demo.slug,
        actor,
        action: "update",
        deploymentId: currentDeploymentId,
        demo
      });
      if (persistedReview) {
        preInspection.contentReview = publicContentReview(persistedReview);
      }
      markDeploymentStep(steps, "inspect", "failed", preInspection.summary || "项目检查未通过", {
        detectedType: preInspection.detectedType,
        contentReviewStatus: preInspection.contentReview?.status
      });
      const error = createProjectError(preInspection, nodeRuntimeBlockReason(preInspection) || preInspection.issues?.[0] || preInspection.summary || "这个项目暂时无法生成试用链接，请根据提示调整后重试。");
      error.statusCode = 400;
      error.contentReview = preInspection.contentReview || null;
      error.deploymentEvents = completeDeploymentSteps(steps, { demoId, userId: user.id, deploymentId: currentDeploymentId });
      await appendDeploymentEvents(failedDeploymentSteps(error, steps, { demoId, userId: user.id, deploymentId: currentDeploymentId }));
      throw error;
    }

    const previousDatabase = demo.database || null;
    const result = canPublishRuntime
      ? await extractRuntimeDemo(uploadedFile.path, stagingDir, {
          fileName: uploadedFile.originalname,
          steps,
          actor,
          action: "update",
          user,
          demo,
          projectName: demo.name || demo.slug,
          deploymentId: currentDeploymentId,
          slug: demo.slug,
          startRuntime: false
        })
      : await extractStaticDemo(uploadedFile.path, stagingDir, {
          fileName: uploadedFile.originalname,
          steps,
          actor,
          action: "update",
          user,
          demo,
          projectName: demo.name || demo.slug,
          deploymentId: currentDeploymentId
        });
    if (result.contentReview?.status !== "passed") {
      throw createContentReviewError(result.contentReview);
    }
    const architecture = attachArchitectureToInspection(result.inspection);
    result.inspection = architecture.inspection;
    const liveDir = path.join(demoRoot, demo.slug);

    if (await exists(liveDir)) {
      await fs.mkdir(path.dirname(backupDir), { recursive: true });
      await copyDemoArchive(liveDir, backupDir);
    }

    await stopRuntime(demo.slug);
    await fs.rm(liveDir, { recursive: true, force: true });
    try {
      await fs.cp(stagingDir, liveDir, { recursive: true });
    } catch (swapError) {
      await fs.rm(liveDir, { recursive: true, force: true });
      if (await exists(backupDir)) {
        await fs.cp(backupDir, liveDir, { recursive: true });
      }
      throw swapError;
    }

    let runtime = null;
    let nextDatabase = canPublishRuntime ? previousDatabase : null;
    try {
      if (canPublishRuntime && needsMysqlDatabase(result.inspection) && !nextDatabase?.enabled) {
        markDeploymentStep(steps, "database", "pending", "正在创建 MySQL 试用数据库");
        nextDatabase = await createDemoDatabase({
          slug: demo.slug,
          demoId: demo.id,
          inspection: result.inspection,
          config: hostingConfig()
        });
        nextDatabase = await initializeDemoDatabase(nextDatabase, {
          projectDir: liveDir,
          config: hostingConfig()
        });
        createdDatabase = nextDatabase;
        if (nextDatabase.schema?.status === "failed") {
          const error = createHttpError(`MySQL 试用数据库已创建，但初始化脚本执行失败：${nextDatabase.schema.error}`, 400);
          error.inspection = result.inspection;
          error.database = nextDatabase;
          error.databaseError = nextDatabase.schema.error;
          throw error;
        }
        markDeploymentStep(steps, "database", "success", nextDatabase.schema?.status === "ready" ? "MySQL 试用数据库已创建并完成初始化" : "MySQL 试用数据库已创建", {
          engine: nextDatabase.engine,
          databaseName: nextDatabase.databaseName,
          schemaStatus: nextDatabase.schema?.status || "skipped"
        });
      } else if (canPublishRuntime && needsMysqlDatabase(result.inspection)) {
        nextDatabase = await initializeDemoDatabase(nextDatabase, {
          projectDir: liveDir,
          config: hostingConfig()
        });
        if (nextDatabase.schema?.status === "failed") {
          const error = createHttpError(`MySQL 试用数据库初始化失败：${nextDatabase.schema.error}`, 400);
          error.inspection = result.inspection;
          error.database = nextDatabase;
          error.databaseError = nextDatabase.schema.error;
          throw error;
        }
        markDeploymentStep(steps, "database", "success", "继续使用已有 MySQL 试用数据库", {
          engine: nextDatabase.engine,
          databaseName: nextDatabase.databaseName,
          schemaStatus: nextDatabase.schema?.status || "skipped"
        });
      } else {
        markDeploymentStep(steps, "database", "skipped", "这个项目不需要试用数据库");
      }
      if (canPublishRuntime) {
        markDeploymentStep(steps, "publish", "pending", "正在启动 Node.js 试用环境，首次安装依赖可能需要 1-3 分钟");
      }
      if (canPublishRuntime) {
        const runtimeConfigStatus = createRuntimeConfigStatus(result.inspection, demo.runtimeEnv, nextDatabase);
        runtime = runtimeConfigStatus.missing.length
          ? createConfigRequiredRuntime(null, runtimeConfigStatus, createFailureDiagnosis({
              message: runtimeConfigStatus.nextAction,
              category: "runtime_env",
              inspection: result.inspection,
              database: nextDatabase
            }))
          : await startNodeRuntime({
              slug: demo.slug,
              projectDir: liveDir,
              inspection: result.inspection,
              config: hostingConfig(),
              env: runtimeEnvForDemo({ ...demo, database: nextDatabase, inspection: result.inspection })
            });
        if (runtimeConfigStatus.missing.length) {
          const diagnosis = runtime.failureDiagnosis || createFailureDiagnosis({
            message: runtimeConfigStatus.nextAction,
            category: "runtime_env",
            inspection: result.inspection,
            runtime,
            database: nextDatabase
          });
          result.inspection = attachDiagnosisToInspection(result.inspection, diagnosis);
          markDeploymentStep(steps, "publish", "skipped", "项目已更新，需补充运行配置后再启动", { missingEnv: runtimeConfigStatus.missing });
        }
      }
    } catch (runtimeError) {
      await fs.rm(liveDir, { recursive: true, force: true });
      if (await exists(backupDir)) {
        await fs.cp(backupDir, liveDir, { recursive: true });
      }
      if (demo.hostingMode === "node_runtime" && await exists(liveDir)) {
        try {
          await startNodeRuntime({
            slug: demo.slug,
            projectDir: liveDir,
            inspection: demo.inspection || {},
            config: hostingConfig(),
            env: runtimeEnvForDemo({ ...demo, database: previousDatabase })
          });
        } catch {
          // Original runtime may remain offline, but files are restored.
        }
      }
      throw runtimeError;
    }
    if (runtime) {
      markDeploymentStep(steps, "publish", "success", "运行环境已启动，试用链接和接口已可访问", { runtimeStatus: runtime.status, driver: runtime.driver });
      markDeploymentStep(steps, "success", "success", "发布成功，访问地址已生成");
      architecture.projectArchitecture.hosting.runtime = {
        ...(architecture.projectArchitecture.hosting.runtime || {}),
        ...runtime
      };
      architecture.inspection.runtime = {
        ...(architecture.inspection.runtime || {}),
        ...runtime
      };
      architecture.inspection.hosting = architecture.projectArchitecture.hosting;
      architecture.inspection.projectArchitecture = architecture.projectArchitecture;
      result.inspection = architecture.inspection;
    }

    const now = new Date().toISOString();
    const updatedDemo = {
      ...demo,
      status: "published",
      detectedType: result.detectedType,
      architecture: architecture.projectArchitecture,
      hosting: architecture.projectArchitecture.hosting,
      hostingMode: architecture.projectArchitecture.projectKind,
      hostingModeLabel: architecture.projectArchitecture.projectKindLabel,
      runtime: architecture.projectArchitecture.hosting.runtime,
      database: nextDatabase,
      runtimeConfig: createRuntimeConfigStatus(result.inspection, demo.runtimeEnv, nextDatabase),
      externalBackend: createExternalBackendConfigStatus(result.inspection, demo.runtimeEnv, demo.externalBackend),
      projectProfile: result.inspection.projectProfile || null,
      projectCategory: result.inspection.projectCategory || result.inspection.projectProfile?.label || "",
      fileCount: result.fileCount,
      extractedBytes: result.extractedBytes,
      ignoredFiles: result.ignoredFiles,
      inspection: result.inspection,
      contentReview: publicContentReview(result.contentReview),
      lastSourceFileName: uploadedFile.originalname,
      updatedAt: now,
      version: Number(demo.version || 1) + 1,
      expiresAt: new Date(Date.now() + quota.plan.demoRetentionDays * 24 * 60 * 60 * 1000).toISOString(),
      deployEvents: [
        ...getDeployEvents(demo),
        { type: "update", at: now, status: "success" }
      ]
    };
    updatedDemo.inspection = {
      ...updatedDemo.inspection,
      externalBackend: updatedDemo.externalBackend
    };
    const autoForm = updatedDemo.hostingMode === "node_runtime"
      ? { reason: "Node.js 运行项目暂不自动接管页面表单" }
      : await ensureAutoHostedForm({
          user,
          demo: updatedDemo,
          inspection: result.inspection,
          targetDir: liveDir,
          now
        });
    if (autoForm?.form) {
      updatedDemo.autoFormId = autoForm.form.id;
      updatedDemo.inspection = {
        ...updatedDemo.inspection,
        autoFormEnabled: true,
        autoFormId: autoForm.form.id,
        autoFormSubmitUrl: publicForm(autoForm.form, { publicBaseUrl }).submitUrl
      };
      result.inspection = updatedDemo.inspection;
      markDeploymentStep(steps, "form_hosting", "success", "已自动开启表单收集", { formId: autoForm.form.id });
    } else if (autoForm?.reason) {
      updatedDemo.inspection = {
        ...updatedDemo.inspection,
        autoFormEnabled: false,
        autoFormReason: autoForm.reason
      };
      result.inspection = updatedDemo.inspection;
      markDeploymentStep(steps, "form_hosting", "skipped", autoForm.reason);
    }
    updatedDemo.externalBackend = createExternalBackendConfigStatus(updatedDemo.inspection, updatedDemo.runtimeEnv, updatedDemo.externalBackend);
    updatedDemo.inspection = {
      ...updatedDemo.inspection,
      externalBackend: updatedDemo.externalBackend
    };
    updatedDemo.applicationReadiness = createApplicationReadiness({ demo: updatedDemo, inspection: updatedDemo.inspection });
    updatedDemo.inspection = {
      ...updatedDemo.inspection,
      applicationReadiness: updatedDemo.applicationReadiness
    };
    result.inspection = updatedDemo.inspection;
    if (previousDatabase?.enabled && previousDatabase.databaseName !== nextDatabase?.databaseName) {
      await deleteDemoDatabase(previousDatabase, hostingConfig()).catch((cleanupError) => {
        logger.error({ err: cleanupError }, "Failed to cleanup old demo database");
      });
    }
    demos[demoIndex] = updatedDemo;
    await writeJson(demosFile, demos);
    await writeAuditLog({
      action: actor === "agent" ? "agent_update_demo" : "update_demo",
      actorType: actor === "agent" ? "agent" : "user",
      actorId: user.id,
      targetType: "demo",
      targetId: demo.id,
      ip: clientIp,
      metadata: {
        slug: demo.slug,
        sourceFileName: uploadedFile.originalname,
        detectedType: result.detectedType,
        buildLog: result.buildLog,
        extractedBytes: result.extractedBytes,
        contentReviewId: result.contentReview?.id,
        contentReviewStatus: result.contentReview?.status,
        databaseEngine: nextDatabase?.engine || "",
        source: deploySource || (actor === "agent" ? "agent_api" : "web")
      }
    });
    const deploymentEvents = completeDeploymentSteps(steps, { demoId: demo.id, userId: user.id, deploymentId: currentDeploymentId });
    await appendDeploymentEvents(deploymentEvents);

    return {
      id: demos[demoIndex].id,
      slug: demos[demoIndex].slug,
      name: demos[demoIndex].name,
      projectName: demos[demoIndex].name,
      status: demos[demoIndex].status,
      publicUrl: demos[demoIndex].publicUrl,
      linkMode: demos[demoIndex].linkMode || "readable",
      customDomainEligible: Boolean(demos[demoIndex].customDomainEligible),
      deploySource: deploySource || demos[demoIndex].deploySource || "web",
      deploySourceLabel: deploySourceLabel(deploySource || demos[demoIndex].deploySource || "web"),
      architecture: architecture.projectArchitecture,
      hosting: architecture.projectArchitecture.hosting,
      hostingMode: architecture.projectArchitecture.projectKind,
      hostingModeLabel: architecture.projectArchitecture.projectKindLabel,
      runtime: architecture.projectArchitecture.hosting.runtime,
      database: publicDemoDatabase(demos[demoIndex].database),
      runtimeEnv: publicRuntimeEnv(demos[demoIndex].runtimeEnv),
      runtimeConfig: demos[demoIndex].runtimeConfig,
      externalBackend: publicExternalBackend(demos[demoIndex].externalBackend),
      applicationReadiness: publicApplicationReadiness(demos[demoIndex].applicationReadiness),
      projectProfile: result.inspection.projectProfile || null,
      projectCategory: result.inspection.projectCategory || result.inspection.projectProfile?.label || "",
      detectedType: demos[demoIndex].detectedType,
      autoFormEnabled: Boolean(result.inspection?.autoFormEnabled),
      autoFormSubmitUrl: result.inspection?.autoFormSubmitUrl || "",
      contentReviewStatus: result.contentReview?.status || "",
      fileCount: demos[demoIndex].fileCount,
      extractedBytes: demos[demoIndex].extractedBytes,
      ignoredFiles: demos[demoIndex].ignoredFiles,
      inspection: result.inspection,
      contentReview: publicContentReview(result.contentReview),
      buildLog: result.buildLog,
      deploymentEvents,
      version: demos[demoIndex].version,
      quota: calculateQuota(user, demos),
      limits: summarizeResponseLimits(calculateQuota(user, demos))
    };
  } catch (error) {
    if (!error.deploymentEvents) {
      await appendDeploymentEvents(failedDeploymentSteps(error, steps, { demoId, userId: user.id, deploymentId: currentDeploymentId }));
    }
    if (createdDatabase) {
      await deleteDemoDatabase(createdDatabase, hostingConfig()).catch(() => null);
    }
    throw error;
  } finally {
    await fs.rm(uploadedFile.path, { force: true });
    await fs.rm(stagingDir, { recursive: true, force: true });
    await fs.rm(backupDir, { recursive: true, force: true });
  }
}

async function runExpirationCheck() {
  try {
    const result = await checkAndRemindExpiringDemos({
      readJson,
      writeJson,
      demosFile,
      usersFile,
      isEmailConfigured,
      sendExpirationEmail: (to, info) => sendExpirationReminderEmail(to, info, { sendSmtpMail, baseUrl: publicBaseUrl }),
      isExpired,
    });
    if (result.reminded > 0) {
      console.log("[到期提醒] 已发送 " + result.reminded + " 封提醒邮件");
    }
  } catch (err) {
    console.error("[到期提醒] 执行失败:", err.message);
  }
}



// --- Error handler middleware ---
const { errorMiddleware } = createErrorHandler({ maxZipSizeMb, attachErrorDiagnosis, publicContentReview });
app.use(errorMiddleware);

export const server = app.listen(port, () => {
  logger.info({ port, version: serviceVersion }, "DemoGo server started");
  setTimeout(runExpirationCheck, 30000);
  setInterval(runExpirationCheck, 6 * 60 * 60 * 1000);
});

async function createAvailableSlug(_input, existingDemos = []) {
  const base = `try-${crypto.randomBytes(4).toString("hex")}`;
  let slug = base;
  let index = 1;

  while (isSlugClaimedByDemo(slug, existingDemos) || await exists(path.join(demoRoot, slug)) || await exists(getArchivedDemoDir(slug))) {
    index += 1;
    slug = `${base}-${index}`;
  }

  return slug;
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

function readBearerToken(req) {
  const authorization = String(req.get("authorization") || "");
  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() === "bearer" && token) return token.trim();
  return String(req.get("x-demogo-agent-token") || "").trim();
}

async function getUserFromRequest(req) {
  const token = req.cookies?.demogo_session;
  if (!token) return null;

  const [sessions, users] = await Promise.all([
    readJson(sessionsFile, []),
    readJson(usersFile, [])
  ]);
  const session = sessions.find((item) => item.token === token && new Date(item.expiresAt) > new Date());
  if (!session) return null;
  return users.find((user) => user.id === session.userId) || null;
}

async function getUserFromAgentToken(value) {
  const token = parseAgentToken(value);
  if (!token) return null;
  const users = await readJson(usersFile, []);
  return users.find((user) => verifyAgentToken(user, token)) || null;
}

async function resolveAgentUpdateDemoId({ user, demoRef }) {
  const ref = String(demoRef || "").trim();
  if (!ref) {
    throw createHttpError("请提供要更新的 Demo ID、链接后缀或原试用链接。", 400);
  }

  const demos = await readJson(demosFile, []);
  const direct = demos.find((demo) => demo.userId === user.id && demo.id === ref);
  if (direct) return direct.id;

  const slug = extractDemoSlug(ref);
  const demo = demos.find((item) => (
    item.userId === user.id &&
    (item.slug === slug || (Array.isArray(item.aliases) && item.aliases.includes(slug)))
  ));
  if (!demo) {
    throw createHttpError("未找到可更新的 Demo。请确认原链接属于当前 AI 发布口令对应的账号。", 404);
  }
  return demo.id;
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
      await expireDemoFiles(demo);
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

async function restartDemoRuntime(demo) {
  if (!demo || demo.status !== "published" || demo.hostingMode !== "node_runtime") {
    const error = "这个项目不是在线 Node.js 试用项目。";
    return { demo, runtime: null, error, diagnosis: createFailureDiagnosis({ message: error, inspection: demo?.inspection, runtime: demo?.runtime, database: demo?.database }) };
  }
  const liveDir = path.join(demoRoot, demo.slug);
  if (!await exists(liveDir)) {
    const error = "项目文件不存在，无法启动运行环境。";
    return { demo, runtime: null, error, diagnosis: createFailureDiagnosis({ message: error, category: "package", inspection: demo.inspection, runtime: demo.runtime, database: demo.database }) };
  }
  try {
    const runtimeConfigStatus = createRuntimeConfigStatus(demo.inspection || {}, demo.runtimeEnv, demo.database);
    if (runtimeConfigStatus.missing.length) {
      const diagnosis = createFailureDiagnosis({
        message: runtimeConfigStatus.nextAction || "请先补充运行配置。",
        category: "runtime_env",
        inspection: demo.inspection,
        runtime: demo.runtime,
        database: demo.database
      });
      const runtime = createConfigRequiredRuntime(demo.runtime, runtimeConfigStatus, diagnosis);
      return {
        demo: {
          ...demo,
          runtime,
          failureDiagnosis: diagnosis,
          runtimeConfig: runtimeConfigStatus,
          updatedAt: new Date().toISOString()
        },
        runtime: null,
        error: runtimeConfigStatus.nextAction || "请先补充运行配置。",
        diagnosis
      };
    }
    const runtime = await startNodeRuntime({
      slug: demo.slug,
      projectDir: liveDir,
      inspection: demo.inspection || {},
      config: hostingConfig(),
      env: runtimeEnvForDemo(demo)
    });
    const nextHosting = {
      ...(demo.hosting || {}),
      runtime: {
        ...(demo.hosting?.runtime || {}),
        ...runtime
      }
    };
    const nextInspection = {
      ...(demo.inspection || {}),
      runtime: {
        ...(demo.inspection?.runtime || {}),
        ...runtime
      },
      hosting: nextHosting
    };
    return {
      demo: {
        ...demo,
        runtime: {
          ...(demo.runtime || {}),
          ...runtime
        },
        hosting: nextHosting,
        inspection: nextInspection,
        runtimeConfig: runtimeConfigStatus,
        updatedAt: new Date().toISOString()
      },
      runtime,
      error: ""
    };
  } catch (error) {
    const diagnosis = createFailureDiagnosis({
      message: error instanceof Error ? error.message : "运行环境启动失败。",
      inspection: demo.inspection,
      runtime: demo.runtime,
      database: demo.database,
      logs: error?.logs || error?.message || ""
    });
    const failedRuntime = {
      ...(demo.runtime || {}),
      status: "failed",
      statusLabel: "启动失败",
      logSummary: diagnosis.evidence?.find((item) => item.startsWith("日志摘要："))?.replace("日志摘要：", "") || demo.runtime?.logSummary || "",
      failureDiagnosis: diagnosis,
      lifecycle: {
        ...(demo.runtime?.lifecycle || {}),
        stage: "failed",
        stageLabel: "启动失败",
        stoppedAt: new Date().toISOString()
      }
    };
    return {
      demo: {
        ...demo,
        runtime: failedRuntime,
        failureDiagnosis: diagnosis,
        updatedAt: new Date().toISOString()
      },
      runtime: null,
      error: error instanceof Error ? error.message : "运行环境启动失败。",
      diagnosis
    };
  }
}

async function removeDemoFiles(value) {
  const slug = demoSlug(value);
  if (!slug) return;
  await stopRuntime(slug);
  const liveDir = path.join(demoRoot, slug);
  const archiveDir = getArchivedDemoDir(slug);
  await removePath(archiveDir);
  if (await exists(liveDir)) {
    await fs.mkdir(path.dirname(archiveDir), { recursive: true });
    await copyDemoArchive(liveDir, archiveDir);
    await removePath(liveDir);
  }
}

async function expireDemoFiles(value) {
  const slug = demoSlug(value);
  if (!slug) return;
  await stopRuntime(slug);
  await removePath(path.join(demoRoot, slug));
  await removePath(getArchivedDemoDir(slug));
  if (typeof value === "object") {
    await deleteDemoDatabase(value.database, hostingConfig()).catch(() => null);
  }
}

async function deleteDemoFiles(value) {
  const slug = demoSlug(value);
  if (!slug) return;
  await stopRuntime(slug);
  await removePath(path.join(demoRoot, slug));
  await removePath(getArchivedDemoDir(slug));
  if (typeof value === "object") {
    await deleteDemoDatabase(value.database, hostingConfig()).catch(() => null);
  }
}

async function redirectDemoAlias(req, res) {
  const slug = slugify(req.params.slug);
  if (!slug) return false;
  const demos = await readJson(demosFile, []);
  const demo = demos.find((item) => Array.isArray(item.aliases) && item.aliases.includes(slug) && item.status === "published");
  if (!demo?.publicUrl) return false;
  res.redirect(302, demo.publicUrl);
  return true;
}

async function appendDeploymentEvents(events) {
  const items = Array.isArray(events) ? events.filter(Boolean) : [];
  if (!items.length) return;
  const existing = await readJson(deploymentEventsFile, []);
  await writeJson(deploymentEventsFile, [...items, ...existing].slice(0, 5000));
}


async function inspectProjectArchive(archivePath, fileName = "") {
  const analysis = await analyzeArchiveEntries(archivePath, fileName, { keepTempFiles: true });
  try {
    let inspection = attachArchitectureToInspection(createInspectionSummary(analysis)).inspection;
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

function hostingConfig() {
  const config = {
    version: serviceVersion,
    dataDir,
    runtimeEnabled,
    runtimeNodeEnabled,
    runtimeDriver,
    runtimeRootDir: runtimeRootDir || path.join(dataDir, "runtime-projects"),
    runtimeDockerImage,
    runtimeMemory,
    runtimeCpus,
    runtimeTtlMinutes,
    runtimeStartTimeoutSeconds,
    runtimeMaxInstances,
    demoDbEnabled,
    demoDbMock,
    demoDbAdminHost,
    demoDbAdminPort,
    demoDbAdminUser,
    demoDbAdminPassword,
    demoDbHost,
    demoDbPort
  };
  return {
    ...config,
    demoDatabaseReady: isDemoDatabaseReady(config)
  };
}

function hostingCapabilities() {
  return createHostingCapabilities(hostingConfig());
}

function attachArchitectureToInspection(inspection) {
  const config = hostingConfig();
  const projectArchitecture = createProjectArchitecture(inspection, config);
  const runtimeReady = projectArchitecture.projectKind === "node_runtime" &&
    projectArchitecture.hosting?.runtime?.status === "ready";
  const runtimeWarnings = inspection.runtime?.warnings || [];
  const runtimeUnsupportedReasons = inspection.runtime?.unsupportedReasons || [];
  const databaseBlockReason = demoDatabaseBlockReason(inspection, config);
  const nextInspection = {
    ...inspection,
    projectArchitecture,
    hosting: projectArchitecture.hosting,
    hostingMode: projectArchitecture.projectKind,
    hostingModeLabel: projectArchitecture.projectKindLabel,
    analysis: {
      ...(inspection.analysis || {}),
      hostingMode: projectArchitecture.projectKind,
      hostingModeLabel: projectArchitecture.projectKindLabel
    },
    runtime: {
      ...(inspection.runtime || {}),
      ...(projectArchitecture.hosting.runtime || {})
    }
  };
  nextInspection.hosting = {
    ...(nextInspection.hosting || {}),
    runtime: nextInspection.runtime
  };
  nextInspection.projectArchitecture = {
    ...projectArchitecture,
    hosting: nextInspection.hosting
  };
  if (runtimeWarnings.length || runtimeUnsupportedReasons.length) {
    nextInspection.supportNotes = Array.from(new Set([
      ...(nextInspection.supportNotes || []),
      ...runtimeWarnings
    ]));
    nextInspection.unsupportedNotes = Array.from(new Set([
      ...(nextInspection.unsupportedNotes || []),
      ...runtimeUnsupportedReasons
    ]));
    nextInspection.ruleReport = {
      ...(nextInspection.ruleReport || {}),
      risks: Array.from(new Set([
        ...((nextInspection.ruleReport || {}).risks || []),
        ...runtimeUnsupportedReasons
      ]))
    };
  }
  if (databaseBlockReason) {
    nextInspection.unsupportedNotes = Array.from(new Set([
      ...(nextInspection.unsupportedNotes || []),
      databaseBlockReason
    ]));
    nextInspection.ruleReport = {
      ...(nextInspection.ruleReport || {}),
      risks: Array.from(new Set([
        ...((nextInspection.ruleReport || {}).risks || []),
        databaseBlockReason
      ]))
    };
  }
  const externalBackend = createExternalBackendConfigStatus(nextInspection, {}, nextInspection.externalBackend);
  if (externalBackend) {
    nextInspection.externalBackend = externalBackend;
    nextInspection.supportNotes = Array.from(new Set([
      ...(nextInspection.supportNotes || []),
      externalBackend.status === "missing"
        ? "检测到 Supabase，需要在项目详情页填写 URL 和 anon key"
        : "检测到 Supabase 外部后端配置"
    ]));
    nextInspection.ruleReport = {
      ...(nextInspection.ruleReport || {}),
      recommendations: Array.from(new Set([
        ...((nextInspection.ruleReport || {}).recommendations || []),
        "Supabase 由用户自行提供，DemoGo 保存 anon key、做基础连接检测，并在构建或运行时注入配置。"
      ]))
    };
  }
  if (inspection.runtime?.requiresMysql && !inspection.runtime?.unsupportedReasons?.length) {
    nextInspection.supportNotes = Array.from(new Set([
      ...(nextInspection.supportNotes || []),
      "发布时会分配 MySQL 试用数据库"
    ]));
    nextInspection.ruleReport = {
      ...(nextInspection.ruleReport || {}),
      recommendations: Array.from(new Set([
        ...((nextInspection.ruleReport || {}).recommendations || []),
        "检测到 MySQL 依赖，发布时会创建隔离的空试用数据库。"
      ]))
    };
  }
  if (runtimeReady) {
    nextInspection.status = "warning";
    nextInspection.canPublish = true;
    nextInspection.summary = inspection.hasSsr
      ? "已识别为可单服务运行的完整应用项目，可以创建试用运行环境。"
      : "已识别为 Node.js 单服务项目，可以创建试用运行环境。";
    nextInspection.userStatus = "supported";
    nextInspection.userStatusLabel = "支持";
    nextInspection.userSummary = inspection.hasSsr
      ? "这个完整应用可以进入试用运行环境，页面和接口会放在同一个试用链接下。"
      : "这个项目可以进入 Node.js 单服务试用环境，页面和接口会放在同一个试用链接下。";
    nextInspection.ruleReport = {
      ...(nextInspection.ruleReport || {}),
      publishability: "支持",
      recommendations: Array.from(new Set([
        ...((nextInspection.ruleReport || {}).recommendations || []),
        inspection.runtime?.requiresMysql
          ? "Node.js 单服务运行器和 MySQL 试用数据库已开启，可以创建试用环境。"
          : "Node.js 单服务运行器已开启，可以创建试用运行环境。"
      ]))
    };
  } else if (projectArchitecture.projectKind === "node_runtime") {
    nextInspection.status = "blocked";
    nextInspection.canPublish = false;
    nextInspection.userStatus = "unsupported";
    nextInspection.userStatusLabel = "暂不支持";
    nextInspection.summary = projectArchitecture.hosting?.runtime?.statusLabel || "当前运行环境尚未就绪。";
    nextInspection.userSummary = "这个项目需要应用运行环境。当前平台环境还没有满足启动条件，暂时不能生成可运行的试用链接。";
    nextInspection.unsupportedNotes = Array.from(new Set([
      ...(nextInspection.unsupportedNotes || []),
      nextInspection.summary
    ]));
  }
  nextInspection.applicationReadiness = createApplicationReadiness({ inspection: nextInspection });
  return {
    projectArchitecture,
    inspection: nextInspection
  };
}

function isNodeRuntimeInspection(inspection = {}) {
  return inspection.hostingMode === "node_runtime" ||
    inspection.projectProfile?.type === "node_service" ||
    (inspection.projectProfile?.type === "fullstack_framework" && inspection.hosting?.mode === "node_runtime") ||
    (inspection.hasBackend && inspection.runtime?.engine === "node");
}

function createConfigRequiredRuntime(previousRuntime = null, runtimeConfigStatus = {}, diagnosis = null) {
  return {
    ...(previousRuntime || {}),
    status: "config_required",
    statusLabel: "等待运行配置",
    logs: previousRuntime?.logs || "",
    logSummary: runtimeConfigStatus.nextAction || "",
    failureDiagnosis: diagnosis || createFailureDiagnosis({
      message: runtimeConfigStatus.nextAction || "请先补充运行配置。",
      category: "runtime_env",
      runtime: previousRuntime
    }),
    lifecycle: {
      ...(previousRuntime?.lifecycle || {}),
      stage: "config_required",
      stageLabel: "等待运行配置",
      startedAt: null,
      stoppedAt: null
    },
    config: runtimeConfigStatus
  };
}

function attachRuntimeToInspection(inspection = {}, runtime = {}) {
  return {
    ...inspection,
    runtime: {
      ...(inspection.runtime || {}),
      ...runtime,
      status: runtime.status,
      statusLabel: runtime.statusLabel
    },
    hosting: {
      ...(inspection.hosting || {}),
      runtime: {
        ...(inspection.hosting?.runtime || {}),
        ...runtime,
        status: runtime.status,
        statusLabel: runtime.statusLabel
      }
    }
  };
}

function canPublishNodeRuntimeInspection(inspection = {}) {
  if (!isNodeRuntimeInspection(inspection)) return false;
  const config = hostingConfig();
  const databaseReason = demoDatabaseBlockReason(inspection, config);
  if (databaseReason) return false;
  const runtimeCheck = canStartNodeRuntime(inspection, createRuntimeConfig(config));
  return runtimeCheck.ok || runtimeCheck.configRequired;
}

function nodeRuntimeBlockReason(inspection = {}) {
  if (!isNodeRuntimeInspection(inspection)) return "";
  const config = hostingConfig();
  const databaseReason = demoDatabaseBlockReason(inspection, config);
  if (databaseReason) return databaseReason;
  const runtimeCheck = canStartNodeRuntime(inspection, createRuntimeConfig(config));
  if (runtimeCheck.configRequired) return "";
  return runtimeCheck.reason;
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

  const result = await detectBuildAndNormalizeOutput(targetDir, inspection, {
    env: externalBackendEnvValues(inspection, options.demo?.runtimeEnv || {})
  });
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
    finalInspection.externalBackend = createExternalBackendConfigStatus(finalInspection, options.demo?.runtimeEnv || {}, options.demo?.externalBackend);
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

async function extractRuntimeDemo(archivePath, targetDir, options = {}) {
  const steps = options.steps || [];
  const analysis = await analyzeArchiveEntries(archivePath, options.fileName, { keepTempFiles: true });
  try {
    markDeploymentStep(steps, "extract", "success", `解压文件完成，识别到 ${analysis.rawFileCount} 个文件`, { archiveType: analysis.archiveType });
    markDeploymentStep(steps, "security_check", analysis.blockedFiles.length ? "failed" : "success", analysis.blockedFiles.length ? "安全检查未通过" : "安全检查通过", {
      ignoredFiles: analysis.ignoredFiles,
      blockedFiles: analysis.blockedFiles
    });
    let inspection = attachArchitectureToInspection(createInspectionSummary(analysis)).inspection;
    markDeploymentStep(steps, "inspect", inspection.hostingMode === "node_runtime" ? "success" : "failed", inspection.summary, {
      detectedType: inspection.detectedType,
      hostingMode: inspection.hostingMode
    });
    const runtimeEligibility = canStartNodeRuntime(inspection, createRuntimeConfig(hostingConfig()));
    if (!runtimeEligibility.ok && !runtimeEligibility.configRequired) {
      throw createProjectError(inspection, runtimeEligibility.reason);
    }
    let configRequiredRuntime = null;
    if (runtimeEligibility.configRequired) {
      configRequiredRuntime = createConfigRequiredRuntime(null, createRuntimeConfigStatus(inspection, {}, null), createFailureDiagnosis({
        message: runtimeEligibility.reason,
        category: "runtime_env",
        inspection,
        runtime: null,
        database: null
      }));
      inspection.runtime = { ...(inspection.runtime || {}), ...configRequiredRuntime };
      inspection = attachDiagnosisToInspection(inspection, createFailureDiagnosis({
        message: runtimeEligibility.reason,
        category: "runtime_env",
        inspection,
        runtime: configRequiredRuntime,
        database: null
      }));
    }
    if (analysis.blockedFiles.length) {
      throw createProjectError(inspection, "项目包包含敏感或不支持发布的文件。");
    }
    if (!analysis.publishableEntries.length) {
      throw createProjectError(inspection, "压缩包内没有可运行文件。");
    }
    const stats = await prepareRuntimeProject({
      archiveEntries: analysis.publishableEntries,
      targetDir,
      maxFiles: maxExtractedFiles,
      maxBytes: maxExtractedBytes,
      writeEntry: writeArchiveEntry
    });
    markDeploymentStep(steps, "build", "skipped", "Node.js 项目将直接创建运行环境", { detectedType: inspection.detectedType });
    const contentReview = await createAndPersistContentReview({
      analysis,
      inspection,
      fileName: options.fileName,
      actor: options.actor,
      action: options.action,
      user: options.user,
      demo: options.demo,
      projectName: options.projectName,
      deploymentId: options.deploymentId,
      targetDir
    });
    inspection.contentReview = publicContentReview(contentReview);
    markDeploymentStep(
      steps,
      "content_review",
      contentReview.status === "passed" ? "success" : "failed",
      contentReview.summary,
      { contentReviewId: contentReview.id, contentReviewStatus: contentReview.status }
    );
    if (contentReview.status !== "passed" && contentReviewFailClosed) {
      const error = createProjectError(inspection, contentReview.summary);
      error.contentReview = contentReview;
      throw error;
    }
    inspection.externalBackend = createExternalBackendConfigStatus(inspection, options.demo?.runtimeEnv || {}, options.demo?.externalBackend);
    markDeploymentStep(steps, "form_hosting", "skipped", "Node.js 运行项目暂不自动接管页面表单");
    const runtime = configRequiredRuntime || {
      status: "ready",
      statusLabel: "等待启动",
      lifecycle: {
        stage: "ready_to_start",
        stageLabel: "等待启动",
        startedAt: null,
        expiresAt: null,
        stoppedAt: null
      },
      logs: ""
    };
    const finalInspection = {
      ...inspection,
      runtime: {
        ...(inspection.runtime || {}),
        ...runtime,
        status: runtime.status,
        statusLabel: runtime.statusLabel
      },
      hosting: {
        ...(inspection.hosting || {}),
        runtime: {
          ...(inspection.hosting?.runtime || {}),
          ...runtime,
          status: runtime.status,
          statusLabel: runtime.statusLabel
        }
      },
      canPublish: true,
      status: "pass",
      userStatus: "supported",
      userStatusLabel: "支持",
      userSummary: "这个 Node.js 单服务项目已创建试用运行环境，可以通过试用链接访问页面和接口。"
    };
    markDeploymentStep(steps, "publish", "success", "运行项目文件准备完成", { runtimeStatus: "pending" });
    return {
      detectedType: inspection.detectedType,
      buildLog: runtime.logs || "",
      fileCount: stats.fileCount,
      extractedBytes: stats.extractedBytes,
      ignoredFiles: analysis.ignoredFiles,
      contentReview,
      inspection: finalInspection,
      runtime
    };
  } catch (error) {
    throw error;
  } finally {
    await cleanupArchiveAnalysis(analysis);
  }
}


// Demo track route
registerDemoTrackRoutes(app, { recordDemoVisit });

// Sync upload to object storage
async function syncUploadToStorage(filePath, originalName) {
  if (!isMinioBackend()) return;
  try {
    const key = `uploads/${path.basename(filePath)}-${originalName}`;
    await putFile(key, filePath);
  } catch (err) {
    logger.warn({ originalName, error: err.message }, "Failed to sync upload to object storage");
  }
}

// Sync demo files to object storage
async function syncDemoToStorage(slug) {
  if (!isMinioBackend()) return;
  const demoDir = path.join(demoRoot, slug);
  try {
    await putDirectory(`demos/${slug}`, demoDir);
    logger.info({ slug }, "Demo synced to object storage");
  } catch (err) {
    logger.warn({ slug, error: err.message }, "Failed to sync demo to object storage");
  }
}

// Delete demo from object storage
async function deleteDemoFromStorage(slug) {
  if (!isMinioBackend()) return;
  try {
    await deletePrefix(`demos/${slug}`);
    logger.info({ slug }, "Demo deleted from object storage");
  } catch (err) {
    logger.warn({ slug, error: err.message }, "Failed to delete demo from object storage");
  }
}

// Graceful shutdown
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Shutdown signal received, stopping gracefully...");

  // 1. Stop HTTP server (drain in-flight requests)
  try {
    await new Promise((resolve) => server?.close?.(resolve));
    logger.info("HTTP server closed, no longer accepting requests");
  } catch (err) {
    logger.warn({ err }, "HTTP server close error");
  }

  // 2. Stop running Docker containers
  try {
    await stopExpiredRuntimes();
    logger.info("Runtime containers stopped");
  } catch (err) {
    logger.warn({ err }, "Runtime container stop error");
  }

  // 3. Close Redis/BullMQ queue connection
  try {
    await closeQueue();
    logger.info("Queue connection closed");
  } catch (err) {
    logger.warn({ err }, "Queue close error");
  }

  // 4. Close MySQL connection pool
  try {
    await closePool();
    logger.info("MySQL pool closed");
  } catch (err) {
    logger.warn({ err }, "MySQL pool close error");
  }

  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGQUIT", () => shutdown("SIGQUIT"));

// Top-level error handlers
process.on("uncaughtException", (err) => {
  logger.error({ err: { message: err.message, stack: err?.stack?.split("\n").slice(0, 8).join("\n") } }, "Uncaught exception");
  shutdown("UNCAUGHT_EXCEPTION").catch(() => process.exit(1));
});
process.on("unhandledRejection", (reason) => {
  logger.warn({ reason: String(reason) }, "Unhandled promise rejection");
});