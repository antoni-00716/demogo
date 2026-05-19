import { api, toJsonBody } from "./client";
import type { FormField, FormSubmission, HostedForm } from "../types";

export type FormQuota = {
  forms?: {
    used: number;
    limit: number;
  };
  monthlySubmissions?: {
    used: number;
    limit: number;
  };
};

export function getForms() {
  return api<{ forms: HostedForm[]; quota: FormQuota }>("/api/forms");
}

export function createHostedForm(input: { demoId: string; name?: string; fields?: FormField[] }) {
  return api<{ form: HostedForm; quota: FormQuota }>("/api/forms", {
    method: "POST",
    body: toJsonBody(input)
  });
}

export function getHostedForm(id: string) {
  return api<{ form: HostedForm; submissions: FormSubmission[] }>(`/api/forms/${id}`);
}

export function updateHostedFormStatus(id: string, status: "active" | "closed" | "deleted") {
  return api<{ form: HostedForm; quota: FormQuota }>(`/api/forms/${id}/status`, {
    method: "POST",
    body: toJsonBody({ status })
  });
}
