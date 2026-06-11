// DemoGo v0.9.13 - Deployment job service CRUD unit tests
// Run: node --test server/src/tests/deployment-job-crud.test.mjs

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Lightweight readJson/writeJson for testing
const TEST_DIR = path.join(__dirname, "..", "data");
const jobsFile = path.join(TEST_DIR, "_test_crud_jobs.json");
const eventsFile = path.join(TEST_DIR, "_test_crud_events.json");
const usersFile = path.join(TEST_DIR, "_test_crud_users.json");

async function readJson(file, fallback) {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw);
  } catch { return fallback; }
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

// We import the factory and create a fresh instance per test
import { createDeploymentJobService } from "../services/deployment-job-service.js";

let svc;

before(async () => {
  await writeJson(jobsFile, []);
  await writeJson(eventsFile, []);
  await writeJson(usersFile, [{
    id: "u1",
    email: "test@demogo.dev",
    plan: "free",
    password: "hashed:salt",
    createdAt: new Date().toISOString()
  }]);

  svc = createDeploymentJobService({
    readJson, writeJson,
    deploymentJobsFile: jobsFile,
    deploymentEventsFile: eventsFile,
    usersFile,
    writeTrialEvent: null,
    attachErrorDiagnosis: null,
    publicContentReview: null
  });
});

after(async () => {
  try { await fs.unlink(jobsFile); } catch {}
  try { await fs.unlink(eventsFile); } catch {}
  try { await fs.unlink(usersFile); } catch {}
});

// ============ createDeploymentJob ============

describe("createDeploymentJob", () => {
  it("creates a queued job with all required fields", async () => {
    const job = await svc.createDeploymentJob({
      user: { id: "u1", email: "test@demogo.dev" },
      action: "create",
      requestedName: "my-project",
      file: { path: "/tmp/test.zip", originalname: "test.zip" },
      ip: "127.0.0.1"
    });

    assert.ok(job.id, "job.id must exist");
    assert.strictEqual(job.userId, "u1");
    assert.strictEqual(job.userEmail, "test@demogo.dev");
    assert.strictEqual(job.action, "create");
    assert.strictEqual(job.status, "queued");
    assert.strictEqual(job.statusLabel, "排队中");
    assert.strictEqual(job.requestedName, "my-project");
    assert.strictEqual(job.originalName, "test.zip");
    assert.strictEqual(job.actor, "user");
    assert.strictEqual(job.deploySource, "web");
    assert.strictEqual(job.diagnosis, null);
    assert.strictEqual(job.startedAt, null);
    assert.strictEqual(job.finishedAt, null);
    assert.ok(job.createdAt, "createdAt must exist");
    assert.ok(job.updatedAt, "updatedAt must exist");
  });

  it("creates deployment steps with deploymentId", async () => {
    const job = await svc.createDeploymentJob({
      user: { id: "u1", email: "test@demogo.dev" },
      action: "create",
      file: { path: "/tmp/test.zip", originalname: "test.zip" }
    });

    assert.ok(Array.isArray(job.steps), "steps must be array");
    assert.ok(job.steps.length >= 8, "should have at least 8 steps");
    // All steps should have deploymentId set to job.id
    for (const step of job.steps) {
      assert.strictEqual(step.deploymentId, job.id, `step ${step.eventType} should have deploymentId`);
    }
  });

  it("persists job to JSON store", async () => {
    const job = await svc.createDeploymentJob({
      user: { id: "u1", email: "test@demogo.dev" },
      action: "create",
      file: { path: "/tmp/a.zip", originalname: "a.zip" }
    });

    const jobs = await readJson(jobsFile, []);
    const found = jobs.find(j => j.id === job.id);
    assert.ok(found, "job should be persisted");
    assert.strictEqual(found.status, "queued");
  });

  it("supports update action", async () => {
    const job = await svc.createDeploymentJob({
      user: { id: "u1", email: "test@demogo.dev" },
      action: "update",
      demoId: "existing-demo-id",
      file: { path: "/tmp/update.zip", originalname: "update.zip" }
    });

    assert.strictEqual(job.action, "update");
    assert.strictEqual(job.demoId, "existing-demo-id");
  });
});

// ============ findDeploymentJob ============

describe("findDeploymentJob", () => {
  it("finds an existing job", async () => {
    const job = await svc.createDeploymentJob({
      user: { id: "u1", email: "test@demogo.dev" },
      action: "create",
      file: { path: "/tmp/find.zip", originalname: "find.zip" }
    });

    const found = await svc.findDeploymentJob(job.id);
    assert.ok(found, "should find job");
    assert.strictEqual(found.id, job.id);
    assert.strictEqual(found.originalName, "find.zip");
  });

  it("returns null for non-existent job", async () => {
    const found = await svc.findDeploymentJob("nonexistent-id");
    assert.strictEqual(found, null);
  });
});

// ============ updateDeploymentJob ============

describe("updateDeploymentJob", () => {
  it("updates job fields", async () => {
    const job = await svc.createDeploymentJob({
      user: { id: "u1", email: "test@demogo.dev" },
      action: "create",
      file: { path: "/tmp/upd.zip", originalname: "upd.zip" }
    });

    const updated = await svc.updateDeploymentJob(job.id, {
      status: "running",
      statusLabel: "????",
      startedAt: new Date().toISOString()
    });

    assert.ok(updated, "should return updated job");
    assert.strictEqual(updated.status, "running");
    assert.strictEqual(updated.statusLabel, "????");
    assert.ok(updated.startedAt, "startedAt should be set");
    assert.ok(new Date(updated.updatedAt) >= new Date(job.updatedAt), "updatedAt should be newer");
  });

  it("returns null for non-existent job", async () => {
    const result = await svc.updateDeploymentJob("nonexistent", { status: "running" });
    assert.strictEqual(result, null);
  });
});

// ============ runDeploymentJob ============

describe("runDeploymentJob", () => {
  it("skips non-queued job", async () => {
    const job = await svc.createDeploymentJob({
      user: { id: "u1", email: "test@demogo.dev" },
      action: "create",
      file: { path: "/tmp/skip.zip", originalname: "skip.zip" }
    });

    // Mark as running first
    await svc.updateDeploymentJob(job.id, { status: "running", statusLabel: "????" });

    const result = await svc.runDeploymentJob(job.id);
    assert.strictEqual(result, undefined, "should skip non-queued job");
  });

  it("requires user to exist", async () => {
    // Create job with non-existent user
    const badJob = {
      id: crypto.randomUUID(),
      userId: "nonexistent-user",
      userEmail: "ghost@demogo.dev",
      action: "create",
      demoId: null,
      requestedName: "",
      filePath: "/tmp/ghost.zip",
      originalName: "ghost.zip",
      actor: "user",
      deploySource: "web",
      ip: "127.0.0.1",
      status: "queued",
      statusLabel: "????",
      message: "",
      steps: [],
      result: null,
      error: null,
      inspection: null,
      contentReview: null,
      diagnosis: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null
    };
    await svc.saveDeploymentJob(badJob);

    const result = await svc.runDeploymentJob(badJob.id);
    assert.strictEqual(result, null, "should return null on user not found");

    // Job should be marked failed
    const failed = await svc.findDeploymentJob(badJob.id);
    assert.strictEqual(failed.status, "failed");
    assert.ok(failed.error, "should have error details");
  });
});

// ============ publicDeploymentJob ============

describe("publicDeploymentJob", () => {
  it("returns null for null input", () => {
    assert.strictEqual(svc.publicDeploymentJob(null), null);
  });

  it("returns sanitized job", async () => {
    const job = await svc.createDeploymentJob({
      user: { id: "u1", email: "test@demogo.dev" },
      action: "create",
      file: { path: "/tmp/pub.zip", originalname: "pub.zip" }
    });

    const pub = svc.publicDeploymentJob(job);
    assert.ok(pub, "should return job");
    assert.strictEqual(pub.id, job.id);
    assert.strictEqual(pub.status, "queued");
    assert.ok(Array.isArray(pub.steps), "steps should be array");
  });
});

// ============ Deployment Steps ============

describe("deployment steps", () => {
  it("createDeploymentSteps creates 10 steps", () => {
    const steps = svc.createDeploymentSteps({ demoId: "d1", userId: "u1", action: "create" });
    assert.strictEqual(steps.length, 10);
  });

  it("markDeploymentStep updates step status", () => {
    const steps = svc.createDeploymentSteps({ demoId: "d1" });
    svc.markDeploymentStep(steps, "build", "success", "????");
    const buildStep = steps.find(s => s.eventType === "build");
    assert.strictEqual(buildStep.status, "success");
    assert.strictEqual(buildStep.message, "????");
  });

  it("completeDeploymentSteps fills context and marks pending as skipped", () => {
    const steps = svc.createDeploymentSteps({ action: "create" });
    const completed = svc.completeDeploymentSteps(steps, { demoId: "d1", userId: "u1" });
    assert.strictEqual(completed.length, 10);
    for (const step of completed) {
      assert.strictEqual(step.demoId, "d1");
      assert.strictEqual(step.userId, "u1");
      // Only "receive" was marked success, rest pending ? skipped
      if (step.eventType !== "receive") {
        assert.strictEqual(step.status, "skipped");
      }
    }
  });

  it("failedDeploymentSteps adds failed event", () => {
    const steps = svc.createDeploymentSteps({ demoId: "d1" });
    const failed = svc.failedDeploymentSteps(new Error("????"), steps, { demoId: "d1" });
    assert.ok(failed.length > 10, "should add failed event");
    assert.ok(failed.some(s => s.eventType === "failed" && s.status === "failed"));
  });
});

// ============ deploymentJobStatusLabel ============

describe("deploymentJobStatusLabel", () => {
  it("returns Chinese labels", () => {
    assert.strictEqual(svc.deploymentJobStatusLabel("queued"), "排队中");
    assert.strictEqual(svc.deploymentJobStatusLabel("running"), "执行中");
    assert.strictEqual(svc.deploymentJobStatusLabel("success"), "成功");
    assert.strictEqual(svc.deploymentJobStatusLabel("failed"), "失败");
    assert.strictEqual(svc.deploymentJobStatusLabel("unknown"), "未知");
  });
});
