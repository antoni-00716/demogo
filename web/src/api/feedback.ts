import { api, toJsonBody } from "./client";
import type { Feedback } from "../types";

export function createFeedback(input: { type: string; demoId?: string; message: string }) {
  return api<{ feedback: Feedback }>("/api/feedback", {
    method: "POST",
    body: toJsonBody(input)
  });
}
