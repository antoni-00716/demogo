export function securityHeadersMiddleware(req, res, next) {
  res.set("x-content-type-options", "nosniff");
  res.set("x-frame-options", "DENY");
  res.set("x-dns-prefetch-control", "off");
  res.set("referrer-policy", "strict-origin-when-cross-origin");
  res.set("x-permitted-cross-domain-policies", "none");
  res.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  res.set("content-security-policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'");
  next();
}
