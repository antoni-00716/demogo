import process from "node:process";

export const serviceVersion = "0.2.5";

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
export const contentReviewMode = process.env.DEMOGO_CONTENT_REVIEW_MODE || "local";
export const contentReviewFailClosed = process.env.DEMOGO_CONTENT_REVIEW_FAIL_CLOSED !== "0";
export const contentReviewMaxTextBytes = Number(process.env.DEMOGO_CONTENT_REVIEW_MAX_TEXT_KB || 1024) * 1024;
export const contentReviewExternalEndpoint = process.env.DEMOGO_CONTENT_REVIEW_EXTERNAL_ENDPOINT || "";
export const contentReviewExternalToken = process.env.DEMOGO_CONTENT_REVIEW_EXTERNAL_TOKEN || "";

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


