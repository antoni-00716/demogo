// DemoGo - Request utility functions
import { join as pathJoin } from "node:path";
import { dataDir } from "../config.js";
import { readJson } from "./data-access.js";

const sessionsFile = pathJoin(dataDir, "sessions.json");
const usersFile = pathJoin(dataDir, "users.json");

export function getClientIp(req) {
  const xff = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  if (xff) return xff;
  const xrip = String(req.headers["x-real-ip"] || "").trim();
  if (xrip) return xrip;
  return req.socket?.remoteAddress || "";
}

export async function getUserFromRequest(req) {
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
