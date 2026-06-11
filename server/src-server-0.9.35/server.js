import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import cookieParser from "cookie-parser";
import express from "express";
import multer from "multer";
import {
  adminPassword,
  adminUser,
  dataDir,
  demoRoot,
  deployRateLimit,
  deployRateWindowMs,
  emailVerificationEnabled,
  maxZipSizeMb,
  port,
  publicBaseUrl,
  redisHost,
  redisPort,
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
import {
  calculateFormQuota,
  publicForm,
} from "./services/form-service.js";
import { calculateQuota as calculateUserQuota } from "./services/quota-service.js";
import { publicUser } from "./services/user-service.js";
import { publicUserDemo, createRuntimeConfigStatus, runtimeEnvForDemo } from "./lib/admin-helpers.js";
import { deleteDemoDatabase } from "./services/demo-database-service.js";
import {
  findRuntime,
  proxyRuntimeRequest,
  startNodeRuntime,
  stopExpiredRuntimes,
  stopRuntime
} from "./services/runtime-service.js";
import { hashPassword, verifyPassword, hashVerificationCode, createVerifyEmailCode } from "./lib/password-utils.js";
import { normalizeEmail, createLoginRateLimiter } from "./lib/login-rate-limiter.js";
import { createSessionStore, setSessionCookie, createAgentTokenRecord, publicAgentToken } from "./lib/session-store.js";
import { createDeployRateLimiter } from "./lib/deploy-rate-limiter.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { securityHeadersMiddleware } from "./middleware/security.js";
import { createRateLimiter, createStrictRateLimiter } from "./middleware/rate-limiter.js";
import { isEmailConfigured, sendVerificationEmail, createSmtpMailer } from "./email/mailer.js";
import { createDemoExpirationService } from "./services/demo-expiration-service.js";
import { isExpired } from "./lib/slug-utils.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { csrfMiddleware } from "./middleware/csrf.js";
import { apiVersionMiddleware } from "./middleware/api-version.js";
import { createErrorHandler } from "./middleware/error-handler.js";
import { createDeploymentJobService } from "./services/deployment-job-service.js";
import { addDeploymentJob, deploymentQueue, closeQueue } from "./queue/queue.js";
import { createBuildService } from "./services/build-service.js";

import { registerAgentRoutes } from "./routes/agent.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerFeedbackRoutes } from "./routes/feedback.js";
import { registerSubdomainRoutes } from "./routes/subdomain.js";
import { registerPlanUpgradeRoutes } from "./routes/plan-upgrade.js";
import { registerFormsRoutes } from "./routes/forms.js";
import { registerMiscRoutes } from "./routes/misc.js";
import { registerDemoTrackRoutes } from "./routes/demo-track.js";
import { registerDeployRoutes } from "./routes/deploy.js";
import { registerDemosRoutes } from "./routes/demos.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { detectDeploySource } from "./lib/deploy-helpers.js";
import { slugify } from "./lib/project-utils.js";

import {
  isSupportedArchiveName,
  looksLikeAssetRequest,
  createProjectError
} from "./lib/archive-analyzer.js";

import { readJson, writeJson } from "./lib/data-access.js";
import { getClientIp } from "./lib/request-utils.js";
import { writeAuditLog } from "./lib/audit-log.js";
import { createDeploymentPipelineService } from "./services/deployment-pipeline-service.js";
import { createDemoLifecycleService } from "./services/demo-lifecycle-service.js";
import { createAuthHelpers } from "./services/auth-helpers.js";
import { createDeployHandlerService } from "./services/deploy-handler-service.js";
import {
  normalizeTrialEventType,
  writeTrialEvent,
  summarizeResponseLimits,
  attachErrorDiagnosis,
} from "./services/trial-analytics-service.js";
import { publicContentReview } from "./services/content-review-service.js";
import {
  createFailureDiagnosis,
  inspectionTypeLabel,
  createUserFacingInspection,
} from "./services/failure-diagnosis-service.js";

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

const loginFailureWindowMs = 10 * 60 * 1000;
const loginFailureLimit = 5;
const verificationCodeTtlMs = 10 * 60 * 1000;
const verificationResendMs = 60 * 1000;
const verificationMaxAttempts = 5;

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: maxZipSizeMb * 1024 * 1024,
    files: 1
  },
  fileFilter: (_req, file, cb) => {
    const isSupported = isSupportedArchiveName(file.originalname);
    cb(isSupported ? null : new Error("当前仅支持 .zip、.tar.gz 或 .tgz 项目包"), isSupported);
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
const authHelpers = createAuthHelpers({ readJson, sessionsFile, usersFile, demosFile, slugify });
const { readBearerToken, getUserFromRequest, getUserFromAgentToken, resolveAgentUpdateDemoId } = authHelpers;
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

function calculateQuota(user, allDemos) {
  return calculateUserQuota(user, allDemos, isExpired);
}

// --- Deployment pipeline service ---
const pipelineService = createDeploymentPipelineService({
  readJson, writeJson,
  demosFile, demoRoot,
  checkDeployRateLimit, calculateQuota,
  startNodeRuntime, stopRuntime,
  writeAuditLog, writeTrialEvent, summarizeResponseLimits,
});
const {
  performCreateDeployment, performUpdateDeployment,
  inspectProjectArchive, hostingConfig, hostingCapabilities,
  attachArchitectureToInspection, createConfigRequiredRuntime,
} = pipelineService;

// --- Demo lifecycle service (after pipeline — needs hostingConfig + createConfigRequiredRuntime) ---
const lifecycleService = createDemoLifecycleService({
  demoRoot, dataDir, demosFile,
  readJson,
  hostingConfig, createConfigRequiredRuntime,
  deleteDemoDatabase,
  createRuntimeConfigStatus, runtimeEnvForDemo,
  createFailureDiagnosis,
  slugify,
});
const {
  exists,
  copyDemoArchive,
  expireDemoFiles,
  removeDemoFiles,
  deleteDemoFiles,
  restartDemoRuntime,
  syncDemoToStorage,
  redirectDemoAlias,
} = lifecycleService;

// Wire file handlers into pipeline service (breaks circular dependency)
pipelineService.setFileHandlers({ expireDemoFiles, copyDemoArchive });

// Wire up deployment job handlers
deploymentJobService.setHandlers({ processCreateJob: performCreateDeployment, processUpdateJob: performUpdateDeployment });

// --- Demo expiration service ---
const expirationService = createDemoExpirationService({
  readJson, writeJson, demosFile, usersFile,
  isEmailConfigured, sendSmtpMail, publicBaseUrl,
  writeAuditLog, expireDemoFiles, logger,
});
const { expireDemos, runExpirationCheck } = expirationService;
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

// Wire build functions into pipeline service (breaks circular dependency)
pipelineService.setBuildFunctions({
  detectBuildAndNormalizeOutput,
  summarizePublishedDirectory,
  injectTrackingScript,
  ensureAutoHostedForm,
});

// --- Deploy handler service ---
const deployHandlerService = createDeployHandlerService({
  getClientIp,
  detectDeploySource,
  writeTrialEvent,
  inspectProjectArchive,
  createDeploymentJob,
  addDeploymentJob,
  performCreateDeployment,
  performUpdateDeployment,
  resolveAgentUpdateDemoId,
  attachErrorDiagnosis,
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
  removeDemoFiles,
    deleteDemoFiles,
    performUpdateDeployment,
    demoRoot,
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

registerDemoTrackRoutes(app, { recordDemoVisit });

// --- Error handler middleware ---
const { errorMiddleware } = createErrorHandler({ maxZipSizeMb, attachErrorDiagnosis, publicContentReview });
app.use(errorMiddleware);

globalThis.__demogoQueueAvailable = false;

// Verify Redis is available (required in production, optional in dev)
try {
  await deploymentQueue.getJobCounts();
  globalThis.__demogoQueueAvailable = true;
  console.log("Redis connected successfully");

  // Start in-process worker for async deployment processing
  const { Worker } = await import("bullmq");
  const { processDeploymentJob } = await import("./queue/deployment-processor.js");
  const inProcessWorker = new Worker("demogo-deployments", async (job) => {
    const { jobId } = job.data;
    await job.updateProgress(10);
    await processDeploymentJob(jobId);
    await job.updateProgress(100);
  }, { connection: { host: redisHost, port: redisPort }, concurrency: 1 });
  inProcessWorker.on("completed", (job) => console.log(`Job ${job.id} completed`));
  inProcessWorker.on("failed", (job, err) => console.error(`Job ${job.id} failed:`, err.message));
  console.log("In-process deployment worker started");

} catch (err) {
  globalThis.__demogoQueueAvailable = false;
  if (process.env.NODE_ENV === "production") {
    console.error("FATAL: Cannot connect to Redis. Install and start Redis first.");
    console.error("  Error:", err.message);
    process.exit(1);
  } else {
    console.warn("WARNING: Redis not available. Deployments will run synchronously.");
  }
}

app.listen(port, () => {
  console.log(`DemoGo server listening on ${port}`);
  setTimeout(runExpirationCheck, 30000);
  setInterval(runExpirationCheck, 6 * 60 * 60 * 1000);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing connections...");
  await closeQueue().catch(() => {});
  process.exit(0);
});
process.on("SIGINT", async () => {
  console.log("SIGINT received, closing connections...");
  await closeQueue().catch(() => {});
  process.exit(0);
});