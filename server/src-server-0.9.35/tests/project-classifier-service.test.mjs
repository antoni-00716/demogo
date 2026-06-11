// DemoGo v0.9.22 - Project classifier service unit tests
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyProject, projectTypeLabel } from "../services/project-classifier-service.js";

describe("projectTypeLabel", () => {
  it("returns Chinese label for known types", () => {
    assert.strictEqual(projectTypeLabel("static_site"), "静态网站");
    assert.strictEqual(projectTypeLabel("spa"), "单页应用");
    assert.strictEqual(projectTypeLabel("mpa"), "多页网站");
    assert.strictEqual(projectTypeLabel("node_service"), "Node.js 单服务应用");
    assert.strictEqual(projectTypeLabel("dashboard"), "数据看板");
    assert.strictEqual(projectTypeLabel("ai_frontend"), "AI 应用前端");
    assert.strictEqual(projectTypeLabel("fullstack_framework"), "全栈/元框架项目");
    assert.strictEqual(projectTypeLabel("h5_page"), "移动 H5 页面");
    assert.strictEqual(projectTypeLabel("frontend_build"), "前端源码项目");
    assert.strictEqual(projectTypeLabel("mini_program_source"), "小程序源码");
  });

  it("returns '暂未识别' for unknown type", () => {
    assert.strictEqual(projectTypeLabel("unknown"), "暂未识别");
    assert.strictEqual(projectTypeLabel(""), "暂未识别");
    assert.strictEqual(projectTypeLabel("bogus_type_xyz"), "暂未识别");
  });
});

describe("classifyProject", () => {
  it("classifies empty analysis as unknown", () => {
    const result = classifyProject({}, {});
    assert.strictEqual(result.type, "unknown");
    assert.strictEqual(result.supported, false);
    assert.ok(result.label);
  });

  it("classifies static HTML site (has index.html, no package.json)", () => {
    const analysis = {
      paths: ["index.html", "style.css", "script.js"],
      packageDependencies: {},
      packageScripts: {}
    };
    const context = { detectedType: "static-root" };
    const result = classifyProject(analysis, context);
    assert.strictEqual(result.type, "static_site");
    assert.strictEqual(result.supported, true);
    assert.ok(result.frontendFrameworks.length >= 0);
  });

  it("classifies React+Vite source project", () => {
    const analysis = {
      paths: ["index.html", "package.json", "src/App.jsx", "vite.config.js"],
      packageDependencies: { react: "^18.0.0", "react-dom": "^18.0.0" },
      packageScripts: { dev: "vite", build: "vite build", start: "vite preview" }
    };
    const context = {
      detectedType: "source",
      hasPackageJson: true,
      hasBuildScript: true
    };
    const result = classifyProject(analysis, context);
    assert.ok(["static_site", "spa", "frontend_build"].includes(result.type),
      "React+Vite should be classified as a frontend project type, got: " + result.type);
    assert.ok(result.frontendFrameworks.some(f => f.code === "react" || f.code === "vite"),
      "Should detect React or Vite framework");
  });

  it("classifies Node.js backend service", () => {
    const analysis = {
      paths: ["package.json", "server.js", "routes/api.js"],
      packageDependencies: { express: "^4.18.0" },
      packageScripts: { start: "node server.js", build: "echo done" }
    };
    const context = {
      detectedType: "backend",
      hasBackend: true,
      hasPackageJson: true,
      hasBuildScript: true
    };
    const result = classifyProject(analysis, context);
    assert.strictEqual(result.type, "node_service");
    assert.ok(result.backendFrameworks.some(f => f.code === "express"),
      "Should detect Express framework");
    assert.strictEqual(result.platform, "server");
  });

  it("classifies Next.js fullstack project", () => {
    const analysis = {
      paths: ["package.json", "next.config.js", "pages/index.js"],
      packageDependencies: { next: "^14.0.0", react: "^18.0.0" },
      packageScripts: { dev: "next dev", build: "next build", start: "next start" }
    };
    const context = {
      detectedType: "source",
      hasSsr: true,
      hasPackageJson: true,
      hasBuildScript: true
    };
    const result = classifyProject(analysis, context);
    assert.strictEqual(result.type, "fullstack_framework");
    assert.ok(result.frontendFrameworks.some(f => f.code === "next"),
      "Should detect Next.js as frontend framework");
  });

  it("classifies single HTML page", () => {
    const analysis = {
      paths: ["index.html"],
      packageDependencies: {},
      packageScripts: {}
    };
    const context = { detectedType: "single-html" };
    const result = classifyProject(analysis, context);
    assert.strictEqual(result.type, "static_site");
    assert.strictEqual(result.supported, true);
  });

  it("classifies Vue project", () => {
    const analysis = {
      paths: ["index.html", "package.json", "src/App.vue", "vite.config.js"],
      packageDependencies: { vue: "^3.0.0" },
      packageScripts: { dev: "vite", build: "vite build" }
    };
    const context = {
      detectedType: "source",
      hasPackageJson: true,
      hasBuildScript: true
    };
    const result = classifyProject(analysis, context);
    assert.ok(result.frontendFrameworks.some(f => f.code === "vue"),
      "Should detect Vue framework");
  });

  it("classifies project with MySQL dependency as having database support", () => {
    const analysis = {
      paths: ["package.json", "server.js", "schema.sql"],
      packageDependencies: { express: "^4.18.0", mysql2: "^3.0.0" },
      packageScripts: { start: "node server.js" }
    };
    const context = {
      detectedType: "backend",
      hasBackend: true,
      hasPackageJson: true
    };
    const result = classifyProject(analysis, context);
    assert.strictEqual(result.type, "node_service");
    // Should detect database
    assert.ok(result.databases.length > 0, "Should detect MySQL database");
  });

  it("returns consistent structure for all results", () => {
    const result = classifyProject({ paths: ["index.html"] }, { detectedType: "static-root" });
    // All results should have these keys
    const requiredKeys = [
      "type", "label", "summary", "framework", "frontendFrameworks",
      "backendFrameworks", "databases", "environmentVariables", "assessment",
      "buildTool", "platform", "supportStatus", "supported", "notes",
      "unsupportedReasons", "signals"
    ];
    requiredKeys.forEach(key => {
      assert.ok(key in result, "Missing key: " + key);
    });
    assert.ok(Array.isArray(result.frontendFrameworks));
    assert.ok(Array.isArray(result.backendFrameworks));
    assert.ok(Array.isArray(result.databases));
    assert.ok(Array.isArray(result.notes));
    assert.ok(Array.isArray(result.unsupportedReasons));
  });
});

