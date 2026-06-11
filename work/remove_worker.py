import re

fp = r"C:\Users\wei.gu\Documents\demogo\server\src\server.js"
with open(fp, 'r', encoding='utf-8') as f:
    c = f.read()

# Pattern: the entire in-process worker block
old = '''globalThis.__demogoQueueAvailable = false;

// Verify Redis is available (required in production, optional in dev)
try {
  await deploymentQueue.getJobCounts();
  globalThis.__demogoQueueAvailable = true;
  console.log("Redis connected successfully");

  // Start in-process worker for async deployment processing
  const { Worker } = await import("bullmq");
  const { processDeploymentJob } = await import("./queue/deployment-processor.js");
  const inProcessWorker = new Worker("demogo-deployments", async (job) => {
    const { jobId } = job.data;
    await job.updateProgress(10);
    await processDeploymentJob(jobId);
    await job.updateProgress(100);
  }, { connection: { host: redisHost, port: redisPort }, concurrency: 1 });
  inProcessWorker.on("completed", (job) => console.log(\u0060Job  completed\u0060));
  inProcessWorker.on("failed", (job, err) => console.error(\u0060Job  failed: \u0060));
  console.log("In-process deployment worker started");

} catch (err) {
  globalThis.__demogoQueueAvailable = false;
  if (process.env.NODE_ENV === "production") {
    console.error("FATAL: Cannot connect to Redis. Install and start Redis first.");
    console.error("  Error:", err.message);
    process.exit(1);
  } else {
    console.warn("WARNING: Redis not available. Deployments will run synchronously.");
  }
}'''

new = '''globalThis.__demogoQueueAvailable = false;

// Verify Redis is available (required in production, optional in dev)
try {
  await deploymentQueue.getJobCounts();
  globalThis.__demogoQueueAvailable = true;
  console.log("Redis connected successfully");
} catch (err) {
  globalThis.__demogoQueueAvailable = false;
  if (process.env.NODE_ENV === "production") {
    console.error("FATAL: Cannot connect to Redis. Install and start Redis first.");
    console.error("  Error:", err.message);
    process.exit(1);
  } else {
    console.warn("WARNING: Redis not available. Deployments will run synchronously.");
  }
}'''

if old in c:
    c = c.replace(old, new)
    with open(fp, 'w', encoding='utf-8') as f:
        f.write(c)
    print("In-process worker removed from server.js")
else:
    print("Pattern not found - checking with regex...")
    # Try with different whitespace
    found = c.find('in-process worker')
    print(f"  'in-process worker' found at position: {found}")
