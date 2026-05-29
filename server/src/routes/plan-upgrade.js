import crypto from "node:crypto";
import { join as pathJoin } from "node:path";
import { dataDir } from "../config.js";
import { readJson, writeJson } from "../lib/data-access.js";
import { getClientIp } from "../lib/request-utils.js";
import { writeAuditLog } from "../lib/audit-log.js";
import { publicPlanRequest, normalizeRequestedPlan, canUpgradePlan } from "../services/plan-request-service.js";

const planRequestsFile = pathJoin(dataDir, "plan-upgrade-requests.json");

export function registerPlanRoutes(app, deps = {}) {
  const { requireUser } = deps;

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
      res.status(400).json({ error: "??? Lite ? Pro ??" });
      return;
    }

    if (requestedPlan === currentPlan) {
      res.status(400).json({ error: "???????????????" });
      return;
    }

    if (!canUpgradePlan(currentPlan, requestedPlan)) {
      res.status(400).json({ error: "????????????????????????" });
      return;
    }

    if (contact.length > 120) {
      res.status(400).json({ error: "??????????? 120 ???" });
      return;
    }

    if (message.length > 500) {
      res.status(400).json({ error: "??????????? 500 ???" });
      return;
    }

    const requests = await readJson(planRequestsFile, []);
    const existingOpen = requests.find((item) => item.userId === req.user.id && item.status === "open");
    if (existingOpen) {
      res.status(409).json({ error: "??????????????????????" });
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
}
