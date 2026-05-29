import { api, toJsonBody } from "./client";
import type { AgentToken, Demo, Quota, User } from "../types";

export type MeResponse = {
  user: User;
  demos: Demo[];
  quota: Quota;
};

export function getMe() {
  return api<MeResponse>("/api/me");
}

export function login(email: string, password: string) {
  return api<{ user: User }>("/api/auth/login", {
    method: "POST",
    body: toJsonBody({ email, password })
  });
}

export function getRegisterOptions() {
  return api<{
    emailVerificationEnabled: boolean;
    emailConfigured: boolean;
    emailRequired: boolean;
    canRegister: boolean;
  }>("/api/auth/register-options");
}

export function sendVerificationCode(email: string, password: string) {
  return api<{ ok: true; expiresInSeconds?: number; resendAfterSeconds?: number }>("/api/auth/send-verification-code", {
    method: "POST",
    body: toJsonBody({ email, password })
  });
}

export function register(email: string, password: string, verificationCode?: string) {
  return api<{ user: User }>("/api/auth/register", {
    method: "POST",
    body: toJsonBody({ email, password, verificationCode })
  });
}

export function logout() {
  return api<{ ok: true }>("/api/auth/logout", {
    method: "POST"
  });
}

export function getAgentToken() {
  return api<{ token: AgentToken }>("/api/agent-token");
}

export function resetAgentToken() {
  return api<{ token: AgentToken }>("/api/agent-token", {
    method: "POST"
  });
}
