import crypto from "node:crypto";
import path from "node:path";
import { join as pathJoin } from "node:path";
import fs from "node:fs/promises";
import { dataDir, demoRoot, serviceVersion } from "../config.js";
import { readJson, writeJson } from "../lib/data-access.js";
import { calculateFormQuota, sanitizeSubmissionPayload, publicFormSubmission } from "../services/form-service.js";
import { getClientIp } from "../lib/request-utils.js";
import { slugify } from "../lib/project-utils.js";
import { exists } from "../lib/utils.js";

const formsFile = pathJoin(dataDir, "forms.json");
const formSubmissionsFile = pathJoin(dataDir, "form-submissions.json");
const usersFile = pathJoin(dataDir, "users.json");

export function registerMiscRoutes(app, {
  routeRuntimeDemo,
  securityHeadersMiddleware,
  createStrictRateLimiter,
  createRateLimiter,
  express,
  normalizeTrialEventType,
  getUserFromRequest,
  writeTrialEvent,
  redirectDemoAlias,
  looksLikeAssetRequest,
  hostingCapabilities,
}) {
  // Infrastructure middleware (should eventually move back to server.js)

  // Cache headers for demo static content
  app.use("/d", (req, res, next) => {
    const ext = (req.path || "").split(".").pop().toLowerCase();
    const assetExts = ["js","css","png","jpg","jpeg","gif","svg","ico","woff","woff2","ttf","eot"];
    if (assetExts.includes(ext)) {
      res.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (ext === "html" || !ext.includes("/")) {
      res.set("Cache-Control", "public, max-age=300, must-revalidate");
    }
    next();
  });

  app.use("/d/:slug", routeRuntimeDemo);
  app.use(securityHeadersMiddleware);
  app.use("/api/auth/login", createStrictRateLimiter({ maxRequests: parseInt(process.env.DEMOGO_LOGIN_RATE_LIMIT || "10") }).middleware);
  app.use("/api", createRateLimiter({ maxRequests: parseInt(process.env.DEMOGO_API_RATE_LIMIT || "60") }).middleware);
  app.use("/d", express.static(demoRoot));

  // POST /api/trial-events
  app.post("/api/trial-events", async (req, res, next) => {
  try {
    const eventType = normalizeTrialEventType(req.body?.eventType);
    if (!eventType) {
      res.status(400).json({ error: "事件类型无效。" });
      return;
    }
    const user = await getUserFromRequest(req);
    await writeTrialEvent({
      eventType,
      userId: user?.id || null,
      userEmail: user?.email || null,
      source: req.body?.source,
      path: req.body?.path || req.get("referer") || "",
      metadata: req.body?.metadata,
      ip: getClientIp(req)
    });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

  // GET /d/:slug - demo alias redirect
  app.get("/d/:slug", async (req, res, next) => {
    try {
      if (await redirectDemoAlias(req, res)) return;
      next();
    } catch (error) {
      next(error);
    }
  });

  // GET /api/hosting/capabilities
  app.get("/api/hosting/capabilities", (_req, res) => {
    res.json({ capabilities: hostingCapabilities() });
  });

  // GET /d/:slug/* - SPA fallback
  app.get("/d/:slug/*", async (req, res, next) => {
    try {
      if (await redirectDemoAlias(req, res)) return;
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

  // GET /api/health
  app.get("/api/health", async (_req, res) => {
    try {
      const { getSystemHealth } = await import("../services/health-service.js");
      const health = await getSystemHealth();
      res.json({
        ok: health.status === "healthy",
        service: "demogo-server",
        version: health.checks.version,
        ...health
      });
    } catch (error) {
      res.status(500).json({ status: "error", error: error.message });
    }
  });
  // POST /api/public/forms/:token/submit
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
}