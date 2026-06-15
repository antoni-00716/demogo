import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import cookieParser from "cookie-parser";
import express from "express";
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
import { calculateQuota as calculateUserQuota } from "./services/quota-service.js";
import { adminUserSummary, filterAdminUsers, publicUser } from "./services/user-service.js";
import { publicUserDemo } from "./lib/admin-helpers.js";
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
import { createSessionStore, setSessionCookie, createAgentTokenRecord, publicAgentToken } from "./lib/session-store.js";
import { readBearerToken, getUserFromRequest, getUserFromAgentToken } from "./lib/auth-helpers.js";
import { createDeployRateLimiter } from "./lib/deploy-rate-limiter.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { securityHeadersMiddleware } from "./middleware/security.js";
import { createRateLimiter, createStrictRateLimiter } from "./middleware/rate-limiter.js";
import { createUploadMiddleware } from "./middleware/upload.js";
import { isEmailConfigured, sendVerificationEmail, createSmtpMailer, sendExpirationReminderEmail } from "./email/mailer.js";
import { checkAndRemindExpiringDemos } from "./services/demo-expiration-service.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { csrfMiddleware } from "./middleware/csrf.js";
import { apiVersionMiddleware } from "./middleware/api-version.js";
import { createErrorHandler } from "./middleware/error-handler.js";
import { createDeploymentJobService } from "./services/deployment-job-service.js";
import { createBuildService } from "./services/build-service.js";
import { createDeploymentPipelineService } from "./services/deployment-pipeline-service.js";
import { createDeployHandlerService } from "./services/deploy-handler-service.js";

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
import { detectDeploySource } from "./lib/deploy-helpers.js";
import { cleanProjectName, isGenericProjectName, slugify } from "./lib/project-utils.js";

import {
  isSupportedArchiveName,
  looksLikeAssetRequest,
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

import { putDirectory, isMinioBackend } from "./lib/storage.js";
import { addDeploymentJob, closeQueue } from "./queue/queue.js";
import { registerDemoTrackRoutes } from "./routes/demo-track.js";

const app = express();

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

const { upload, uploadProjectArchive } = createUploadMiddleware({ maxZipSizeMb, uploadDir, isSupportedArchiveName });

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
  getUserFromRequest: (req) => getUserFromRequest(req, { sessionsFile, usersFile }),
  getUserFromAgentToken: (value) => getUserFromAgentToken(value, { usersFile }),
  adminUser,
  adminPassword,
  readJson,
  usersFile,
  readBearerToken
});
const requireUser = authMiddleware.requireUser;
const requireAgentToken = authMiddleware.requireAgentToken;
const requireAdmin = authMiddleware.requireAdmin;


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

// --- Pipeline service (canonical source of truth for deployment pipeline) ---
const pipelineService = createDeploymentPipelineService({
  readJson, writeJson,
  demosFile, demoRoot,
  checkDeployRateLimit, calculateQuota,
  startNodeRuntime, stopRuntime,
  writeAuditLog, writeTrialEvent, summarizeResponseLimits,
});

// Wire build functions into pipeline service (breaks circular dependency)
pipelineService.setBuildFunctions({
  detectBuildAndNormalizeOutput,
  summarizePublishedDirectory,
  injectTrackingScript,
  ensureAutoHostedForm,
});

// Destructure all needed functions from pipeline service
const {
  removeDemoFiles, expireDemoFiles, deleteDemoFiles, restartDemoRuntime,
  performCreateDeployment, performUpdateDeployment,
  inferProjectDisplayName, createAvailableSlug,
  hostingConfig, hostingCapabilities,
  attachArchitectureToInspection,
  isNodeRuntimeInspection, createConfigRequiredRuntime,
  attachRuntimeToInspection, canPublishNodeRuntimeInspection, nodeRuntimeBlockReason,
  extractStaticDemo, extractRuntimeDemo,
  inspectProjectArchive,
} = pipelineService;

// Wire up deployment job handlers (using pipeline versions)
deploymentJobService.setHandlers({ processCreateJob: performCreateDeployment, processUpdateJob: performUpdateDeployment });

// --- Deploy handler service ---
const deployHandlerService = createDeployHandlerService({
  getClientIp, detectDeploySource, writeTrialEvent,
  inspectProjectArchive, createDeploymentJob, addDeploymentJob,
  performCreateDeployment, performUpdateDeployment,
  resolveAgentUpdateDemoId, attachErrorDiagnosis,
});
const { handleCreateDeployment, handleUpdateDeployment } = deployHandlerService;

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
  getUserFromRequest: (req) => getUserFromRequest(req, { sessionsFile, usersFile }),
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
  getUserFromRequest: (req) => getUserFromRequest(req, { sessionsFile, usersFile }),
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
  getUserFromRequest: (req) => getUserFromRequest(req, { sessionsFile, usersFile }),
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
    // Add security headers that are bypassed by proxy routes placed before securityHeadersMiddleware
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Content-Security-Policy", "default-src 'self' 'unsafe-inline' 'unsafe-eval' *.demogo.cn; img-src 'self' data: blob:; connect-src 'self' ws: wss:; style-src 'self' 'unsafe-inline'; font-src 'self' data:");
    res.setHeader("X-XSS-Protection", "0");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
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

function calculateQuota(user, allDemos) {
  return calculateUserQuota(user, allDemos, isExpired);
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

async function redirectDemoAlias(req, res) {
  const slug = slugify(req.params.slug);
  if (!slug) return false;
  const demos = await readJson(demosFile, []);
  const demo = demos.find((item) => Array.isArray(item.aliases) && item.aliases.includes(slug) && item.status === "published");
  if (!demo?.publicUrl) return false;
  res.redirect(302, demo.publicUrl);
  return true;
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