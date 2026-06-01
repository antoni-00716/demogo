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
  contentReviewStatusLabel,
  createContentReviewError,
  publicContentReview,
  reviewArchiveContent,
  reviewDirectoryContent,
} from "./services/content-review-service.js";
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
import { createAuthMiddleware } from "./middleware/auth.js";
import { createContentReviewProvider } from "./services/content-review-provider.js";
import { csrfMiddleware } from "./middleware/csrf.js";
import { apiVersionMiddleware } from "./middleware/api-version.js";
import { startCleanupService } from "./services/cleanup-service.js";
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

const archiveIgnoredPathParts = new Set([
  "node_modules"
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
const loginRateLimiter = createLoginRateLimiter({ loginFailureLimit, loginFailureWindowMs });
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
  routeRuntimeDemo,
  securityHeadersMiddleware,
  createStrictRateLimiter,
  createRateLimiter,
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
  writeTrialEvent: writeTrialEvent,
});

// --- Admin route module ---
registerAdminRoutes(app, {
  requireAdmin,
  flushUsageStats,
  svcReadDeploymentEventsForDemo,
  writeTrialEvent: writeTrialEvent,
});



// ===== STATIC FILE SERVING =====

// ===== HEALTH & CAPABILITIES =====

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


// ===== AGENT TOKEN & PROJECT =====

// ===== DEMOS CRUD =====

// ===== DEPLOY EVENTS & JOBS =====

// ===== FORMS =====

// ===== PUBLIC FORM SUBMISSION =====

// ===== ADMIN ROUTES =====

// ===== FEEDBACK =====

// ===== INSPECT & DEPLOY =====

// ===== ADMIN CONTENT REVIEWS =====

// ===== DEMO LIFECYCLE (offline/delete/slug/restore) =====

// ===== SUBDOMAIN REQUESTS =====

// ===== DEMO UPDATE =====

// ===== DEPLOYMENT JOBS (async) =====

// ===== RUNTIME MANAGEMENT =====

// ===== RUNTIME ENV CONFIG =====

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

function summarizeFailureReasons(events, contentReviews) {
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

function summarizeTrialFunnel(trialEvents = [], deploymentEvents = [], auditLogs = [], users = []) {
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

function summarizeDeploySources(auditLogs = [], demos = []) {
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

function countBy(items, getter) {
  return (Array.isArray(items) ? items : []).reduce((acc, item) => {
    const key = getter(item);
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function normalizeTrialEventType(value) {
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

async function writeTrialEvent(event) {
  const eventType = normalizeTrialEventType(event?.eventType);
  if (!eventType) return;
  const events = await readJson(trialEventsFile, []);
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
  await writeJson(trialEventsFile, events.slice(0, 5000));
}

function sanitizeTrialMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const clean = {};
  for (const [key, item] of Object.entries(value)) {
    if (!/^[a-zA-Z0-9_:-]{1,48}$/.test(key)) continue;
    if (typeof item === "string") clean[key] = item.slice(0, 500);
    else if (typeof item === "number" || typeof item === "boolean" || item === null) clean[key] = item;
  }
  return clean;
}

function classifyFailureMessage(message = "") {
  return classifyFailureCategory({ message });
}

function normalizeSubdomainRequestStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  return ["open", "approved", "rejected", "canceled"].includes(status) ? status : "";
}

function subdomainRequestStatusLabel(status) {
  return {
    open: "待处理",
    approved: "已通过",
    rejected: "已拒绝",
    canceled: "已取消"
  }[status] || "待处理";
}

function filterSubdomainRequests(requests, filters = {}) {
  const status = normalizeSubdomainRequestStatus(filters.status);
  return (requests || [])
    .filter((item) => !status || item.status === status)
    .map((item) => ({
      ...item,
      statusLabel: subdomainRequestStatusLabel(item.status)
    }));
}

function summarizeResponseLimits(quota) {
  if (!quota) return null;
  return {
    plan: quota.plan?.name || quota.plan?.code || "",
    onlineDemos: quota.onlineDemos || null,
    monthlyDeploys: quota.monthlyDeploys || null
  };
}


function attachErrorDiagnosis(error, context = {}) {
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

function attachDiagnosisToInspection(inspection, diagnosis) {
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

function deploymentJobStatusLabel(status) {
  if (status === "queued") return "等待开始";
  if (status === "running") return "正在生成";
  if (status === "success") return "已生成";
  if (status === "failed") return "生成失败";
  return "未知状态";
}


function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

app.use("/d", express.static(demoRoot));

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
  const diagnosis = attachErrorDiagnosis(error, { message, statusCode });
  res.status(statusCode).json({
    error: message,
    inspection: error.inspection,
    contentReview: publicContentReview(error.contentReview),
    diagnosis,
    deploymentEvents: error.deploymentEvents || undefined
  });
});

// Demo 到期提醒定时任务，每 6 小时执行一次
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

app.listen(port, () => {
  console.log(`DemoGo server listening on ${port}`);
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

function isSlugClaimedByDemo(slug, demos = [], ignoreDemoId = "") {
  return demos.some((demo) => {
    if (ignoreDemoId && demo.id === ignoreDemoId) return false;
    return demo.slug === slug || (Array.isArray(demo.aliases) && demo.aliases.includes(slug));
  });
}

function canUseCustomDomain(planCode = "free") {
  return String(planCode || "free").toLowerCase() === "pro";
}

function canCustomizeSlug(planCode = "free") {
  return ["lite", "pro"].includes(String(planCode || "free").toLowerCase());
}

function normalizeCustomSlug(value) {
  const slug = String(value || "").trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(slug)) return "";
  return slug;
}

function isReservedSlug(value) {
  return new Set([
    "api",
    "admin",
    "app",
    "www",
    "mail",
    "login",
    "register",
    "static",
    "assets",
    "demo",
    "demogo",
    "root",
    "support"
  ]).has(String(value || "").toLowerCase());
}

function platformHost() {
  try {
    return new URL(publicBaseUrl).hostname.replace(/^www\./, "");
  } catch {
    return "demogo.cn";
  }
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

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
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

function extractDemoSlug(value) {
  const ref = String(value || "").trim();
  if (!ref) return "";
  try {
    const url = new URL(ref);
    const parts = url.pathname.split("/").filter(Boolean);
    const demoIndex = parts.indexOf("d");
    return slugify(demoIndex >= 0 ? parts[demoIndex + 1] || "" : parts.at(-1) || "");
  } catch {
    const cleaned = ref.replace(/^\/?d\//i, "").split(/[/?#]/)[0];
    return slugify(cleaned);
  }
}

function normalizeEnvKey(value) {
  const key = String(value || "").trim().toUpperCase();
  return /^[A-Z_][A-Z0-9_]*$/.test(key) ? key : "";
}

function isPlatformEnvKey(key) {
  return ["PORT", "NODE_ENV"].includes(String(key || "").toUpperCase());
}

function maskSecretValue(value) {
  const text = String(value || "");
  if (!text) return "";
  if (text.length <= 6) return "***";
  return `${text.slice(0, 3)}***${text.slice(-3)}`;
}

async function createAndPersistContentReview(context) {
  const sourceReview = await reviewArchiveContent(context.analysis, {
    mode: contentReviewMode,
    maxTextBytes: contentReviewMaxTextBytes,
    externalEndpoint: contentReviewExternalEndpoint,
    externalToken: contentReviewExternalToken,
    id: crypto.randomUUID(),
    readText: readArchiveEntryText
  });
  const outputReview = context.targetDir
    ? await reviewDirectoryContent(context.targetDir, {
        mode: contentReviewMode,
        maxTextBytes: contentReviewMaxTextBytes,
        externalEndpoint: contentReviewExternalEndpoint,
        externalToken: contentReviewExternalToken,
        id: crypto.randomUUID()
      })
    : null;
  const review = mergeContentReviews(sourceReview, outputReview);
  const record = {
    ...review,
    id: review.id || crypto.randomUUID(),
    userId: context.user?.id || context.demo?.userId || null,
    userEmail: context.user?.email || context.demo?.userEmail || "",
    demoId: context.demo?.id || null,
    demoSlug: context.demo?.slug || "",
    deploymentId: context.deploymentId || null,
    action: context.action || "create",
    actorType: context.actor || "user",
    projectName: context.projectName || "",
    fileName: context.fileName || "",
    detectedType: context.inspection?.detectedType || "",
    canPublishBeforeReview: Boolean(context.inspection?.canPublish),
    resolutionStatus: defaultContentReviewResolutionStatus(review.status),
    adminNote: "",
    handledBy: "",
    handledAt: null
  };
  await persistContentReview(record);
  return record;
}

async function persistPreflightContentReview(context) {
  const review = context.inspection?.contentReview;
  if (!review || !review.status || review.status === "passed") return null;
  const record = {
    ...review,
    id: review.id || crypto.randomUUID(),
    userId: context.user?.id || null,
    userEmail: context.user?.email || "",
    demoId: null,
    demoSlug: "",
    deploymentId: context.deploymentId || null,
    action: context.action || "create",
    actorType: context.actor || "user",
    projectName: context.projectName || "",
    fileName: context.fileName || "",
    detectedType: context.inspection?.detectedType || "",
    canPublishBeforeReview: false,
    resolutionStatus: defaultContentReviewResolutionStatus(review.status),
    adminNote: "",
    handledBy: "",
    handledAt: null,
    createdAt: review.createdAt || new Date().toISOString()
  };
  await persistContentReview(record);
  return record;
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
    summary: summarizeMergedContentReview(status, findings),
    findings,
    reviewedFiles: Array.from(new Set([...(sourceReview.reviewedFiles || []), ...(outputReview.reviewedFiles || [])])).slice(0, 120),
    reviewedFileCount: Number(sourceReview.reviewedFileCount || 0) + Number(outputReview.reviewedFileCount || 0),
    scannedTextBytes: Number(sourceReview.scannedTextBytes || 0) + Number(outputReview.scannedTextBytes || 0),
    scope: "source_and_output"
  };
}

function summarizeMergedContentReview(status, findings) {
  const categories = Array.from(new Set(findings.map((item) => item.category))).slice(0, 3).join("、");
  if (status === "passed" && findings.length) return `内容检查通过，发现 ${categories || "一般提示"}，不影响生成试用链接。`;
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

function attachContentReviewToInspection(inspection, review) {
  const publicReview = publicContentReview(review);
  const blocked = review?.status === "blocked" || review?.status === "review_required" || review?.status === "failed";
  const issues = [...(inspection.issues || [])];
  const suggestions = [...(inspection.suggestions || [])];
  if (blocked) {
    issues.push(review.summary || "内容检查未通过。");
    for (const finding of (review.findings || []).slice(0, 5)) {
      if (finding.suggestion) suggestions.push(finding.suggestion);
    }
  }
  return {
    ...inspection,
    status: blocked ? "blocked" : inspection.status,
    canPublish: inspection.canPublish && !blocked,
    summary: blocked ? (review.summary || "内容检查未通过。") : inspection.summary,
    userStatus: blocked ? "unsupported" : inspection.userStatus,
    userStatusLabel: blocked ? "暂不能发布" : inspection.userStatusLabel,
    userSummary: blocked ? contentReviewUserSummary(review) : inspection.userSummary,
    issues,
    suggestions: Array.from(new Set(suggestions)),
    contentReview: publicReview,
    ruleReport: {
      ...(inspection.ruleReport || {}),
      risks: [
        ...((inspection.ruleReport || {}).risks || []),
        ...((blocked ? (review.findings || []).filter((finding) => finding.severity !== "notice") : []).slice(0, 5).map((finding) => `${finding.category}：${finding.snippet || finding.sourceFile || ""}`))
      ],
      recommendations: [
        ...((inspection.ruleReport || {}).recommendations || []),
        ...((blocked ? (review.findings || []).filter((finding) => finding.severity !== "notice") : []).slice(0, 5).map((finding) => finding.suggestion).filter(Boolean))
      ],
      fixPrompt: createContentReviewFixPrompt(review) || (inspection.ruleReport || {}).fixPrompt
    }
  };
}

function createContentReviewFixPrompt(review) {
  if (!review || review.status === "passed") return "";
  const findings = (review.findings || []).slice(0, 5);
  return [
    "请帮我修改这个页面，使它适合公开分享和试用。",
    "要求：删除或改写可能涉及诈骗、博彩、色情低俗、违法交易、恶意下载、高敏信息收集或真实支付风险的内容。正常报名、预约、咨询、姓名、手机号、邮箱等获客表单可以保留。",
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
  return ["blocked", "review_required", "failed"].includes(String(status || "")) ? "pending_review" : "resolved";
}

function publicAdminContentReview(review) {
  return {
    ...publicContentReview(review),
    userId: review.userId || null,
    userEmail: review.userEmail || "",
    demoId: review.demoId || null,
    demoSlug: review.demoSlug || "",
    deploymentId: review.deploymentId || null,
    action: review.action || "",
    actorType: review.actorType || "",
    projectName: review.projectName || "",
    fileName: review.fileName || "",
    detectedType: review.detectedType || "",
    canPublishBeforeReview: Boolean(review.canPublishBeforeReview),
    resolutionStatus: contentReviewResolutionStatus(review),
    resolutionStatusLabel: contentReviewResolutionStatusLabel(contentReviewResolutionStatus(review)),
    adminNote: review.adminNote || "",
    handledBy: review.handledBy || "",
    handledAt: review.handledAt || null
  };
}

function contentReviewResolutionStatus(review) {
  if (review?.resolutionStatus) return normalizeContentReviewResolutionStatus(review.resolutionStatus) || "pending_review";
  return ["blocked", "review_required", "failed"].includes(String(review?.status || "")) ? "pending" : "resolved";
}

function normalizeContentReviewResolutionStatus(value) {
  const status = String(value || "").trim();
  return ["pending_review", "pending", "confirmed_violation", "false_positive", "resolved"].includes(status) ? status : "";
}

function contentReviewResolutionStatusLabel(status) {
  if (status === "pending_review") return "待处理";
  if (status === "confirmed_violation") return "确认违规";
  if (status === "false_positive") return "误判";
  if (status === "resolved") return "已处理";
  return "待处理";
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

function isExpired(demo) {
  return demo.expiresAt && new Date(demo.expiresAt) <= new Date();
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

function demoSlug(value) {
  return typeof value === "string" ? value : value?.slug;
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

async function removePath(targetPath) {
  if (process.platform === "win32") {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  await fs.rm(targetPath, {
    recursive: true,
    force: true,
    maxRetries: 20,
    retryDelay: 1000
  });
}

async function copyDemoArchive(sourceDir, targetDir) {
  const rootDir = path.resolve(sourceDir);
  await fs.cp(sourceDir, targetDir, {
    recursive: true,
    filter: (sourcePath) => shouldCopyDemoArchivePath(sourcePath, rootDir)
  });
}

function shouldCopyDemoArchivePath(sourcePath, rootDir) {
  const relativePath = path.relative(rootDir, path.resolve(sourcePath));
  if (!relativePath) return true;
  return !relativePath
    .split(path.sep)
    .filter(Boolean)
    .some((part) => archiveIgnoredPathParts.has(part));
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

function getArchivedDemoDir(slug) {
  return path.join(dataDir, "offline-demos", slug);
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

async function appendDeploymentEvents(events) {
  const items = Array.isArray(events) ? events.filter(Boolean) : [];
  if (!items.length) return;
  const existing = await readJson(deploymentEventsFile, []);
  await writeJson(deploymentEventsFile, [...items, ...existing].slice(0, 5000));
}


function createDeploymentSteps(context = {}) {
  const now = new Date().toISOString();
  const steps = [
    ["receive", "success", "接收文件完成"],
    ["extract", "pending", "等待解压项目文件"],
    ["security_check", "pending", "等待安全检查"],
    ["inspect", "pending", "等待检测项目类型"],
    ["build", "pending", "等待构建检查"],
    ["content_review", "pending", "等待内容安全检查"],
    ["database", "pending", "等待试用数据库检查"],
    ["form_hosting", "pending", "等待表单收集检查"],
    ["publish", "pending", "等待发布文件"],
    ["success", "pending", "等待生成访问地址"]
  ];
  return steps.map(([eventType, status, message]) => ({
    id: crypto.randomUUID(),
    demoId: context.demoId || null,
    userId: context.userId || null,
    deploymentId: context.deploymentId || null,
    eventType,
    status,
    message,
    detail: { action: context.action || "create" },
    createdAt: now
  }));
}

function markDeploymentStep(steps, eventType, status, message, detail = {}) {
  if (!Array.isArray(steps)) return;
  const step = steps.find((item) => item.eventType === eventType);
  if (!step) return;
  step.status = status;
  step.message = message || step.message;
  step.detail = { ...(step.detail || {}), ...detail };
  step.createdAt = new Date().toISOString();
}

function completeDeploymentSteps(steps, context = {}) {
  const now = new Date().toISOString();
  return (Array.isArray(steps) ? steps : []).map((step) => ({
    ...step,
    demoId: step.demoId || context.demoId || null,
    userId: step.userId || context.userId || null,
    deploymentId: step.deploymentId || context.deploymentId || null,
    status: step.status === "pending" ? "skipped" : step.status,
    createdAt: step.createdAt || now
  }));
}

function failedDeploymentSteps(error, steps = [], context = {}) {
  const message = error instanceof Error ? error.message : "发布失败";
  const existing = completeDeploymentSteps(steps, context);
  const hasFailed = existing.some((step) => step.status === "failed");
  return [
    ...existing,
    ...(hasFailed ? [] : [{
      id: crypto.randomUUID(),
      demoId: context.demoId || null,
      userId: context.userId || null,
      deploymentId: context.deploymentId || null,
      eventType: "failed",
      status: "failed",
      message,
      detail: {},
      createdAt: new Date().toISOString()
    }])
  ];
}

function getClientIp(req) {
  return String(req.get("x-forwarded-for") || req.socket.remoteAddress || "")
    .split(",")[0]
    .trim();
}

function extractEmailAddress(value) {
  const match = String(value || "").match(/<([^>]+)>/);
  return (match ? match[1] : String(value || "")).trim();
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
  await renameWithRetry(tempFile, filePath);
}

async function renameWithRetry(source, target, attempts = 5) {
  let lastError = null;
  for (let index = 0; index < attempts; index += 1) {
    try {
      await fs.rename(source, target);
      return;
    } catch (error) {
      lastError = error;
      if (!["EPERM", "EBUSY"].includes(error?.code) || index === attempts - 1) break;
      await new Promise((resolve) => setTimeout(resolve, 50 * (index + 1)));
    }
  }
  throw lastError;
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










































function createRuleReport(context) {
  const hasForms = context.formFields.length > 0;
  const localApis = context.apiCalls.filter((item) => item.isLocal);
  const risks = [];
  const recommendations = [];
  let projectCategory = context.projectProfile?.label || inspectionTypeLabel(context.detectedType);

  if (context.projectProfile?.summary) {
    recommendations.push(`项目类型：${context.projectProfile.summary}。`);
  }

  for (const reason of context.projectProfile?.unsupportedReasons || []) {
    if (!risks.includes(reason)) risks.push(reason);
  }

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

  if (context.hasPackageJson && !context.hasBuildScript && !context.entryFile && context.projectProfile?.type !== "node_service") {
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
  if (context.projectProfile?.type === "node_service") {
    parts.push("请确认这是一个 Node.js 单服务项目：package.json 里需要有 scripts.start，服务必须监听 process.env.PORT，不要写死 3000/3001 端口；当前不要依赖 Redis、WebSocket 或多个服务同时运行。");
    if (context.runtime?.unsupportedReasons?.length) {
      parts.push(`当前检测到的阻塞点：${context.runtime.unsupportedReasons.join("；")}。请先改成无 Redis、无 WebSocket、无多服务的演示版本。`);
    } else if (context.runtime?.requiresMysql) {
      parts.push("项目可以使用 DemoGo 分配的 MySQL 试用数据库。请从环境变量读取 MYSQL_HOST、MYSQL_PORT、MYSQL_DATABASE、MYSQL_USER、MYSQL_PASSWORD 或 DATABASE_URL，不要写死数据库连接信息。");
      parts.push("第一版只提供空库，不会自动建表或执行迁移。请在应用启动时自行建表，或让演示逻辑在表不存在时自动初始化。");
    }
    if (context.runtime?.hasStartProdScript) {
      parts.push("运行器会优先使用 npm run start:prod，请确认这个命令可以在生产模式启动，并监听 process.env.PORT。");
    } else if (context.runtime?.buildBeforeStart) {
      parts.push("运行器会先执行 npm run build，再执行 npm start。请确认 build 能生成 start 需要的 dist/build 文件。");
    }
  }
  if (["mini_program_source", "desktop_app_source", "mobile_native_source"].includes(context.projectProfile?.type)) {
    parts.push("请导出一个可以在浏览器打开的 H5/Web 版本，再上传生成试用链接。当前不要上传小程序源码、桌面应用源码或 App 源码作为最终发布包。");
  }
  if (context.projectProfile?.type === "fullstack_framework") {
    parts.push("请将 Next/Nuxt/Remix 等项目导出为静态网页产物后再上传，例如生成 out/dist/build 目录；当前不要依赖 SSR 服务端运行态。");
  }
  if (localApis.length) {
    parts.push("请检查当前项目中的表单提交或数据保存逻辑。项目发布到 DemoGo 后，不会自动运行 /api/ 开头的自定义后台接口。基础报名、预约或留言表单可以由 DemoGo 自动接管；完整业务后台需要后续后端托管能力。");
  }
  if (context.hasPackageJson && !context.hasBuildScript && !context.entryFile && context.projectProfile?.type !== "node_service") {
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

function createInspectionSummary(analysis) {
  const hasRootIndex = analysis.paths.includes("index.html");
  const hasDistIndex = analysis.paths.includes("dist/index.html");
  const hasBuildIndex = analysis.paths.includes("build/index.html");
  const hasOutIndex = analysis.paths.includes("out/index.html");
  const hasPublicIndex = analysis.paths.includes("public/index.html");
  const hasPackageJson = analysis.hasPackageJson || analysis.paths.includes("package.json");
  const hasBuildScript = Boolean(analysis.hasBuildScript);
  const hasSourceIndicators = hasSourceProjectIndicators(analysis.paths || []);
  const hasBackend = hasBackendIndicators(analysis.paths || [], analysis.packageScripts || {}) || hasNodeRuntimeDependency(analysis);
  const hasSsr = hasSsrIndicators(analysis.paths || []);
  const singleHtmlEntry = detectSingleHtmlEntry(analysis.paths || []);
  const hasBuiltEntry = hasDistIndex || hasBuildIndex || hasOutIndex || hasPublicIndex;
  const detectedType = detectInspectionType({ hasRootIndex, hasDistIndex, hasBuildIndex, hasOutIndex, hasPublicIndex, hasPackageJson, hasBuildScript, hasSourceIndicators, hasBackend, hasSsr, singleHtmlEntry });
  const projectProfile = classifyProject(analysis, { detectedType, hasBackend, hasSsr, hasPackageJson, hasBuildScript });
  const projectAssessment = projectProfile.assessment || null;
  const runtime = detectRuntimeMetadata(analysis, { hasBackend, hasSsr });
  const status = determineInspectionStatus(analysis, { hasRootIndex, hasDistIndex, hasBuildIndex, hasOutIndex, hasPublicIndex, hasPackageJson, hasBuildScript, hasBackend, hasSsr, singleHtmlEntry, detectedType, projectProfile, runtime });
  const issues = [];
  const suggestions = [];
  const ignoredNames = analysis.ignoredFiles.slice(0, 5);
  const entryFile = analysis.entryFile;
  const formFields = analysis.formFields || [];
  const apiCalls = analysis.apiCalls || [];

  if (analysis.rawFileCount === 0) {
    issues.push("压缩包为空，未找到可发布文件。");
    suggestions.push("请重新打包项目，确保压缩包内包含 index.html 或 dist/build 目录。");
  }

  if (analysis.blockedFiles.length) {
    issues.push(`项目包包含敏感或不支持发布的文件：${analysis.blockedFiles.slice(0, 3).join("、")}。`);
    suggestions.push("请删除密钥、环境变量、脚本或可执行文件后重新上传。");
  }

  if (!hasRootIndex && !hasBuiltEntry && !hasPublicIndex && !singleHtmlEntry && !hasPackageJson && analysis.rawFileCount > 0) {
    issues.push("未找到可访问的首页文件或可生成网页的项目配置。");
    suggestions.push("请确认压缩包内包含 index.html、一个单独的 HTML 页面，或包含 dist/index.html、build/index.html、out/index.html。");
  }

  if (hasBackend && !hasBuiltEntry) {
    if (projectProfile.type === "node_service") {
      const runtime = detectRuntimeMetadata(analysis, { hasBackend, hasSsr });
      suggestions.push("已识别为 Node.js 单服务项目。当前运行器要求项目提供 start 命令，并监听 process.env.PORT。");
      if (runtime.framework) {
        suggestions.push(`识别到 ${formatRuntimeFramework(runtime.framework)} 项目。`);
      }
      if (runtime.hasStartProdScript) {
        suggestions.push("检测到 start:prod 命令，运行器会优先使用 npm run start:prod。");
      } else if (runtime.buildBeforeStart) {
        suggestions.push("检测到需要先构建再启动，运行器会先执行 npm run build，再执行 npm start。");
      }
      for (const warning of runtime.warnings || []) {
        suggestions.push(warning);
      }
      for (const reason of runtime.unsupportedReasons || []) {
        if (!issues.includes(reason)) issues.push(reason);
      }
      if (!analysis.packageScripts?.start) {
        issues.push("检测到 Node.js 项目，但缺少 start 启动命令。");
        suggestions.push("请让 AI 编程工具补充 start 命令，并确保服务监听 process.env.PORT。");
      }
    } else {
      issues.push("检测到这个项目需要服务器长期运行，当前 DemoGo 暂不支持这类项目的完整功能。");
      suggestions.push("请让 AI 编程工具导出一个纯网页演示版本，或等待后续后端托管能力。");
    }
  }

  if ((hasSsr || projectProfile.type === "fullstack_framework") && !hasOutIndex && !hasDistIndex && !hasBuildIndex && !isSingleServiceSsrProfile(projectProfile)) {
    issues.push("检测到这个项目可能需要服务端渲染，当前 DemoGo 暂不支持这类运行方式。");
    suggestions.push("如果项目可以导出静态网页，请先生成 dist/build/out 后再上传。");
  } else if ((hasSsr || projectProfile.type === "fullstack_framework") && isSingleServiceSsrProfile(projectProfile)) {
    suggestions.push("已识别为可单服务运行的完整应用项目。运行器会先构建，再按 start 命令启动，并要求监听 process.env.PORT。");
    if (!analysis.packageScripts?.start) {
      issues.push("检测到完整应用项目，但缺少 start 启动命令。");
      suggestions.push("请让 AI 编程工具补充 start 命令，并确保服务监听 process.env.PORT。");
    }
  }

  if (hasPackageJson && !hasRootIndex && !hasBuiltEntry && !hasPublicIndex && !singleHtmlEntry && projectProfile.type !== "node_service") {
    suggestions.push("已识别为 AI 生成的网页源码，DemoGo 会自动生成网页后发布。");
  }

  if (hasPackageJson && !hasBuildScript && !hasRootIndex && !hasBuiltEntry && !hasPublicIndex && !singleHtmlEntry && projectProfile.type !== "node_service") {
    issues.push("检测到项目源码，但没有生成网页的命令。");
    suggestions.push("请让 AI 编程工具补充生成命令，或先生成 dist/build/out 后重新上传。");
  }

  if (formFields.length) {
    const autoHostableFields = filterAutoHostableFormFields(formFields);
    suggestions.push(`${autoHostableFields.length ? "检测到疑似报名/留言字段" : "检测到页面填写控件"}：${formFields.slice(0, 5).map((field) => field.label || field.name).join("、")}。`);
  }

  if (apiCalls.some((item) => item.isLocal)) {
    suggestions.push("检测到本地 API 调用。DemoGo 当前不托管自定义后端，发布后相关提交或数据保存功能可能不可用。");
  }

  if (analysis.publishableFileCount > maxExtractedFiles) {
    issues.push(`需要发布的文件较多，当前最多支持 ${maxExtractedFiles} 个文件。`);
    suggestions.push("请删除不必要的素材、缓存和历史产物后重新上传。");
  }

  if (analysis.publishableBytes > maxExtractedBytes) {
    issues.push(`项目包体积过大，当前最多支持 ${formatBytes(maxExtractedBytes)}。`);
    suggestions.push("请压缩大图片、视频或删除无关资源后重新上传。");
  }

  if (ignoredNames.length) {
    suggestions.push(`系统已自动忽略无关文件：${ignoredNames.join("、")}${analysis.ignoredFiles.length > ignoredNames.length ? " 等" : ""}。`);
  }

  return {
    status,
    canPublish: status === "pass" || status === "warning",
    detectedType,
    projectProfile,
    projectAssessment,
    projectCategory: projectProfile.label,
    label: inspectionTypeLabel(detectedType),
    summary: inspectionSummary(status, detectedType),
    issues,
    suggestions,
    rawFileCount: analysis.rawFileCount,
    publishableFileCount: analysis.publishableFileCount,
    rawBytes: analysis.rawBytes,
    publishableBytes: analysis.publishableBytes,
    ignoredFileCount: analysis.ignoredFiles.length,
    ignoredFiles: analysis.ignoredFiles,
    blockedFiles: analysis.blockedFiles,
    rootEntries: analysis.rootEntries,
    entryFile,
    singleHtmlEntry,
    projectTitle: analysis.projectTitle || "",
    pageHeading: analysis.pageHeading || "",
    hasPackageJson,
    hasBuildScript,
    hasBackend,
    hasSsr,
    formFields,
    apiCalls,
    runtime,
    ruleReport: createRuleReport({
      status,
      detectedType,
      projectProfile,
      projectAssessment,
      entryFile,
      singleHtmlEntry,
      hasPackageJson,
      hasBuildScript,
      hasSourceIndicators,
      hasBackend,
      hasSsr,
      formFields,
      apiCalls,
      runtime,
      issues
    }),
    ...createUserFacingInspection({
      status,
      detectedType,
      projectProfile,
      projectAssessment,
      entryFile,
      singleHtmlEntry,
      hasPackageJson,
      hasBuildScript,
      hasBackend,
      hasSsr,
      formFields,
      apiCalls,
      runtime,
      issues
    })
  };
}

function determineInspectionStatus(analysis, flags) {
  if (analysis.rawFileCount === 0 || analysis.blockedFiles.length > 0) return "blocked";
  if (analysis.publishableFileCount > maxExtractedFiles || analysis.publishableBytes > maxExtractedBytes) return "blocked";
  if (flags.projectProfile?.type === "node_service" && flags.runtime?.unsupportedReasons?.length) return "blocked";
  const hasOutput = flags.hasDistIndex || flags.hasBuildIndex || flags.hasOutIndex || flags.hasPublicIndex;
  if (flags.projectProfile?.type === "node_service" && !hasOutput) return "blocked";
  if (flags.hasBackend && flags.projectProfile?.type !== "node_service" && !hasOutput) return "blocked";
  if ((flags.hasSsr || flags.projectProfile?.type === "fullstack_framework") && !hasOutput) {
    if (isSingleServiceSsrProfile(flags.projectProfile) && flags.runtime?.startCommand && !flags.runtime?.unsupportedReasons?.length) return "warning";
    return "blocked";
  }
  if (flags.hasRootIndex || flags.hasDistIndex || flags.hasBuildIndex || flags.hasOutIndex || flags.hasPublicIndex || flags.singleHtmlEntry) return analysis.ignoredFiles.length ? "warning" : "pass";
  if (flags.hasPackageJson && !flags.hasBuildScript) return "blocked";
  if (flags.hasPackageJson) return "warning";
  return "blocked";
}



function inspectionTypeLabel(type) {
  const labels = {
    "static-root": "普通网页项目",
    dist: "已生成的网页项目",
    build: "已生成的网页项目",
    out: "已生成的网页项目",
    public: "普通网页项目",
    "single-html": "单页网页项目",
    source: "AI 生成的网页项目",
    "built-dist": "AI 生成的网页项目",
    "built-build": "AI 生成的网页项目",
    "built-out": "AI 生成的网页项目",
    "built-public": "AI 生成的网页项目",
    backend: "需要服务器的项目",
    runtime: "需要服务器的项目",
    unknown: "暂未识别"
  };
  return labels[type] || labels.unknown;
}

function inspectionSummary(status, type) {
  if (status === "blocked") return "项目暂时无法发布，请根据提示调整后重新上传。";
  if (type === "source") return "已识别为 AI 生成的网页项目，DemoGo 会自动生成网页后发布。";
  if (type === "single-html") return "已识别为单个网页文件，DemoGo 会自动作为首页发布。";
  if (status === "warning") return "项目可以发布，系统会自动忽略部分无关文件。";
  return "项目检测通过，可以继续发布。";
}

function createUserFacingInspection(context) {
  const localApis = context.apiCalls.filter((item) => item.isLocal);
  const unsupportedNotes = [];
  const supportNotes = [];
  let userLabel = context.projectProfile?.label || inspectionTypeLabel(context.detectedType);
  let userSummary = "这个项目可以发布，别人能打开页面。";

  if (context.projectProfile?.notes?.length) {
    supportNotes.push(...context.projectProfile.notes);
  }
  if (context.projectProfile?.unsupportedReasons?.length) {
    unsupportedNotes.push(...context.projectProfile.unsupportedReasons);
  }
  if (context.projectAssessment?.support?.nextAction && context.status !== "blocked") {
    supportNotes.push(context.projectAssessment.support.nextAction);
  }

  if (context.projectProfile?.type === "node_service") {
    userLabel = "Node.js 单服务应用";
    userSummary = context.status === "blocked"
      ? "这个项目需要 Node.js 运行环境，但还缺少启动命令或运行器未满足条件。"
      : (context.runtime?.requiresMysql
          ? "这个项目可以进入 Node.js 单服务试用环境，并会获得一个隔离的 MySQL 试用数据库。"
          : "这个项目可以进入 Node.js 单服务试用环境，页面和接口会放在同一个试用链接下。");
    supportNotes.push("支持单个 Node.js 服务");
    if (context.projectProfile?.framework) {
      supportNotes.push(`${formatRuntimeFramework(context.projectProfile.framework)} 项目`);
    }
    supportNotes.push("必须监听 PORT");
    if (context.runtime?.requiresMysql) {
      supportNotes.push("支持 MySQL 试用数据库");
      supportNotes.push("数据库为空库，不自动建表");
    }
    if (context.runtime?.hasStartProdScript) supportNotes.push("优先使用 start:prod");
    if (context.runtime?.buildBeforeStart) supportNotes.push("会先构建再启动");
  } else if (context.projectAssessment?.support?.publishMode === "ssr_runtime_planned") {
    userLabel = "全栈网页应用";
    userSummary = "DemoGo 已识别出这个项目不只是静态网页，还需要服务器生成页面或处理运行逻辑。当前版本先给出诊断；如果项目能导出静态网页，可以先发布静态版本。";
    unsupportedNotes.push("需要完整应用运行能力");
  } else if (context.projectAssessment?.support?.publishMode === "full_app_planned") {
    userLabel = "完整应用项目";
    userSummary = "DemoGo 已识别出这个项目包含后端、运行配置或数据库能力。当前版本先给出诊断，完整应用发布能力会在后续增强。";
    unsupportedNotes.push("需要后端、运行配置或数据库能力");
  } else if (context.hasBackend && context.status === "blocked") {
    userLabel = "需要服务器的项目";
    userSummary = "这个项目不只是网页，还需要服务器长期运行。当前 DemoGo 暂不支持这类项目的完整发布。";
    unsupportedNotes.push("需要服务器处理业务逻辑");
  } else if (context.hasSsr && context.status === "blocked") {
    userLabel = "需要服务器的项目";
    userSummary = "这个项目需要服务器生成页面。当前 DemoGo 主要支持可直接打开的网页项目。";
    unsupportedNotes.push("需要服务器生成页面");
  } else if (context.detectedType === "source") {
    userLabel = "AI 生成的网页项目";
    userSummary = "这个项目可以发布。DemoGo 会先自动生成可访问网页，再生成试用链接。";
    supportNotes.push("会自动生成网页");
  } else if (["dist", "build", "out", "built-dist", "built-build", "built-out"].includes(context.detectedType)) {
    userLabel = "已生成的网页项目";
    supportNotes.push("已经包含可访问网页");
  } else if (context.detectedType === "static-root") {
    userLabel = "普通网页项目";
    supportNotes.push("已经包含首页文件");
  } else if (context.detectedType === "single-html") {
    userLabel = "单页网页项目";
    userSummary = "这个项目可以发布。DemoGo 会把这个 HTML 页面作为首页生成试用链接。";
    supportNotes.push("单个 HTML 页面可直接发布");
  } else if (context.detectedType === "public") {
    userLabel = "普通网页项目";
    supportNotes.push("已经包含可访问网页");
  }

  if (context.formFields.length) {
    supportNotes.push("页面展示可以发布");
    if (filterAutoHostableFormFields(context.formFields).length) {
      supportNotes.push("发布时会自动开启基础表单收集");
      userSummary = "这个页面可以发布，并检测到报名、预约或留言表单。DemoGo 会在发布时自动开启基础表单收集。";
    } else {
      userSummary = "这个页面可以发布。页面里有填写控件，但不像报名、预约或留言表单，DemoGo 不会自动收集这些内容。";
    }
  }

  if (localApis.length) {
    unsupportedNotes.push("项目自带后台接口不会自动运行");
    userSummary = "这个页面可以发布，但项目自带后台接口不会自动运行。基础报名、预约或留言表单会尝试由 DemoGo 自动收集；完整业务后台暂不支持。";
  }

  if (context.status === "blocked" && !context.hasBackend && !context.hasSsr) {
    userSummary = context.issues[0] || "这个项目当前暂不支持发布，请按提示调整后重新上传。";
  }

  if (context.status === "blocked" && context.projectAssessment?.support?.nextAction) {
    unsupportedNotes.unshift(context.projectAssessment.support.nextAction);
  }

  return {
    userLabel,
    userSummary,
    userStatus: context.status === "blocked" ? "unsupported" : "supported",
    userStatusLabel: context.status === "blocked" ? "暂不支持" : "支持",
    supportNotes: Array.from(new Set(supportNotes.filter(Boolean))),
    unsupportedNotes: Array.from(new Set(unsupportedNotes.filter(Boolean))),
    fixPrompt: context.projectAssessment?.aiFixPrompt || createFixPrompt(context)
  };
}


