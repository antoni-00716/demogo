// DemoGo v0.9.3 - Slug & plan utility functions (extracted from server.js)

import path from "node:path";
import { dataDir } from "../config.js";

export function getArchivedDemoDir(slug) {
  return path.join(dataDir, "offline-demos", slug);
}

export function isSlugClaimedByDemo(slug, demos = [], ignoreDemoId = "") {
  return demos.some((demo) => {
    if (ignoreDemoId && demo.id === ignoreDemoId) return false;
    return demo.slug === slug || (Array.isArray(demo.aliases) && demo.aliases.includes(slug));
  });
}

export function canUseCustomDomain(planCode = "free") {
  return String(planCode || "free").toLowerCase() === "pro";
}

export function canCustomizeSlug(planCode = "free") {
  return ["lite", "pro"].includes(String(planCode || "free").toLowerCase());
}

export function normalizeCustomSlug(value) {
  const slug = String(value || "").trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(slug)) return "";
  return slug;
}

export function isReservedSlug(value) {
  return new Set([
    "api",
    "admin",
    "app",
    "www",
    "mail",
    "login",
    "register",
    "static",
    "assets",
    "demo",
    "demogo",
    "root",
    "support"
  ]).has(String(value || "").toLowerCase());
}

export function isExpired(demo) {
  if (!demo?.expiresAt) return false;
  return new Date(demo.expiresAt) <= new Date();
}

export function demoSlug(demoId) {
  return String(demoId || "");
}

export function platformHost() {
  try {
    return new URL(publicBaseUrl).hostname.replace(/^www\./, "");
  } catch {
    return "demogo.cn";
  }
}
