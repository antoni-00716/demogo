// DemoGo v0.9.34 - Shared deployment step functions
// Canonical implementation used by both server.js and deployment-job-service.js.
// Extracted to eliminate duplication that caused "fix one, break the other" bugs.

import crypto from "node:crypto";

/**
 * Create the default set of deployment pipeline steps.
 * Each step starts as "pending" and gets updated as the pipeline progresses.
 */
export function createDeploymentSteps(context = {}) {
  const now = new Date().toISOString();
  const steps = [
    ["receive", "success", "文件已接收"],
    ["extract", "pending", "正在解压项目文件"],
    ["security_check", "pending", "正在安全检查"],
    ["inspect", "pending", "正在分析项目结构"],
    ["build", "pending", "正在构建项目"],
    ["content_review", "pending", "正在内容审核"],
    ["database", "pending", "正在准备数据库环境"],
    ["form_hosting", "pending", "正在识别表单"],
    ["publish", "pending", "正在生成链接"],
    ["success", "pending", "链接生成完成"]
  ];
  return steps.map(([eventType, status, message]) => ({
    id: crypto.randomUUID(),
    demoId: context.demoId || null,
    userId: context.userId || null,
    deploymentId: context.deploymentId || null,
    eventType,
    status,
    message,
    detail: { action: context.action || "create" },
    createdAt: now
  }));
}

/**
 * Update a specific step's status and message.
 */
export function markDeploymentStep(steps, eventType, status, message, detail = {}) {
  if (!Array.isArray(steps)) return;
  const step = steps.find((item) => item.eventType === eventType);
  if (!step) return;
  step.status = status;
  step.message = message || step.message;
  step.detail = { ...(step.detail || {}), ...detail };
  step.createdAt = new Date().toISOString();
}

/**
 * Finalize all steps: pending → skipped, attach context IDs.
 * Returns an array of deployment event records ready for persistence.
 */
export function completeDeploymentSteps(steps, context = {}) {
  const now = new Date().toISOString();
  return (Array.isArray(steps) ? steps : []).map((step) => ({
    ...step,
    demoId: step.demoId || context.demoId || null,
    userId: step.userId || context.userId || null,
    deploymentId: step.deploymentId || context.deploymentId || null,
    status: step.status === "pending" ? "skipped" : step.status,
    createdAt: step.createdAt || now
  }));
}

/**
 * Create a "failed" event appended to the completed steps.
 * If a step already failed, no extra "failed" event is added.
 */
export function failedDeploymentSteps(error, steps = [], context = {}) {
  const message = error instanceof Error ? error.message : "未知错误";
  const existing = completeDeploymentSteps(steps, context);
  const hasFailed = existing.some((step) => step.status === "failed");
  return [
    ...existing,
    ...(hasFailed ? [] : [{
      id: crypto.randomUUID(),
      demoId: context.demoId || null,
      userId: context.userId || null,
      deploymentId: context.deploymentId || null,
      eventType: "failed",
      status: "failed",
      message,
      detail: {},
      createdAt: new Date().toISOString()
    }])
  ];
}
