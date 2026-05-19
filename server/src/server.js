import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
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
  usageFlushIntervalMs
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
const loginFailureBuckets = new Map();
const loginFailureWindowMs = 10 * 60 * 1000;
const loginFailureLimit = 5;

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

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use("/d", express.static(demoRoot));
app.get("/d/:slug/*", async (req, res, next) => {
  try {
    if (looksLikeAssetRequest(req.path)) return next();
    const slug = slugify(req.params.slug);
    if (!slug) return next();
    const indexPath = path.join(demoRoot, slug, "index.html");
    if (!await exists(indexPath)) return next();
    res.sendFile(indexPath);
  } catch (error) {
    next(error);
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "demogo-server", version: serviceVersion });
});

await expireDemos();
setInterval(() => {
  expireDemos().catch((error) => console.error("Failed to expire demos", error));
}, 60 * 60 * 1000);

setInterval(() => {
  flushUsageStats().catch((error) => console.error("Failed to flush usage stats", error));
}, usageFlushIntervalMs);

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

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!email || !password || password.length < 8) {
      res.status(400).json({ error: "请输入邮箱和至少 8 位密码" });
      return;
    }

    const users = await readJson(usersFile, []);
    if (users.some((user) => user.email === email)) {
      res.status(409).json({ error: "该邮箱已注册，请直接登录" });
      return;
    }

    const user = {
      id: crypto.randomUUID(),
      email,
      plan: "free",
      createdAt: new Date().toISOString(),
      passwordHash: await hashPassword(password)
    };

    users.push(user);
    await writeJson(usersFile, users);
    const session = await createSession(user.id);
    setSessionCookie(res, session.token);
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const clientIp = getClientIp(req);
    const rate = checkLoginFailureRate(email, clientIp);
    if (!rate.allowed) {
      res.status(429).json({ error: "登录尝试过多，请稍后再试" });
      return;
    }
    const users = await readJson(usersFile, []);
    const user = users.find((item) => item.email === email);

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      recordLoginFailure(email, clientIp);
      res.status(401).json({ error: "邮箱或密码不正确" });
      return;
    }

    clearLoginFailures(email, clientIp);
    const session = await createSession(user.id);
    setSessionCookie(res, session.token);
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/logout", async (req, res, next) => {
  try {
    const token = req.cookies?.demogo_session;
    if (token) {
      const sessions = await readJson(sessionsFile, []);
      await writeJson(sessionsFile, sessions.filter((session) => session.token !== token));
    }
    res.clearCookie("demogo_session");
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/me", async (req, res, next) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "请先登录" });
      return;
    }
    const demos = await readJson(demosFile, []);
    res.json({
      user: publicUser(user),
      demos: demos.filter((demo) => demo.userId === user.id),
      quota: calculateQuota(user, demos)
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/agent-token", requireUser, async (req, res, next) => {
  try {
    res.json({ token: publicAgentToken(req.user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/agent-token", requireUser, async (req, res, next) => {
  try {
    const users = await readJson(usersFile, []);
    const userIndex = users.findIndex((user) => user.id === req.user.id);
    if (userIndex === -1) {
      res.status(404).json({ error: "未找到当前用户，请重新登录。" });
      return;
    }

    const { plainToken, token } = createAgentTokenRecord();
    users[userIndex] = {
      ...users[userIndex],
      agentToken: token,
      updatedAt: new Date().toISOString()
    };
    await writeJson(usersFile, users);
    await writeAuditLog({
      action: "reset_agent_token",
      actorType: "user",
      actorId: req.user.id,
      targetType: "user",
      targetId: req.user.id,
      ip: getClientIp(req),
      metadata: { prefix: token.prefix }
    });
    res.json({ token: { ...publicAgentToken(users[userIndex]), value: plainToken } });
  } catch (error) {
    next(error);
  }
});

app.get("/api/demos", async (req, res, next) => {
  try {
    await flushUsageStats();
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "请先登录" });
      return;
    }
    const demos = await readJson(demosFile, []);
    res.json({
      demos: demos.filter((demo) => demo.userId === user.id),
      quota: calculateQuota(user, demos)
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/demos/:id", requireUser, async (req, res, next) => {
  try {
    await flushUsageStats();
    const demos = await readJson(demosFile, []);
    const demo = demos.find((item) => item.id === req.params.id && item.userId === req.user.id);
    if (!demo) {
      res.status(404).json({ error: "未找到该 Demo" });
      return;
    }
    const events = await readDeploymentEventsForDemo(demo.id);
    res.json({
      demo,
      events,
      inspection: demo.inspection || null
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/demos/:id/events", requireUser, async (req, res, next) => {
  try {
    const demos = await readJson(demosFile, []);
    const demo = demos.find((item) => item.id === req.params.id && item.userId === req.user.id);
    if (!demo) {
      res.status(404).json({ error: "未找到该 Demo" });
      return;
    }
    res.json({ events: await readDeploymentEventsForDemo(demo.id) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/demos/:id/inspection", requireUser, async (req, res, next) => {
  try {
    const demos = await readJson(demosFile, []);
    const demo = demos.find((item) => item.id === req.params.id && item.userId === req.user.id);
    if (!demo) {
      res.status(404).json({ error: "未找到该 Demo" });
      return;
    }
    res.json({ inspection: demo.inspection || null });
  } catch (error) {
    next(error);
  }
});

app.get("/api/deploy-events", requireUser, async (req, res, next) => {
  try {
    const demos = await readJson(demosFile, []);
    res.json(userDeployEvents(req.user, demos, { limit: req.query?.limit }));
  } catch (error) {
    next(error);
  }
});

app.get("/api/deployment-jobs/:id", requireUser, async (req, res, next) => {
  try {
    const job = await findDeploymentJob(req.params.id);
    if (!job || job.userId !== req.user.id) {
      res.status(404).json({ error: "未找到这次生成任务" });
      return;
    }
    res.json({ job: publicDeploymentJob(job) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/forms", requireUser, async (req, res, next) => {
  try {
    const [forms, submissions] = await Promise.all([
      readJson(formsFile, []),
      readJson(formSubmissionsFile, [])
    ]);
    const userForms = forms
      .filter((form) => form.userId === req.user.id && form.status !== "deleted")
      .map((form) => publicForm(form, { publicBaseUrl }));
    res.json({
      forms: userForms,
      quota: calculateFormQuota(req.user, forms, submissions)
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/forms", requireUser, async (req, res, next) => {
  try {
    const demoId = String(req.body?.demoId || "").trim();
    const name = String(req.body?.name || "").trim().slice(0, 120);
    const requestedFields = normalizeFormFields(req.body?.fields || []);
    const [demos, forms, submissions] = await Promise.all([
      readJson(demosFile, []),
      readJson(formsFile, []),
      readJson(formSubmissionsFile, [])
    ]);
    const demo = demos.find((item) => item.id === demoId && item.userId === req.user.id);

    if (!demo) {
      res.status(404).json({ error: "未找到要开启报名/留言收集的试用项目" });
      return;
    }

    if (demo.status !== "published") {
      res.status(409).json({ error: "只有在线试用项目可以开启报名/留言收集" });
      return;
    }

    const existing = forms.find((form) => form.demoId === demo.id && form.userId === req.user.id && form.status !== "deleted");
    if (existing) {
      res.json({
        form: publicForm(existing, { publicBaseUrl }),
        quota: calculateFormQuota(req.user, forms, submissions)
      });
      return;
    }

    const quota = calculateFormQuota(req.user, forms, submissions);
    if (quota.forms.used >= quota.forms.limit) {
      res.status(403).json({ error: `当前套餐最多托管 ${quota.forms.limit} 个表单，请升级套餐或关闭其他表单后再试` });
      return;
    }

    const now = new Date().toISOString();
    const item = {
      id: crypto.randomUUID(),
      userId: req.user.id,
      userEmail: req.user.email,
      demoId: demo.id,
      demoSlug: demo.slug,
      demoName: demo.name || demo.slug,
      publicToken: crypto.randomBytes(24).toString("hex"),
      name: name || `${demo.name || demo.slug} 表单`,
      status: "active",
      fields: requestedFields.length
        ? requestedFields
        : (normalizeFormFields(demo.inspection?.formFields || []).length
            ? normalizeFormFields(demo.inspection?.formFields || [])
            : defaultFormFields()),
      submissionCount: 0,
      createdAt: now,
      updatedAt: now
    };

    forms.unshift(item);
    await writeJson(formsFile, forms.slice(0, 2000));
    await writeAuditLog({
      action: "create_form_hosting",
      actorType: "user",
      actorId: req.user.id,
      targetType: "form",
      targetId: item.id,
      ip: getClientIp(req),
      metadata: {
        demoId: demo.id,
        demoSlug: demo.slug
      }
    });

    res.json({
      form: publicForm(item, { publicBaseUrl }),
      quota: calculateFormQuota(req.user, forms, submissions)
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/forms/:id", requireUser, async (req, res, next) => {
  try {
    const [forms, submissions] = await Promise.all([
      readJson(formsFile, []),
      readJson(formSubmissionsFile, [])
    ]);
    const form = forms.find((item) => item.id === req.params.id && item.userId === req.user.id && item.status !== "deleted");
    if (!form) {
      res.status(404).json({ error: "未找到表单" });
      return;
    }
    res.json({
      form: publicForm(form, { publicBaseUrl }),
      submissions: submissions
        .filter((item) => item.formId === form.id && item.userId === req.user.id)
        .slice(0, 100)
        .map(publicFormSubmission)
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/forms/:id/status", requireUser, async (req, res, next) => {
  try {
    const nextStatus = normalizeFormStatus(req.body?.status);
    if (!["active", "closed", "deleted"].includes(nextStatus)) {
      res.status(400).json({ error: "请选择有效的表单状态" });
      return;
    }

    const [forms, submissions] = await Promise.all([
      readJson(formsFile, []),
      readJson(formSubmissionsFile, [])
    ]);
    const formIndex = forms.findIndex((item) => item.id === req.params.id && item.userId === req.user.id);
    if (formIndex === -1) {
      res.status(404).json({ error: "未找到表单" });
      return;
    }

    forms[formIndex] = {
      ...forms[formIndex],
      status: nextStatus,
      updatedAt: new Date().toISOString()
    };
    await writeJson(formsFile, forms);
    await writeAuditLog({
      action: "update_form_status",
      actorType: "user",
      actorId: req.user.id,
      targetType: "form",
      targetId: forms[formIndex].id,
      ip: getClientIp(req),
      metadata: {
        status: nextStatus,
        demoSlug: forms[formIndex].demoSlug
      }
    });

    res.json({
      form: publicForm(forms[formIndex], { publicBaseUrl }),
      quota: calculateFormQuota(req.user, forms, submissions)
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/public/forms/:token/submit", async (req, res, next) => {
  try {
    const token = String(req.params.token || "").trim();
    const [forms, submissions, users] = await Promise.all([
      readJson(formsFile, []),
      readJson(formSubmissionsFile, []),
      readJson(usersFile, [])
    ]);
    const formIndex = forms.findIndex((item) => item.publicToken === token && (item.status || "active") === "active");
    if (formIndex === -1) {
      res.status(404).json({ error: "表单不存在或已关闭" });
      return;
    }

    const form = forms[formIndex];
    const owner = users.find((user) => user.id === form.userId) || { id: form.userId, plan: "free" };
    const quota = calculateFormQuota(owner, forms, submissions);
    if (quota.monthlySubmissions.limit && quota.monthlySubmissions.used >= quota.monthlySubmissions.limit) {
      res.status(403).json({ error: "本月表单提交额度已用完" });
      return;
    }

    const payload = sanitizeSubmissionPayload(req.body || {}, form.fields || []);
    if (!Object.keys(payload).length) {
      res.status(400).json({ error: "请填写表单内容后再提交" });
      return;
    }

    const now = new Date().toISOString();
    const submission = {
      id: crypto.randomUUID(),
      formId: form.id,
      userId: form.userId,
      userEmail: form.userEmail,
      demoId: form.demoId,
      demoSlug: form.demoSlug,
      payload,
      ip: getClientIp(req),
      userAgent: String(req.get("user-agent") || "").slice(0, 500),
      createdAt: now
    };

    submissions.unshift(submission);
    forms[formIndex] = {
      ...form,
      submissionCount: Number(form.submissionCount || 0) + 1,
      updatedAt: now
    };
    await Promise.all([
      writeJson(formSubmissionsFile, submissions.slice(0, 5000)),
      writeJson(formsFile, forms)
    ]);

    res.json({ ok: true, submission: publicFormSubmission(submission) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/overview", requireAdmin, async (req, res, next) => {
  try {
    await flushUsageStats();
    const [users, demos, feedback, planRequests, forms, formSubmissions, contentReviews, auditLogs, deploymentEvents] = await Promise.all([
      readJson(usersFile, []),
      readJson(demosFile, []),
      readJson(feedbackFile, []),
      readJson(planRequestsFile, []),
      readJson(formsFile, []),
      readJson(formSubmissionsFile, []),
      readJson(contentReviewsFile, []),
      readJson(auditLogsFile, []),
      readJson(deploymentEventsFile, [])
    ]);
    const search = String(req.query?.search || "").trim().toLowerCase();
    const status = String(req.query?.status || "").trim();
    const userSearch = String(req.query?.user || "").trim().toLowerCase();
    const demoSearch = String(req.query?.demo || "").trim().toLowerCase();
    const liveDemos = demos.filter((demo) => demo.status === "published");
    const offlineDemos = demos.filter((demo) => demo.status === "offline");
    const expiredDemos = demos.filter((demo) => demo.status === "expired");
    const deletedDemos = demos.filter((demo) => demo.status === "deleted");
    const failedDemos = demos.filter((demo) => demo.status === "failed");
    const filteredUsers = filterAdminUsers(users, { search: search || userSearch });
    const filteredDemos = filterAdminDemos(demos, {
      search: search || demoSearch,
      status
    });
    const latestDemos = filteredDemos.slice(0, 50);
    const latestFeedback = feedback.slice(0, 20);
    const totalVisits = demos.reduce((sum, demo) => sum + Number(demo.usage?.visits || 0), 0);
    const totalEstimatedBytes = demos.reduce((sum, demo) => sum + Number(demo.usage?.estimatedBytes || 0), 0);
    const aiDeployAuditLogs = auditLogs.filter((item) => item.action === "agent_deploy_demo");
    const failedDeploymentEvents = deploymentEvents.filter((item) => item.status === "failed");
    const failureReasonCounts = summarizeFailureReasons(failedDeploymentEvents, contentReviews);
    const planCounts = users.reduce((acc, user) => {
      acc[user.plan] = (acc[user.plan] || 0) + 1;
      return acc;
    }, {});

    res.json({
      metrics: {
        users: users.length,
        demos: demos.length,
        liveDemos: liveDemos.length,
        offlineDemos: offlineDemos.length,
        expiredDemos: expiredDemos.length,
        deletedDemos: deletedDemos.length,
        failedDemos: failedDemos.length,
        totalVisits,
        totalEstimatedBytes,
        planCounts,
        feedback: feedback.length,
        openFeedback: feedback.filter((item) => item.status === "open").length,
        forms: forms.filter((item) => item.status !== "deleted").length,
        activeForms: forms.filter((item) => (item.status || "active") === "active").length,
        formSubmissions: formSubmissions.length,
        planUpgradeRequests: planRequests.length,
        openPlanUpgradeRequests: planRequests.filter((item) => item.status === "open").length,
        contentReviews: contentReviews.length,
        blockedContentReviews: contentReviews.filter((item) => item.status === "blocked").length,
        pendingContentReviews: contentReviews.filter((item) => item.status === "review_required").length,
        pendingContentReviewResolutions: contentReviews.filter((item) => contentReviewResolutionStatus(item) === "pending").length,
        aiDeploys: aiDeployAuditLogs.length,
        deploySuccesses: deploymentEvents.filter((item) => item.eventType === "success" && item.status === "success").length,
        deployFailures: failedDeploymentEvents.length,
        failureReasons: failureReasonCounts
      },
      users: filteredUsers.slice(0, 50).map((user) => adminUserSummary(user, demos, calculateQuota)),
      demos: latestDemos.map(adminDemoSummary),
      forms: forms.slice(0, 50).map((form) => publicForm(form, { publicBaseUrl })),
      feedback: latestFeedback.map(publicFeedback),
      contentReviews: contentReviews.slice(0, 50).map(publicAdminContentReview)
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/forms", requireAdmin, async (req, res, next) => {
  try {
    const [forms, submissions] = await Promise.all([
      readJson(formsFile, []),
      readJson(formSubmissionsFile, [])
    ]);
    const filtered = filterAdminForms(forms, {
      search: req.query?.search,
      status: req.query?.status
    });
    res.json({
      forms: filtered.slice(0, 200).map((form) => publicForm(form, { publicBaseUrl })),
      submissions: submissions.slice(0, 100).map(publicFormSubmission)
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/users", requireAdmin, async (req, res, next) => {
  try {
    const [users, demos] = await Promise.all([
      readJson(usersFile, []),
      readJson(demosFile, [])
    ]);
    const filteredUsers = filterAdminUsers(users, {
      search: req.query?.search,
      plan: req.query?.plan
    });
    res.json({
      users: filteredUsers.slice(0, 200).map((user) => adminUserSummary(user, demos, calculateQuota)),
      plans: Object.values(plans)
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/plan-upgrade-requests", requireUser, async (req, res, next) => {
  try {
    const requests = await readJson(planRequestsFile, []);
    res.json({
      requests: requests
        .filter((item) => item.userId === req.user.id)
        .slice(0, 20)
        .map(publicPlanRequest)
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/plan-upgrade-requests", requireUser, async (req, res, next) => {
  try {
    const requestedPlan = normalizeRequestedPlan(req.body?.plan);
    const contact = String(req.body?.contact || "").trim();
    const message = String(req.body?.message || "").trim();
    const currentPlan = req.user.plan || "free";

    if (!requestedPlan) {
      res.status(400).json({ error: "请选择 Lite 或 Pro 套餐" });
      return;
    }

    if (requestedPlan === currentPlan) {
      res.status(400).json({ error: "你已经是当前套餐，无需重复申请" });
      return;
    }

    if (!canUpgradePlan(currentPlan, requestedPlan)) {
      res.status(400).json({ error: "当前套餐有效期间暂不支持降级或重复申请低等级套餐" });
      return;
    }

    if (contact.length > 120) {
      res.status(400).json({ error: "联系方式过长，请控制在 120 字以内" });
      return;
    }

    if (message.length > 500) {
      res.status(400).json({ error: "申请说明过长，请控制在 500 字以内" });
      return;
    }

    const requests = await readJson(planRequestsFile, []);
    const existingOpen = requests.find((item) => item.userId === req.user.id && item.status === "open");
    if (existingOpen) {
      res.status(409).json({ error: "你已有一个待处理的升级申请，请等待管理员处理" });
      return;
    }

    const now = new Date().toISOString();
    const item = {
      id: crypto.randomUUID(),
      userId: req.user.id,
      userEmail: req.user.email,
      currentPlan,
      requestedPlan,
      status: "open",
      contact: contact.slice(0, 120),
      message: message.slice(0, 500),
      createdAt: now,
      updatedAt: now
    };

    requests.unshift(item);
    await writeJson(planRequestsFile, requests.slice(0, 2000));
    await writeAuditLog({
      action: "request_plan_upgrade",
      actorType: "user",
      actorId: req.user.id,
      targetType: "plan_upgrade_request",
      targetId: item.id,
      ip: getClientIp(req),
      metadata: {
        currentPlan,
        requestedPlan,
        userEmail: req.user.email
      }
    });

    res.json({ request: publicPlanRequest(item) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/plan-upgrade-requests", requireAdmin, async (req, res, next) => {
  try {
    const requests = await readJson(planRequestsFile, []);
    const filtered = filterPlanRequests(requests, {
      search: req.query?.search,
      status: req.query?.status,
      plan: req.query?.plan
    });
    res.json({
      requests: filtered.slice(0, 200).map(publicPlanRequest)
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/plan-upgrade-requests/:id/status", requireAdmin, async (req, res, next) => {
  try {
    const nextStatus = normalizePlanRequestStatus(req.body?.status);
    const adminNote = String(req.body?.adminNote || "").trim().slice(0, 500);

    if (!["approved", "rejected"].includes(nextStatus)) {
      res.status(400).json({ error: "请选择开通或拒绝" });
      return;
    }

    const [requests, users, demos] = await Promise.all([
      readJson(planRequestsFile, []),
      readJson(usersFile, []),
      readJson(demosFile, [])
    ]);
    const requestIndex = requests.findIndex((item) => item.id === req.params.id);
    if (requestIndex === -1) {
      res.status(404).json({ error: "未找到升级申请" });
      return;
    }

    const request = requests[requestIndex];
    if ((request.status || "open") !== "open") {
      res.status(409).json({ error: "该申请已经处理过" });
      return;
    }

    const now = new Date().toISOString();
    let updatedUser = null;
    if (nextStatus === "approved") {
      const userIndex = users.findIndex((user) => user.id === request.userId);
      if (userIndex === -1) {
        res.status(404).json({ error: "申请用户不存在，无法开通套餐" });
        return;
      }
      const previousPlan = users[userIndex].plan || "free";
      users[userIndex] = {
        ...users[userIndex],
        plan: request.requestedPlan,
        updatedAt: now,
        planUpdatedAt: now
      };
      updatedUser = users[userIndex];
      await writeJson(usersFile, users);
      await writeAuditLog({
        action: "admin_approve_plan_upgrade",
        actorType: "admin",
        targetType: "user",
        targetId: updatedUser.id,
        ip: getClientIp(req),
        metadata: {
          requestId: request.id,
          email: updatedUser.email,
          previousPlan,
          nextPlan: request.requestedPlan
        }
      });
    }

    requests[requestIndex] = {
      ...request,
      status: nextStatus,
      adminNote,
      handledBy: adminUser || "admin",
      handledAt: now,
      updatedAt: now
    };
    await writeJson(planRequestsFile, requests);
    await writeAuditLog({
      action: nextStatus === "approved" ? "admin_update_plan_request_approved" : "admin_update_plan_request_rejected",
      actorType: "admin",
      targetType: "plan_upgrade_request",
      targetId: request.id,
      ip: getClientIp(req),
      metadata: {
        userId: request.userId,
        userEmail: request.userEmail,
        requestedPlan: request.requestedPlan,
        adminNote
      }
    });

    res.json({
      request: publicPlanRequest(requests[requestIndex]),
      user: updatedUser ? adminUserSummary(updatedUser, demos, calculateQuota) : null
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/feedback", requireAdmin, async (req, res, next) => {
  try {
    const feedback = await readJson(feedbackFile, []);
    const filtered = filterFeedback(feedback, {
      search: req.query?.search,
      type: req.query?.type,
      status: req.query?.status
    });
    res.json({
      feedback: filtered.slice(0, 200).map(publicFeedback)
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/feedback/:id/status", requireAdmin, async (req, res, next) => {
  try {
    const nextStatus = normalizeFeedbackStatus(req.body?.status);
    if (!nextStatus) {
      res.status(400).json({ error: "请选择有效反馈状态" });
      return;
    }

    const feedback = await readJson(feedbackFile, []);
    const feedbackIndex = feedback.findIndex((item) => item.id === req.params.id);
    if (feedbackIndex === -1) {
      res.status(404).json({ error: "未找到反馈" });
      return;
    }

    const previousStatus = feedback[feedbackIndex].status || "open";
    feedback[feedbackIndex] = {
      ...feedback[feedbackIndex],
      status: nextStatus,
      updatedAt: new Date().toISOString()
    };
    await writeJson(feedbackFile, feedback);
    await writeAuditLog({
      action: "admin_update_feedback_status",
      actorType: "admin",
      targetType: "feedback",
      targetId: feedback[feedbackIndex].id,
      ip: getClientIp(req),
      metadata: {
        previousStatus,
        nextStatus,
        userEmail: feedback[feedbackIndex].userEmail,
        demoSlug: feedback[feedbackIndex].demoSlug
      }
    });

    res.json({ feedback: publicFeedback(feedback[feedbackIndex]) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/feedback", requireUser, async (req, res, next) => {
  try {
    const message = String(req.body?.message || "").trim();
    const type = normalizeFeedbackType(req.body?.type);
    const demoId = String(req.body?.demoId || "").trim();
    const contact = String(req.body?.contact || "").trim();

    if (message.length < 5) {
      res.status(400).json({ error: "请至少填写 5 个字的问题描述" });
      return;
    }

    if (message.length > 1000) {
      res.status(400).json({ error: "问题描述过长，请控制在 1000 字以内" });
      return;
    }

    const demos = await readJson(demosFile, []);
    const relatedDemo = demoId ? demos.find((demo) => demo.id === demoId && demo.userId === req.user.id) : null;
    if (demoId && !relatedDemo) {
      res.status(404).json({ error: "未找到关联 Demo" });
      return;
    }

    const feedback = await readJson(feedbackFile, []);
    const now = new Date().toISOString();
    const item = {
      id: crypto.randomUUID(),
      userId: req.user.id,
      userEmail: req.user.email,
      demoId: relatedDemo?.id || null,
      demoSlug: relatedDemo?.slug || null,
      type,
      message,
      contact: contact.slice(0, 120),
      status: "open",
      ip: getClientIp(req),
      createdAt: now,
      updatedAt: now
    };

    feedback.unshift(item);
    await writeJson(feedbackFile, feedback.slice(0, 2000));
    await writeAuditLog({
      action: "submit_feedback",
      actorType: "user",
      actorId: req.user.id,
      targetType: "feedback",
      targetId: item.id,
      ip: item.ip,
      metadata: {
        type,
        demoId: item.demoId,
        demoSlug: item.demoSlug
      }
    });

    res.json({ feedback: publicFeedback(item) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/inspect", requireUser, upload.single("project"), async (req, res, next) => {
  const uploadedFile = req.file;
  if (!uploadedFile) {
    res.status(400).json({ error: "请上传 .zip、.tar.gz 或 .tgz 项目包" });
    return;
  }

  try {
    const inspection = await inspectProjectArchive(uploadedFile.path, uploadedFile.originalname);
    res.json({ inspection });
  } catch (error) {
    next(error);
  } finally {
    await fs.rm(uploadedFile.path, { force: true });
  }
});

app.get("/api/admin/content-reviews", requireAdmin, async (req, res, next) => {
  try {
    const reviews = await readJson(contentReviewsFile, []);
    const status = String(req.query?.status || "").trim();
    const resolutionStatus = String(req.query?.resolutionStatus || "").trim();
    const search = String(req.query?.search || "").trim().toLowerCase();
    const filtered = reviews.filter((review) => {
      if (status && review.status !== status) return false;
      if (resolutionStatus && contentReviewResolutionStatus(review) !== resolutionStatus) return false;
      if (!search) return true;
      return [
        review.projectName,
        review.fileName,
        review.userEmail,
        review.demoSlug,
        review.summary
      ].some((value) => String(value || "").toLowerCase().includes(search));
    });
    res.json({
      reviews: filtered.slice(0, 200).map(publicAdminContentReview)
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/content-reviews/:id/status", requireAdmin, async (req, res, next) => {
  try {
    const reviews = await readJson(contentReviewsFile, []);
    const index = reviews.findIndex((review) => review.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: "未找到内容检查记录" });
      return;
    }

    const resolutionStatus = normalizeContentReviewResolutionStatus(req.body?.resolutionStatus);
    if (!resolutionStatus) {
      res.status(400).json({ error: "请选择有效的处理结果" });
      return;
    }

    const now = new Date().toISOString();
    const updated = {
      ...reviews[index],
      resolutionStatus,
      adminNote: String(req.body?.adminNote || "").trim().slice(0, 1000),
      handledBy: adminUser || "admin",
      handledAt: now
    };
    reviews[index] = updated;
    await writeJson(contentReviewsFile, reviews);
    await writeAuditLog({
      action: "admin_handle_content_review",
      actorType: "admin",
      targetType: "content_review",
      targetId: updated.id,
      metadata: {
        resolutionStatus,
        reviewStatus: updated.status,
        projectName: updated.projectName,
        demoSlug: updated.demoSlug
      }
    });
    res.json({ review: publicAdminContentReview(updated) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/demos/:id/offline", requireAdmin, async (req, res, next) => {
  try {
    const demos = await readJson(demosFile, []);
    const demoIndex = demos.findIndex((demo) => demo.id === req.params.id);

    if (demoIndex === -1) {
      res.status(404).json({ error: "未找到该 Demo" });
      return;
    }

    const demo = demos[demoIndex];
    if (demo.status !== "published") {
      res.json({ demo });
      return;
    }

    await removeDemoFiles(demo.slug);
    demos[demoIndex] = {
      ...demo,
      status: "offline",
      offlineAt: new Date().toISOString(),
      offlineBy: "admin"
    };
    await writeJson(demosFile, demos);
    await writeAuditLog({
      action: "admin_offline_demo",
      actorType: "admin",
      targetType: "demo",
      targetId: demo.id,
      metadata: { slug: demo.slug, userEmail: demo.userEmail }
    });
    res.json({ demo: demos[demoIndex] });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/demos/:id/delete", requireAdmin, async (req, res, next) => {
  try {
    const demos = await readJson(demosFile, []);
    const demoIndex = demos.findIndex((demo) => demo.id === req.params.id);

    if (demoIndex === -1) {
      res.status(404).json({ error: "未找到该 Demo" });
      return;
    }

    const demo = demos[demoIndex];
    if (demo.status === "published") {
      res.status(409).json({ error: "已发布 Demo 不能直接删除，请先下线" });
      return;
    }

    if (demo.status === "deleted") {
      res.json({ demo });
      return;
    }

    await deleteDemoFiles(demo.slug);
    demos[demoIndex] = {
      ...demo,
      status: "deleted",
      deletedAt: new Date().toISOString(),
      deletedBy: "admin"
    };
    await writeJson(demosFile, demos);
    await writeAuditLog({
      action: "admin_delete_demo",
      actorType: "admin",
      targetType: "demo",
      targetId: demo.id,
      metadata: { slug: demo.slug, userEmail: demo.userEmail, previousStatus: demo.status }
    });
    res.json({ demo: demos[demoIndex] });
  } catch (error) {
    next(error);
  }
});

app.post("/api/demos/:id/offline", requireUser, async (req, res, next) => {
  try {
    const demos = await readJson(demosFile, []);
    const demoIndex = demos.findIndex((demo) => demo.id === req.params.id && demo.userId === req.user.id);

    if (demoIndex === -1) {
      res.status(404).json({ error: "未找到该 Demo" });
      return;
    }

    const demo = demos[demoIndex];
    if (demo.status !== "published") {
      res.json({ demo, quota: calculateQuota(req.user, demos) });
      return;
    }

    await removeDemoFiles(demo.slug);
    demos[demoIndex] = {
      ...demo,
      status: "offline",
      offlineAt: new Date().toISOString(),
      offlineBy: "user"
    };
    await writeJson(demosFile, demos);
    await writeAuditLog({
      action: "user_offline_demo",
      actorType: "user",
      actorId: req.user.id,
      targetType: "demo",
      targetId: demo.id,
      metadata: { slug: demo.slug }
    });
    res.json({ demo: demos[demoIndex], quota: calculateQuota(req.user, demos) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/demos/:id/delete", requireUser, async (req, res, next) => {
  try {
    const demos = await readJson(demosFile, []);
    const demoIndex = demos.findIndex((demo) => demo.id === req.params.id && demo.userId === req.user.id);

    if (demoIndex === -1) {
      res.status(404).json({ error: "未找到该 Demo" });
      return;
    }

    const demo = demos[demoIndex];
    if (demo.status === "published") {
      res.status(409).json({ error: "已发布 Demo 不能直接删除，请先下线" });
      return;
    }

    if (demo.status === "deleted") {
      res.json({ demo, quota: calculateQuota(req.user, demos) });
      return;
    }

    await deleteDemoFiles(demo.slug);
    demos[demoIndex] = {
      ...demo,
      status: "deleted",
      deletedAt: new Date().toISOString(),
      deletedBy: "user"
    };
    await writeJson(demosFile, demos);
    await writeAuditLog({
      action: "user_delete_demo",
      actorType: "user",
      actorId: req.user.id,
      targetType: "demo",
      targetId: demo.id,
      metadata: { slug: demo.slug, previousStatus: demo.status }
    });
    res.json({ demo: demos[demoIndex], quota: calculateQuota(req.user, demos) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/demos/:id/restore", requireUser, async (req, res, next) => {
  try {
    const demos = await readJson(demosFile, []);
    const demoIndex = demos.findIndex((demo) => demo.id === req.params.id && demo.userId === req.user.id);

    if (demoIndex === -1) {
      res.status(404).json({ error: "未找到该 Demo" });
      return;
    }

    const demo = demos[demoIndex];
    if (isExpired(demo)) {
      await expireDemoFiles(demo.slug);
      demos[demoIndex] = {
        ...demo,
        status: "expired",
        expiredAt: new Date().toISOString()
      };
      await writeJson(demosFile, demos);
      await writeAuditLog({
        action: "expire_demo",
        actorType: "system",
        targetType: "demo",
        targetId: demo.id,
        metadata: { slug: demo.slug, source: "restore_attempt" }
      });
      res.status(409).json({ error: "已过期 Demo 不能重新上线，请重新上传发布" });
      return;
    }

    if (demo.status === "published") {
      res.json({ demo, quota: calculateQuota(req.user, demos) });
      return;
    }

    if (demo.status === "deleted") {
      res.status(409).json({ error: "已删除 Demo 不能重新上线，请重新上传发布" });
      return;
    }

    if (demo.status === "expired") {
      res.status(409).json({ error: "已过期 Demo 不能重新上线，请重新上传发布" });
      return;
    }

    const quota = calculateQuota(req.user, demos);
    if (quota.onlineDemos.used >= quota.onlineDemos.limit) {
      res.status(403).json({ error: `当前套餐最多保留 ${quota.onlineDemos.limit} 个在线 Demo，请先下线其他 Demo 或升级套餐` });
      return;
    }

    const archiveDir = getArchivedDemoDir(demo.slug);
    if (!await exists(archiveDir)) {
      res.status(409).json({ error: "Demo 文件已被清理，无法重新上线，请重新上传发布" });
      return;
    }

    const liveDir = path.join(demoRoot, demo.slug);
    if (await exists(liveDir)) {
      res.status(409).json({ error: "该访问路径已被占用，无法重新上线，请重新上传发布" });
      return;
    }

    await fs.cp(archiveDir, liveDir, { recursive: true });
    demos[demoIndex] = {
      ...demo,
      status: "published",
      restoredAt: new Date().toISOString()
    };
    delete demos[demoIndex].offlineAt;
    delete demos[demoIndex].offlineBy;
    await writeJson(demosFile, demos);
    await writeAuditLog({
      action: "restore_demo",
      actorType: "user",
      actorId: req.user.id,
      targetType: "demo",
      targetId: demo.id,
      metadata: { slug: demo.slug }
    });
    res.json({ demo: demos[demoIndex], quota: calculateQuota(req.user, demos) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/demos/:id/update", requireUser, upload.single("project"), async (req, res, next) => {
  const uploadedFile = req.file;
  const user = req.user;
  const clientIp = getClientIp(req);

  if (!uploadedFile) {
    res.status(400).json({ error: "请上传 .zip、.tar.gz 或 .tgz 项目包" });
    return;
  }

  try {
    res.json(await performUpdateDeployment({
      demoId: req.params.id,
      uploadedFile,
      user,
      clientIp
    }));
  } catch (error) {
    next(error);
  }
});

app.post("/api/deployment-jobs", requireUser, upload.single("project"), async (req, res, next) => {
  const uploadedFile = req.file;
  if (!uploadedFile) {
    res.status(400).json({ error: "请上传 .zip、.tar.gz 或 .tgz 项目包" });
    return;
  }

  try {
    const job = await createDeploymentJob({
      user: req.user,
      action: "create",
      requestedName: String(req.body?.name || "").trim(),
      file: uploadedFile,
      ip: getClientIp(req),
      actor: "user",
      deploySource: "web"
    });
    res.status(202).json({ job: publicDeploymentJob(job) });
    runDeploymentJob(job.id).catch((error) => {
      console.error("Deployment job failed", error);
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/demos/:id/deployment-jobs", requireUser, upload.single("project"), async (req, res, next) => {
  const uploadedFile = req.file;
  if (!uploadedFile) {
    res.status(400).json({ error: "请上传 .zip、.tar.gz 或 .tgz 项目包" });
    return;
  }

  try {
    const job = await createDeploymentJob({
      user: req.user,
      action: "update",
      demoId: req.params.id,
      file: uploadedFile,
      ip: getClientIp(req),
      actor: "user",
      deploySource: "web"
    });
    res.status(202).json({ job: publicDeploymentJob(job) });
    runDeploymentJob(job.id).catch((error) => {
      console.error("Deployment job failed", error);
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/agent/deploy", requireAgentToken, upload.single("project"), async (req, res, next) => {
  return handleCreateDeployment(req, res, next, { actor: "agent" });
});

app.post("/api/deploy", requireUser, upload.single("project"), async (req, res, next) => {
  return handleCreateDeployment(req, res, next, { actor: "user" });
});

async function handleCreateDeployment(req, res, next, options = {}) {
  const uploadedFile = req.file;
  const requestedName = String(req.body?.name || "").trim();
  const user = req.user;
  const clientIp = getClientIp(req);
  const deploySource = detectDeploySource(req, options.actor);

  if (!uploadedFile) {
    res.status(400).json({ error: "请上传 .zip、.tar.gz 或 .tgz 项目包" });
    return;
  }

  try {
    res.json(await performCreateDeployment({
      uploadedFile,
      requestedName,
      user,
      clientIp,
      actor: options.actor,
      deploySource
    }));
  } catch (error) {
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
  const currentDeploymentId = deploymentId || crypto.randomUUID();
  const steps = createDeploymentSteps({ userId: user.id, deploymentId: currentDeploymentId, action: "create" });

  try {
    const rate = await checkDeployRateLimit(user, clientIp);
    if (!rate.allowed) {
      throw createHttpError("上传过于频繁，请稍后再试", 429);
    }
    const preInspection = await inspectProjectArchive(uploadedFile.path, uploadedFile.originalname);
    if (!preInspection.canPublish) {
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
      const error = createProjectError(preInspection, preInspection.issues?.[0] || preInspection.summary || "这个项目暂时无法生成试用链接，请根据提示调整后重试。");
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

    const result = await extractStaticDemo(uploadedFile.path, targetDir, {
      fileName: uploadedFile.originalname,
      steps,
      actor,
      action: "create",
      user,
      projectName: inferredName,
      deploymentId: currentDeploymentId
    });
    if (result.contentReview?.status !== "passed") {
      throw createContentReviewError(result.contentReview);
    }
    const now = new Date().toISOString();
    const publicUrl = `${publicBaseUrl.replace(/\/$/, "")}/d/${slug}/`;
    const demoId = crypto.randomUUID();
    const demo = {
      id: demoId,
      userId: user.id,
      userEmail: user.email,
      slug,
      name: inferredName,
      status: "published",
      publicUrl,
      deploySource,
      deploySourceLabel: deploySourceLabel(deploySource),
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
    const autoForm = await ensureAutoHostedForm({
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
      deploySource,
      deploySourceLabel: demo.deploySourceLabel,
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
    return response;
  } catch (error) {
    if (!error.deploymentEvents) {
      await appendDeploymentEvents(failedDeploymentSteps(error, steps, { userId: user.id, deploymentId: currentDeploymentId }));
    }
    if (targetDir) {
      await fs.rm(targetDir, { recursive: true, force: true });
    }
    throw error;
  } finally {
    await fs.rm(uploadedFile.path, { force: true });
  }
}

async function performUpdateDeployment({ demoId, uploadedFile, user, clientIp = "", actor = "user", deploymentId = "" }) {
  if (!uploadedFile) {
    throw createHttpError("请上传 .zip、.tar.gz 或 .tgz 项目包", 400);
  }

  const currentDeploymentId = deploymentId || crypto.randomUUID();
  const stagingDir = path.join(dataDir, "update-staging", `${demoId}-${crypto.randomBytes(4).toString("hex")}`);
  const backupDir = path.join(dataDir, "update-backups", `${demoId}-${crypto.randomBytes(4).toString("hex")}`);
  const steps = createDeploymentSteps({ demoId, userId: user.id, deploymentId: currentDeploymentId, action: "update" });

  try {
    const demos = await readJson(demosFile, []);
    const demoIndex = demos.findIndex((demo) => demo.id === demoId && demo.userId === user.id);

    if (demoIndex === -1) {
      throw createHttpError("未找到该 Demo", 404);
    }

    const demo = demos[demoIndex];
    if (isExpired(demo)) {
      await expireDemoFiles(demo.slug);
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
    const result = await extractStaticDemo(uploadedFile.path, stagingDir, {
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
    const liveDir = path.join(demoRoot, demo.slug);

    if (await exists(liveDir)) {
      await fs.mkdir(path.dirname(backupDir), { recursive: true });
      await fs.cp(liveDir, backupDir, { recursive: true });
    }

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

    const now = new Date().toISOString();
    const updatedDemo = {
      ...demo,
      status: "published",
      detectedType: result.detectedType,
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
    const autoForm = await ensureAutoHostedForm({
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
    demos[demoIndex] = updatedDemo;
    await writeJson(demosFile, demos);
    await writeAuditLog({
      action: "update_demo",
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
        contentReviewStatus: result.contentReview?.status
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
      deploySource: demos[demoIndex].deploySource || "web",
      deploySourceLabel: demos[demoIndex].deploySourceLabel || deploySourceLabel(demos[demoIndex].deploySource || "web"),
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

function summarizeResponseLimits(quota) {
  if (!quota) return null;
  return {
    plan: quota.plan?.name || quota.plan?.code || "",
    onlineDemos: quota.onlineDemos || null,
    monthlyDeploys: quota.monthlyDeploys || null
  };
}

async function createDeploymentJob({ user, action, demoId = "", requestedName = "", file, ip = "", actor = "user", deploySource = "web" }) {
  const now = new Date().toISOString();
  const job = {
    id: crypto.randomUUID(),
    userId: user.id,
    userEmail: user.email,
    action,
    demoId: demoId || null,
    requestedName,
    filePath: file.path,
    originalName: file.originalname,
    actor,
    deploySource,
    ip,
    status: "queued",
    statusLabel: "等待开始",
    message: "已接收项目包，正在排队处理。",
    steps: createDeploymentSteps({ demoId: demoId || null, userId: user.id, deploymentId: "", action }).map((step) => ({
      ...step,
      deploymentId: null
    })),
    result: null,
    error: null,
    inspection: null,
    contentReview: null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null
  };
  job.steps = job.steps.map((step) => ({ ...step, deploymentId: job.id }));
  await saveDeploymentJob(job);
  return job;
}

async function runDeploymentJob(jobId) {
  let job = await findDeploymentJob(jobId);
  if (!job || job.status !== "queued") return;
  job = await updateDeploymentJob(jobId, {
    status: "running",
    statusLabel: "正在生成",
    message: "DemoGo 正在检查项目、处理内容并生成试用链接。",
    startedAt: new Date().toISOString()
  });

  try {
    const users = await readJson(usersFile, []);
    const user = users.find((item) => item.id === job.userId);
    if (!user) {
      throw createHttpError("当前用户不存在，请重新登录后再试。", 404);
    }
    const uploadedFile = {
      path: job.filePath,
      originalname: job.originalName
    };
    const result = job.action === "update"
      ? await performUpdateDeployment({
          demoId: job.demoId,
          uploadedFile,
          user,
          clientIp: job.ip,
          actor: job.actor,
          deploymentId: job.id
        })
      : await performCreateDeployment({
          uploadedFile,
          requestedName: job.requestedName,
          user,
          clientIp: job.ip,
          actor: job.actor,
          deploySource: job.deploySource,
          deploymentId: job.id
        });
    const finished = await updateDeploymentJob(jobId, {
      status: "success",
      statusLabel: "已生成",
      message: job.action === "update" ? "试用项目已更新，可以打开链接检查。" : "试用链接已生成，可以发给别人试用。",
      result,
      inspection: result.inspection || null,
      contentReview: result.contentReview || null,
      steps: result.deploymentEvents || job.steps,
      finishedAt: new Date().toISOString()
    });
    return finished;
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成失败，请根据提示调整后重试。";
    const events = error.deploymentEvents || await readDeploymentEventsForDeployment(jobId);
    await updateDeploymentJob(jobId, {
      status: "failed",
      statusLabel: "生成失败",
      message,
      error: {
        message,
        statusCode: error.statusCode || 500
      },
      inspection: error.inspection || null,
      contentReview: publicContentReview(error.contentReview) || null,
      steps: events?.length ? events : markJobStepsFailed(job.steps, message),
      finishedAt: new Date().toISOString()
    });
    return null;
  }
}

async function saveDeploymentJob(job) {
  const jobs = await readJson(deploymentJobsFile, []);
  const cleanJob = sanitizeDeploymentJob(job);
  const index = jobs.findIndex((item) => item.id === cleanJob.id);
  if (index >= 0) jobs[index] = cleanJob;
  else jobs.unshift(cleanJob);
  await writeJson(deploymentJobsFile, jobs.slice(0, 1000));
  return cleanJob;
}

async function updateDeploymentJob(jobId, patch) {
  const jobs = await readJson(deploymentJobsFile, []);
  const index = jobs.findIndex((item) => item.id === jobId);
  if (index === -1) return null;
  const next = sanitizeDeploymentJob({
    ...jobs[index],
    ...patch,
    updatedAt: new Date().toISOString()
  });
  jobs[index] = next;
  await writeJson(deploymentJobsFile, jobs);
  return next;
}

async function findDeploymentJob(jobId) {
  const jobs = await readJson(deploymentJobsFile, []);
  return jobs.find((item) => item.id === jobId) || null;
}

function sanitizeDeploymentJob(job) {
  if (!job) return null;
  return {
    ...job,
    filePath: job.filePath || "",
    result: job.result || null,
    steps: Array.isArray(job.steps) ? job.steps : []
  };
}

function publicDeploymentJob(job) {
  if (!job) return null;
  return {
    id: job.id,
    action: job.action,
    demoId: job.demoId || null,
    status: job.status,
    statusLabel: job.statusLabel || deploymentJobStatusLabel(job.status),
    message: job.message || "",
    originalName: job.originalName || "",
    result: job.result || null,
    inspection: job.inspection || job.result?.inspection || null,
    contentReview: job.contentReview || job.result?.contentReview || null,
    steps: Array.isArray(job.steps) ? job.steps : [],
    error: job.error || null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt || null,
    finishedAt: job.finishedAt || null
  };
}

function deploymentJobStatusLabel(status) {
  if (status === "queued") return "等待开始";
  if (status === "running") return "正在生成";
  if (status === "success") return "已生成";
  if (status === "failed") return "生成失败";
  return "未知状态";
}

async function readDeploymentEventsForDeployment(deploymentId) {
  const events = await readJson(deploymentEventsFile, []);
  return events
    .filter((event) => event.deploymentId === deploymentId)
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
}

function markJobStepsFailed(steps, message) {
  const items = Array.isArray(steps) ? steps : [];
  let failedMarked = false;
  return completeDeploymentSteps(items).map((step) => {
    if (!failedMarked && step.status === "skipped") {
      failedMarked = true;
      return { ...step, status: "failed", message };
    }
    return step;
  });
}

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

app.use((error, _req, res, _next) => {
  const message = error instanceof Error ? error.message : "发布失败";
  const statusCode = error.statusCode || (message.includes("仅支持") || message.includes("不支持") || message.includes("超出") ? 400 : 500);
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

async function createAvailableSlug(input, existingDemos = []) {
  const base = slugify(input) || `demo-${crypto.randomBytes(3).toString("hex")}`;
  let slug = base;
  let index = 1;
  const reservedSlugs = new Set(existingDemos.map((demo) => demo.slug).filter(Boolean));

  while (reservedSlugs.has(slug) || await exists(path.join(demoRoot, slug)) || await exists(getArchivedDemoDir(slug))) {
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

async function requireUser(req, res, next) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "请先登录后再生成试用链接" });
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

async function requireAgentToken(req, res, next) {
  try {
    const value = readBearerToken(req) || String(req.body?.agentToken || req.body?.publishToken || "").trim();
    if (!value) {
      res.status(401).json({ error: "缺少 DemoGo AI 发布口令。" });
      return;
    }

    const user = await getUserFromAgentToken(value);
    if (!user) {
      res.status(401).json({ error: "AI 发布口令无效或已被重置。" });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

function requireAdmin(req, res, next) {
  if (!adminUser || !adminPassword) {
    res.status(403).json({ error: "管理 API 未配置" });
    return;
  }

  const authorization = String(req.get("authorization") || "");
  const [scheme, encoded] = authorization.split(" ");

  if (scheme !== "Basic" || !encoded) {
    res.set("WWW-Authenticate", 'Basic realm="DemoGo Admin API"');
    res.status(401).json({ error: "需要管理员认证" });
    return;
  }

  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const separatorIndex = decoded.indexOf(":");
  const user = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);

  if (user !== adminUser || password !== adminPassword) {
    res.set("WWW-Authenticate", 'Basic realm="DemoGo Admin API"');
    res.status(401).json({ error: "管理员账号或密码不正确" });
    return;
  }

  next();
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

async function createSession(userId) {
  const sessions = await readJson(sessionsFile, []);
  const session = {
    token: crypto.randomBytes(32).toString("hex"),
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };
  sessions.push(session);
  await writeJson(sessionsFile, sessions);
  return session;
}

function createAgentTokenRecord() {
  const id = crypto.randomBytes(6).toString("hex");
  const secret = crypto.randomBytes(24).toString("base64url");
  const plainToken = `dmg_${id}_${secret}`;
  return {
    plainToken,
    token: {
      id,
      prefix: `dmg_${id}`,
      secretHash: hashAgentTokenSecret(secret),
      createdAt: new Date().toISOString()
    }
  };
}

function publicAgentToken(user) {
  const token = user?.agentToken;
  return {
    enabled: Boolean(token?.secretHash),
    prefix: token?.prefix || "",
    createdAt: token?.createdAt || null
  };
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

function parseAgentToken(value) {
  const match = String(value || "").trim().match(/^dmg_([a-f0-9]{12})_([A-Za-z0-9_-]{20,})$/);
  if (!match) return null;
  return { id: match[1], secret: match[2] };
}

function verifyAgentToken(user, token) {
  const record = user?.agentToken;
  if (!record?.secretHash || record.id !== token.id) return false;
  const expected = Buffer.from(record.secretHash, "hex");
  const actual = Buffer.from(hashAgentTokenSecret(token.secret), "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function hashAgentTokenSecret(secret) {
  return crypto.createHash("sha256").update(String(secret)).digest("hex");
}

function setSessionCookie(res, token) {
  res.cookie("demogo_session", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function loginFailureKey(email, ip) {
  return `${email || "unknown"}|${ip || "unknown"}`;
}

function checkLoginFailureRate(email, ip) {
  const key = loginFailureKey(email, ip);
  const now = Date.now();
  const current = loginFailureBuckets.get(key);
  if (!current || current.resetAt <= now) {
    loginFailureBuckets.delete(key);
    return { allowed: true, used: 0, limit: loginFailureLimit };
  }
  return {
    allowed: current.count < loginFailureLimit,
    used: current.count,
    limit: loginFailureLimit
  };
}

function recordLoginFailure(email, ip) {
  const key = loginFailureKey(email, ip);
  const now = Date.now();
  const current = loginFailureBuckets.get(key);
  if (!current || current.resetAt <= now) {
    loginFailureBuckets.set(key, { count: 1, resetAt: now + loginFailureWindowMs });
    return;
  }
  loginFailureBuckets.set(key, { ...current, count: current.count + 1 });
}

function clearLoginFailures(email, ip) {
  loginFailureBuckets.delete(loginFailureKey(email, ip));
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
        ...((review.findings || []).slice(0, 5).map((finding) => `${finding.category}：${finding.snippet || finding.sourceFile || ""}`))
      ],
      recommendations: [
        ...((inspection.ruleReport || {}).recommendations || []),
        ...((review.findings || []).slice(0, 5).map((finding) => finding.suggestion).filter(Boolean))
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
  if (review?.resolutionStatus) return normalizeContentReviewResolutionStatus(review.resolutionStatus) || "pending";
  return ["blocked", "review_required", "failed"].includes(String(review?.status || "")) ? "pending" : "resolved";
}

function normalizeContentReviewResolutionStatus(value) {
  const status = String(value || "").trim();
  return ["pending", "confirmed_violation", "false_positive", "resolved"].includes(status) ? status : "";
}

function contentReviewResolutionStatusLabel(status) {
  if (status === "pending") return "待处理";
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

async function appendDeploymentEvents(events) {
  const items = Array.isArray(events) ? events.filter(Boolean) : [];
  if (!items.length) return;
  const existing = await readJson(deploymentEventsFile, []);
  await writeJson(deploymentEventsFile, [...items, ...existing].slice(0, 5000));
}

async function readDeploymentEventsForDemo(demoId) {
  const events = await readJson(deploymentEventsFile, []);
  return events
    .filter((event) => event.demoId === demoId)
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
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

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt);
  return `${salt}:${hash}`;
}

async function verifyPassword(password, storedHash) {
  const [salt, expectedHash] = String(storedHash || "").split(":");
  if (!salt || !expectedHash) return false;
  const actualHash = await scrypt(password, salt);
  return crypto.timingSafeEqual(Buffer.from(actualHash, "hex"), Buffer.from(expectedHash, "hex"));
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

async function readArchiveEntryText(item) {
  if (item?.archiveType === "tar.gz") {
    const bytes = await fs.readFile(item.tempPath);
    return bytes.subarray(0, 256 * 1024).toString("utf8");
  }
  return readZipEntryText(item?.entry || item);
}

function extractFormFields(content, sourceFile) {
  const fields = [];
  const inputPattern = /<(input|textarea|select)\b([^>]*)>/gi;
  let match;
  while ((match = inputPattern.exec(content))) {
    const tag = match[1].toLowerCase();
    const attrs = parseHtmlAttributes(match[2] || "");
    const type = attrs.type || (tag === "textarea" ? "textarea" : tag === "select" ? "select" : "text");
    if (["hidden", "submit", "button", "reset", "file", "image"].includes(type.toLowerCase())) continue;
    const name = attrs.name || attrs.id || attrs["v-model"] || attrs["formcontrolname"] || "";
    const label = inferFieldLabel(name || attrs.placeholder || attrs["aria-label"] || type);
    if (!name && !label) continue;
    fields.push({
      name,
      label,
      type,
      required: Object.prototype.hasOwnProperty.call(attrs, "required"),
      sourceFile,
      autoHostEligible: isCollectableFormField({ name, label, type, sourceFile })
    });
  }

  for (const fieldName of inferFieldNamesFromCode(content)) {
    fields.push({
      name: fieldName,
      label: inferFieldLabel(fieldName),
      type: inferFieldType(fieldName),
      required: false,
      sourceFile,
      autoHostEligible: isCollectableFormField({
        name: fieldName,
        label: inferFieldLabel(fieldName),
        type: inferFieldType(fieldName),
        sourceFile
      })
    });
  }

  return fields;
}

function isCollectableFormField(field) {
  const text = `${field?.name || ""} ${field?.label || ""}`.toLowerCase();
  if (isNonCollectableControl(text)) return false;
  return /name|姓名|phone|mobile|tel|手机号|电话|email|邮箱|company|公司|message|留言|remark|备注|contact|联系|wechat|微信|address|地址/.test(text);
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
    while ((match = pattern.exec(content))) {
      names.add((match[1] || "").toString().replace(/^[A-Z]/, (value) => value.toLowerCase()));
    }
  }
  return Array.from(names).filter(Boolean).slice(0, 12);
}

function inferFieldType(name) {
  const lower = String(name || "").toLowerCase();
  if (lower.includes("phone") || lower.includes("mobile") || lower.includes("tel")) return "phone";
  if (lower.includes("email")) return "email";
  if (lower.includes("count") || lower.includes("quantity") || lower.includes("number")) return "number";
  if (lower.includes("message") || lower.includes("remark")) return "textarea";
  return "text";
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

function extractApiCalls(content, sourceFile) {
  const calls = [];
  const patterns = [
    { type: "fetch", regex: /fetch\s*\(\s*(['"`])([^'"`]+)\1/gi },
    { type: "axios", regex: /axios\.(get|post|put|patch|delete)\s*\(\s*(['"`])([^'"`]+)\2/gi }
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.regex.exec(content))) {
      const method = pattern.type === "axios" ? match[1].toUpperCase() : "UNKNOWN";
      const url = pattern.type === "axios" ? match[3] : match[2];
      if (!url || url.startsWith("data:")) continue;
      calls.push({
        type: pattern.type,
        method,
        url,
        isLocal: isLocalApiUrl(url),
        sourceFile
      });
    }
  }

  return calls;
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

function createInspectionSummary(analysis) {
  const hasRootIndex = analysis.paths.includes("index.html");
  const hasDistIndex = analysis.paths.includes("dist/index.html");
  const hasBuildIndex = analysis.paths.includes("build/index.html");
  const hasOutIndex = analysis.paths.includes("out/index.html");
  const hasPublicIndex = analysis.paths.includes("public/index.html");
  const hasPackageJson = analysis.hasPackageJson || analysis.paths.includes("package.json");
  const hasBuildScript = Boolean(analysis.hasBuildScript);
  const hasSourceIndicators = hasSourceProjectIndicators(analysis.paths || []);
  const hasBackend = hasBackendIndicators(analysis.paths || [], analysis.packageScripts || {});
  const hasSsr = hasSsrIndicators(analysis.paths || []);
  const singleHtmlEntry = detectSingleHtmlEntry(analysis.paths || []);
  const hasBuiltEntry = hasDistIndex || hasBuildIndex || hasOutIndex;
  const status = determineInspectionStatus(analysis, { hasRootIndex, hasDistIndex, hasBuildIndex, hasOutIndex, hasPublicIndex, hasPackageJson, hasBuildScript, hasBackend, hasSsr, singleHtmlEntry });
  const detectedType = detectInspectionType({ hasRootIndex, hasDistIndex, hasBuildIndex, hasOutIndex, hasPublicIndex, hasPackageJson, hasBuildScript, hasSourceIndicators, hasBackend, hasSsr, singleHtmlEntry });
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
    issues.push("检测到这个项目需要服务器长期运行，当前 DemoGo 暂不支持这类项目的完整功能。");
    suggestions.push("请让 AI 编程工具导出一个纯网页演示版本，或等待后续后端托管能力。");
  }

  if (hasSsr && !hasOutIndex) {
    issues.push("检测到这个项目可能需要服务端渲染，当前 DemoGo 暂不支持这类运行方式。");
    suggestions.push("如果项目可以导出静态网页，请先生成 dist/build/out 后再上传。");
  }

  if (hasPackageJson && !hasRootIndex && !hasBuiltEntry && !hasPublicIndex && !singleHtmlEntry) {
    suggestions.push("已识别为 AI 生成的网页源码，DemoGo 会自动生成网页后发布。");
  }

  if (hasPackageJson && !hasBuildScript && !hasRootIndex && !hasBuiltEntry && !hasPublicIndex && !singleHtmlEntry) {
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
    ruleReport: createRuleReport({
      status,
      detectedType,
      entryFile,
      singleHtmlEntry,
      hasPackageJson,
      hasBuildScript,
      hasSourceIndicators,
      hasBackend,
      hasSsr,
      formFields,
      apiCalls,
      issues
    }),
    ...createUserFacingInspection({
      status,
      detectedType,
      entryFile,
      singleHtmlEntry,
      hasPackageJson,
      hasBuildScript,
      hasBackend,
      hasSsr,
      formFields,
      apiCalls,
      issues
    })
  };
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

function createInvalidZipInspection(error) {
  const technicalReason = error instanceof Error ? error.message : "";
  return createInvalidArchiveInspection("ZIP", technicalReason);
}

function createInvalidArchiveInspection(archiveType, technicalReason = "") {
  return {
    status: "blocked",
    canPublish: false,
    detectedType: "unknown",
    label: inspectionTypeLabel("unknown"),
    summary: "压缩包不完整或格式异常，DemoGo 无法读取项目文件。",
    issues: [
      `压缩包缺少完整的 ${archiveType} 目录信息，可能是生成、下载或上传过程中被截断。`
    ],
    suggestions: [
      "请从原项目文件夹重新压缩后上传，不要上传正在生成或传输未完成的文件。",
      "如果文件来自其他工具导出，请先在本地解压验证，确认能正常打开后再上传。"
    ],
    rawFileCount: 0,
    publishableFileCount: 0,
    rawBytes: 0,
    publishableBytes: 0,
    ignoredFileCount: 0,
    ignoredFiles: [],
    blockedFiles: [],
    rootEntries: [],
    entryFile: null,
    projectTitle: "",
    pageHeading: "",
    hasPackageJson: false,
    hasBuildScript: false,
    formFields: [],
    apiCalls: [],
    ruleReport: {
      projectCategory: inspectionTypeLabel("unknown"),
      publishability: "暂时无法发布",
      risks: technicalReason ? [`${archiveType} 读取失败：${technicalReason}`] : [],
      recommendations: [
        "重新打包后再上传。"
      ],
      fixPrompt: "请重新导出或重新压缩项目，确保生成的是完整 .zip、.tar.gz 或 .tgz 文件，且压缩包内包含 index.html、dist/index.html 或 build/index.html。"
    }
  };
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
  let userLabel = inspectionTypeLabel(context.detectedType);
  let userSummary = "这个项目可以发布，别人能打开页面。";

  if (context.hasBackend && context.status === "blocked") {
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

  return {
    userLabel,
    userSummary,
    userStatus: context.status === "blocked" ? "unsupported" : "supported",
    userStatusLabel: context.status === "blocked" ? "暂不支持" : "支持",
    supportNotes,
    unsupportedNotes,
    fixPrompt: createFixPrompt(context)
  };
}

function createProjectError(inspection, message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.inspection = {
    ...inspection,
    status: "blocked",
    canPublish: false,
    summary: message
  };
  return error;
}

async function detectBuildAndNormalizeOutput(targetDir, inspection) {
  const packageJsonPath = path.join(targetDir, "package.json");
  const hasPackageJson = await exists(packageJsonPath);
  const shouldBuildSourceProject = hasPackageJson && inspection?.detectedType === "source" && inspection?.hasBuildScript;

  if (shouldBuildSourceProject) {
    let buildLog = "";
    try {
      buildLog = await buildNodeProject(targetDir);
    } catch (error) {
      throw createProjectError(inspection, explainBuildError(error));
    }

    const builtOutput = await findPublishableOutput(targetDir, { built: true });
    if (builtOutput) {
      await promoteDirectory(builtOutput.dir, targetDir);
      return { detectedType: builtOutput.type, buildLog };
    }

    throw createProjectError(inspection, "项目已完成生成，但未找到可发布的网页入口。请让 AI 工具生成 dist/index.html、build/index.html 或 out/index.html。");
  }

  const existingOutput = await findPublishableOutput(targetDir, { built: false });
  if (existingOutput) {
    if (existingOutput.dir !== targetDir) {
      await promoteDirectory(existingOutput.dir, targetDir);
    }
    return { detectedType: existingOutput.type, buildLog: "" };
  }

  if (inspection?.detectedType === "single-html" && await promoteSingleHtmlEntry(targetDir, inspection.entryFile)) {
    return { detectedType: "single-html", buildLog: "" };
  }

  if (hasPackageJson) {
    let buildLog = "";
    try {
      buildLog = await buildNodeProject(targetDir);
    } catch (error) {
      throw createProjectError(inspection, explainBuildError(error));
    }
    const builtOutput = await findPublishableOutput(targetDir, { built: true });
    if (builtOutput) {
      await promoteDirectory(builtOutput.dir, targetDir);
      return { detectedType: builtOutput.type, buildLog };
    }
    throw createProjectError(inspection, "项目已完成生成，但未找到可发布的网页入口。请让 AI 工具生成 dist/index.html、build/index.html 或 out/index.html。");
  }

  throw createProjectError(inspection, "未找到可访问的首页文件。请上传包含 index.html、dist/index.html、build/index.html 或 out/index.html 的项目包。");
}

async function findPublishableOutput(targetDir, options = {}) {
  const prefix = options.built ? "built-" : "";
  const candidates = [
    { dir: targetDir, type: "static-root", allowWhenBuilt: false },
    { dir: path.join(targetDir, "dist"), type: `${prefix}dist`, allowWhenBuilt: true },
    { dir: path.join(targetDir, "build"), type: `${prefix}build`, allowWhenBuilt: true },
    { dir: path.join(targetDir, "out"), type: `${prefix}out`, allowWhenBuilt: true },
    { dir: path.join(targetDir, "public"), type: `${prefix}public`, allowWhenBuilt: false }
  ];

  for (const candidate of candidates) {
    if (options.built && !candidate.allowWhenBuilt) continue;
    if (await exists(path.join(candidate.dir, "index.html"))) return candidate;
  }
  return null;
}

async function summarizePublishedDirectory(rootDir) {
  const summary = { fileCount: 0, totalBytes: 0 };
  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      const stat = await fs.stat(fullPath);
      summary.fileCount += 1;
      summary.totalBytes += stat.size;
    }
  }
  await walk(rootDir);
  return summary;
}

async function promoteDirectory(sourceDir, targetDir) {
  const stagingDir = `${targetDir}-staging-${crypto.randomBytes(3).toString("hex")}`;
  await fs.rename(sourceDir, stagingDir);
  const entries = await fs.readdir(targetDir);

  for (const entry of entries) {
    await fs.rm(path.join(targetDir, entry), { recursive: true, force: true });
  }

  const promotedEntries = await fs.readdir(stagingDir);
  for (const entry of promotedEntries) {
    await fs.rename(path.join(stagingDir, entry), path.join(targetDir, entry));
  }
  await fs.rm(stagingDir, { recursive: true, force: true });
}

async function ensureAutoHostedForm({ user, demo, inspection, targetDir, now = new Date().toISOString() }) {
  const allFields = Array.isArray(inspection?.formFields) ? inspection.formFields : [];
  const autoHostableFields = filterAutoHostableFormFields(allFields);
  const detectedFields = normalizeFormFields(autoHostableFields);
  if (!allFields.length) {
    return { reason: "未检测到可自动接管的表单" };
  }
  if (!detectedFields.length) {
    return { reason: "检测到页面填写控件，但不像报名、预约或留言表单，已跳过自动表单收集" };
  }

  const [forms, submissions] = await Promise.all([
    readJson(formsFile, []),
    readJson(formSubmissionsFile, [])
  ]);
  const existingIndex = forms.findIndex((form) => form.demoId === demo.id && form.userId === user.id && form.status !== "deleted");
  const quota = calculateFormQuota(user, forms, submissions);
  if (existingIndex === -1 && quota.forms.limit && quota.forms.used >= quota.forms.limit) {
    return { reason: `当前套餐最多托管 ${quota.forms.limit} 个表单，已跳过自动表单收集` };
  }

  const item = existingIndex >= 0
    ? {
        ...forms[existingIndex],
        demoSlug: demo.slug,
        demoName: demo.name || demo.slug,
        fields: detectedFields.length ? detectedFields : normalizeFormFields(forms[existingIndex].fields || []),
        status: forms[existingIndex].status || "active",
        updatedAt: now
      }
    : {
        id: crypto.randomUUID(),
        userId: user.id,
        userEmail: user.email,
        demoId: demo.id,
        demoSlug: demo.slug,
        demoName: demo.name || demo.slug,
        publicToken: crypto.randomBytes(24).toString("hex"),
        name: `${demo.name || demo.slug} 表单`,
        status: "active",
        fields: detectedFields,
        submissionCount: 0,
        autoCreated: true,
        createdAt: now,
        updatedAt: now
      };

  if (existingIndex >= 0) {
    forms[existingIndex] = item;
  } else {
    forms.unshift(item);
  }
  await writeJson(formsFile, forms.slice(0, 2000));
  await injectAutoFormScript(targetDir, publicForm(item, { publicBaseUrl }));
  await writeAuditLog({
    action: existingIndex >= 0 ? "refresh_auto_form_hosting" : "auto_create_form_hosting",
    actorType: "system",
    actorId: user.id,
    targetType: "form",
    targetId: item.id,
    metadata: {
      demoId: demo.id,
      demoSlug: demo.slug,
      fieldCount: item.fields.length
    }
  });
  return { form: item };
}

function filterAutoHostableFormFields(fields = []) {
  const sourceFields = Array.isArray(fields) ? fields : [];
  const names = sourceFields.map((field) => `${field.name || ""} ${field.label || ""}`.toLowerCase()).join(" ");
  const hasContact = /phone|mobile|tel|手机号|电话|email|邮箱|wechat|微信|contact|联系/.test(names);
  const hasMessage = /message|留言|remark|备注/.test(names);
  const hasIdentity = /name|姓名|company|公司/.test(names);
  if (!hasContact && !hasMessage && !hasIdentity) return [];
  return sourceFields
    .filter((field) => !isNonCollectableControl(`${field.name || ""} ${field.label || ""}`))
    .map((field) => ({ ...field, autoHostEligible: true }))
    .slice(0, 12);
}

async function injectAutoFormScript(targetDir, form) {
  const indexPath = path.join(targetDir, "index.html");
  if (!await exists(indexPath)) return;

  const fields = normalizeFormFields(form.fields || []).map((field) => field.name);
  const config = JSON.stringify({
    submitUrl: form.submitUrl,
    fields
  }).replace(/</g, "\\u003c");
  const script = [
    "<script>",
    "(function(){",
    "if(window.__DEMOGO_AUTO_FORM__)return;",
    `window.__DEMOGO_AUTO_FORM__=${config};`,
    "var cfg=window.__DEMOGO_AUTO_FORM__;",
    "function named(el){return el&&((el.getAttribute('name')||el.id||'').trim());}",
    "function setText(form,text,ok){var box=form.querySelector('[data-demogo-form-status]');if(!box){box=document.createElement('div');box.setAttribute('data-demogo-form-status','');box.style.marginTop='10px';box.style.fontSize='14px';form.appendChild(box);}box.textContent=text;box.style.color=ok?'#087a69':'#b54708';}",
    "document.addEventListener('submit',function(event){",
    "var form=event.target;if(!form||form.tagName!=='FORM')return;",
    "var controls=Array.prototype.slice.call(form.querySelectorAll('input,textarea,select')).filter(function(el){return named(el)&&el.type!=='button'&&el.type!=='submit'&&el.type!=='reset';});",
    "if(!controls.length)return;",
    "event.preventDefault();",
    "var payload={};controls.forEach(function(el){var key=named(el);if(!key)return;if((el.type==='checkbox'||el.type==='radio')&&!el.checked)return;payload[key]=el.value;});",
    "fetch(cfg.submitUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(function(res){if(!res.ok)throw new Error('submit failed');return res.json();}).then(function(){setText(form,'提交成功，我们会尽快联系你。',true);form.reset();}).catch(function(){setText(form,'提交失败，请稍后重试。',false);});",
    "},true);",
    "})();",
    "</script>"
  ].join("");

  const html = await fs.readFile(indexPath, "utf8");
  const cleaned = html.replace(/<script>\s*\(function\(\)\{\s*if\(window\.__DEMOGO_AUTO_FORM__\)[\s\S]*?<\/script>\s*/g, "");
  const updated = cleaned.includes("</body>")
    ? cleaned.replace("</body>", `${script}\n</body>`)
    : `${cleaned}\n${script}`;
  await fs.writeFile(indexPath, updated, "utf8");
}

async function buildNodeProject(projectDir) {
  const packageJsonContent = await fs.readFile(path.join(projectDir, "package.json"), "utf8");
  const packageJson = JSON.parse(packageJsonContent.replace(/^\uFEFF/, ""));
  if (!packageJson.scripts?.build) {
    throw new Error("检测到 package.json，但未找到 scripts.build，无法自动构建");
  }

  if (buildMode !== "host" && await commandAvailable("docker")) {
    return buildNodeProjectInDocker(projectDir);
  }

  if (buildMode === "docker") {
    throw new Error("已配置 Docker 构建模式，但服务器未检测到 docker 命令");
  }

  return buildNodeProjectOnHost(projectDir);
}

async function buildNodeProjectOnHost(projectDir) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const installCommand = await exists(path.join(projectDir, "package-lock.json")) ? [npmCommand, ["ci"]] : [npmCommand, ["install"]];
  const installLog = await runCommand(installCommand[0], installCommand[1], projectDir);
  const buildLog = await runCommand(npmCommand, ["run", "build"], projectDir);
  return ["[host build]", installLog, buildLog].join("\n");
}

async function buildNodeProjectInDocker(projectDir) {
  const installCommand = await exists(path.join(projectDir, "package-lock.json")) ? "npm ci" : "npm install";
  const script = `${installCommand} && npm run build`;
  const args = [
    "run",
    "--rm",
    "--network=bridge",
    "--memory",
    dockerMemory,
    "--cpus",
    dockerCpus,
    "-v",
    `${path.resolve(projectDir)}:/workspace`,
    "-w",
    "/workspace",
    dockerImage,
    "sh",
    "-lc",
    script
  ];
  const log = await runCommand("docker", args, projectDir);
  return [`[docker build] image=${dockerImage} memory=${dockerMemory} cpus=${dockerCpus}`, log].join("\n");
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    execFile(command, args, {
      cwd,
      shell: process.platform === "win32",
      timeout: buildTimeoutMs,
      maxBuffer: 1024 * 1024 * 2,
      env: {
        ...process.env,
        CI: "true"
      }
    }, (error, stdout, stderr) => {
      const output = [
        `$ ${command} ${args.join(" ")}`,
        stdout,
        stderr
      ].filter(Boolean).join("\n");

      if (error) {
        const commandError = new Error(`构建命令失败：${command} ${args.join(" ")}\n${error.message}\n${output}`);
        commandError.code = error.code;
        commandError.signal = error.signal;
        commandError.killed = error.killed;
        reject(commandError);
        return;
      }
      resolve(output);
    });
  });
}

async function commandAvailable(command) {
  const checkCommand = process.platform === "win32" ? "where" : "which";
  try {
    await runCommand(checkCommand, [command], process.cwd());
    return true;
  } catch {
    return false;
  }
}

function explainBuildError(error) {
  const message = String(error?.message || "");
  if (error?.killed || message.includes("ETIMEDOUT")) {
    return "项目生成时间过长，系统已停止处理。常见原因是依赖过多、上传了无关依赖目录，或项目配置异常。建议先在 AI 编程工具中生成 dist/build 后再上传。";
  }
  if (message.includes("scripts.build") || message.includes("未找到 scripts.build")) {
    return "检测到 package.json，但未找到生成网页的 build 命令。请先在 AI 编程工具中生成可发布版本，或补充 build 命令后重新上传。";
  }
  if (message.includes("JSON")) {
    return "package.json 解析失败，请检查项目配置文件格式是否正确。";
  }
  if (message.includes("npm") || message.includes("构建命令失败")) {
    return "项目自动生成失败。常见原因是依赖安装失败、项目配置不完整，或源码需要本地特殊环境。建议先生成 dist/build 后再上传。";
  }
  return "项目自动生成失败，请检查项目配置，或先生成 dist/build 后重新上传。";
}

async function injectTrackingScript(targetDir, detectedType) {
  const indexPath = path.join(targetDir, "index.html");
  if (!await exists(indexPath)) return;

  const script = [
    "<script>",
    "(function(){",
    "var p=location.pathname.match(/\\/d\\/([^\\/]+)/);",
    "if(!p)return;",
    "var b=0;",
    "try{b=performance.getEntriesByType('resource').reduce(function(s,r){return s+(r.transferSize||0);},0);}catch(e){}",
    "var s=document.createElement('script');",
    "s.src='/api/demo-track/'+encodeURIComponent(p[1])+'?bytes='+Math.max(0,Math.round(b));",
    "s.async=true;",
    "document.head.appendChild(s);",
    "})();",
    "</script>"
  ].join("");
  const html = await fs.readFile(indexPath, "utf8");
  if (html.includes("/api/demo-track/")) return;
  const updated = html.includes("</body>")
    ? html.replace("</body>", `${script}\n</body>`)
    : `${html}\n${script}`;
  await fs.writeFile(indexPath, updated, "utf8");
}

const pendingUsage = new Map();

function recordDemoVisit(slug, estimatedBytes, ip) {
  const now = new Date().toISOString();
  const current = pendingUsage.get(slug) || {
    visits: 0,
    estimatedBytes: 0,
    uniqueIps: new Set(),
    lastVisitedAt: now
  };
  current.visits += 1;
  current.estimatedBytes += Math.max(0, Math.min(Number(estimatedBytes) || 0, 50 * 1024 * 1024));
  if (ip) current.uniqueIps.add(ip);
  current.lastVisitedAt = now;
  pendingUsage.set(slug, current);
}

async function flushUsageStats() {
  if (!pendingUsage.size) return;
  const updates = Array.from(pendingUsage.entries());
  pendingUsage.clear();

  const demos = await readJson(demosFile, []);
  let changed = false;
  for (const [slug, usage] of updates) {
    const demo = demos.find((item) => item.slug === slug);
    if (!demo) continue;
    const current = demo.usage || {};
    demo.usage = {
      visits: Number(current.visits || 0) + usage.visits,
      estimatedBytes: Number(current.estimatedBytes || 0) + usage.estimatedBytes,
      uniqueVisitorsEstimate: Number(current.uniqueVisitorsEstimate || 0) + usage.uniqueIps.size,
      lastVisitedAt: usage.lastVisitedAt
    };
    changed = true;
  }

  if (changed) {
    await writeJson(demosFile, demos);
  }
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value >= 1024 * 1024 * 1024) return `${(value / 1024 / 1024 / 1024).toFixed(1)}GB`;
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)}MB`;
  if (value >= 1024) return `${Math.round(value / 1024)}KB`;
  return `${value}B`;
}

function stripBom(content) {
  return String(content || "").replace(/^\uFEFF/, "");
}
