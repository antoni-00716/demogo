// DemoGo v0.9.4 - Simple in-memory rate limiter middleware

export function createRateLimiter({ windowMs = 60000, maxRequests = 60 } = {}) {
  const buckets = new Map();

  function middleware(req, res, next) {
    if (process.env.DEMOGO_RATE_LIMIT_DISABLED === "1") return next();
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (bucket.count >= maxRequests) {
      res.status(429).json({
        error: "请求过于频繁，请稍后再试",
        retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000)
      });
      return;
    }

    bucket.count += 1;
    next();
  }

  // Periodically clean up expired buckets
  setInterval(() => {
    const cutoff = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= cutoff) buckets.delete(key);
    }
  }, 60000).unref();

  return { middleware };
}

export function createStrictRateLimiter({ windowMs = 60000, maxRequests = 10 } = {}) {
  const limiter = createRateLimiter({ windowMs, maxRequests });
  return limiter;
}
