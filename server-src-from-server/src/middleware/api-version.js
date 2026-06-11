// DemoGo v0.9.5 - Transparent API versioning middleware
// Accepts both /api/xxx and /api/v1/xxx by stripping /v1 prefix

export function apiVersionMiddleware(req, res, next) {
  if (req.path.startsWith("/api/v1/")) {
    req.url = req.url.replace("/api/v1/", "/api/");
  }
  next();
}
