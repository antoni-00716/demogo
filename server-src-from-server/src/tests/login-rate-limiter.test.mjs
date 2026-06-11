// DemoGo v0.9.4 - Unit tests for lib/login-rate-limiter.js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeEmail, createLoginRateLimiter } from "../lib/login-rate-limiter.js";

describe("normalizeEmail", () => {
  it("lowercases email", () => assert.strictEqual(normalizeEmail("User@Example.COM"), "user@example.com"));
  it("trims whitespace", () => assert.strictEqual(normalizeEmail("  a@b.com  "), "a@b.com"));
  it("handles empty", () => assert.strictEqual(normalizeEmail(""), ""));
  it("handles null/undefined", () => assert.strictEqual(normalizeEmail(null), ""));
});

describe("login rate limiter", () => {
  const limiter = createLoginRateLimiter({ loginFailureLimit: 3, loginFailureWindowMs: 60000 });

  it("allows first login attempt", () => {
    const r = limiter.checkLoginFailureRate("a@b.com", "1.2.3.4");
    assert.strictEqual(r.allowed, true);
    assert.strictEqual(r.used, 0);
  });

  it("records failures", () => {
    limiter.recordLoginFailure("x@y.com", "5.6.7.8");
    limiter.recordLoginFailure("x@y.com", "5.6.7.8");
    const r = limiter.checkLoginFailureRate("x@y.com", "5.6.7.8");
    assert.strictEqual(r.allowed, true);
    assert.strictEqual(r.used, 2);
  });

  it("blocks after limit", () => {
    limiter.recordLoginFailure("x@y.com", "5.6.7.8");
    const r = limiter.checkLoginFailureRate("x@y.com", "5.6.7.8");
    assert.strictEqual(r.allowed, false);
    assert.strictEqual(r.used, 3);
  });

  it("clears failures", () => {
    limiter.clearLoginFailures("x@y.com", "5.6.7.8");
    const r = limiter.checkLoginFailureRate("x@y.com", "5.6.7.8");
    assert.strictEqual(r.allowed, true);
    assert.strictEqual(r.used, 0);
  });

  it("separates users by email", () => {
    limiter.recordLoginFailure("user1@test.com", "1.1.1.1");
    limiter.recordLoginFailure("user1@test.com", "1.1.1.1");
    limiter.recordLoginFailure("user1@test.com", "1.1.1.1");
    const blocked = limiter.checkLoginFailureRate("user1@test.com", "1.1.1.1");
    assert.strictEqual(blocked.allowed, false);
    const allowed = limiter.checkLoginFailureRate("user2@test.com", "2.2.2.2");
    assert.strictEqual(allowed.allowed, true);
  });
});
