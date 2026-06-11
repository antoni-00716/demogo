function loginFailureKey(email, ip) {
  return `${email || "unknown"}|${ip || "unknown"}`;
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function createLoginRateLimiter({ loginFailureLimit, loginFailureWindowMs }) {
  const buckets = new Map();

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

  return { checkLoginFailureRate, recordLoginFailure, clearLoginFailures };
}
