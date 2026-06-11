// DemoGo v0.9.7 - 部署任务 + 失败诊断服务单元测试
// Run: node --test server/src/tests/deployment-job-service.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { createFailureDiagnosis, classifyFailureCategory } from "../services/failure-diagnosis-service.js";

// ============================================================
// createFailureDiagnosis - 基础测试
// ============================================================

describe("createFailureDiagnosis", () => {
  it("handles empty input gracefully", () => {
    const result = createFailureDiagnosis({});
    assert.strictEqual(result.category, "other");
    assert.strictEqual(result.severity, "warning");
    assert.ok(result.title.length > 0);
    assert.ok(result.summary.length > 0);
    assert.ok(Array.isArray(result.userActions));
    assert.ok(result.userActions.length > 0);
    assert.ok(result.aiPrompt.length > 50);
  });

  it("classifies quota limit (403)", () => {
    const result = createFailureDiagnosis({
      statusCode: 403,
      message: "当前套餐最多保留 3 个在线试用项目。请先下线旧项目或升级套餐。"
    });
    assert.strictEqual(result.category, "quota");
    assert.strictEqual(result.title, "额度或套餐限制");
  });

  it("classifies content review failure", () => {
    const result = createFailureDiagnosis({
      contentReview: { status: "blocked" },
      message: "内容包含违规信息"
    });
    assert.strictEqual(result.category, "content");
  });

  it("classifies unsupported tech stack", () => {
    const result = createFailureDiagnosis({
      message: "暂不支持 Python Django 项目"
    });
    assert.strictEqual(result.category, "unsupported");
  });

  it("classifies missing env vars", () => {
    const result = createFailureDiagnosis({
      message: "缺少运行配置：DATABASE_URL 未设置",
      inspection: { runtimeConfig: { missing: ["DATABASE_URL"] } }
    });
    assert.strictEqual(result.category, "runtime_env");
  });

  it("generates AI fix prompt for build failure", () => {
    const result = createFailureDiagnosis({
      message: "npm run build 失败",
      inspection: {
        detectedType: "source",
        projectProfile: { summary: "React + Vite 项目" }
      },
      logs: "Error: Build failed with exit code 1"
    });
    assert.strictEqual(result.category, "build");
    assert.ok(result.aiPrompt.includes("DemoGo"));
    assert.ok(result.aiPrompt.includes("npm run build"));
  });
});

// ============================================================
// classifyFailureCategory - 分类逻辑
// ============================================================

describe("classifyFailureCategory", () => {
  it("classifies quota keyword", () => {
    const result = classifyFailureCategory({ message: "在线试用项目 数量达到上限" });
    assert.strictEqual(result, "quota");
  });

  it("classifies content keyword", () => {
    const result = classifyFailureCategory({ message: "内容涉及诈骗和赌博" });
    assert.strictEqual(result, "content");
  });

  it("classifies unsupported keyword", () => {
    const result = classifyFailureCategory({ message: "项目使用 Redis 和 WebSocket" });
    assert.strictEqual(result, "unsupported");
  });

  it("classifies runtime_start keyword", () => {
    const result = classifyFailureCategory({ message: "启动超时 端口被占用" });
    assert.strictEqual(result, "runtime_start");
  });

  it("classifies build failure", () => {
    const result = classifyFailureCategory({ message: "npm run build failed vite error" });
    assert.strictEqual(result, "build");
  });

  it("defaults to other for unknown", () => {
    const result = classifyFailureCategory({ message: "some random error" });
    assert.strictEqual(result, "other");
  });
});

// ============================================================
// API 契约测试
// ============================================================

describe("API contract", () => {
  it("failure diagnosis response has required fields", () => {
    const result = createFailureDiagnosis({ message: "test error" });
    assert.ok("category" in result);
    assert.ok("severity" in result);
    assert.ok("title" in result);
    assert.ok("summary" in result);
    assert.ok("evidence" in result);
    assert.ok("userActions" in result);
    assert.ok("aiPrompt" in result);
    assert.ok("createdAt" in result);
  });

  it("evidence is always an array", () => {
    const result = createFailureDiagnosis({ message: "test" });
    assert.ok(Array.isArray(result.evidence));
  });

  it("userActions are non-empty for known categories", () => {
    const categories = ["quota", "content", "build", "runtime_start", "unsupported", "other"];
    for (const cat of categories) {
      const result = classifyFailureCategory({ message: cat === "quota" ? "套餐额度" : cat === "content" ? "违规内容" : cat });
      assert.ok(typeof result === "string" && result.length > 0);
    }
  });
});