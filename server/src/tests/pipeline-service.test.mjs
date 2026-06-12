// DemoGo v0.9.39 - Unit tests for deployment pipeline service (internal functions)
// The pipeline service is a factory (createDeploymentPipelineService) with many deps.
// Internal functions can only be tested through the factory.
// Full tests require integration setup with readJson/writeJson mocks.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";

// Test the pipeline by creating a minimal service instance
import { createDeploymentPipelineService } from "../services/deployment-pipeline-service.js";

describe("deployment-pipeline-service factory", () => {
  it("creates a pipeline service with all expected methods", () => {
    const pipeline = createDeploymentPipelineService({
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
    });

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
    assert.ok(methods.length >= 18); // All expected methods present
  });

  it("inferProjectDisplayName returns uploadedFileName as fallback", async () => {
    const pipeline = createDeploymentPipelineService({
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
    });

    const name = pipeline.inferProjectDisplayName({
      requestedName: "",
      uploadedFileName: "my-project.zip",
      inspection: {},
    });
    assert.ok(name.length > 0);
    assert.equal(name, "my-project"); // should strip .zip
  });

  it("isNodeRuntimeInspection detects node runtime from hostingMode", async () => {
    const pipeline = createDeploymentPipelineService({
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
    });

    const result = pipeline.isNodeRuntimeInspection({
      analysis: { hostingMode: "node_runtime" },
    });
    assert.ok(result);
  });
});
