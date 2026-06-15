// DemoGo v0.9.39 - Unit tests for demo-expiration-service
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getDemoExpiryStatus, checkAndRemindExpiringDemos } from "../services/demo-expiration-service.js";

describe("getDemoExpiryStatus", () => {
  it("returns not expiring when no expiresAt", () => {
    const result = getDemoExpiryStatus({});
    assert.equal(result.isExpiring, false);
    assert.equal(result.hoursLeft, 0);
    assert.equal(result.label, "");
  });

  it("returns expired when past expiry", () => {
    const result = getDemoExpiryStatus({ expiresAt: "2020-01-01T00:00:00Z" });
    assert.equal(result.isExpiring, true);
    assert.equal(result.hoursLeft, 0);
    assert.equal(result.label, "已过期");
  });

  it("returns expiring soon within 24 hours", () => {
    const future = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(); // 6h from now
    const result = getDemoExpiryStatus({ expiresAt: future });
    assert.equal(result.isExpiring, true);
    assert.ok(result.hoursLeft > 0);
    assert.ok(result.label.includes("小时后到期"));
  });
});

describe("checkAndRemindExpiringDemos", () => {
  it("skips when email not configured", async () => {
    const result = await checkAndRemindExpiringDemos({
      readJson: async () => [],
      writeJson: async () => {},
      demosFile: "/tmp/d.json",
      usersFile: "/tmp/u.json",
      isEmailConfigured: () => false,
      sendExpirationEmail: async () => {},
      isExpired: () => false,
    });
    assert.equal(result.skipped, true);
    assert.equal(result.reminded, 0);
  });

  it("handles read errors gracefully", async () => {
    const result = await checkAndRemindExpiringDemos({
      readJson: async () => { throw new Error("file not found"); },
      writeJson: async () => {},
      demosFile: "/tmp/d.json",
      usersFile: "/tmp/u.json",
      isEmailConfigured: () => true,
      sendExpirationEmail: async () => {},
      isExpired: () => false,
    });
    assert.equal(result.errors, 1);
  });
});
