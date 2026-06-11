// DemoGo v0.9.7 - 内容审查服务单元测试
// Run: node --test server/src/tests/content-review-service.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  reviewArchiveContent,
  publicContentReview,
  contentReviewStatusLabel,
} from "../services/content-review-service.js";

function makeAnalysis(files) {
  return {
    publishableEntries: files.map((f, i) => ({
      relativePath: f.path || `file${i}.html`,
      bytes: Buffer.byteLength(f.content || "", "utf8"),
    }))
  };
}

function makeReadText(files) {
  const map = {};
  files.forEach(f => { map[f.path || "index.html"] = f.content || ""; });
  return async (entry) => map[entry.relativePath] || "";
}

// ============================================================
// contentReviewStatusLabel
// ============================================================

describe("contentReviewStatusLabel", () => {
  it('returns "已通过" for passed', () => {
    assert.strictEqual(contentReviewStatusLabel("passed"), "已通过");
  });
  it('returns "待人工确认" for review_required', () => {
    assert.strictEqual(contentReviewStatusLabel("review_required"), "待人工确认");
  });
  it('returns "已拦截" for blocked', () => {
    assert.strictEqual(contentReviewStatusLabel("blocked"), "已拦截");
  });
  it('returns "检查失败" for failed', () => {
    assert.strictEqual(contentReviewStatusLabel("failed"), "检查失败");
  });
  it('returns "未检查" for unknown values', () => {
    assert.strictEqual(contentReviewStatusLabel("unknown"), "未检查");
  });
});

// ============================================================
// publicContentReview
// ============================================================

describe("publicContentReview", () => {
  it("returns null for null/undefined", () => {
    assert.strictEqual(publicContentReview(null), null);
    assert.strictEqual(publicContentReview(undefined), null);
  });
  it("adds statusLabel without mutating original", () => {
    const original = { status: "passed" };
    const result = publicContentReview(original);
    assert.strictEqual(original.statusLabel, undefined);
    assert.strictEqual(result.statusLabel, "已通过");
  });
});

// ============================================================
// reviewArchiveContent - 安全内容
// ============================================================

describe("reviewArchiveContent - safe content", () => {
  it("passes simple HTML", async () => {
    const files = [{ path: "index.html", content: "<html><body>Hello World</body></html>" }];
    const result = await reviewArchiveContent(makeAnalysis(files), { readText: makeReadText(files) });
    assert.strictEqual(result.status, "passed");
  });

  it("passes normal business page", async () => {
    const files = [{ path: "index.html", content: "欢迎使用 DemoGo，请填写姓名和手机号预约试用。" }];
    const result = await reviewArchiveContent(makeAnalysis(files), { readText: makeReadText(files) });
    assert.ok(result.status === "passed" || result.status === "notice");
  });

  it("handles empty entries", async () => {
    const result = await reviewArchiveContent({ publishableEntries: [] });
    assert.strictEqual(result.status, "passed");
  });
});

// ============================================================
// reviewArchiveContent - 违规内容拦截
// ============================================================

describe("reviewArchiveContent - blocked content", () => {
  it("blocks fraud content 刷单", async () => {
    const files = [{ path: "index.html", content: "刷单日赚 投资返利 高额回报 稳赚不赔 快速回本" }];
    const result = await reviewArchiveContent(makeAnalysis(files), { readText: makeReadText(files) });
    assert.ok(result.status !== "passed", "should not pass fraud content");
    assert.ok(result.findings.length > 0, "should have findings");
  });

  it("blocks gambling content 赌博", async () => {
    const files = [{ path: "index.html", content: "博彩 百家乐 老虎机 体育投注 六合彩 下注" }];
    const result = await reviewArchiveContent(makeAnalysis(files), { readText: makeReadText(files) });
    assert.ok(result.status !== "passed", "should not pass gambling content");
  });

  it("blocks porn content 色情", async () => {
    const files = [{ path: "index.html", content: "色情视频 裸聊 约炮 成人服务 上门服务" }];
    const result = await reviewArchiveContent(makeAnalysis(files), { readText: makeReadText(files) });
    assert.ok(result.status !== "passed", "should not pass porn content");
  });

  it("blocks illegal goods 违禁品", async () => {
    const files = [{ path: "index.html", content: "买卖身份证 假证 代开发票 出售银行卡 跑分平台" }];
    const result = await reviewArchiveContent(makeAnalysis(files), { readText: makeReadText(files) });
    assert.ok(result.status !== "passed", "should not pass illegal goods");
  });

  it("detects malware content", async () => {
    const files = [{ path: "index.html", content: "木马 病毒下载 免杀 撞库 盗号 黑产" }];
    const result = await reviewArchiveContent(makeAnalysis(files), { readText: makeReadText(files) });
    assert.ok(result.status !== "passed", "should not pass malware content");
  });
});

// ============================================================
// reviewArchiveContent - edge cases
// ============================================================

describe("reviewArchiveContent - edge cases", () => {
  it("skips image files", async () => {
    const files = [
      { path: "logo.png", content: "binary" },
      { path: "index.html", content: "<h1>Hello</h1>" }
    ];
    const result = await reviewArchiveContent(makeAnalysis(files), { readText: makeReadText(files) });
    assert.strictEqual(result.status, "passed");
  });

  it("handles null analysis", async () => {
    const result = await reviewArchiveContent(null);
    assert.strictEqual(result.status, "passed");
  });
});