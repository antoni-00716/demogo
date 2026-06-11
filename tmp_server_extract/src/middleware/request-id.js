import crypto from "node:crypto";

export function requestIdMiddleware(req, res, next) {
  const id = req.get("x-request-id") || crypto.randomUUID();
  req.requestId = id;
  res.set("x-request-id", id);
  next();
}
