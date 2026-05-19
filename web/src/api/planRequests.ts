import { api, toJsonBody } from "./client";
import type { PlanRequest } from "../types";

export function getPlanRequests() {
  return api<{ requests: PlanRequest[] }>("/api/plan-upgrade-requests");
}

export function createPlanRequest(input: { plan: "lite" | "pro"; contact?: string; message?: string }) {
  return api<{ request: PlanRequest }>("/api/plan-upgrade-requests", {
    method: "POST",
    body: toJsonBody(input)
  });
}
