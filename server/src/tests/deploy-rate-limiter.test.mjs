// DemoGo v0.9.39 - Unit tests for deploy rate limiter
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createDeployRateLimiter } from "../lib/deploy-rate-limiter.js";

describe("createDeployRateLimiter", () => {
  it("creates checkDeployRateLimit function", () => {
    const limiter = createDeployRateLimiter({
      readJson: async () => [],
      auditLogsFile: "/tmp/test-audit.json",
      deployRateLimit: 10,
      deployRateWindowMs: 60000,
    });
    assert.equal(typeof limiter.checkDeployRateLimit, "function");
  });

  it("allows first deployment", async () => {
    const limiter = createDeployRateLimiter({
      readJson: async () => [],
      auditLogsFile: "/tmp/test-audit.json",
      deployRateLimit: 10,
      deployRateWindowMs: 60000,
    });
    const result = await limiter.checkDeployRateLimit({ id: "user-1" }, "127.0.0.1");
    assert.equal(result.allowed, true);
    assert.equal(result.used, 0);
  });

  it("returns rate limit result structure", async () => {
    const limiter = createDeployRateLimiter({
      readJson: async () => [],
      auditLogsFile: "/tmp/test-audit.json",
      deployRateLimit: 5,
      deployRateWindowMs: 60000,
    });
    const result = await limiter.checkDeployRateLimit({ id: "user-2" }, "127.0.0.1");
    assert.ok(typeof result.allowed === "boolean");
    assert.ok(typeof result.used === "number");
    assert.ok(typeof result.limit === "number");
  });
});
