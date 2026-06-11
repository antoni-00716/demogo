import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  detectRuntimeWarnings,
  shouldBuildBeforeNodeStart,
  inferRuntimeEngine,
  inferNodeFramework,
  formatRuntimeFramework,
  isSingleServiceSsrProfile,
  detectInspectionType,
  createRuntimeConfig,
  canStartNodeRuntime,
  profileUsesSupabase,
} from "../services/runtime-service.js";

describe("inferRuntimeEngine", () => {
  it("returns node when deps exist", () => {
    assert.equal(inferRuntimeEngine([], { express: "^4.0.0" }), "node");
  });
  it("returns node when hasBackend flag set", () => {
    assert.equal(inferRuntimeEngine(["index.html"], {}, { hasBackend: true }), "node");
  });
  it("returns python for requirements.txt", () => {
    assert.equal(inferRuntimeEngine(["requirements.txt"]), "python");
  });
  it("returns java for pom.xml", () => {
    assert.equal(inferRuntimeEngine(["pom.xml"]), "java");
  });
  it("returns go for go.mod", () => {
    assert.equal(inferRuntimeEngine(["go.mod"]), "go");
  });
  it("returns empty string for static files only", () => {
    assert.equal(inferRuntimeEngine(["index.html", "style.css"]), "");
  });
  it("returns empty string for empty input", () => {
    assert.equal(inferRuntimeEngine([], {}), "");
  });
});

describe("inferNodeFramework", () => {
  it("detects Next.js", () => { assert.equal(inferNodeFramework({ next: "^14.0.0" }), "next"); });
  it("detects Express", () => { assert.equal(inferNodeFramework({ express: "^4.0.0" }), "express"); });
  it("detects Nuxt", () => { assert.equal(inferNodeFramework({ nuxt: "^3.0.0" }), "nuxt"); });
  it("detects TanStack Start", () => { assert.equal(inferNodeFramework({ "@tanstack/react-start": "^1.0.0" }), "tanstack_start"); });
  it("detects Fastify", () => { assert.equal(inferNodeFramework({ fastify: "^4.0.0" }), "fastify"); });
  it("detects Hono", () => { assert.equal(inferNodeFramework({ hono: "^4.0.0" }), "hono"); });
  it("detects NestJS", () => { assert.equal(inferNodeFramework({ "@nestjs/core": "^10.0.0" }), "nestjs"); });
  it("returns empty string for frontend-only", () => { assert.equal(inferNodeFramework({ react: "^18.0.0" }), ""); });
  it("is case-insensitive", () => { assert.equal(inferNodeFramework({ NEXT: "^14.0.0" }), "next"); });
});

describe("formatRuntimeFramework", () => {
  it("formats well-known frameworks", () => {
    assert.equal(formatRuntimeFramework("next"), "Next.js");
    assert.equal(formatRuntimeFramework("express"), "Express");
    assert.equal(formatRuntimeFramework("nuxt"), "Nuxt");
    assert.equal(formatRuntimeFramework("tanstack_start"), "TanStack Start");
  });
  it("defaults to Node.js for unknown", () => {
    assert.equal(formatRuntimeFramework("anything"), "Node.js");
  });
});

describe("shouldBuildBeforeNodeStart", () => {
  it("returns true for Next.js start", () => {
    assert.equal(shouldBuildBeforeNodeStart({ build: "next build", start: "next start" }), true);
  });
  it("returns false when only start script", () => {
    assert.equal(shouldBuildBeforeNodeStart({ start: "node server.js" }), false);
  });
  it("returns false for empty scripts", () => {
    assert.equal(shouldBuildBeforeNodeStart({}), false);
  });
});

describe("isSingleServiceSsrProfile", () => {
  it("detects Next.js fullstack", () => {
    assert.equal(isSingleServiceSsrProfile({ type: "fullstack_framework", framework: "next" }), true);
  });
  it("rejects non-fullstack", () => {
    assert.equal(isSingleServiceSsrProfile({ framework: "express" }), false);
  });
  it("detects from frontendFrameworks", () => {
    assert.equal(isSingleServiceSsrProfile({ type: "fullstack_framework", frontendFrameworks: [{ code: "nuxt" }] }), true);
  });
});

describe("detectInspectionType", () => {
  it("detects out/ssr/backend/static-root/dist/build/public/single-html/unknown", () => {
    assert.equal(detectInspectionType({ hasOutIndex: true }), "out");
    assert.equal(detectInspectionType({ hasSsr: true }), "runtime");
    assert.equal(detectInspectionType({ hasBackend: true, hasPackageJson: true }), "backend");
    assert.equal(detectInspectionType({ hasRootIndex: true }), "static-root");
    assert.equal(detectInspectionType({ hasDistIndex: true }), "dist");
    assert.equal(detectInspectionType({ hasBuildIndex: true }), "build");
    assert.equal(detectInspectionType({ hasPublicIndex: true }), "public");
    assert.equal(detectInspectionType({ singleHtmlEntry: true }), "single-html");
    assert.equal(detectInspectionType({}), "unknown");
  });
});

describe("profileUsesSupabase", () => {
  it("detects supabase in databases/env/signals", () => {
    assert.equal(profileUsesSupabase({ databases: [{ code: "supabase" }] }), true);
    assert.equal(profileUsesSupabase({ environmentVariables: { required: ["SUPABASE_URL"] } }), true);
    assert.equal(profileUsesSupabase({ signals: ["supabase"] }), true);
    assert.equal(profileUsesSupabase({ databases: [{ code: "mysql" }] }), false);
    assert.equal(profileUsesSupabase({}), false);
  });
});

describe("createRuntimeConfig", () => {
  it("creates config with defaults", () => {
    const c = createRuntimeConfig();
    assert.equal(c.driver, "docker");
    assert.equal(c.dockerImage, "node:20-alpine");
    assert.equal(c.memory, "512m");
  });
  it("accepts custom config", () => {
    const c = createRuntimeConfig({ runtimeDockerImage: "node:22-alpine", env: { DB_HOST: "localhost" } });
    assert.equal(c.dockerImage, "node:22-alpine");
    assert.deepEqual(c.env, { DB_HOST: "localhost" });
  });
});

describe("canStartNodeRuntime", () => {
  const cfg = { enabled: true, nodeEnabled: true };

  it("returns ok for basic Node project with backend", () => {
    assert.equal(canStartNodeRuntime({ analysis: { hasBackend: true, projectProfile: { engine: "node", type: "node_service" } }, runtime: { startCommand: "node server.js" } }, cfg).ok, true);
  });
  it("rejects when disabled", () => {
    assert.equal(canStartNodeRuntime({ analysis: { projectProfile: { engine: "node" } }, runtime: {} }, { enabled: false, nodeEnabled: true }).ok, false);
    assert.equal(canStartNodeRuntime({ analysis: { projectProfile: { engine: "node" } }, runtime: {} }, { enabled: true, nodeEnabled: false }).ok, false);
  });
  it("rejects when missing env vars", () => {
    const r = canStartNodeRuntime({
      analysis: { projectProfile: { engine: "node" }, projectAssessment: { environmentVariables: { required: ["DB_HOST"] } } },
      runtime: {}
    }, cfg);
    assert.equal(r.ok, false);
    assert.equal(r.configRequired, true);
  });
});

describe("detectRuntimeWarnings", () => {
  it("returns warnings for database dependencies", () => {
    const result = detectRuntimeWarnings({
      dependencies: { mysql2: "^3.0.0" },
      scripts: {},
      paths: ["package.json"]
    });
    assert.ok(result.warnings.length > 0);
    assert.equal(result.requiresMysql, true);
  });
  it("no warnings for basic project", () => {
    const result = detectRuntimeWarnings({
      dependencies: { express: "^4.0.0" },
      scripts: { start: "node server.js" },
      paths: ["package.json", "server.js"]
    });
    assert.equal(result.warnings.length, 0);
    assert.equal(result.requiresDatabase, false);
  });
  it("handles empty input gracefully", () => {
    const result = detectRuntimeWarnings({});
    assert.ok(Array.isArray(result.warnings));
  });
});
