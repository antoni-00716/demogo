import crypto from "node:crypto";

export function createAuthMiddleware(deps) {
  const { readJson, writeJson, sessionsFile, usersFile, adminUser, adminPassword } = deps;

  async function requireUser(req, res, next) {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        res.status(401).json({ error: "���ȵ�¼����������������" });
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
        res.status(401).json({ error: "ȱ�� DemoGo AI �������" });
        return;
      }
      const user = await getUserFromAgentToken(value);
      if (!user) {
        res.status(401).json({ error: "AI ����������Ч���ѱ����á�" });
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
      res.status(403).json({ error: "���� API δ����" });
      return;
    }
    const authorization = String(req.get("authorization") || "");
    const [scheme, encoded] = authorization.split(" ");
    if (scheme !== "Basic" || !encoded) {
      res.set("WWW-Authenticate", 'Basic realm="DemoGo Admin API"');
      res.status(401).json({ error: "��Ҫ����Ա��֤" });
      return;
    }
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const sep = decoded.indexOf(":");
    if (decoded.slice(0, sep) !== adminUser || decoded.slice(sep + 1) !== adminPassword) {
      res.set("WWW-Authenticate", 'Basic realm="DemoGo Admin API"');
      res.status(401).json({ error: "����Ա�˺Ż����벻��ȷ" });
      return;
    }
    next();
  }

  function readBearerToken(req) {
    const auth = String(req.get("authorization") || "");
    const [scheme, token] = auth.split(" ");
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
    const session = sessions.find((s) => s.token === token && new Date(s.expiresAt) > new Date());
    if (!session) return null;
    return users.find((u) => u.id === session.userId) || null;
  }

  async function getUserFromAgentToken(value) {
    const token = parseAgentToken(value);
    if (!token) return null;
    const users = await readJson(usersFile, []);
    return users.find((u) => verifyAgentToken(u, token)) || null;
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
    const record = user?.agentToken;
    if (!record?.id) return null;
    return {
      enabled: Boolean(record.id),
      prefix: `dmg_${record.id}`,
      createdAt: record.createdAt || null,
      lastResetAt: record.lastResetAt || null
    };
  }

  function setSessionCookie(res, token) {
    res.cookie("demogo_session", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/"
    });
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  const loginFailureBuckets = new Map();
  const loginFailureWindowMs = 10 * 60 * 1000;
  const loginFailureLimit = 5;

  function loginFailureKey(email, ip) {
    return `${normalizeEmail(email)}|${String(ip || "").trim()}`;
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
    requireUser, requireAgentToken, requireAdmin,
    readBearerToken, createSession, createAgentTokenRecord,
    publicAgentToken, setSessionCookie, normalizeEmail,
    checkLoginFailureRate, recordLoginFailure, clearLoginFailures,
    hashAgentTokenSecret, parseAgentToken, verifyAgentToken,
    getUserFromRequest, getUserFromAgentToken
  };
}