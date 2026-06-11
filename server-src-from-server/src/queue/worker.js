// DemoGo v0.9.30 - BullMQ Worker process for async deployment
// Run independently: node src/queue/worker.js
import { Worker } from "bullmq";
import { redisHost, redisPort, redisPassword, redisDb } from "../config.js";
import { processDeploymentJob } from "./deployment-processor.js";
import logger from "../lib/logger.js";

const connection = {
  host: redisHost,
  port: redisPort,
  db: redisDb,
};
if (redisPassword) connection.password = redisPassword;

const worker = new Worker(
  "demogo-deployments",
  async (job) => {
    const { jobId, action } = job.data;
    logger.info({ jobId: job.id, action, bullJobId: job.id }, "Worker picked up job");

    await job.updateProgress(10);
    await job.log(`Starting ${action} deployment`);

    try {
      const result = await processDeploymentJob(jobId);
      await job.updateProgress(100);
      await job.log("Deployment completed successfully");
      logger.info({ jobId }, "Deployment completed");
      return result;
    } catch (error) {
      await job.log(`Deployment failed: ${error.message}`);
      logger.error({ jobId, error: error.message }, "Deployment failed");
      throw error;
    }
  },
  {
    connection,
    concurrency: 1,
    limiter: {
      max: 5,
      duration: 60000,
    },
  }
);

worker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Job completed");
});

worker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, "Job failed");
});

worker.on("error", (err) => {
  logger.error({ error: err.message }, "Worker error");
});

logger.info({ redisHost, redisPort }, "Deployment worker started");
console.log("DemoGo deployment worker is running...");

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down worker");
  await worker.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down worker");
  await worker.close();
  process.exit(0);
});
