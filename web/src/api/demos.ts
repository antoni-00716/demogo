import { api } from "./client";
import type { Demo, DeployEvent, DeploymentStep, FailureDiagnosis, ProjectAssessment, Quota, SubdomainRequest } from "../types";

export type Inspection = {
  canPublish?: boolean;
  status?: string;
  label?: string;
  summary?: string;
  userLabel?: string;
  userSummary?: string;
  userStatus?: "supported" | "unsupported";
  userStatusLabel?: string;
  detectedType?: string;
  entryFile?: string;
  fileCount?: number;
  totalBytes?: number;
  publishableBytes?: number;
  formFields?: Array<{ name?: string; label?: string; type?: string }>;
  apiCalls?: Array<{ url?: string; method?: string; isLocal?: boolean }>;
  projectArchitecture?: Demo["architecture"];
  hosting?: Demo["hosting"];
  hostingMode?: string;
  hostingModeLabel?: string;
  runtime?: Demo["runtime"];
  externalBackend?: Demo["externalBackend"];
  applicationReadiness?: Demo["applicationReadiness"];
  projectProfile?: Demo["projectProfile"];
  projectAssessment?: ProjectAssessment;
  projectCategory?: string;
  issues?: string[];
  suggestions?: string[];
  recommendations?: string[];
  supportNotes?: string[];
  unsupportedNotes?: string[];
  fixPrompt?: string;
  ruleReport?: {
    summary?: string;
    risks?: string[];
    recommendations?: string[];
    fixPrompt?: string;
    aiPrompt?: string;
  };
  contentReview?: Demo["contentReview"];
  failureDiagnosis?: FailureDiagnosis | null;
};

export type DemoDetail = {
  demo: Demo;
  events: DeploymentStep[];
  inspection: Inspection | null;
};

export type DeployResponse = Demo & {
  inspection?: Inspection;
  deploymentEvents?: DeploymentStep[];
  buildLog?: string;
  quota?: Quota;
  diagnosis?: FailureDiagnosis | null;
};

export type DeploymentJob = {
  id: string;
  action: "create" | "update" | string;
  demoId?: string | null;
  status: "queued" | "running" | "success" | "failed" | string;
  statusLabel?: string;
  message?: string;
  originalName?: string;
  result?: DeployResponse | null;
  inspection?: Inspection | null;
  deploymentEvents?: DeploymentStep[];
  steps?: DeploymentStep[];
  error?: { message?: string; statusCode?: number; diagnosis?: FailureDiagnosis | null } | null;
  diagnosis?: FailureDiagnosis | null;
  contentReview?: Demo["contentReview"] | null;
  createdAt?: string;
  updatedAt?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
};

export function getDemos() {
  return api<{ demos: Demo[]; quota: Quota }>("/api/demos");
}

export function getDeployEvents() {
  return api<{
    events: DeployEvent[];
    month: {
      startsAt: string;
      used: number;
      limit: number;
      plan: string;
      planName: string;
    };
  }>("/api/deploy-events?limit=50");
}

export function getDemoDetail(id: string) {
  return api<DemoDetail>(`/api/demos/${id}`);
}

export function getDemoEvents(id: string) {
  return api<{ events: DeploymentStep[] }>(`/api/demos/${id}/events`);
}

export function updateDemoSlug(id: string, slug: string) {
  return api<{ demo: Demo; quota: Quota }>(`/api/demos/${id}/slug`, {
    method: "POST",
    body: JSON.stringify({ slug })
  });
}

export function createSubdomainRequest(id: string, subdomain: string, message = "") {
  return api<{ request: unknown }>(`/api/demos/${id}/subdomain-requests`, {
    method: "POST",
    body: JSON.stringify({ subdomain, message })
  });
}

export function getSubdomainRequests() {
  return api<{ requests: SubdomainRequest[] }>("/api/subdomain-requests");
}

export function getDemoInspection(id: string) {
  return api<{ inspection: Inspection | null }>(`/api/demos/${id}/inspection`);
}

export function inspectProject(file: File) {
  const form = new FormData();
  form.append("project", file);
  return api<{ inspection: Inspection }>("/api/inspect", {
    method: "POST",
    body: form
  });
}

export function deployProject(file: File, fields: { name?: string }) {
  const form = new FormData();
  form.append("project", file);
  if (fields.name) form.append("name", fields.name);
  return api<DeployResponse>("/api/deploy", {
    method: "POST",
    body: form
  });
}

export function createDeploymentJob(file: File, fields: { name?: string }) {
  const form = new FormData();
  form.append("project", file);
  if (fields.name) form.append("name", fields.name);
  return api<{ job: DeploymentJob }>("/api/deployment-jobs", {
    method: "POST",
    body: form
  });
}

export function updateDemo(id: string, file: File) {
  const form = new FormData();
  form.append("project", file);
  return api<DeployResponse>(`/api/demos/${id}/update`, {
    method: "POST",
    body: form
  });
}

export function createUpdateDeploymentJob(id: string, file: File) {
  const form = new FormData();
  form.append("project", file);
  return api<{ job: DeploymentJob }>(`/api/demos/${id}/deployment-jobs`, {
    method: "POST",
    body: form
  });
}

export function getDeploymentJob(id: string) {
  return api<{ job: DeploymentJob }>(`/api/deployment-jobs/${id}`);
}

export function offlineDemo(id: string) {
  return api<{ demo: Demo; quota?: Quota }>(`/api/demos/${id}/offline`, { method: "POST" });
}

export function restoreDemo(id: string) {
  return api<{ demo: Demo; quota?: Quota }>(`/api/demos/${id}/restore`, { method: "POST" });
}

export function restartDemoRuntime(id: string) {
  return api<{ demo: Demo; runtime?: Demo["runtime"]; diagnosis?: FailureDiagnosis | null }>(`/api/demos/${id}/runtime/restart`, { method: "POST" });
}

export function saveDemoRuntimeEnv(id: string, env: Record<string, string>) {
  return api<{ demo: Demo; runtimeConfig?: Demo["runtimeConfig"]; externalBackend?: Demo["externalBackend"] }>(`/api/demos/${id}/runtime-env`, {
    method: "POST",
    body: JSON.stringify({ env })
  });
}

export function resetDemoDatabase(id: string) {
  return api<{ demo: Demo; database?: Demo["database"] }>(`/api/demos/${id}/database/reset`, { method: "POST" });
}

export function deleteDemo(id: string) {
  return api<{ demo: Demo; quota?: Quota }>(`/api/demos/${id}/delete`, { method: "POST" });
}

export async function getDemoAnalytics(demoId: string): Promise<{
  demoId: string;
  slug: string;
  visits: number;
  visitors: number;
  estimatedBytes: number;
  estimatedBytesLabel: string;
  lastVisitedAt: string | null;
}> {
  return api(`/api/demos/${demoId}/analytics`);
}