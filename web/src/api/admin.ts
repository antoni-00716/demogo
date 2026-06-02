import { api, toJsonBody } from "./client";
import type { AdminMetrics, AdminUser, ContentReview, Demo, Feedback, FormSubmission, HostedForm, PlanRequest, SubdomainRequest } from "../types";

export function getAdminOverview() {
  return api<{
    metrics: AdminMetrics;
    users: AdminUser[];
    demos: Demo[];
    forms: HostedForm[];
    feedback: Feedback[];
    contentReviews?: ContentReview[];
  }>("/api/admin/overview");
}

export function getAdminContentReviews(filters: { search?: string; status?: string; resolutionStatus?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.resolutionStatus) params.set("resolutionStatus", filters.resolutionStatus);
  return api<{ reviews: ContentReview[] }>(`/api/admin/content-reviews${params.toString() ? `?${params}` : ""}`);
}

export function updateAdminContentReviewStatus(id: string, input: { resolutionStatus: string; adminNote?: string }) {
  return api<{ review: ContentReview }>(`/api/admin/content-reviews/${id}/status`, {
    method: "POST",
    body: toJsonBody(input)
  });
}

export function getAdminForms(filters: { search?: string; status?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  return api<{ forms: HostedForm[]; submissions: FormSubmission[] }>(`/api/admin/forms${params.toString() ? `?${params}` : ""}`);
}

export function getAdminUsers(filters: { search?: string; plan?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.plan) params.set("plan", filters.plan);
  return api<{ users: AdminUser[] }>(`/api/admin/users${params.toString() ? `?${params}` : ""}`);
}

export function getAdminPlanRequests(filters: { search?: string; plan?: string; status?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.plan) params.set("plan", filters.plan);
  if (filters.status) params.set("status", filters.status);
  return api<{ requests: PlanRequest[] }>(`/api/admin/plan-upgrade-requests${params.toString() ? `?${params}` : ""}`);
}

export function updateAdminPlanRequestStatus(id: string, input: { status: "approved" | "rejected"; adminNote?: string }) {
  return api<{ request: PlanRequest; user?: AdminUser | null }>(`/api/admin/plan-upgrade-requests/${id}/status`, {
    method: "POST",
    body: toJsonBody(input)
  });
}

export function getAdminSubdomainRequests(filters: { status?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  return api<{ requests: SubdomainRequest[] }>(`/api/admin/subdomain-requests${params.toString() ? `?${params}` : ""}`);
}

export function updateAdminSubdomainRequestStatus(id: string, input: { status: "approved" | "rejected"; adminNote?: string }) {
  return api<{ request: SubdomainRequest }>(`/api/admin/subdomain-requests/${id}/status`, {
    method: "POST",
    body: toJsonBody(input)
  });
}

export function getAdminFeedback(filters: { search?: string; type?: string; status?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.type) params.set("type", filters.type);
  if (filters.status) params.set("status", filters.status);
  return api<{ feedback: Feedback[] }>(`/api/admin/feedback${params.toString() ? `?${params}` : ""}`);
}

export function updateAdminFeedbackStatus(id: string, status: Feedback["status"]) {
  return api<{ feedback: Feedback }>(`/api/admin/feedback/${id}/status`, {
    method: "POST",
    body: toJsonBody({ status })
  });
}

export function getAdminRuntimes() {
  return api<{ summary: NonNullable<AdminMetrics["runtime"]>; demos: Demo[]; runtimes: Array<NonNullable<Demo["runtime"]> & { slug?: string }> }>("/api/admin/runtimes");
}

export function adminStopDemoRuntime(id: string) {
  return api<{ demo: Demo; runtime?: Demo["runtime"] }>(`/api/admin/demos/${id}/runtime/stop`, { method: "POST" });
}

export function adminOfflineDemo(id: string) {
  return api<{ demo: Demo }>(`/api/admin/demos/${id}/offline`, { method: "POST" });
}

export function adminDeleteDemo(id: string) {
  return api<{ demo: Demo }>(`/api/admin/demos/${id}/delete`, { method: "POST" });
}
