import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

describe("login-rate-limiter persistence", () => {
  it("persists and restores rate limit state across restarts", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "login-rate-test-"));
    try {
      const persistPath = path.join(dir, "rate-limiter.json");
      const { createLoginRateLimiter } = await import("../lib/login-rate-limiter.js");

      // Create a limiter and record some failures
      const limiter1 = createLoginRateLimiter({
        loginFailureLimit: 3,
        loginFailureWindowMs: 60000,
        persistPath
      });

      limiter1.recordLoginFailure("test@example.com", "1.2.3.4");
      limiter1.recordLoginFailure("test@example.com", "1.2.3.4");
      limiter1.recordLoginFailure("test@example.com", "1.2.3.4"); // 3 = limit, now blocked

      // Persist immediately
      await limiter1.persist();

      // Verify persisted file exists
      const content = await fs.readFile(persistPath, "utf8");
      assert.ok(JSON.parse(content), "persisted file should be valid JSON");

      // Create a new limiter (simulates restart)
      const limiter2 = createLoginRateLimiter({
        loginFailureLimit: 3,
        loginFailureWindowMs: 60000,
        persistPath
      });

      // Wait for restore to complete
      await limiter2.ready();

      const result = limiter2.checkLoginFailureRate("test@example.com", "1.2.3.4");
      assert.equal(result.allowed, false, "should still be rate limited after restore");
      assert.equal(result.used, 3, "should have correct count after restore");

    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("does not restore expired entries", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "login-rate-test-2-"));
    try {
      const persistPath = path.join(dir, "rate-limiter.json");

      // Manually write expired data
      await fs.writeFile(persistPath, JSON.stringify({
        "test@example.com|1.2.3.4": { count: 5, resetAt: Date.now() - 1000 }
      }));

      const { createLoginRateLimiter } = await import("../lib/login-rate-limiter.js");

      const limiter = createLoginRateLimiter({
        loginFailureLimit: 3,
        loginFailureWindowMs: 60000,
        persistPath
      });

      await limiter.ready();

      const result = limiter.checkLoginFailureRate("test@example.com", "1.2.3.4");
      assert.equal(result.allowed, true, "expired entries should be ignored after restore");
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
