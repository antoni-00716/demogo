import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

function readVersion() {
  // Use import.meta.url to reliably locate VERSION relative to this config file
  // regardless of the current working directory.
  const candidates = [
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "VERSION"),
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "VERSION"),
  ];
  for (const filePath of candidates) {
    try {
      return fs.readFileSync(filePath, "utf8").trim();
    } catch {
      // Try the next candidate path.
    }
  }
  // Fallback: must not silently use a wrong version; use a sentinel that is obvious.
  console.error("FATAL: Cannot locate VERSION file from " + path.dirname(fileURLToPath(import.meta.url)));
  return "UNKNOWN";
}

export const serviceVersion = readVersion();

export const port = Number(process.env.PORT || 3001);
export const publicBaseUrl = process.env.PUBLIC_BASE_URL || "https://demogo.cn";
export const uploadDir = process.env.DEMOGO_UPLOAD_DIR || "/var/lib/demogo/uploads";
export const demoRoot = process.env.DEMOGO_DEMO_ROOT || "/var/www/demogo-preview/d";
export const dataDir = process.env.DEMOGO_DATA_DIR || "/var/lib/demogo/data";
export const adminUser = process.env.DEMOGO_ADMIN_USER || "";
export const adminPassword = process.env.DEMOGO_ADMIN_PASSWORD || "";
export const maxZipSizeMb = Number(process.env.DEMOGO_MAX_ZIP_MB || 50);
export const maxExtractedFiles = Number(process.env.DEMOGO_MAX_FILES || 800);
export const maxExtractedBytes = Number(process.env.DEMOGO_MAX_EXTRACTED_MB || 120) * 1024 * 1024;
export const usageFlushIntervalMs = Number(process.env.DEMOGO_USAGE_FLUSH_SECONDS || 30) * 1000;
export const deployRateWindowMs = Number(process.env.DEMOGO_DEPLOY_RATE_WINDOW_MINUTES || 10) * 60 * 1000;
export const deployRateLimit = Number(process.env.DEMOGO_DEPLOY_RATE_LIMIT || 5);
export const buildTimeoutMs = Number(process.env.DEMOGO_BUILD_TIMEOUT_SECONDS || 180) * 1000;
export const buildMode = process.env.DEMOGO_BUILD_MODE || "auto";
export const dockerImage = process.env.DEMOGO_BUILD_DOCKER_IMAGE || "node:20-alpine";
export const dockerMemory = process.env.DEMOGO_BUILD_DOCKER_MEMORY || "512m";
export const dockerCpus = process.env.DEMOGO_BUILD_DOCKER_CPUS || "1";
export const runtimeEnabled = process.env.DEMOGO_RUNTIME_ENABLED === "1";
export const runtimeNodeEnabled = process.env.DEMOGO_RUNTIME_NODE_ENABLED === "1";
export const runtimeDriver = process.env.DEMOGO_RUNTIME_DRIVER || "docker";
export const runtimeRootDir = process.env.DEMOGO_RUNTIME_ROOT_DIR || "";
export const runtimeDockerImage = process.env.DEMOGO_RUNTIME_DOCKER_IMAGE || "node:20-alpine";
export const runtimeMemory = process.env.DEMOGO_RUNTIME_MEMORY || "512m";
export const runtimeCpus = process.env.DEMOGO_RUNTIME_CPUS || "1";
export const runtimeTtlMinutes = Number(process.env.DEMOGO_RUNTIME_TTL_MINUTES || 120);
export const runtimeStartTimeoutSeconds = Number(process.env.DEMOGO_RUNTIME_START_TIMEOUT_SECONDS || 180);
export const runtimeMaxInstances = Number(process.env.DEMOGO_RUNTIME_MAX_INSTANCES || 2);
export const demoDbEnabled = process.env.DEMOGO_DEMO_DB_ENABLED === "1";
export const demoDbMock = process.env.DEMOGO_DEMO_DB_MOCK === "1";
export const demoDbAdminHost = process.env.DEMOGO_DB_ADMIN_HOST || process.env.DEMOGO_DB_HOST || "";
export const demoDbAdminPort = Number(process.env.DEMOGO_DB_ADMIN_PORT || process.env.DEMOGO_DB_PORT || 3306);
export const demoDbAdminUser = process.env.DEMOGO_DB_ADMIN_USER || "";
export const demoDbAdminPassword = process.env.DEMOGO_DB_ADMIN_PASSWORD || "";
export const demoDbHost = process.env.DEMOGO_DEMO_DB_HOST || "172.17.0.1";
export const demoDbPort = Number(process.env.DEMOGO_DEMO_DB_PORT || 3306);
export const contentReviewMode = process.env.DEMOGO_CONTENT_REVIEW_MODE || "local";
export const contentReviewFailClosed = process.env.DEMOGO_CONTENT_REVIEW_FAIL_CLOSED !== "0";
export const contentReviewMaxTextBytes = Number(process.env.DEMOGO_CONTENT_REVIEW_MAX_TEXT_KB || 1024) * 1024;
export const contentReviewExternalEndpoint = process.env.DEMOGO_CONTENT_REVIEW_EXTERNAL_ENDPOINT || "";
export const contentReviewExternalToken = process.env.DEMOGO_CONTENT_REVIEW_EXTERNAL_TOKEN || "";
export const smtpHost = process.env.SMTP_HOST || "";
export const smtpPort = Number(process.env.SMTP_PORT || 587);
export const smtpUser = process.env.SMTP_USER || "";
export const smtpPass = process.env.SMTP_PASS || "";
export const smtpFrom = process.env.SMTP_FROM || smtpUser;
export const smtpSecure = process.env.SMTP_SECURE === "1" || smtpPort === 465;
export const emailVerificationEnabled = process.env.DEMOGO_EMAIL_VERIFICATION_ENABLED !== "0";

export const plans = {
  free: {
    code: "free",
    name: "Free",
    maxOnlineDemos: 1,
    monthlyDeployLimit: 3,
    demoRetentionDays: 7,
    maxZipSizeMb,
    maxForms: 1,
    maxFormSubmissions: 100
  },
  lite: {
    code: "lite",
    name: "Lite",
    maxOnlineDemos: 3,
    monthlyDeployLimit: 20,
    demoRetentionDays: 30,
    maxZipSizeMb,
    maxForms: 3,
    maxFormSubmissions: 1000
  },
  pro: {
    code: "pro",
    name: "Pro",
    maxOnlineDemos: 10,
    monthlyDeployLimit: 60,
    demoRetentionDays: 30,
    maxZipSizeMb,
    maxForms: 10,
    maxFormSubmissions: 10000
  }
};

export function normalizePlanCode(value) {
  const plan = String(value || "").trim().toLowerCase();
  return plans[plan] ? plan : "";
}

// Redis config for BullMQ job queue
export const redisHost = process.env.REDIS_HOST || "127.0.0.1";
export const redisPort = Number(process.env.REDIS_PORT || 6379);
export const redisPassword = process.env.REDIS_PASSWORD || undefined;
export const redisDb = Number(process.env.REDIS_DB || 0);

// MinIO / S3-compatible object storage
export const storageBackend = process.env.DEMOGO_STORAGE_BACKEND || "local";
export const s3Endpoint = process.env.S3_ENDPOINT || "http://127.0.0.1:9000";
export const s3AccessKey = process.env.S3_ACCESS_KEY || "";
export const s3SecretKey = process.env.S3_SECRET_KEY || "";
export const s3Bucket = process.env.S3_BUCKET || "demogo";
export const s3UseSsl = process.env.S3_USE_SSL === "1";
export const s3Region = process.env.S3_REGION || "us-east-1";
