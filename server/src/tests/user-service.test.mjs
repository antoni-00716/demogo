// DemoGo v0.9.39 - Unit tests for user-service
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { publicUser, filterAdminUsers, adminUserSummary } from "../services/user-service.js";

describe("publicUser", () => {
  it("returns sanitized user with default plan", () => {
    const result = publicUser({ id: "u1", email: "a@b.com" });
    assert.equal(result.id, "u1");
    assert.equal(result.email, "a@b.com");
    assert.equal(result.plan, "free");
    assert.ok(result.planName);
  });

  it("preserves plan and createdAt", () => {
    const result = publicUser({ id: "u1", email: "a@b.com", plan: "pro", createdAt: "2026-01-01" });
    assert.equal(result.plan, "pro");
    assert.equal(result.createdAt, "2026-01-01");
  });

  it("does not leak sensitive fields", () => {
    const result = publicUser({ id: "u1", email: "a@b.com", password: "secret", tokens: [] });
    assert.equal(result.password, undefined);
    assert.equal(result.tokens, undefined);
  });
});

describe("filterAdminUsers", () => {
  const users = [
    { id: "u1", email: "admin@test.com", plan: "pro" },
    { id: "u2", email: "user@test.com", plan: "free" },
    { id: "u3", email: "dev@other.com", plan: "lite" },
  ];

  it("returns all users when no filters", () => {
    assert.equal(filterAdminUsers(users).length, 3);
  });

  it("filters by plan", () => {
    const result = filterAdminUsers(users, { plan: "pro" });
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "u1");
  });

  it("filters by email search", () => {
    const result = filterAdminUsers(users, { search: "admin" });
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "u1");
  });

  it("filters by search and plan together", () => {
    const result = filterAdminUsers(users, { search: "test", plan: "free" });
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "u2");
  });

  it("returns empty for no match", () => {
    assert.deepEqual(filterAdminUsers(users, { search: "zzzzz" }), []);
  });
});

describe("adminUserSummary", () => {
  it("includes user info and demo counts", () => {
    const result = adminUserSummary(
      { id: "u1", email: "a@b.com", plan: "lite" },
      [
        { id: "d1", userId: "u1", status: "published" },
        { id: "d2", userId: "u1", status: "published" },
        { id: "d3", userId: "u2", status: "published" },
      ]
    );
    assert.equal(result.id, "u1");
    assert.equal(result.demoCount, 2);
    assert.equal(result.onlineDemoCount, 2);
  });
});
