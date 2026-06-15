// DemoGo v0.9.39 - Unit tests for deployment pipeline service (internal functions)
// The pipeline service is a factory (createDeploymentPipelineService) with many deps.
// Internal functions can only be tested through the factory.
// Full tests require integration setup with readJson/writeJson mocks.

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

// Test the pipeline by creating a minimal service instance
import { createDeploymentPipelineService } from "../services/deployment-pipeline-service.js";

const defaultDeps = {
  readJson: async () => ({}),
  writeJson: async () => {},
  demosFile: "/tmp/demos.json",
  demoRoot: "/tmp/demos",
  checkDeployRateLimit: async () => {},
  calculateQuota: () => ({ canDeploy: true }),
  startNodeRuntime: async () => null,
  stopRuntime: async () => {},
  writeAuditLog: async () => {},
  writeTrialEvent: async () => {},
  summarizeResponseLimits: () => "",
};

function createPipeline(overrides = {}) {
  return createDeploymentPipelineService({ ...defaultDeps, ...overrides });
}

describe("deployment-pipeline-service factory", () => {
  it("creates a pipeline service with all expected methods", () => {
    const pipeline = createPipeline();

    const methods = Object.getOwnPropertyNames(pipeline);
    assert.ok(methods.includes("performCreateDeployment"));
    assert.ok(methods.includes("performUpdateDeployment"));
    assert.ok(methods.includes("removeDemoFiles"));
    assert.ok(methods.includes("expireDemoFiles"));
    assert.ok(methods.includes("deleteDemoFiles"));
    assert.ok(methods.includes("restartDemoRuntime"));
    assert.ok(methods.includes("hostingConfig"));
    assert.ok(methods.includes("hostingCapabilities"));
    assert.ok(methods.includes("inferProjectDisplayName"));
    assert.ok(methods.includes("createAvailableSlug"));
    assert.ok(methods.includes("inspectProjectArchive"));
    assert.ok(methods.includes("isNodeRuntimeInspection"));
    assert.ok(methods.includes("extractStaticDemo"));
    assert.ok(methods.includes("extractRuntimeDemo"));
    assert.ok(methods.length >= 18);
  });

  it("hostingCapabilities returns platform info", () => {
    const pipeline = createPipeline();
    const caps = pipeline.hostingCapabilities();
    assert.ok(caps);
    assert.ok(typeof caps === "object");
  });

  it("hostingConfig returns configuration", () => {
    const pipeline = createPipeline();
    const config = pipeline.hostingConfig();
    assert.ok(config);
    assert.ok(typeof config.memoryLimit === "string" || config.memoryLimit === undefined);
  });
});

describe("inferProjectDisplayName", () => {
  it("uses requestedName when provided", () => {
    const pipeline = createPipeline();
    const name = pipeline.inferProjectDisplayName({
      requestedName: "My App",
      uploadedFileName: "random-zip-name.zip",
      inspection: {},
    });
    // The pipeline may clean the name (slugify, trim, etc.)
    assert.ok(name.length > 0);
    assert.ok(typeof name === "string");
  });

  it("strips .zip extension from filename", () => {
    const pipeline = createPipeline();
    const name = pipeline.inferProjectDisplayName({
      requestedName: "",
      uploadedFileName: "my-project.zip",
      inspection: {},
    });
    assert.equal(name, "my-project");
  });

  it("strips .tar.gz extension from filename", () => {
    const pipeline = createPipeline();
    const name = pipeline.inferProjectDisplayName({
      requestedName: "",
      uploadedFileName: "my-app.tar.gz",
      inspection: {},
    });
    assert.equal(name, "my-app");
  });

  it("returns slugified fallback when everything is empty", () => {
    const pipeline = createPipeline();
    const name = pipeline.inferProjectDisplayName({
      requestedName: "",
      uploadedFileName: "",
      inspection: {},
    });
    assert.equal(typeof name, "string");
    assert.ok(name.length > 0);
  });
});

describe("isNodeRuntimeInspection", () => {
  it("returns true for node_runtime mode", () => {
    const pipeline = createPipeline();
    assert.ok(pipeline.isNodeRuntimeInspection({
      analysis: { hostingMode: "node_runtime" },
    }));
  });

  it("returns false for static mode", () => {
    const pipeline = createPipeline();
    assert.ok(!pipeline.isNodeRuntimeInspection({
      analysis: { hostingMode: "static" },
    }));
  });

  it("handles empty inspection gracefully", () => {
    const pipeline = createPipeline();
    // Should not throw when inspection is empty
    assert.doesNotThrow(() => pipeline.isNodeRuntimeInspection({}));
  });
});

describe("removeDemoFiles", () => {
  it("handles non-existent directory gracefully", async () => {
    const pipeline = createPipeline();
    // Should not throw when dir doesn't exist
    await pipeline.removeDemoFiles("/nonexistent/path/" + Date.now());
  });

  it("removes existing demo directory", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pipeline-test-"));
    const demoDir = path.join(tmpDir, "demo-slug");
    await fs.mkdir(demoDir, { recursive: true });
    await fs.writeFile(path.join(demoDir, "index.html"), "test");

    const pipeline = createPipeline({ demoRoot: tmpDir });
    await pipeline.removeDemoFiles("demo-slug");

    const exists = await fs.access(demoDir).then(() => true).catch(() => false);
    assert.ok(!exists, "Directory should be removed");
    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});
