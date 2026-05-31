export function securityHeadersMiddleware(req, res, next) {
  res.set("x-content-type-options", "nosniff");
  res.set("x-frame-options", "DENY");
  res.set("x-dns-prefetch-control", "off");
  res.set("referrer-policy", "strict-origin-when-cross-origin");
  res.set("x-permitted-cross-domain-policies", "none");
  res.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  next();
}
