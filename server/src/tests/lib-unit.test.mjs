// DemoGo v0.9.3 - Unit tests for lib/ pure functions
// Run: node --test server/src/tests/lib-unit.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Import the functions under test
import {
  isSlugClaimedByDemo,
  canUseCustomDomain,
  canCustomizeSlug,
  normalizeCustomSlug,
  isReservedSlug,
  isExpired,
} from "../lib/slug-utils.js";

import { findUserDemo } from "../lib/demo-helpers.js";

// ============================================================
// slug-utils.js
// ============================================================

describe("normalizeCustomSlug", () => {
  it("returns lowercase trimmed slug for valid input", () => {
    assert.strictEqual(normalizeCustomSlug("My-Demo-123"), "my-demo-123");
  });

  it("returns empty string for slug shorter than 3 chars", () => {
    assert.strictEqual(normalizeCustomSlug("ab"), "");
  });

  it("returns empty string for slug longer than 40 chars", () => {
    assert.strictEqual(normalizeCustomSlug("a".repeat(41)), "");
  });

  it("returns empty string for slug starting with hyphen", () => {
    assert.strictEqual(normalizeCustomSlug("-demo"), "");
  });

  it("returns empty string for slug ending with hyphen", () => {
    assert.strictEqual(normalizeCustomSlug("demo-"), "");
  });

  it("returns empty string for slug with uppercase letters", () => {
    assert.strictEqual(normalizeCustomSlug("HelloWorld"), "helloworld");
  });

  it("returns empty string for slug with special characters", () => {
    assert.strictEqual(normalizeCustomSlug("demo_test"), "");
  });

  it("returns empty string for empty input", () => {
    assert.strictEqual(normalizeCustomSlug(""), "");
  });

  it("handles exactly 3 chars", () => {
    assert.strictEqual(normalizeCustomSlug("abc"), "abc");
  });

  it("handles exactly 40 chars", () => {
    const slug = "a".repeat(40);
    assert.strictEqual(normalizeCustomSlug(slug), slug);
  });
});

describe("isReservedSlug", () => {
  it("flags 'api' as reserved", () => {
    assert.strictEqual(isReservedSlug("api"), true);
  });

  it("flags 'admin' as reserved", () => {
    assert.strictEqual(isReservedSlug("admin"), true);
  });

  it("flags 'www' as reserved", () => {
    assert.strictEqual(isReservedSlug("www"), true);
  });

  it("flags 'demogo' as reserved", () => {
    assert.strictEqual(isReservedSlug("demogo"), true);
  });

  it("does not flag normal slugs", () => {
    assert.strictEqual(isReservedSlug("my-project"), false);
  });

  it("is case-insensitive", () => {
    assert.strictEqual(isReservedSlug("API"), true);
    assert.strictEqual(isReservedSlug("Admin"), true);
  });
});

describe("canCustomizeSlug", () => {
  it("allows lite plan", () => {
    assert.strictEqual(canCustomizeSlug("lite"), true);
  });

  it("allows pro plan", () => {
    assert.strictEqual(canCustomizeSlug("pro"), true);
  });

  it("denies free plan", () => {
    assert.strictEqual(canCustomizeSlug("free"), false);
  });

  it("denies unknown plan", () => {
    assert.strictEqual(canCustomizeSlug("enterprise"), false);
  });

  it("is case-insensitive", () => {
    assert.strictEqual(canCustomizeSlug("LITE"), true);
    assert.strictEqual(canCustomizeSlug("PRO"), true);
  });
});

describe("canUseCustomDomain", () => {
  it("allows pro plan", () => {
    assert.strictEqual(canUseCustomDomain("pro"), true);
  });

  it("denies free plan", () => {
    assert.strictEqual(canUseCustomDomain("free"), false);
  });

  it("denies lite plan", () => {
    assert.strictEqual(canUseCustomDomain("lite"), false);
  });

  it("is case-insensitive", () => {
    assert.strictEqual(canUseCustomDomain("PRO"), true);
  });
});

describe("isSlugClaimedByDemo", () => {
  const demos = [
    { id: "1", slug: "my-demo" },
    { id: "2", slug: "other-demo", aliases: ["old-demo"] },
  ];

  it("returns true when slug matches a demo slug", () => {
    assert.strictEqual(isSlugClaimedByDemo("my-demo", demos), true);
  });

  it("returns true when slug matches an alias", () => {
    assert.strictEqual(isSlugClaimedByDemo("old-demo", demos), true);
  });

  it("returns false when slug does not match", () => {
    assert.strictEqual(isSlugClaimedByDemo("new-demo", demos), false);
  });

  it("ignores the specified demo id", () => {
    assert.strictEqual(isSlugClaimedByDemo("my-demo", demos, "1"), false);
  });

  it("returns false for empty demos array", () => {
    assert.strictEqual(isSlugClaimedByDemo("anything", []), false);
  });
});

describe("isExpired", () => {
  it("returns true for past expiry date", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    assert.strictEqual(isExpired({ expiresAt: past }), true);
  });

  it("returns false for future expiry date", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    assert.strictEqual(isExpired({ expiresAt: future }), false);
  });

  it("returns false when expiresAt is missing", () => {
    assert.strictEqual(isExpired({}), false);
  });

  it("returns false when expiresAt is null", () => {
    assert.strictEqual(isExpired({ expiresAt: null }), false);
  });
});

// ============================================================
// demo-helpers.js
// ============================================================

describe("findUserDemo", () => {
  const demos = [
    { id: "a", userId: "u1", name: "Demo A" },
    { id: "b", userId: "u2", name: "Demo B" },
    { id: "c", userId: "u1", name: "Demo C" },
  ];

  it("finds demo by id and userId", () => {
    const result = findUserDemo(demos, "a", "u1");
    assert.notStrictEqual(result, null);
    assert.strictEqual(result.demo.id, "a");
    assert.strictEqual(result.index, 0);
  });

  it("returns null when demo not found by id", () => {
    assert.strictEqual(findUserDemo(demos, "x", "u1"), null);
  });

  it("returns null when demo belongs to different user", () => {
    assert.strictEqual(findUserDemo(demos, "b", "u1"), null);
  });

  it("returns null for empty array", () => {
    assert.strictEqual(findUserDemo([], "a", "u1"), null);
  });
});

