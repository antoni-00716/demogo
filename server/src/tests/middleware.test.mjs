// DemoGo v0.9.4 - Unit tests for middleware
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { requestIdMiddleware } from "../middleware/request-id.js";
import { securityHeadersMiddleware } from "../middleware/security.js";

describe("requestIdMiddleware", () => {
  it("sets x-request-id header", () => {
    const headers = {};
    const req = { get: () => undefined };
    const res = { set: (k, v) => { headers[k] = v; } };
    requestIdMiddleware(req, res, () => {});
    assert.ok(headers["x-request-id"]);
    assert.ok(req.requestId);
  });

  it("uses existing x-request-id if provided", () => {
    const headers = {};
    const req = { get: () => "existing-id-123" };
    const res = { set: (k, v) => { headers[k] = v; } };
    requestIdMiddleware(req, res, () => {});
    assert.strictEqual(headers["x-request-id"], "existing-id-123");
    assert.strictEqual(req.requestId, "existing-id-123");
  });
});

describe("securityHeadersMiddleware", () => {
  it("sets security headers", () => {
    const headers = {};
    const res = { set: (k, v) => { headers[k] = v; } };
    securityHeadersMiddleware({}, res, () => {});
    assert.strictEqual(headers["x-content-type-options"], "nosniff");
    assert.strictEqual(headers["x-frame-options"], "DENY");
    assert.strictEqual(headers["referrer-policy"], "strict-origin-when-cross-origin");
  });
});
