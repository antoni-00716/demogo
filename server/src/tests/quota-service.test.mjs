// DemoGo v0.9.39 - Unit tests for quota-service
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateQuota, getDeployEvents, planName } from "../services/quota-service.js";

const mockUser = { id: "user-1", plan: "free" };
const mockProUser = { id: "user-2", plan: "pro" };
const isExpired = () => false;

describe("calculateQuota", () => {
  it("returns free plan limits for free user", () => {
    const quota = calculateQuota(mockUser, [], isExpired);
    assert.equal(quota.plan.code, "free");
    assert.ok(quota.onlineDemos.limit >= 1);
    assert.ok(quota.monthlyDeploys.limit >= 0);
  });

  it("counts only user's own demos", () => {
    const demos = [
      { id: "d1", userId: "user-1", status: "published" },
      { id: "d2", userId: "user-2", status: "published" },
    ];
    const quota = calculateQuota(mockUser, demos, isExpired);
    assert.equal(quota.onlineDemos.used, 1);
  });

  it("excludes expired demos", () => {
    const demos = [
      { id: "d1", userId: "user-1", status: "published" },
    ];
    const quota = calculateQuota(mockUser, demos, () => true);
    assert.equal(quota.onlineDemos.used, 0);
  });

  it("counts monthly deploy events", () => {
    const demos = [{
      id: "d1", userId: "user-1", status: "published",
      deployEvents: [{ type: "create", at: new Date().toISOString() }]
    }];
    const quota = calculateQuota(mockUser, demos, isExpired);
    assert.ok(quota.monthlyDeploys.used >= 1);
  });
});

describe("getDeployEvents", () => {
  it("returns empty array when demo has no events", () => {
    assert.deepEqual(getDeployEvents({}), []);
  });

  it("reads deployEvents field", () => {
    const events = getDeployEvents({ deployEvents: [{ type: "create", at: "2026-01-01" }] });
    assert.equal(events.length, 1);
  });

  it("reads deploymentEvents fallback field", () => {
    const events = getDeployEvents({ deploymentEvents: [{ type: "update", at: "2026-01-01" }] });
    assert.equal(events.length, 1);
  });

  it("filters events without timestamps", () => {
    const events = getDeployEvents({ deployEvents: [{ type: "create" }, { type: "update", at: "2026-01-01" }] });
    assert.equal(events.length, 1);
  });

  it("uses createdAt as fallback event", () => {
    const events = getDeployEvents({ createdAt: "2026-01-01" });
    assert.equal(events.length, 1);
    assert.equal(events[0].type, "create");
  });
});

describe("planName", () => {
  it("returns name for known plan", () => {
    assert.ok(planName("lite").length > 0);
  });

  it("returns free plan name for undefined", () => {
    assert.ok(planName(undefined).length > 0);
  });
});
