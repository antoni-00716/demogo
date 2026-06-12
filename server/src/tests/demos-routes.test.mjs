// DemoGo v0.9.39 - Unit tests for demos.js route utilities
// Tests the core utility functions used by demos.js endpoints
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isSlugClaimedByDemo, canCustomizeSlug, canUseCustomDomain, normalizeCustomSlug, isReservedSlug, isExpired, demoSlug, extractDemoSlug } from "../lib/slug-utils.js";

describe("isSlugClaimedByDemo (used by demos.js slug endpoints)", () => {
  const demos = [
    { id: "1", slug: "my-project", aliases: ["old-name"] },
    { id: "2", slug: "another-demo" },
  ];

  it("returns true for claimed slug", () => {
    assert.ok(isSlugClaimedByDemo("my-project", demos));
  });

  it("returns true for claimed alias", () => {
    assert.ok(isSlugClaimedByDemo("old-name", demos));
  });

  it("returns false for available slug", () => {
    assert.equal(isSlugClaimedByDemo("available-slug", demos), false);
  });

  it("ignores the current demo when checking", () => {
    assert.equal(isSlugClaimedByDemo("my-project", demos, "1"), false);
  });
});

describe("canCustomizeSlug (plan gating)", () => {
  it("allows slug customization for lite plan", () => {
    assert.ok(canCustomizeSlug("lite"));
  });

  it("allows slug customization for pro plan", () => {
    assert.ok(canCustomizeSlug("pro"));
  });

  it("blocks slug customization for free plan", () => {
    assert.equal(canCustomizeSlug("free"), false);
  });

  it("blocks slug customization for unknown plan", () => {
    assert.equal(canCustomizeSlug("starter"), false);
  });

  it("defaults to free plan when no plan provided", () => {
    assert.equal(canCustomizeSlug(), false);
  });
});

describe("canUseCustomDomain", () => {
  it("allows custom domain for pro plan", () => {
    assert.ok(canUseCustomDomain("pro"));
  });

  it("blocks custom domain for free plan", () => {
    assert.equal(canUseCustomDomain("free"), false);
  });

  it("blocks custom domain for lite plan", () => {
    assert.equal(canUseCustomDomain("lite"), false);
  });
});

describe("normalizeCustomSlug (validation used by demos.js)", () => {
  it("accepts valid slug", () => {
    assert.equal(normalizeCustomSlug("my-valid-slug-123"), "my-valid-slug-123");
  });

  it("rejects slug with trailing hyphen", () => {
    assert.equal(normalizeCustomSlug("slug-"), "");
  });

  it("rejects empty slug", () => {
    assert.equal(normalizeCustomSlug(""), "");
  });

  it("rejects slug with special chars", () => {
    assert.equal(normalizeCustomSlug("my slug!"), "");
  });

  it("trims and lowercases", () => {
    assert.equal(normalizeCustomSlug("  My-Slug "), "my-slug");
  });

  it("rejects too short slug", () => {
    assert.equal(normalizeCustomSlug("a"), "");
  });
});

describe("isReservedSlug (used by demos.js to block system slugs)", () => {
  it("blocks api", () => assert.ok(isReservedSlug("api")));
  it("blocks admin", () => assert.ok(isReservedSlug("admin")));
  it("blocks app", () => assert.ok(isReservedSlug("app")));
  it("blocks login", () => assert.ok(isReservedSlug("login")));
  it("blocks demogo", () => assert.ok(isReservedSlug("demogo")));
  it("allows normal project names", () => assert.equal(isReservedSlug("my-cool-project"), false));
  it("blocks case-insensitively", () => assert.ok(isReservedSlug("API")));
});

describe("isExpired (used by demos.js for expiry checks)", () => {
  it("returns false for demo without expiry", () => {
    assert.equal(isExpired({}), false);
  });

  it("returns true for demo past expiry", () => {
    assert.ok(isExpired({ expiresAt: "2020-01-01T00:00:00Z" }));
  });

  it("returns false for demo not yet expired", () => {
    assert.equal(isExpired({ expiresAt: "2099-01-01T00:00:00Z" }), false);
  });
});

describe("extractDemoSlug (used in update/delete endpoints)", () => {
  it("extracts slug from URL path", () => {
    assert.equal(extractDemoSlug("https://demogo.cn/d/my-project"), "my-project");
  });

  it("extracts slug from slug string", () => {
    assert.equal(extractDemoSlug("my-project"), "my-project");
  });

  it("returns empty for empty input", () => {
    assert.equal(extractDemoSlug(""), "");
  });
});

describe("demoSlug", () => {
  it("returns slug from demo object", () => {
    assert.equal(demoSlug({ slug: "my-demo" }), "my-demo");
  });

  it("returns string as-is", () => {
    assert.equal(demoSlug("my-demo"), "my-demo");
  });

  it("returns undefined for missing slug", () => {
    assert.equal(demoSlug({ name: "test" }), undefined);
  });
});
