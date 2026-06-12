import { readJson } from "./data-access.js";
import { parseAgentToken, verifyAgentToken } from "./session-store.js";

export function readBearerToken(req) {
  const authorization = String(req.get("authorization") || "");
  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() === "bearer" && token) return token.trim();
  return String(req.get("x-demogo-agent-token") || "").trim();
}

export async function getUserFromRequest(req, deps) {
  const { sessionsFile, usersFile } = deps;
  const token = req.cookies?.demogo_session;
  if (!token) return null;

  const [sessions, users] = await Promise.all([
    readJson(sessionsFile, []),
    readJson(usersFile, [])
  ]);
  const session = sessions.find((item) => item.token === token && new Date(item.expiresAt) > new Date());
  if (!session) return null;
  return users.find((user) => user.id === session.userId) || null;
}

export async function getUserFromAgentToken(value, deps) {
  const { usersFile } = deps;
  const token = parseAgentToken(value);
  if (!token) return null;
  const users = await readJson(usersFile, []);
  return users.find((user) => verifyAgentToken(user, token)) || null;
}
