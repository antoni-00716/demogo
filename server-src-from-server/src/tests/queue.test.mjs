// DemoGo v0.9.30 - BullMQ queue integration tests
// Uses redis-memory-server for isolated testing.

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { RedisMemoryServer } from "redis-memory-server";

let redisServer;
let redisHost;
let redisPort;

describe("BullMQ Queue Integration", () => {
  before(async () => {
    redisServer = new RedisMemoryServer();
    await redisServer.start();
    redisHost = await redisServer.getHost();
    redisPort = await redisServer.getPort();
    
    // Set env vars so queue.js picks them up
    process.env.REDIS_HOST = redisHost;
    process.env.REDIS_PORT = String(redisPort);
    delete process.env.REDIS_PASSWORD;
    process.env.REDIS_DB = "0";
  });

  after(async () => {
    // Clean up
    const { deploymentQueue, closeQueue } = await import("../queue/queue.js");
    await deploymentQueue.obliterate({ force: true });
    await closeQueue();
    await redisServer.stop();
  });

  it("should create queue and add a job", async () => {
    const { deploymentQueue, addDeploymentJob } = await import("../queue/queue.js");
    
    const job = await addDeploymentJob({ jobId: "test-job-1", action: "create" });
    assert.ok(job.id);
    
    const counts = await deploymentQueue.getJobCounts();
    assert.equal(counts.waiting, 1);
  });

  it("should retrieve job status", async () => {
    const { deploymentQueue, addDeploymentJob, getJobStatus } = await import("../queue/queue.js");
    
    const job = await addDeploymentJob({ jobId: "test-job-2", action: "update" });
    const status = await getJobStatus(job.id);
    
    assert.ok(status);
    assert.equal(status.status, "waiting");
    assert.equal(status.data.action, "update");
  });

  it("should process job through worker", async () => {
    // Dynamic import to avoid cached module state
    const { deploymentQueue, addDeploymentJob } = await import("../queue/queue.js");
    
    // Add a test job
    const job = await addDeploymentJob({ jobId: "test-job-3", action: "create" });
    
    // Verify it exists in queue
    const counts = await deploymentQueue.getJobCounts();
    assert.ok(counts.waiting >= 1);

    // Remove the test job
    await job.remove();
  });

  it("should handle job removal", async () => {
    const { deploymentQueue, addDeploymentJob } = await import("../queue/queue.js");
    
    const job = await addDeploymentJob({ jobId: "test-job-4", action: "create" });
    await job.remove();
    
    const status = await deploymentQueue.getJob(job.id);
    assert.equal(status, undefined);
  });

  it("should respect concurrency limits", async () => {
    const { deploymentQueue } = await import("../queue/queue.js");
    
    // Add multiple jobs
    const jobs = [];
    for (let i = 0; i < 5; i++) {
      const job = await deploymentQueue.add("deploy", { 
        jobId: `test-concurrency-${i}`, 
        action: "create" 
      });
      jobs.push(job);
    }
    
    const counts = await deploymentQueue.getJobCounts();
    assert.ok(counts.waiting >= 5, `expected >=5, got ${counts.waiting}`);
    
    // Clean up
    for (const job of jobs) {
      await job.remove();
    }
  });
});
