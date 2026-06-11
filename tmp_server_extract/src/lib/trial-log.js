// DemoGo - Trial event logger
import crypto from "node:crypto";
import { join as pathJoin } from "node:path";
import { dataDir } from "../config.js";
import { readJson, writeJson } from "./data-access.js";

const trialEventsFile = pathJoin(dataDir, "trial-events.json");

export async function writeTrialEvent(event) {
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

const SENSITIVE_FIELDS = new Set([
  "password", "passwd", "pwd", "token", "secret", "key", "apikey",
  "api_key", "privatekey", "private_key", "credit", "card", "ssn"
]);

export function normalizeTrialEventType(value) {
  const val = String(value || "").trim().toLowerCase().replace(/s+/g, "_").replace(/[^a-z0-9_]/g, "");
  if (!val || val.length > 80) return "";
  return val;
}

export function sanitizeTrialMetadata(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object") return typeof value === "string" ? String(value).slice(0, 200) : null;
  const cleaned = {};
  for (const [key, val] of Object.entries(value)) {
    const cleanKey = String(key).slice(0, 40).replace(/[^a-zA-Z0-9_]/g, "_");
    if (!cleanKey) continue;
    if (SENSITIVE_FIELDS.has(cleanKey.toLowerCase())) continue;
    if (typeof val === "string") cleaned[cleanKey] = val.slice(0, 500);
    else if (typeof val === "number" || typeof val === "boolean") cleaned[cleanKey] = val;
    else if (val === null) cleaned[cleanKey] = null;
  }
  return Object.keys(cleaned).length ? cleaned : null;
}
