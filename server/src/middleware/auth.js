// DemoGo v0.9.5 - Auth middleware (session + agent token + admin basic auth)
import crypto from "node:crypto";

export function createAuthMiddleware(deps) {
  const {
    getUserFromRequest,
    getUserFromAgentToken,
    adminUser,
    adminPassword,
    readJson,
    usersFile,
    readBearerToken
  } = deps;

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
      const value = readBearerToken
        ? readBearerToken(req)
        : String(req.body?.agentToken || req.body?.publishToken || "").trim();
      if (!value) {
        res.status(401).json({ error: "缺少 DemoGo AI 发布口令" });
        return;
      }
      const user = await getUserFromAgentToken(value);
      if (!user) {
        res.status(401).json({ error: "AI 发布口令无效或已被禁用" });
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
      res.status(403).json({ error: "管理 API 未开启" });
      return;
    }
    const authorization = String(req.get("authorization") || "");
    const [scheme, encoded] = authorization.split(" ");
    if (scheme !== "Basic" || !encoded) {
      res.set("WWW-Authenticate", "Basic realm=\"DemoGo Admin API\"");
      res.status(401).json({ error: "需要管理员认证" });
      return;
    }
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const sep = decoded.indexOf(":");
    if (decoded.slice(0, sep) !== adminUser || decoded.slice(sep + 1) !== adminPassword) {
      res.set("WWW-Authenticate", "Basic realm=\"DemoGo Admin API\"");
      res.status(401).json({ error: "管理员账号或密码不正确" });
      return;
    }
    next();
  }

  // Login rate limiting
  const loginFailureBuckets = new Map();
  const loginFailureWindowMs = 10 * 60 * 1000;
  const loginFailureLimit = 5;

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function loginFailureKey(email, ip) {
    return normalizeEmail(email) + "|" + String(ip || "").trim();
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

  return {
    requireUser,
    requireAgentToken,
    requireAdmin,
    normalizeEmail,
    checkLoginFailureRate,
    recordLoginFailure,
    clearLoginFailures
  };
}

// Helpers used by server.js (not duplicated elsewhere)
export function hashAgentTokenSecret(secret) {
  return crypto.createHash("sha256").update(String(secret)).digest("hex");
}

export function parseAgentToken(value) {
  const match = String(value || "").trim().match(/^dmg_([a-f0-9]{12})_([A-Za-z0-9_-]{20,})$/);
  if (!match) return null;
  return { id: match[1], secret: match[2] };
}

export function verifyAgentToken(user, token) {
  const record = user?.agentToken;
  if (!record?.secretHash || record.id !== token.id) return false;
  const expected = Buffer.from(record.secretHash, "hex");
  const actual = Buffer.from(hashAgentTokenSecret(token.secret), "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
