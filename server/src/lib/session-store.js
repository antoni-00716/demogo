import crypto from "node:crypto";

export function createSessionStore({ readJson, writeJson, sessionsFile }) {
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

  return { createSession };
}

export function setSessionCookie(res, token, req) {
  const baseUrl = String(process.env.PUBLIC_BASE_URL || "");
  const secure = req?.secure || req?.headers?.["x-forwarded-proto"] === "https" ;
  res.cookie("demogo_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/"
  });
}

export function createAgentTokenRecord() {
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

export function publicAgentToken(user) {
  const token = user?.agentToken;
  return {
    enabled: Boolean(token?.secretHash),
    prefix: token?.prefix || "",
    createdAt: token?.createdAt || null
  };
}

function hashAgentTokenSecret(secret) {
  return crypto.createHash("sha256").update(String(secret)).digest("hex");
}

export function verifyAgentToken(user, token) {
  const record = user?.agentToken;
  if (!record?.secretHash || record.id !== token.id) return false;
  const expected = Buffer.from(record.secretHash, "hex");
  const actual = Buffer.from(hashAgentTokenSecret(token.secret), "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export function parseAgentToken(value) {
  const match = String(value || "").trim().match(/^dmg_([a-f0-9]{12})_([A-Za-z0-9_-]{20,})$/);
  if (!match) return null;
  return { id: match[1], secret: match[2] };
}
