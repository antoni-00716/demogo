import { parseAgentToken, verifyAgentToken } from "../lib/session-store.js";
import { createHttpError } from "./content-review-service.js";

export function createAuthHelpers(deps) {
  const { readJson, sessionsFile, usersFile, demosFile, slugify } = deps;

  function readBearerToken(req) {
    const authorization = String(req.get("authorization") || "");
    const [scheme, token] = authorization.split(" ");
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
    const session = sessions.find((item) => item.token === token && new Date(item.expiresAt) > new Date());
    if (!session) return null;
    return users.find((user) => user.id === session.userId) || null;
  }

  async function getUserFromAgentToken(value) {
    const token = parseAgentToken(value);
    if (!token) return null;
    const users = await readJson(usersFile, []);
    return users.find((user) => verifyAgentToken(user, token)) || null;
  }

  async function resolveAgentUpdateDemoId({ user, demoRef }) {
    const ref = String(demoRef || "").trim();
    if (!ref) {
      throw createHttpError("请提供要更新的 Demo ID、访问链接或原来的链接。", 400);
    }
  
    const demos = await readJson(demosFile, []);
    const direct = demos.find((demo) => demo.userId === user.id && demo.id === ref);
    if (direct) return direct.id;
  
    const slug = extractDemoSlug(ref);
    const demo = demos.find((item) => (
      item.userId === user.id &&
      (item.slug === slug || (Array.isArray(item.aliases) && item.aliases.includes(slug)))
    ));
    if (!demo) {
      throw createHttpError("未找到可更新的 Demo。请确认原来的链接在当前 AI 对话对应的用户账号下。", 404);
    }
    return demo.id;
  }

  function extractDemoSlug(value) {
    const ref = String(value || "").trim();
    if (!ref) return "";
    try {
      const url = new URL(ref);
      const parts = url.pathname.split("/").filter(Boolean);
      const demoIndex = parts.indexOf("d");
      return slugify(demoIndex >= 0 ? parts[demoIndex + 1] || "" : parts.at(-1) || "");
    } catch {
      const cleaned = ref.replace(/^\/?d\//i, "").split(/[/?#]/)[0];
      return slugify(cleaned);
    }
  }

  return {
    readBearerToken,
    getUserFromRequest,
    getUserFromAgentToken,
    resolveAgentUpdateDemoId,
    extractDemoSlug,
  };
}
