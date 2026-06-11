// DemoGo v0.9.5 - CSRF protection (double submit cookie pattern)
import crypto from "node:crypto";

const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Public endpoints that don"t require CSRF
const CSRF_EXEMPT_PREFIXES = [
  "/api/auth/",
  "/api/health",
  "/api/hosting/",
  "/api/demo-track/",
  "/api/forms/submit/",
  "/api/feedback/submit/",
  
];

function isExempt(req) {
  if (SAFE_METHODS.has(req.method)) return true;
  const path = req.path || "";
  return CSRF_EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function csrfMiddleware(req, res, next) {
  if (process.env.DEMOGO_CSRF_DISABLED === '1') return next();
  // Ensure a CSRF token cookie exists
  if (!req.cookies?.[CSRF_COOKIE]) {
    const token = crypto.randomBytes(32).toString("hex");
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: "strict",
      secure: req.secure || req.headers["x-forwarded-proto"] === "https",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/"
    });
  }

  if (isExempt(req)) return next();

  const headerToken = String(req.get(CSRF_HEADER) || "").trim();
  const cookieToken = String(req.cookies?.[CSRF_COOKIE] || "").trim();

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    res.status(403).json({ error: "请求被拒绝，缺少或无效的 CSRF 令牌" });
    return;
  }

  next();
}
