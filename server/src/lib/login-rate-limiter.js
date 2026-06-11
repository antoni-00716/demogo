import fs from "node:fs/promises";
import path from "node:path";

function loginFailureKey(email, ip) {
  return `${email || "unknown"}|${ip || "unknown"}`;
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function createLoginRateLimiter({ loginFailureLimit, loginFailureWindowMs, persistPath }) {
  const buckets = new Map();

  // Restore persisted state on startup (fire and forget)
  let restorePromise = (async () => {
    if (!persistPath) return;
    try {
      const raw = await fs.readFile(persistPath, "utf8");
      const data = JSON.parse(raw);
      const now = Date.now();
      for (const [key, entry] of Object.entries(data)) {
        if (entry.resetAt > now) buckets.set(key, entry);
      }
    } catch { /* no persisted state, start fresh */ }
  })();

  // Persist to disk
  async function persist() {
    if (!persistPath) return;
    try {
      const state = {};
      for (const [key, entry] of buckets.entries()) {
        state[key] = { count: entry.count, resetAt: entry.resetAt };
      }
      await fs.mkdir(path.dirname(persistPath), { recursive: true });
      await fs.writeFile(persistPath, JSON.stringify(state), "utf8");
    } catch { /* best effort */ }
  }

  // Auto-persist every 30 seconds (unref so it doesn't keep process alive)
  if (persistPath) {
    setInterval(() => persist().catch(() => {}), 30000).unref();
  }

  function checkLoginFailureRate(email, ip) {
    const key = loginFailureKey(email, ip);
    const now = Date.now();
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.delete(key);
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
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + loginFailureWindowMs });
      return;
    }
    buckets.set(key, { ...current, count: current.count + 1 });
  }

  function clearLoginFailures(email, ip) {
    buckets.delete(loginFailureKey(email, ip));
  }

  return { checkLoginFailureRate, recordLoginFailure, clearLoginFailures, persist, ready: () => restorePromise };
}
