import path from "node:path";
import { existsSync } from "node:fs";
import { demoRoot, serviceVersion, publicBaseUrl } from "../config.js";
import { createHostingCapabilities } from "../services/hosting-architecture-service.js";
import { getClientIp } from "../lib/request-utils.js";
import { writeTrialEvent } from "../lib/trial-log.js";

let _normalizeTrialEventType;

export function registerMiscRoutes(app) {

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, version: serviceVersion });
});

app.get("/api/hosting/capabilities", (_req, res) => {
  res.json({ ...createHostingCapabilities(), version: serviceVersion });
});

app.post("/api/trial-events", async (req, res) => {
  try {
    const eventType = _normalizeTrialEventType?.(req.body?.eventType);
    if (!eventType) { res.status(400).json({ error: "Unknown event type" }); return; }
    await writeTrialEvent({
      eventType,
      userId: req.body?.userId || null,
      userEmail: req.body?.userEmail || null,
      source: String(req.body?.source || ""),
      path: String(req.body?.path || ""),
      ip: getClientIp(req),
      metadata: req.body?.metadata
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to record trial event" });
  }
});

app.get("/d/:slug", async (req, res) => {
  const previewPath = path.join(demoRoot, req.params.slug);
  if (existsSync(previewPath)) return res.redirect("/d/" + req.params.slug + "/");
  res.status(404).send("Demo not found");
});

app.get("/d/:slug/*", async (req, res, next) => {
  const demoDir = path.resolve(path.join(demoRoot, req.params.slug));
  const fullPath = path.resolve(path.join(demoDir, req.params[0] || "index.html"));
  if (!fullPath.startsWith(demoDir)) return res.status(403).send("Forbidden");
  res.sendFile(fullPath, (err) => {
    if (err) {
      const indexPath = path.join(demoDir, "index.html");
      if (existsSync(indexPath)) return res.sendFile(indexPath);
      next();
    }
  });
});

app.get("/api/demo-track/:slug", async (req, res) => {
  try {
    await writeTrialEvent({
      eventType: "demo_view",
      source: "browser",
      path: "/d/" + req.params.slug + "/",
      ip: getClientIp(req),
      metadata: { slug: req.params.slug, referrer: String(req.headers.referer || "") }
    });
  } catch (_) {}
  res.json({ ok: true });
});

}