// DemoGo v0.9.30 - BullMQ job queue for async deployment processing
import { Queue } from "bullmq";
import { redisHost, redisPort, redisPassword, redisDb } from "../config.js";
import logger from "../lib/logger.js";

const connection = {
  host: redisHost,
  port: redisPort,
  db: redisDb,
};
if (redisPassword) connection.password = redisPassword;

const queueName = process.env.DEMOGO_QUEUE_NAME || "demogo-deployments";
export const deploymentQueue = new Queue(queueName, {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 50,
    removeOnFail: 100,
  },
});

export async function addDeploymentJob(data) {
  const job = await deploymentQueue.add("deploy", data, {
    jobId: data.jobId,
  });
  logger.info({ jobId: job.id, action: data.action }, "Job added to queue");
  return job;
}

export async function getJobStatus(jobId) {
  const job = await deploymentQueue.getJob(jobId);
  if (!job) return null;
  return {
    id: job.id,
    status: await job.getState(),
    progress: job.progress,
    data: job.data,
    logs: await job.getChildrenValues?.() || [],
    failedReason: job.failedReason,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  };
}

export async function closeQueue() {
  await deploymentQueue.close();
  logger.info("Queue connection closed");
}
