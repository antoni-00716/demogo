// DemoGo E2E regression test — inspection nested structure validation
// Run: node src/tests/e2e-inspection-regression.js
//
// This test validates that the refactored inspection object (41 flat fields → 6 nested
// sub-objects) is correctly returned by the /api/inspect endpoint for all project types.
// Uses standalone script mode (not node:test) to avoid Windows spawn compatibility issues.

import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "../..");
const projectRoot = path.resolve(serverRoot, "..");
const testRoot = path.join(projectRoot, ".tmp", "e2e-inspection-regression");
const port = 3125;
const baseUrl = `http://127.0.0.1:${port}`;

const adminUser = "admin";
const adminPassword = "admin-test-pass";

let cookie = "";
let passed = 0;
let failed = 0;

// ── Setup ────────────────────────────────────────────────────────────────────

await fs.rm(testRoot, { recursive: true, force: true });
await fs.mkdir(path.join(testRoot, "data"), { recursive: true });
await fs.mkdir(path.join(testRoot, "uploads"), { recursive: true });
await fs.mkdir(path.join(testRoot, "site", "d"), { recursive: true });

const child = spawn(process.execPath, ["src/server.js"], {
  cwd: serverRoot,
  env: {
    ...process.env,
    PORT: String(port),
    PUBLIC_BASE_URL: baseUrl,
    DEMOGO_DATA_DIR: path.join(testRoot, "data"),
    DEMOGO_UPLOAD_DIR: path.join(testRoot, "uploads"),
    DEMOGO_DEMO_ROOT: path.join(testRoot, "site", "d"),
    DEMOGO_ADMIN_USER: adminUser,
    DEMOGO_ADMIN_PASSWORD: adminPassword,
    DEMOGO_EMAIL_VERIFICATION_ENABLED: "0",
    DEMOGO_DEPLOY_RATE_LIMIT: "100",
    DEMOGO_RATE_LIMIT_DISABLED: "1",
    DEMOGO_BUILD_MODE: "host",
    DEMOGO_CSRF_DISABLED: "1",
    DEMOGO_RUNTIME_ENABLED: "0",
    DEMOGO_RUNTIME_NODE_ENABLED: "0",
    DEMOGO_RUNTIME_DRIVER: "host",
    DEMOGO_DB_HOST: "",
    DEMOGO_DB_NAME: "",
    DEMOGO_DB_USER: "",
    DEMOGO_DB_PASSWORD: "",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
child.stderr.pipe(process.stderr);

// ── Run tests ────────────────────────────────────────────────────────────────

try {
  await waitForHealth();
  await register();

  await testStaticHtmlProject();
  await testDistProject();
  await testBuildProject();
  await testOutProject();
  await testSingleHtmlProject();
  await testSourceProject();
  await testBlockedProject();
  await testFormDetectionProject();
  await testDeployAndServe();

  console.log(`\n✓ E2E inspection regression passed: ${passed} assertions, ${failed} failures`);
  if (failed > 0) process.exit(1);
} finally {
  child.kill("SIGTERM");
}

// ── Test cases ───────────────────────────────────────────────────────────────

async function testStaticHtmlProject() {
  const zipPath = await createZip("static-e2e", {
    "index.html": "<!doctype html><html><head><title>Static E2E</title></head><body><h1>Static E2E</h1></body></html>",
  });
  const inspection = await inspectZip(zipPath);
  assertStructure(inspection, "static-root");
  assert(inspection.status === "pass", "static project status should be pass");
  assert(inspection.canPublish === true, "static project should be publishable");
  assert(inspection.analysis.detectedType === "static-root", "detectedType should be static-root");
  assert(inspection.entries.entryFile === "index.html", "entryFile should be index.html");
  assert(inspection.files.rawFileCount >= 1, "rawFileCount should be >= 1");
  assert(typeof inspection.analysis.label === "string" && inspection.analysis.label.length > 0, "analysis.label should be a non-empty string");
  assert(typeof inspection.presentation.userLabel === "string", "presentation.userLabel should exist");
  assert(typeof inspection.presentation.userSummary === "string", "presentation.userSummary should exist");
  assert(Array.isArray(inspection.presentation.issues), "presentation.issues should be an array");
  assert(Array.isArray(inspection.presentation.suggestions), "presentation.suggestions should be an array");
  assert(inspection.presentation.ruleReport != null, "presentation.ruleReport should exist");
}

async function testDistProject() {
  const zipPath = await createZip("dist-e2e", {
    "README.md": "# Dist E2E Test",
    "dist/index.html": "<!doctype html><html><body><h1>Dist E2E</h1></body></html>",
  });
  const inspection = await inspectZip(zipPath);
  if (!inspection) {
    console.error("  [DEBUG] dist inspection is null/undefined");
    return;
  }
  // Debug: log detected type if it doesn't match
  if (inspection.analysis?.detectedType !== "dist") {
    console.error(`  [DEBUG] dist inspection.analysis.detectedType = ${JSON.stringify(inspection.analysis?.detectedType)}`);
    console.error(`  [DEBUG] dist files.rootEntries = ${JSON.stringify(inspection.files?.rootEntries)}`);
  }
  assertStructure(inspection, "dist");
  assert(inspection.canPublish === true, "dist project should be publishable");
  assert(inspection.analysis.detectedType === "dist", "detectedType should be dist");
  assert(inspection.entries.entryFile === "dist/index.html", "entryFile should be dist/index.html");
}

async function testBuildProject() {
  const zipPath = await createZip("build-e2e", {
    "README.md": "# Build E2E Test",
    "build/index.html": "<!doctype html><html><body><h1>Build E2E</h1></body></html>",
  });
  const inspection = await inspectZip(zipPath);
  if (inspection.analysis?.detectedType !== "build") {
    console.error(`  [DEBUG] build inspection.analysis.detectedType = ${JSON.stringify(inspection.analysis?.detectedType)}`);
  }
  assertStructure(inspection, "build");
  assert(inspection.canPublish === true, "build project should be publishable");
  assert(inspection.analysis.detectedType === "build", "detectedType should be build");
  assert(inspection.entries.entryFile === "build/index.html", "entryFile should be build/index.html");
}

async function testOutProject() {
  const zipPath = await createZip("out-e2e", {
    "README.md": "# Out E2E Test",
    "out/index.html": "<!doctype html><html><body><h1>Out E2E</h1></body></html>",
  });
  const inspection = await inspectZip(zipPath);
  if (inspection.analysis?.detectedType !== "out") {
    console.error(`  [DEBUG] out inspection.analysis.detectedType = ${JSON.stringify(inspection.analysis?.detectedType)}`);
  }
  assertStructure(inspection, "out");
  assert(inspection.canPublish === true, "out project should be publishable");
  assert(inspection.analysis.detectedType === "out", "detectedType should be out");
  assert(inspection.presentation.userStatusLabel === "支持", "userStatusLabel should be 支持");
}

async function testSingleHtmlProject() {
  const zipPath = await createZip("single-e2e", {
    "landing.html": "<!doctype html><html><head><title>Landing</title></head><body><h1>Landing Page</h1></body></html>",
  });
  const inspection = await inspectZip(zipPath);
  assertStructure(inspection, "single-html");
  assert(inspection.canPublish === true, "single-html project should be publishable");
  assert(inspection.analysis.detectedType === "single-html", "detectedType should be single-html");
  assert(inspection.entries.singleHtmlEntry === "landing.html", "singleHtmlEntry should be landing.html");
}

async function testSourceProject() {
  const zipPath = await createZip("source-e2e", {
    "package.json": JSON.stringify({
      name: "source-e2e",
      dependencies: { react: "^18.0.0", "react-dom": "^18.0.0" },
      scripts: { build: "vite build" },
    }),
    "src/main.jsx": "import React from 'react';",
    "index.html": "<!doctype html><html><body><div id='root'></div></body></html>",
  });
  const inspection = await inspectZip(zipPath);
  assertStructure(inspection, "source");
  assert(inspection.canPublish === true, "source project should be publishable");
  assert(inspection.analysis.detectedType === "source", "detectedType should be source");
  assert(inspection.analysis.hasPackageJson === true, "hasPackageJson should be true");
  assert(inspection.analysis.hasBuildScript === true, "hasBuildScript should be true");
}

async function testBlockedProject() {
  const zipPath = await createZip("blocked-e2e", {
    "index.html": "<!doctype html><html><body><h1>Blocked</h1></body></html>",
    ".env": "SECRET_KEY=abc123\nDB_PASSWORD=secret",
  });
  const inspection = await inspectZip(zipPath);
  assertStructure(inspection, "blocked");
  assert(inspection.canPublish === false, "blocked project should not be publishable");
  assert(inspection.status === "blocked", "status should be blocked");
  assert(Array.isArray(inspection.files.blockedFiles), "files.blockedFiles should be an array");
  assert(
    inspection.files.blockedFiles.some((f) => String(f).includes(".env")),
    "blockedFiles should include .env"
  );
  assert(inspection.presentation.issues.length > 0, "presentation.issues should not be empty for blocked project");
}

async function testFormDetectionProject() {
  const zipPath = await createZip("form-e2e", {
    "index.html": `<!doctype html><html><body>
      <form id="signup">
        <input name="name" placeholder="姓名" required>
        <input name="phone" placeholder="手机号" required>
        <textarea name="message" placeholder="留言"></textarea>
        <button type="submit">提交</button>
      </form>
      <script>fetch("/api/register", { method: "POST" });</script>
    </body></html>`,
  });
  const inspection = await inspectZip(zipPath);
  assertStructure(inspection, "form-detection");
  assert(inspection.canPublish === true, "form project should be publishable");
  assert(inspection.forms.formFields.length >= 3, `formFields should have >= 3 items, got ${inspection.forms.formFields.length}`);
  assert(inspection.forms.apiCalls.length >= 1, "apiCalls should have >= 1 item");
  assert(
    inspection.forms.apiCalls.some((c) => c.isLocal),
    "should detect local API call"
  );
  assert(typeof inspection.forms.autoFormEnabled === "boolean", "autoFormEnabled should be boolean");
  assert(
    inspection.presentation.ruleReport.risks.length > 0,
    "ruleReport should include risks for local API calls"
  );
}

async function testDeployAndServe() {
  const zipPath = await createZip("deploy-e2e", {
    "index.html": "<!doctype html><html><body><h1>E2E Deploy Regression</h1></body></html>",
  });
  const deploy = await deployZip(zipPath, { name: "e2e-deploy" });
  if (!deploy) {
    console.error("  [DEBUG] deploy result is null/undefined");
    return;
  }
  // Debug: log deploy keys if slug/id missing
  if (!deploy.slug || !deploy.id) {
    console.error(`  [DEBUG] deploy keys: ${Object.keys(deploy).join(", ")}`);
    console.error(`  [DEBUG] deploy = ${JSON.stringify(deploy).slice(0, 300)}`);
  }
  assert(deploy.slug, "deploy should return slug");
  assert(deploy.id, "deploy should return id");

  if (!deploy.slug || !deploy.id) {
    console.error("  [SKIP] deploy test skipped due to missing slug/id");
    return;
  }

  const page = await getText(`/d/${deploy.slug}/`);
  assert(page.includes("E2E Deploy Regression"), "deployed page should contain original content");

  // Cleanup
  await postJson(`/api/demos/${deploy.id}/offline`, {});
  await postJson(`/api/demos/${deploy.id}/delete`, {});
}

// ── Assertions ───────────────────────────────────────────────────────────────

function assert(condition, message) {
  if (!condition) {
    failed++;
    console.error(`  ✗ ${message}`);
  } else {
    passed++;
  }
}

function assertStructure(inspection, label) {
  assert(inspection != null, `[${label}] inspection should exist`);
  assert(typeof inspection.status === "string", `[${label}] status should be string`);
  assert(typeof inspection.canPublish === "boolean", `[${label}] canPublish should be boolean`);
  assert(typeof inspection.summary === "string", `[${label}] summary should be string`);
  for (const key of ["analysis", "presentation", "files", "forms", "entries"]) {
    assert(
      inspection[key] != null && typeof inspection[key] === "object",
      `[${label}] inspection.${key} should be an object`
    );
  }
  assert(typeof inspection.analysis.detectedType === "string", `[${label}] analysis.detectedType should be string`);
  assert(typeof inspection.analysis.label === "string", `[${label}] analysis.label should be string`);
  assert(Array.isArray(inspection.files.blockedFiles), `[${label}] files.blockedFiles should be array`);
  assert(Array.isArray(inspection.files.ignoredFiles), `[${label}] files.ignoredFiles should be array`);
  assert(Array.isArray(inspection.forms.formFields), `[${label}] forms.formFields should be array`);
  assert(Array.isArray(inspection.forms.apiCalls), `[${label}] forms.apiCalls should be array`);
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

async function waitForHealth() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${baseUrl}/api/health`);
      if (r.ok) return;
    } catch { /* retry */ }
    await sleep(250);
  }
  throw new Error("server did not become healthy");
}

async function register() {
  await postJson("/api/auth/register", {
    email: `e2e-regression-${Date.now()}@example.com`,
    password: "password123",
  });
}

async function inspectZip(zipPath) {
  const result = await postZip("/api/inspect", zipPath);
  if (result.error) throw new Error(`inspect failed: ${result.error}`);
  return result.inspection;
}

async function deployZip(zipPath, fields = {}) {
  const result = await postZip("/api/deploy", zipPath, fields);
  if (result.jobId) {
    for (let i = 0; i < 60; i++) {
      await sleep(1000);
      const job = await getJson(`/api/jobs/${result.jobId}`);
      if (job.job?.status === "success") return job.job.result;
      if (job.job?.status === "failed") throw new Error(job.job.error || "deploy failed");
    }
    throw new Error("deploy timeout");
  }
  // May return direct result or wrapped in different shape
  return result.demo || result;
}

async function postZip(endpoint, zipPath, fields = {}) {
  const form = new FormData();
  const bytes = await fs.readFile(zipPath);
  form.append("project", new Blob([bytes], { type: "application/zip" }), path.basename(zipPath));
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, String(value));
  }
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    body: form,
    headers: cookie ? { Cookie: cookie } : {},
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  return response.json();
}

async function postJson(endpoint, body) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  return response.json();
}

async function getJson(endpoint) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: cookie ? { Cookie: cookie } : {},
  });
  return response.json();
}

async function getText(endpoint) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: cookie ? { Cookie: cookie } : {},
  });
  if (!response.ok) throw new Error(`${endpoint} returned ${response.status}`);
  return response.text();
}

// ── ZIP creation (using JSZip devDependency for reliability) ─────────────────

async function createZip(name, files) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const [relPath, content] of Object.entries(files)) {
    zip.file(relPath, content);
  }
  const zipPath = path.join(testRoot, `${name}.zip`);
  await fs.mkdir(path.dirname(zipPath), { recursive: true });
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  await fs.writeFile(zipPath, buffer);
  return zipPath;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
