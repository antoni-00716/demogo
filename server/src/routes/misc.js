import path from "node:path";
import { existsSync } from "node:fs";
import { join as pathJoin } from "node:path";
import { demoRoot, dataDir, serviceVersion, publicBaseUrl, runtimeEnabled, runtimeNodeEnabled, runtimeDockerImage, runtimeMemory, runtimeCpus, runtimeTtlMinutes, runtimeStartTimeoutSeconds, runtimeMaxInstances } from "../config.js";
import { readJson } from "../lib/data-access.js";
import { createHostingCapabilities } from "../services/hosting-architecture-service.js";
import { getClientIp } from "../lib/request-utils.js";
import { writeTrialEvent } from "../lib/trial-log.js";

let _normalizeTrialEventType;

export function registerMiscRoutes(app) {

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, version: serviceVersion });
});

app.get("/api/hosting/capabilities", (_req, res) => {
  res.json({ capabilities: createHostingCapabilities({
    version: serviceVersion,
    runtimeEnabled,
    runtimeNodeEnabled,
    demoDatabaseReady: false,
    runtimeDockerImage,
    runtimeMemory,
    runtimeCpus,
    runtimeTtlMinutes,
    runtimeStartTimeoutSeconds,
    runtimeMaxInstances
  }), version: serviceVersion });
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

app.get("/d/:slug", async (req, res, next) => {
  // Express matches /d/slug/ against this route without strict routing.
  // Only redirect bare paths (no trailing slash) to avoid infinite redirect loop.
  if (!req.url.endsWith("/")) {
    const previewPath = path.join(demoRoot, req.params.slug);
    if (existsSync(previewPath)) return res.redirect("/d/" + req.params.slug + "/");
  }

  // Check if slug is an alias for another demo
  try {
    const demosFile = pathJoin(dataDir, "demos.json");
    const demos = await readJson(demosFile, []);
    const targetDemo = demos.find((d) =>
      d.status === "published" &&
      Array.isArray(d.aliases) &&
      d.aliases.includes(req.params.slug)
    );
    if (targetDemo) return res.redirect(302, "/d/" + targetDemo.slug + "/");
  } catch (_) {}

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