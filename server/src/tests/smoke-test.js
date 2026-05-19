import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { serviceVersion } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "../..");
const projectRoot = path.resolve(serverRoot, "..");
const testRoot = path.join(projectRoot, ".tmp", "smoke-test");
const port = 3119;
const baseUrl = `http://127.0.0.1:${port}`;
const adminUser = "admin";
const adminPassword = "admin-test-pass";

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
    DEMOGO_DEPLOY_RATE_LIMIT: "20",
    DEMOGO_BUILD_MODE: "host",
    DEMOGO_DB_HOST: "",
    DEMOGO_DB_NAME: "",
    DEMOGO_DB_USER: "",
    DEMOGO_DB_PASSWORD: ""
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let cookie = "";

try {
  await waitForHealth();
  await register();
  await testLoginRateLimit();
  await getJson("/api/me");
  await inspectDistAndBuildProjects();
  await inspectOutProjects();
  await inspectUnsupportedRuntimeProjects();
  await inspectFormApiProject();
  await inspectBlockedAndIgnoredFiles();
  await inspectBlockedContentProject();
  await inspectInvalidZip();
  await inspectUnsafeZip();
  await inspectAndDeployTarProjects();
  const zipPath = await createStaticZip();
  const inspection = await postZip("/api/inspect", zipPath);
  assert(inspection.inspection?.canPublish, "inspection should be publishable");
  const deploy = await postZip("/api/deploy", zipPath, { name: "demo" });
  assert(deploy.id, "deploy should return id");
  assert(deploy.ok, "deploy should return standardized ok");
  assert(deploy.projectName === "Smoke Demo", "deploy should return standardized projectName");
  assert(deploy.contentReviewStatus === "passed", "deploy should return standardized content review status");
  assert(deploy.name === "Smoke Demo", "generic archive/request name should be replaced by page title");
  assert((deploy.deploymentEvents || []).some((item) => item.eventType === "success" && item.status === "success"), "deploy should return deployment success events");
  const demoDetail = await getJson(`/api/demos/${deploy.id}`);
  assert(demoDetail.demo?.id === deploy.id, "demo detail should return deployed demo");
  assert((demoDetail.events || []).length > 0, "demo detail should include deployment events");
  const demoEvents = await getJson(`/api/demos/${deploy.id}/events`);
  assert((demoEvents.events || []).some((item) => item.eventType === "success"), "demo events API should include success step");
  const demoInspection = await getJson(`/api/demos/${deploy.id}/inspection`);
  assert(demoInspection.inspection?.canPublish, "demo inspection API should return latest inspection");
  const page = await getText(`/d/${deploy.slug}/`);
  assert(page.includes("Smoke Demo"), "published page should contain original content");
  const deepRoutePage = await getText(`/d/${deploy.slug}/dashboard/settings`);
  assert(deepRoutePage.includes("Smoke Demo"), "SPA deep routes should fall back to index.html");
  await testFormHosting(deploy);
  const updateZipPath = await createStaticZip("smoke-demo-update", "Smoke Demo Updated");
  const update = await postZip(`/api/demos/${deploy.id}/update`, updateZipPath);
  assert(update.version === 2, "demo update should increment version");
  const deployEvents = await getJson("/api/deploy-events");
  assert(deployEvents.month?.used >= 2, "deploy events should include create and update usage");
  assert((deployEvents.events || []).some((item) => item.demoId === deploy.id && item.type === "update"), "deploy event list should include update event");
  const updatedPage = await getText(`/d/${deploy.slug}/`);
  assert(updatedPage.includes("Smoke Demo Updated"), "updated page should contain new content");
  await postJson("/api/feedback", {
    type: "suggestion",
    demoId: deploy.id,
    message: "smoke test feedback"
  });
  const planRequest = await postJson("/api/plan-upgrade-requests", {
    plan: "pro",
    contact: "smoke@example.com",
    message: "Need more demo capacity for smoke test"
  });
  assert(planRequest.request?.status === "open", "plan upgrade request should be open");
  const duplicatePlanRequest = await postJsonExpectStatus("/api/plan-upgrade-requests", {
    plan: "lite",
    contact: "smoke@example.com",
    message: "Duplicate request"
  }, 409);
  assert(duplicatePlanRequest.error, "duplicate open plan request should be rejected");
  const users = await adminGet("/api/admin/users");
  const userId = users.users?.[0]?.id;
  assert(userId, "admin users should include created user");
  const planRequests = await adminGet("/api/admin/plan-upgrade-requests");
  const planRequestId = planRequests.requests?.[0]?.id;
  assert(planRequestId, "admin plan requests should include submitted request");
  await adminPost(`/api/admin/plan-upgrade-requests/${planRequestId}/status`, { status: "approved" });
  const approvedRequests = await adminGet("/api/admin/plan-upgrade-requests?status=approved");
  assert(approvedRequests.requests?.some((item) => item.id === planRequestId), "approved plan request should be filterable");
  const refreshedMe = await getJson("/api/me");
  assert(refreshedMe.user?.plan === "pro", "approved plan request should update user plan");
  await testDeploymentJobs();
  await inspectAndDeploySingleHtmlProject();
  await inspectCalculatorControls();
  await testAutoFormHosting();
  await testAgentDeployApi();
  await inspectAndDeploySourceShellProject();
  const downgradePlanRequest = await postJsonExpectStatus("/api/plan-upgrade-requests", {
    plan: "lite",
    contact: "smoke@example.com",
    message: "Should not downgrade from pro"
  }, 400);
  assert(downgradePlanRequest.error, "lower plan request should be rejected after pro is active");
  const feedback = await adminGet("/api/admin/feedback");
  const feedbackId = feedback.feedback?.[0]?.id;
  assert(feedbackId, "admin feedback should include submitted feedback");
  await adminPost(`/api/admin/feedback/${feedbackId}/status`, { status: "resolved" });
  await postJson(`/api/demos/${deploy.id}/offline`, {});
  await postJson(`/api/demos/${deploy.id}/restore`, {});
  await postJson(`/api/demos/${deploy.id}/offline`, {});
  await postJson(`/api/demos/${deploy.id}/delete`, {});
  await postJson("/api/auth/logout", {});
  console.log("OK smoke test passed");
} finally {
  child.kill("SIGTERM");
}

async function testFormHosting(demo) {
  const created = await postJson("/api/forms", {
    demoId: demo.id,
    name: "smoke signup",
    fields: [
      { name: "name", label: "姓名", type: "text", required: true },
      { name: "phone", label: "手机号", type: "phone", required: true }
    ]
  });
  assert(created.form?.id, "form hosting should create a form");
  assert(created.form?.submitUrl?.includes("/api/public/forms/"), "form should expose a public submit URL");

  const forms = await getJson("/api/forms");
  assert(forms.forms?.some((item) => item.id === created.form.id), "created form should appear in user form list");
  assert(forms.quota?.forms?.used === 1, "form quota should count the active form");

  const duplicateCreate = await postJson("/api/forms", {
    demoId: demo.id,
    name: "duplicate should reuse"
  });
  assert(duplicateCreate.form?.id === created.form.id, "creating form twice for one demo should reuse existing form");

  const submitPath = new URL(created.form.submitUrl).pathname;
  const submitted = await postJson(submitPath, {
    name: "Smoke User",
    phone: "13800000000",
    ignored: "should not be stored"
  });
  assert(submitted.ok, "public form submit should succeed");

  const detail = await getJson(`/api/forms/${created.form.id}`);
  assert(detail.submissions?.length === 1, "form detail should include submitted record");
  assert(detail.submissions?.[0]?.payload?.name === "Smoke User", "submission payload should include allowed field");
  assert(!("ignored" in (detail.submissions?.[0]?.payload || {})), "submission payload should ignore undeclared field");

  const overview = await adminGet("/api/admin/overview");
  assert((overview.metrics?.forms || 0) >= 1, "admin overview should include form count");
  assert((overview.metrics?.formSubmissions || 0) >= 1, "admin overview should include form submission count");

  const adminForms = await adminGet("/api/admin/forms");
  assert(adminForms.forms?.some((item) => item.id === created.form.id), "admin forms API should include created form");
}

async function testDeploymentJobs() {
  const jobZip = await createStaticZip("async-job-demo", "Async Job Demo");
  const created = await postZip("/api/deployment-jobs", jobZip, { name: "async-job-demo" }, { expectedStatus: 202 });
  assert(created.job?.id, "deployment job should return id");
  assert(created.job?.status === "queued" || created.job?.status === "running", "deployment job should start queued or running");
  const completed = await waitDeploymentJob(created.job.id);
  assert(completed.status === "success", "deployment job should succeed");
  assert(completed.result?.id, "deployment job should expose deploy result");
  assert(completed.result?.publicUrl, "deployment job should expose public URL");
  assert((completed.steps || []).some((item) => item.eventType === "success" && item.status === "success"), "deployment job should include success step");
  const page = await getText(`/d/${completed.result.slug}/`);
  assert(page.includes("Async Job Demo"), "deployment job page should contain original content");

  const updateZip = await createStaticZip("async-job-demo-update", "Async Job Demo Updated");
  const updateStarted = await postZip(`/api/demos/${completed.result.id}/deployment-jobs`, updateZip, {}, { expectedStatus: 202 });
  const updated = await waitDeploymentJob(updateStarted.job.id);
  assert(updated.status === "success", "update deployment job should succeed");
  assert(updated.result?.version >= 2, "update deployment job should increment version");
  const updatedPage = await getText(`/d/${completed.result.slug}/`);
  assert(updatedPage.includes("Async Job Demo Updated"), "update deployment job should publish new content");

  await postJson(`/api/demos/${completed.result.id}/offline`, {});
  await postJson(`/api/demos/${completed.result.id}/delete`, {});
}

async function testAutoFormHosting() {
  const zipPath = await createZipFromFiles("auto-form-demo", {
    "index.html": `<!doctype html>
      <html>
        <body>
          <h1>Auto Form Demo</h1>
          <form id="signup">
            <input name="name" placeholder="姓名" required>
            <input name="phone" placeholder="手机号" required>
            <textarea name="message" placeholder="留言"></textarea>
            <button type="submit">提交</button>
          </form>
        </body>
      </html>`
  });
  const deploy = await postZip("/api/deploy", zipPath, { name: "auto-form-demo" });
  assert(deploy.inspection?.autoFormEnabled, "deploy should auto-enable form hosting when form fields are detected");
  assert(deploy.inspection?.autoFormSubmitUrl?.includes("/api/public/forms/"), "auto form should expose submit URL");
  const page = await getText(`/d/${deploy.slug}/`);
  assert(page.includes("__DEMOGO_AUTO_FORM__"), "published page should include auto form submit script");

  const forms = await getJson("/api/forms");
  const form = forms.forms?.find((item) => item.demoId === deploy.id);
  assert(form?.id, "auto-created form should appear in user form list");

  const submitPath = new URL(form.submitUrl).pathname;
  const submitted = await postJson(submitPath, {
    name: "Auto User",
    phone: "13900000000",
    message: "Auto form submit"
  });
  assert(submitted.ok, "auto form public submit should succeed");

  const detail = await getJson(`/api/forms/${form.id}`);
  assert(detail.submissions?.some((item) => item.payload?.name === "Auto User"), "auto form detail should include submitted record");
  await postJson(`/api/demos/${deploy.id}/offline`, {});
  await postJson(`/api/demos/${deploy.id}/delete`, {});
}

async function testAgentDeployApi() {
  const overviewBefore = await adminGet("/api/admin/overview");
  const aiDeploysBefore = Number(overviewBefore.metrics?.aiDeploys || 0);
  const deploySuccessesBefore = Number(overviewBefore.metrics?.deploySuccesses || 0);
  const emptyToken = await getJson("/api/agent-token");
  assert(!emptyToken.token?.enabled, "agent token should be disabled before reset");
  const tokenPayload = await postJson("/api/agent-token", {});
  assert(tokenPayload.token?.value?.startsWith("dmg_"), "agent token reset should return one-time token value");
  const tokenStatus = await getJson("/api/agent-token");
  assert(tokenStatus.token?.enabled, "agent token should be enabled after reset");
  assert(!tokenStatus.token?.value, "agent token status should not return secret value");

  const agentZip = await createStaticZip("agent-demo", "Agent Demo");
  const agentDeploy = await postZip("/api/agent/deploy", agentZip, { name: "agent-demo" }, {
    headers: {
      Authorization: `Bearer ${tokenPayload.token.value}`,
      "X-DemoGo-Deploy-Source": "cli",
      "User-Agent": "demogo-cli/0.2.3"
    }
  });
  assert(agentDeploy.ok, "agent deploy should return ok");
  assert(agentDeploy.publicUrl, "agent deploy should return public URL");
  assert(agentDeploy.projectName || agentDeploy.name, "agent deploy should return project name");
  assert(agentDeploy.deploySourceLabel, "agent deploy should return source label");
  assert(typeof agentDeploy.autoFormEnabled === "boolean", "agent deploy should return auto form flag");
  assert(agentDeploy.contentReviewStatus === "passed", "agent deploy should return content review status");
  assert(agentDeploy.deploySource === "cli", "agent deploy should record CLI source");
  const page = await getText(`/d/${agentDeploy.slug}/`);
  assert(page.includes("Agent Demo"), "agent deployed page should contain original content");
  const overviewAfter = await adminGet("/api/admin/overview");
  assert((overviewAfter.demos || []).some((item) => item.id === agentDeploy.id && item.deploySource === "cli"), "admin overview should expose deploy source");
  assert(Number(overviewAfter.metrics?.aiDeploys || 0) >= aiDeploysBefore + 1, "admin overview should count agent deploys");
  assert(Number(overviewAfter.metrics?.deploySuccesses || 0) >= deploySuccessesBefore + 1, "admin overview should count successful deploys");
  assert(overviewAfter.metrics?.failureReasons && typeof overviewAfter.metrics.failureReasons === "object", "admin overview should include failure reason buckets");
  await postJson(`/api/demos/${agentDeploy.id}/offline`, {});
  await postJson(`/api/demos/${agentDeploy.id}/delete`, {});
}

async function inspectCalculatorControls() {
  const zipPath = await createZipFromFiles("price-calculator-demo", {
    "index.html": `<!doctype html>
      <html>
        <head><title>AI 费用计算器</title></head>
        <body>
          <h1>AI 费用计算器</h1>
          <form id="calculator">
            <input name="priceDeepSeekInput" placeholder="DeepSeek 价格">
            <input name="priceGPTInput" placeholder="GPT 价格">
            <input name="feeToggle" type="checkbox">
            <button type="submit">计算</button>
          </form>
        </body>
      </html>`
  });
  const inspection = await postZip("/api/inspect", zipPath);
  assert(inspection.inspection?.canPublish, "calculator page should be publishable");
  assert((inspection.inspection?.formFields || []).length >= 2, "calculator controls should be visible in inspection");
  const deploy = await postZip("/api/deploy", zipPath, { name: "demogo" });
  assert(deploy.name === "AI 费用计算器", "generic project name should use page title");
  assert(!deploy.inspection?.autoFormEnabled, "calculator controls should not auto-enable form hosting");
  assert((deploy.inspection?.autoFormReason || "").includes("不像报名"), "calculator skip reason should explain non-collection controls");
  await postJson(`/api/demos/${deploy.id}/offline`, {});
  await postJson(`/api/demos/${deploy.id}/delete`, {});
}

async function inspectAndDeploySingleHtmlProject() {
  const zipPath = await createZipFromFiles("single-html-demo", {
    "landing-page.html": `<!doctype html>
      <html>
        <head><title>春季活动报名页</title></head>
        <body><h1>春季活动报名页</h1><p>DemoGo single html smoke test</p></body>
      </html>`
  });
  const inspection = await postZip("/api/inspect", zipPath);
  assert(inspection.inspection?.canPublish, "single html project should be publishable");
  assert(inspection.inspection?.detectedType === "single-html", "single html project should be detected");
  assert(inspection.inspection?.entryFile === "landing-page.html", "single html entry should be recorded");
  const deploy = await postZip("/api/deploy", zipPath, { name: "project" });
  assert(deploy.name === "春季活动报名页", "single html generic name should use title");
  assert(deploy.detectedType === "single-html", "single html deploy should keep detected type");
  const page = await getText(`/d/${deploy.slug}/`);
  assert(page.includes("DemoGo single html smoke test"), "single html page should be served as homepage");
  await postJson(`/api/demos/${deploy.id}/offline`, {});
  await postJson(`/api/demos/${deploy.id}/delete`, {});
}

async function waitForHealth() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const health = await getJson("/api/health");
      if (health.version === serviceVersion) return;
    } catch {
      await sleep(250);
    }
  }
  throw new Error("server did not become healthy");
}

async function register() {
  const email = `smoke-${Date.now()}@example.com`;
  await postJson("/api/auth/register", {
    email,
    password: "password123"
  });
}

async function testLoginRateLimit() {
  await postJson("/api/auth/logout", {});
  for (let index = 0; index < 5; index += 1) {
    const failed = await postJsonExpectStatus("/api/auth/login", {
      email: "missing@example.com",
      password: "wrong-password"
    }, 401);
    assert(failed.error, "failed login should return readable error");
  }
  const limited = await postJsonExpectStatus("/api/auth/login", {
    email: "missing@example.com",
    password: "wrong-password"
  }, 429);
  assert(limited.error?.includes("登录尝试过多"), "login failures should be rate limited");
  await register();
}

async function inspectDistAndBuildProjects() {
  const distZip = await createZipFromFiles("dist-demo", {
    "README.md": "dist entry smoke test",
    "dist/index.html": "<!doctype html><html><body><h1>Dist Demo</h1></body></html>"
  });
  const distInspection = await postZip("/api/inspect", distZip);
  assert(distInspection.inspection?.canPublish, "dist project should be publishable");
  assert(distInspection.inspection?.entryFile === "dist/index.html", "dist project should detect dist/index.html");
  assert(distInspection.inspection?.detectedType === "dist", "dist project should be detected as dist");

  const buildZip = await createZipFromFiles("build-demo", {
    "README.md": "build entry smoke test",
    "build/index.html": "<!doctype html><html><body><h1>Build Demo</h1></body></html>"
  });
  const buildInspection = await postZip("/api/inspect", buildZip);
  assert(buildInspection.inspection?.canPublish, "build project should be publishable");
  assert(buildInspection.inspection?.entryFile === "build/index.html", "build project should detect build/index.html");
  assert(buildInspection.inspection?.detectedType === "build", "build project should be detected as build");
}

async function inspectOutProjects() {
  const outZip = await createZipFromFiles("out-demo", {
    "README.md": "out entry smoke test",
    "out/index.html": "<!doctype html><html><body><h1>Out Demo</h1></body></html>"
  });
  const outInspection = await postZip("/api/inspect", outZip);
  assert(outInspection.inspection?.canPublish, "out project should be publishable");
  assert(outInspection.inspection?.entryFile === "out/index.html", "out project should detect out/index.html");
  assert(outInspection.inspection?.detectedType === "out", "out project should be detected as out");
  assert(outInspection.inspection?.userStatusLabel === "支持", "out project should have user-facing supported label");
}

async function inspectUnsupportedRuntimeProjects() {
  const backendZip = await createZipFromFiles("backend-demo", {
    "package.json": JSON.stringify({
      scripts: {
        start: "node server.js"
      }
    }),
    "server.js": "console.log('server only');"
  });
  const backendInspection = await postZip("/api/inspect", backendZip);
  assert(!backendInspection.inspection?.canPublish, "backend project should not be publishable");
  assert(backendInspection.inspection?.userStatusLabel === "暂不支持", "backend project should have unsupported user label");
  assert((backendInspection.inspection?.unsupportedNotes || []).some((item) => item.includes("服务器")), "backend project should explain server requirement");
  const noBuildSourceZip = await createZipFromFiles("source-no-build-demo", {
    "package.json": JSON.stringify({
      scripts: {
        dev: "vite"
      },
      dependencies: {
        vite: "latest"
      }
    }),
    "src/main.jsx": "console.log('no build script');",
    "src/index.jsx": "console.log('no build script');"
  });
  const noBuildInspection = await postZip("/api/inspect", noBuildSourceZip);
  assert(!noBuildInspection.inspection?.canPublish, "source project without build script should be blocked during inspection");
  assert((noBuildInspection.inspection?.issues || []).length > 0, "source project without build script should explain missing generation command");
}

async function inspectFormApiProject() {
  const zipPath = await createZipFromFiles("form-api-demo", {
    "index.html": `<!doctype html>
      <html>
        <body>
          <form id="signup">
            <input name="name" placeholder="姓名" required>
            <input name="phone" placeholder="手机号" required>
            <input name="company" placeholder="公司">
            <textarea name="message" placeholder="留言"></textarea>
            <button type="submit">提交</button>
          </form>
          <script>
            document.getElementById("signup").addEventListener("submit", function (event) {
              event.preventDefault();
              fetch("/api/register", { method: "POST", body: JSON.stringify({ name: "test" }) });
            });
          </script>
        </body>
      </html>`
  });
  const inspection = await postZip("/api/inspect", zipPath);
  assert(inspection.inspection?.canPublish, "form API project should still be publishable with warning");
  assert((inspection.inspection?.formFields || []).length >= 4, "form API project should detect form fields");
  assert((inspection.inspection?.apiCalls || []).some((item) => item.url === "/api/register" && item.isLocal), "form API project should detect local API call");
  assert((inspection.inspection?.ruleReport?.risks || []).length > 0, "form API project should include rule report risks");
}

async function inspectBlockedAndIgnoredFiles() {
  const envZip = await createZipFromFiles("blocked-env-demo", {
    "index.html": "<!doctype html><html><body><h1>Blocked Env</h1></body></html>",
    ".env": "SECRET_SHOULD_NOT_DEPLOY=1"
  });
  const envInspection = await postZip("/api/inspect", envZip);
  assert(!envInspection.inspection?.canPublish, ".env project should be blocked");
  assert((envInspection.inspection?.blockedFiles || []).includes(".env"), ".env project should list blocked .env file");

  const ignoredZip = await createZipFromFiles("ignored-node-modules-demo", {
    "index.html": "<!doctype html><html><body><h1>Ignored Node Modules</h1></body></html>",
    "node_modules/example/index.js": "module.exports = true;",
    ".microcompact/run-log.txt": "AI tool internal log should not be published"
  });
  const ignoredInspection = await postZip("/api/inspect", ignoredZip);
  assert(ignoredInspection.inspection?.canPublish, "node_modules project should remain publishable");
  assert((ignoredInspection.inspection?.ignoredFiles || []).some((item) => item.includes("node_modules")), "node_modules project should list ignored files");
  assert((ignoredInspection.inspection?.ignoredFiles || []).some((item) => item.includes(".microcompact")), "AI tool internal folders should be ignored");
}

async function inspectBlockedContentProject() {
  const fraudZip = await createZipFromFiles("fraud-demo", {
    "index.html": `<!doctype html><html><body><h1>高额回报</h1><p>导师带单，稳赚不赔，先垫付后返利。</p></body></html>`
  });
  const inspection = await postZip("/api/inspect", fraudZip);
  assert(!inspection.inspection?.canPublish, "fraud content should not be publishable during inspection");
  assert(inspection.inspection?.contentReview?.status === "blocked", "fraud content should be blocked by content review");

  const deploy = await postZipExpectStatus("/api/deploy", fraudZip, { name: "fraud-demo" }, 400);
  assert(deploy.contentReview?.status === "blocked" || deploy.inspection?.contentReview?.status === "blocked", "fraud content deploy should be blocked before public link");

  const reviews = await adminGet("/api/admin/content-reviews");
  const blockedReview = (reviews.reviews || []).find((item) => item.status === "blocked");
  assert(blockedReview, "admin should see blocked content review");
  assert(blockedReview.resolutionStatus === "pending", "blocked content review should wait for admin handling");
  const handled = await adminPost(`/api/admin/content-reviews/${blockedReview.id}/status`, {
    resolutionStatus: "confirmed_violation",
    adminNote: "smoke test confirmed"
  });
  assert(handled.review?.resolutionStatus === "confirmed_violation", "admin should update content review resolution");
  const confirmed = await adminGet("/api/admin/content-reviews?resolutionStatus=confirmed_violation");
  assert((confirmed.reviews || []).some((item) => item.id === blockedReview.id), "admin should filter handled content reviews");
}

async function inspectInvalidZip() {
  const zipPath = path.join(testRoot, "invalid-ended.zip");
  await fs.writeFile(zipPath, Buffer.from("not a complete zip file"));
  const inspection = await postZipExpectStatus("/api/inspect", zipPath, {}, 400);
  assert(inspection.error?.includes("压缩包不完整或格式异常"), "invalid zip should return a readable error");
  assert(inspection.inspection?.status === "blocked", "invalid zip inspection should be blocked");
  assert(!inspection.inspection?.canPublish, "invalid zip should not be publishable");
  assert((inspection.inspection?.suggestions || []).some((item) => item.includes("重新压缩")), "invalid zip should suggest repacking");
}

async function inspectUnsafeZip() {
  const zipPath = path.join(testRoot, "unsafe-zip.zip");
  await writeMinimalZip(zipPath, "../index.html", "<!doctype html><html><body>Unsafe ZIP</body></html>");
  const unsafe = await postZipExpectStatus("/api/inspect", zipPath, {}, 400);
  assert(unsafe.error?.includes("不安全"), "unsafe zip should be rejected");
}

async function inspectAndDeployTarProjects() {
  const tarPath = await createTarGzFromFiles("tar-static-demo", {
    "index.html": "<!doctype html><html><body><h1>Tar Demo</h1></body></html>"
  });
  const tarInspection = await postZip("/api/inspect", tarPath);
  assert(tarInspection.inspection?.canPublish, "tar.gz project should be publishable");
  const tarDeploy = await postZip("/api/deploy", tarPath, { name: "tar-demo" });
  assert(tarDeploy.id, "tar.gz deploy should return id");
  const tarPage = await getText(`/d/${tarDeploy.slug}/`);
  assert(tarPage.includes("Tar Demo"), "tar.gz published page should contain original content");
  await postJson(`/api/demos/${tarDeploy.id}/offline`, {});
  await postJson(`/api/demos/${tarDeploy.id}/delete`, {});

  const tgzPath = await createTarGzFromFiles("tgz-static-demo", {
    "index.html": "<!doctype html><html><body><h1>TGZ Demo</h1></body></html>"
  }, ".tgz");
  const tgzInspection = await postZip("/api/inspect", tgzPath);
  assert(tgzInspection.inspection?.canPublish, "tgz project should be publishable");

  const unsafeTarPath = await createUnsafeTarGz();
  const unsafe = await postZipExpectStatus("/api/inspect", unsafeTarPath, {}, 400);
  assert(unsafe.error?.includes("不安全"), "unsafe tar.gz should be rejected");
}

async function inspectAndDeploySourceShellProject() {
  const sourceZip = await createZipFromFiles("source-shell-demo", {
    "package.json": JSON.stringify({
      scripts: {
        build: "node build.js"
      }
    }),
    "index.html": "<!doctype html><html><body><div id=\"root\"></div></body></html>",
    "src/index.tsx": "console.log('source shell demo');",
    "webpack.config.js": "module.exports = {};",
    "build.js": [
      "import fs from 'node:fs/promises';",
      "await fs.mkdir('dist', { recursive: true });",
      "await fs.writeFile('dist/index.html', '<!doctype html><html><body><h1>Built Source Demo</h1></body></html>');"
    ].join("\n")
  });
  const inspection = await postZip("/api/inspect", sourceZip);
  assert(inspection.inspection?.canPublish, "source shell project should be publishable");
  assert(inspection.inspection?.detectedType === "source", "source shell project should be detected as source");
  const deploy = await postZip("/api/deploy", sourceZip, { name: "source-shell-demo" });
  assert(deploy.detectedType === "built-dist", "source shell project should publish built dist output");
  const page = await getText(`/d/${deploy.slug}/`);
  assert(page.includes("Built Source Demo"), "source shell project should serve built output, not root shell html");
  await postJson(`/api/demos/${deploy.id}/offline`, {});
  await postJson(`/api/demos/${deploy.id}/delete`, {});

  const outSourceZip = await createZipFromFiles("source-out-demo", {
    "package.json": JSON.stringify({
      scripts: {
        build: "node build.js"
      }
    }),
    "src/main.jsx": "console.log('source out demo');",
    "vite.config.js": "export default {};",
    "build.js": [
      "import fs from 'node:fs/promises';",
      "await fs.mkdir('out', { recursive: true });",
      "await fs.writeFile('out/index.html', '<!doctype html><html><body><h1>Built Out Demo</h1></body></html>');"
    ].join("\n")
  });
  const outDeploy = await postZip("/api/deploy", outSourceZip, { name: "source-out-demo" });
  assert(outDeploy.detectedType === "built-out", "source out project should publish built out output");
  const outPage = await getText(`/d/${outDeploy.slug}/`);
  assert(outPage.includes("Built Out Demo"), "source out project should serve built out output");
  await postJson(`/api/demos/${outDeploy.id}/offline`, {});
  await postJson(`/api/demos/${outDeploy.id}/delete`, {});
}

async function createStaticZip(name = "smoke-demo", title = "Smoke Demo") {
  return createZipFromFiles(name, {
    "index.html": `<!doctype html><html><body><h1>${title}</h1></body></html>`
  });
}

async function createZipFromFiles(name, files) {
  const sourceDir = path.join(testRoot, name);
  const zipPath = path.join(testRoot, `${name}.zip`);
  await fs.rm(sourceDir, { recursive: true, force: true });
  await fs.mkdir(sourceDir, { recursive: true });

  for (const [relativePath, content] of Object.entries(files)) {
    const targetPath = path.join(sourceDir, relativePath);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, content, "utf8");
  }

  await writeZipFromDirectory(sourceDir, zipPath);
  return zipPath;
}

async function writeZipFromDirectory(sourceDir, zipPath) {
  const files = [];
  await collectZipFiles(sourceDir, sourceDir, files);
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const item of files) {
    const name = Buffer.from(item.relativePath.replace(/\\/g, "/"));
    const data = await fs.readFile(item.fullPath);
    const crc = crc32(data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, name, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);
    offset += localHeader.length + name.length + data.length;
  }

  const centralDirectoryOffset = offset;
  const centralDirectorySize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(files.length, 8);
  endRecord.writeUInt16LE(files.length, 10);
  endRecord.writeUInt32LE(centralDirectorySize, 12);
  endRecord.writeUInt32LE(centralDirectoryOffset, 16);
  endRecord.writeUInt16LE(0, 20);

  await fs.writeFile(zipPath, Buffer.concat([...localParts, ...centralParts, endRecord]));
}

async function collectZipFiles(rootDir, currentDir, result) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await collectZipFiles(rootDir, fullPath, result);
      continue;
    }
    if (!entry.isFile()) continue;
    result.push({
      fullPath,
      relativePath: path.relative(rootDir, fullPath).replace(/\\/g, "/")
    });
  }
}

async function createTarGzFromFiles(name, files, extension = ".tar.gz") {
  const sourceDir = path.join(testRoot, name);
  const archivePath = path.join(testRoot, `${name}${extension}`);
  await fs.rm(sourceDir, { recursive: true, force: true });
  await fs.mkdir(sourceDir, { recursive: true });

  for (const [relativePath, content] of Object.entries(files)) {
    const targetPath = path.join(sourceDir, relativePath);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, content, "utf8");
  }

  const shell = process.platform === "win32"
    ? spawn("tar", ["-czf", archivePath, "-C", sourceDir, "."])
    : spawn("tar", ["-czf", archivePath, "-C", sourceDir, "."]);
  await waitProcess(shell);
  return archivePath;
}

async function createUnsafeTarGz() {
  const archivePath = path.join(testRoot, "unsafe-tar.tar.gz");
  const content = Buffer.from("<!doctype html><html><body>Unsafe</body></html>");
  const header = createTarHeader("../index.html", content.length);
  const padding = Buffer.alloc((512 - (content.length % 512)) % 512);
  const end = Buffer.alloc(1024);
  await fs.writeFile(archivePath, gzipSync(Buffer.concat([header, content, padding, end])));
  return archivePath;
}

function createTarHeader(name, size) {
  const header = Buffer.alloc(512, 0);
  writeTarField(header, name, 0, 100);
  writeTarField(header, "0000644", 100, 8);
  writeTarField(header, "0000000", 108, 8);
  writeTarField(header, "0000000", 116, 8);
  writeTarField(header, size.toString(8).padStart(11, "0"), 124, 12);
  writeTarField(header, Math.floor(Date.now() / 1000).toString(8).padStart(11, "0"), 136, 12);
  header.fill(0x20, 148, 156);
  header[156] = "0".charCodeAt(0);
  writeTarField(header, "ustar", 257, 6);
  writeTarField(header, "00", 263, 2);
  let checksum = 0;
  for (const byte of header) checksum += byte;
  writeTarField(header, checksum.toString(8).padStart(6, "0"), 148, 8);
  header[154] = 0;
  header[155] = 0x20;
  return header;
}

function writeTarField(header, value, offset, length) {
  const bytes = Buffer.from(String(value));
  bytes.copy(header, offset, 0, Math.min(bytes.length, length - 1));
}

async function writeMinimalZip(zipPath, fileName, content) {
  const name = Buffer.from(fileName);
  const data = Buffer.from(content);
  const crc = crc32(data);
  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(0, 6);
  localHeader.writeUInt16LE(0, 8);
  localHeader.writeUInt16LE(0, 10);
  localHeader.writeUInt16LE(0, 12);
  localHeader.writeUInt32LE(crc, 14);
  localHeader.writeUInt32LE(data.length, 18);
  localHeader.writeUInt32LE(data.length, 22);
  localHeader.writeUInt16LE(name.length, 26);
  localHeader.writeUInt16LE(0, 28);

  const centralHeader = Buffer.alloc(46);
  centralHeader.writeUInt32LE(0x02014b50, 0);
  centralHeader.writeUInt16LE(20, 4);
  centralHeader.writeUInt16LE(20, 6);
  centralHeader.writeUInt16LE(0, 8);
  centralHeader.writeUInt16LE(0, 10);
  centralHeader.writeUInt16LE(0, 12);
  centralHeader.writeUInt16LE(0, 14);
  centralHeader.writeUInt32LE(crc, 16);
  centralHeader.writeUInt32LE(data.length, 20);
  centralHeader.writeUInt32LE(data.length, 24);
  centralHeader.writeUInt16LE(name.length, 28);
  centralHeader.writeUInt16LE(0, 30);
  centralHeader.writeUInt16LE(0, 32);
  centralHeader.writeUInt16LE(0, 34);
  centralHeader.writeUInt16LE(0, 36);
  centralHeader.writeUInt32LE(0, 38);
  centralHeader.writeUInt32LE(0, 42);

  const centralDirectoryOffset = localHeader.length + name.length + data.length;
  const centralDirectorySize = centralHeader.length + name.length;
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(1, 8);
  endRecord.writeUInt16LE(1, 10);
  endRecord.writeUInt32LE(centralDirectorySize, 12);
  endRecord.writeUInt32LE(centralDirectoryOffset, 16);
  endRecord.writeUInt16LE(0, 20);

  await fs.writeFile(zipPath, Buffer.concat([
    localHeader,
    name,
    data,
    centralHeader,
    name,
    endRecord
  ]));
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function postZip(endpoint, zipPath, fields = {}, options = {}) {
  const form = new FormData();
  const bytes = await fs.readFile(zipPath);
  const type = zipPath.endsWith(".zip") ? "application/zip" : "application/gzip";
  form.append("project", new Blob([bytes], { type }), path.basename(zipPath));
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, String(value));
  }
  return requestJson(endpoint, {
    method: "POST",
    body: form,
    ...options
  });
}

async function postZipExpectStatus(endpoint, zipPath, fields = {}, status) {
  return postZip(endpoint, zipPath, fields, { expectedStatus: status });
}

async function waitDeploymentJob(jobId) {
  for (let index = 0; index < 80; index += 1) {
    const payload = await getJson(`/api/deployment-jobs/${jobId}`);
    if (payload.job?.status === "success" || payload.job?.status === "failed") {
      return payload.job;
    }
    await sleep(250);
  }
  throw new Error(`deployment job ${jobId} did not finish`);
}

async function getJson(endpoint) {
  return requestJson(endpoint);
}

async function getText(endpoint) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: cookie ? { Cookie: cookie } : {}
  });
  if (!response.ok) throw new Error(`${endpoint} returned ${response.status}`);
  return response.text();
}

async function postJson(endpoint, body) {
  return requestJson(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function postJsonExpectStatus(endpoint, body, status) {
  return requestJson(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    expectedStatus: status
  });
}

async function adminGet(endpoint) {
  return requestJson(endpoint, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${adminUser}:${adminPassword}`).toString("base64")}`
    }
  });
}

async function adminPost(endpoint, body) {
  return requestJson(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${adminUser}:${adminPassword}`).toString("base64")}`
    },
    body: JSON.stringify(body)
  });
}

async function requestJson(endpoint, options = {}) {
  const headers = {
    ...(options.headers || {})
  };
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    cookie = setCookie.split(";")[0];
  }
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (options.expectedStatus && response.status !== options.expectedStatus) {
    throw new Error(`${endpoint} returned ${response.status}, expected ${options.expectedStatus}: ${text}`);
  }
  if (!options.expectedStatus && !response.ok) {
    throw new Error(`${endpoint} returned ${response.status}: ${text}`);
  }
  return payload;
}

function waitProcess(proc) {
  return new Promise((resolve, reject) => {
    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`process exited with code ${code}`));
    });
    proc.on("error", reject);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(value, message) {
  if (!value) throw new Error(message);
}
