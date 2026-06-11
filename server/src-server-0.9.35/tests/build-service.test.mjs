// DemoGo v0.9.17 - Build service unit tests
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createBuildService } from "../services/build-service.js";
import { sanitizeBuildEnv } from "../lib/build-utils.js";

const svc = createBuildService({
  exists: async () => false,
  createProjectError: (inspection, msg) => { const e = new Error(msg); e.inspection = inspection; return e; },
  inspectionTypeLabel: () => "test",
  createUserFacingInspection: (x) => x,
  readJson: async () => [],
  writeJson: async () => {},
  formsFile: "",
  formSubmissionsFile: "",
  writeAuditLog: async () => {},
  publicForm: (x) => x,
  publicBaseUrl: "https://demogo.dev",
  calculateFormQuota: () => ({}),
  demosFile: "",
});

describe("build-service utilities", () => {

  it("formatBytes: B/KB/MB/GB", () => {
    assert.strictEqual(svc.formatBytes(0), "0B");
    assert.strictEqual(svc.formatBytes(500), "500B");
    assert.strictEqual(svc.formatBytes(1024), "1KB");
    assert.strictEqual(svc.formatBytes(1048576), "1.0MB");
    assert.strictEqual(svc.formatBytes(1073741824), "1.0GB");
  });

  it("stripBom removes BOM", () => {
    assert.strictEqual(svc.stripBom("﻿hello"), "hello");
    assert.strictEqual(svc.stripBom("hello"), "hello");
    assert.strictEqual(svc.stripBom(""), "");
  });

  it("explainBuildError: timeout", () => {
    const r = svc.explainBuildError(new Error("ETIMEDOUT"));
    assert.ok(r.length > 20);
  });

  it("explainBuildError: killed", () => {
    const e = new Error(); e.killed = true;
    assert.ok(svc.explainBuildError(e).length > 20);
  });

  it("explainBuildError: generic", () => {
    assert.ok(svc.explainBuildError(new Error("oops")).length > 10);
  });

  it("sanitizeBuildEnv filters empty values", () => {
    const r = sanitizeBuildEnv({ MY_VAR: "" });
    assert.strictEqual(Object.keys(r).length, 0);
  });

  it("sanitizeBuildEnv returns object", () => {
    assert.ok(typeof sanitizeBuildEnv({}) === "object");
  });

  it("commandAvailable: false for nonexistent", async () => {
    assert.strictEqual(await svc.commandAvailable("nonexistent_xyz_123"), false);
  });

});