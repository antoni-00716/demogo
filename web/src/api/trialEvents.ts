import { api, toJsonBody } from "./client";

export type TrialEventType =
  | "home_view"
  | "register_view"
  | "upload_view"
  | "ai_publish_view";

export function trackTrialEvent(eventType: TrialEventType, metadata: Record<string, string | number | boolean> = {}) {
  return api<{ ok: true }>("/api/trial-events", {
    method: "POST",
    body: toJsonBody({
      eventType,
      path: window.location.pathname + window.location.search + window.location.hash,
      source: "web",
      metadata
    })
  }).catch(() => null);
}
