// DemoGo v0.9.39 - Unit tests for failure-diagnosis-service utilities
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { inspectionTypeLabel, inspectionSummary, createUserFacingInspection } from "../services/failure-diagnosis-service.js";

describe("inspectionTypeLabel", () => {
  it("returns label for known types", () => {
    assert.ok(inspectionTypeLabel("static").length > 0);
    assert.ok(inspectionTypeLabel("frontend_build").length > 0);
    assert.ok(inspectionTypeLabel("runtime").length > 0);
  });

  it("returns fallback for unknown type", () => {
    assert.ok(inspectionTypeLabel("unknown_type").length > 0);
  });
});

describe("inspectionSummary", () => {
  it("returns summary text for valid inputs", () => {
    const result = inspectionSummary("passed", "static");
    assert.equal(typeof result, "string");
    assert.ok(result.length > 0);
  });
});

describe("createUserFacingInspection", () => {
  it("is a function", () => {
    assert.equal(typeof createUserFacingInspection, "function");
  });
});
