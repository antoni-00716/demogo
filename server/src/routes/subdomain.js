import crypto from "node:crypto";
import { join as pathJoin } from "node:path";
import { dataDir } from "../config.js";
import { readJson, writeJson } from "../lib/data-access.js";
import { getClientIp } from "../lib/request-utils.js";
import { writeAuditLog } from "../lib/audit-log.js";
import { normalizeCustomSlug, isReservedSlug, platformHost } from "../lib/slug-utils.js";

const demosFile = pathJoin(dataDir, "demos.json");
const subdomainRequestsFile = pathJoin(dataDir, "subdomain-requests.json");

function filterSubdomainRequests(requests, demoId) {
  return requests.filter(r => !demoId || r.demoId === demoId);
}

export function registerSubdomainRoutes(app, deps = {}) {
  const { requireUser } = deps;

app.get("/api/subdomain-requests", requireUser, async (req, res, next) => {
  try {
    const all = await readJson(subdomainRequestsFile, []);
    const userDemos = await readJson(demosFile, []);
    const userDemoIds = new Set(userDemos.filter(d => d.userId === req.user.id).map(d => d.id));
    const mine = all.filter(r => userDemoIds.has(r.demoId));
    res.json({ requests: mine.slice(0, 50) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/demos/:id/subdomain-requests", requireUser, async (req, res, next) => {
  try {
    const subdomain = normalizeCustomSlug(req.body?.subdomain);
    if (!subdomain) {
      res.status(400).json({ error: "??? 3-40 ?????????????" });
      return;
    }
    if (isReservedSlug(subdomain)) {
      res.status(400).json({ error: "???????????????" });
      return;
    }

    const demos = await readJson(demosFile, []);
    const demo = demos.find(d => d.id === req.params.id && d.userId === req.user.id);
    if (!demo) {
      res.status(404).json({ error: "????????" });
      return;
    }
    if (demo.plan !== "pro") {
      res.status(403).json({ error: "Pro ???????????" });
      return;
    }

    const host = platformHost();
    const fullDomain = subdomain + "." + host;

    const requests = await readJson(subdomainRequestsFile, []);
    const existing = requests.find(r => r.subdomain === subdomain && r.status === "approved");
    if (existing && existing.demoId !== demo.id) {
      res.status(409).json({ error: "?????????????" });
      return;
    }
    const duplicate = requests.find(r => r.subdomain === subdomain && r.demoId === demo.id && r.status === "open");
    if (duplicate) {
      res.status(409).json({ error: "??????????????" });
      return;
    }

    const now = new Date().toISOString();
    const item = {
      id: crypto.randomUUID(),
      userId: req.user.id,
      userEmail: req.user.email,
      demoId: demo.id,
      demoSlug: demo.slug,
      subdomain,
      fullDomain,
      status: "open",
      ip: getClientIp(req),
      createdAt: now,
      updatedAt: now
    };

    requests.unshift(item);
    await writeJson(subdomainRequestsFile, requests.slice(0, 1000));
    await writeAuditLog({
      action: "request_subdomain",
      actorType: "user",
      actorId: req.user.id,
      targetType: "subdomain_request",
      targetId: item.id,
      ip: item.ip,
      metadata: { subdomain, fullDomain, demoId: demo.id, demoSlug: demo.slug }
    });

    res.json({ request: item });
  } catch (error) {
    next(error);
  }
});
}
