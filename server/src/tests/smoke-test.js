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
globalThis.__demogoBaseUrl = baseUrl;
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
    DEMOGO_EMAIL_VERIFICATION_ENABLED: "0",
    DEMOGO_DEPLOY_RATE_LIMIT: "20",
      DEMOGO_RATE_LIMIT_DISABLED: "1",
    DEMOGO_RATE_LIMIT_DISABLED: "1",
    DEMOGO_BUILD_MODE: "host",
    DEMOGO_CSRF_DISABLED: "1",
    DEMOGO_RUNTIME_ENABLED: "0",
    DEMOGO_RUNTIME_NODE_ENABLED: "0",
    DEMOGO_RUNTIME_DRIVER: "host",
    DEMOGO_DB_HOST: "",
    DEMOGO_DB_NAME: "",
    DEMOGO_DB_USER: "",
    DEMOGO_DB_PASSWORD: ""
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let cookie = "";
child.stderr.pipe(process.stderr);

try {
  await waitForHealth();
  await testEmailVerificationOptions();
  await register();
  await testLoginRateLimit();
  await getJson("/api/me");
  const hostingCapabilities = await getJson("/api/hosting/capabilities");
  assert(hostingCapabilities.capabilities?.modes?.static?.status === "available", "hosting capabilities should expose static mode");
  assert(hostingCapabilities.capabilities?.modes?.nodeRuntime?.status === "planned", "node runtime should be planned when runtime is disabled");
  await inspectDistAndBuildProjects();
  await inspectOutProjects();
  await inspectProjectClassifierV2();
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
  assert(deploy.hostingMode === "static", "static deploy should expose hosting mode");
  assert(deploy.architecture?.hosting?.routeStrategy?.publicPath === "/d/{slug}/", "deploy should expose architecture route strategy");
  assert(deploy.name === "Smoke Demo", "generic archive/request name should be replaced by page title");
  assert(deploy.linkMode === "random", "free plan should use an automatically assigned trial link path");
  assert(/^try-[a-f0-9]{8}$/.test(deploy.slug), "free plan slug should not reserve readable project names");
  assert(deploy.customDomainEligible === false, "free plan should not expose custom domain eligibility");
  const freeSlugUpdate = await postJsonExpectStatus(`/api/demos/${deploy.id}/slug`, { slug: "free-should-not-edit" }, 403);
  assert(freeSlugUpdate.error, "free plan should not update link suffix");
  assert((deploy.deploymentEvents || []).some((item) => item.eventType === "success" && item.status === "success"), "deploy should return deployment success events");
  const demoDetail = await getJson(`/api/demos/${deploy.id}`);
  assert(demoDetail.demo?.id === deploy.id, "demo detail should return deployed demo");
  assert(demoDetail.demo?.architecture?.projectKind === "static", "demo detail should persist architecture");
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
  assert(update.hostingMode === "static", "update should return hosting mode");
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
  await testSupabaseExternalBackendConfig();
  const proZipPath = await createStaticZip("pro-readable-slug-demo", "Pro Readable Link");
  const proDeploy = await postZip("/api/deploy", proZipPath, { name: "Readable Customer Demo" });
  assert(proDeploy.linkMode === "random", "paid plan first publish should still use random path");
  assert(/^try-[a-f0-9]{8}$/.test(proDeploy.slug), "paid plan first publish should not force a readable path");
  assert(proDeploy.customDomainEligible === true, "pro plan should expose custom domain eligibility");
  const oldProSlug = proDeploy.slug;
  const slugUpdate = await postJson(`/api/demos/${proDeploy.id}/slug`, { slug: "pro-readable-link" });
  assert(slugUpdate.demo?.slug === "pro-readable-link", "pro plan should update link suffix after publish");
  const aliasResponse = await fetch(`${baseUrl}/d/${oldProSlug}/`, { redirect: "manual" });
  assert(aliasResponse.status === 302, "old random link should redirect after suffix update");
  const anotherProZip = await createStaticZip("another-pro-demo", "Another Pro Link");
  const anotherProDeploy = await postZip("/api/deploy", anotherProZip, { name: "Another Pro Demo" });
  const aliasSlugUpdate = await postJsonExpectStatus(`/api/demos/${anotherProDeploy.id}/slug`, { slug: oldProSlug }, 409);
  assert(aliasSlugUpdate.error, "old random link alias should stay reserved from other demos after suffix update");
  const subdomainRequest = await postJson(`/api/demos/${proDeploy.id}/subdomain-requests`, { subdomain: "pro-readable-link" });
  assert(subdomainRequest.request?.status === "open", "pro plan should submit subdomain request");
  const userSubdomainRequests = await getJson("/api/subdomain-requests");
  assert(userSubdomainRequests.requests?.some((item) => item.id === subdomainRequest.request.id && item.status === "open"), "user should see own subdomain request status");
  const subdomainRequests = await adminGet("/api/admin/subdomain-requests");
  const subdomainRequestId = subdomainRequests.requests?.[0]?.id;
  assert(subdomainRequestId, "admin should see subdomain request");
  await adminPost(`/api/admin/subdomain-requests/${subdomainRequestId}/status`, { status: "approved", adminNote: "smoke approved" });
  const approvedUserSubdomainRequests = await getJson("/api/subdomain-requests");
  assert(approvedUserSubdomainRequests.requests?.some((item) => item.id === subdomainRequestId && item.status === "approved" && item.adminNote === "smoke approved"), "user should see approved subdomain request and admin note");
  await postJson(`/api/demos/${anotherProDeploy.id}/offline`, {});
  await postJson(`/api/demos/${anotherProDeploy.id}/delete`, {});
  await postJson(`/api/demos/${proDeploy.id}/offline`, {});
  await postJson(`/api/demos/${proDeploy.id}/delete`, {});
  await testDeploymentJobs();
  await inspectAndDeploySingleHtmlProject();
  await inspectCalculatorControls();
  await testAutoFormHosting();
  await testAgentDeployApi();
  await inspectAndDeploySourceShellProject();
  await testNodeRuntimeWithHostDriver();
  await testNodeRuntimeWithMysqlTrialDatabase();
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

  const blockedZip = await createBlockedContentZip();
  const failedStarted = await postZip("/api/deployment-jobs", blockedZip, { name: "async-blocked-demo" }, { expectedStatus: 202 });
  const failedJob = await waitDeploymentJob(failedStarted.job.id);
  assert(failedJob.status === "failed", "blocked deployment job should fail");
  assert(failedJob.diagnosis?.category === "content", "failed deployment job should expose content diagnosis");
  assert(failedJob.diagnosis?.aiPrompt?.includes("DemoGo"), "failed deployment job should include AI fix prompt");
  assert(failedJob.inspection?.failureDiagnosis?.category === "content", "failed inspection should include diagnosis");

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
  const missingTokenCheck = await requestJson("/api/agent/token-check", { expectedStatus: 401 });
  assert(missingTokenCheck.error, "agent token check should reject missing token");
  const invalidTokenCheck = await requestJson("/api/agent/token-check", {
    headers: { Authorization: "Bearer dmg_000000000000_invalidinvalidinvalid" },
    expectedStatus: 401
  });
  assert(invalidTokenCheck.error, "agent token check should reject invalid token");
  const validTokenCheck = await requestJson("/api/agent/token-check", {
    headers: { Authorization: `Bearer ${tokenPayload.token.value}` }
  });
  assert(validTokenCheck.ok, "agent token check should accept current token");
  assert(validTokenCheck.token?.prefix === tokenStatus.token?.prefix, "agent token check should return token prefix");

  const agentZip = await createStaticZip("agent-demo", "Agent Demo");
  const agentHeaders = {
    Authorization: `Bearer ${tokenPayload.token.value}`,
    "X-DemoGo-Deploy-Source": "cli",
    "User-Agent": "demogo-cli/0.2.3"
  };
  const agentDeploy = await postZip("/api/agent/deploy", agentZip, { name: "agent-demo" }, {
    headers: agentHeaders
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
  const agentUpdateZip = await createStaticZip("agent-demo-update", "Agent Demo Updated");
  const agentUpdate = await postZip("/api/agent/update", agentUpdateZip, { demoId: agentDeploy.publicUrl }, {
    headers: agentHeaders
  });
  assert(agentUpdate.ok !== false, "agent update should return a successful payload");
  assert(agentUpdate.id === agentDeploy.id, "agent update should keep the same demo id");
  assert(agentUpdate.slug === agentDeploy.slug, "agent update should keep the same link slug");
  assert(agentUpdate.publicUrl === agentDeploy.publicUrl, "agent update should keep the same public URL");
  assert(agentUpdate.version === 2, "agent update should increment version");
  const agentUpdatedPage = await getText(`/d/${agentDeploy.slug}/`);
  assert(agentUpdatedPage.includes("Agent Demo Updated"), "agent updated page should contain new content");
  const missingAgentUpdate = await postZip("/api/agent/update", agentUpdateZip, {}, {
    headers: agentHeaders,
    expectedStatus: 400
  });
  assert(missingAgentUpdate.error, "agent update should require a demo id or link");
  const overviewAfter = await adminGet("/api/admin/overview");
  assert((overviewAfter.demos || []).some((item) => item.id === agentDeploy.id && item.deploySource === "cli"), "admin overview should expose deploy source");
  assert(Number(overviewAfter.metrics?.aiDeploys || 0) >= aiDeploysBefore + 1, "admin overview should count agent deploys");
  assert(Number(overviewAfter.metrics?.deploySuccesses || 0) >= deploySuccessesBefore + 1, "admin overview should count successful deploys");
  assert(overviewAfter.metrics?.failureReasons && typeof overviewAfter.metrics.failureReasons === "object", "admin overview should include failure reason buckets");
  await postJson(`/api/demos/${agentDeploy.id}/offline`, {});
  await postJson(`/api/demos/${agentDeploy.id}/delete`, {});

  const fileFieldZip = await createStaticZip("agent-file-field-demo", "Agent File Field Demo");
  const fileFieldDeploy = await postZip("/api/agent/deploy", fileFieldZip, { name: "agent-file-field-demo" }, {
    headers: agentHeaders,
    fileField: "file"
  });
  assert(fileFieldDeploy.ok, "agent deploy should accept file field for AI tool compatibility");
  await postJson(`/api/demos/${fileFieldDeploy.id}/offline`, {});
  await postJson(`/api/demos/${fileFieldDeploy.id}/delete`, {});

  const packageFieldZip = await createStaticZip("agent-package-field-demo", "Agent Package Field Demo");
  const packageFieldDeploy = await postZip("/api/agent/deploy", packageFieldZip, { name: "agent-package-field-demo" }, {
    headers: agentHeaders,
    fileField: "package"
  });
  assert(packageFieldDeploy.ok, "agent deploy should accept package field for AI tool compatibility");
  await postJson(`/api/demos/${packageFieldDeploy.id}/offline`, {});
  await postJson(`/api/demos/${packageFieldDeploy.id}/delete`, {});

  const wrongFieldZip = await createStaticZip("agent-wrong-field-demo", "Agent Wrong Field Demo");
  const wrongField = await postZip("/api/agent/deploy", wrongFieldZip, { name: "agent-wrong-field-demo" }, {
    headers: agentHeaders,
    fileField: "archive",
    expectedStatus: 400
  });
  assert(wrongField.error?.includes("上传字段"), "unexpected upload field should return a readable 400 error");
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

async function testEmailVerificationOptions() {
  const options = await getJson("/api/auth/register-options");
  assert(options.emailVerificationEnabled === false, "smoke test should disable email verification by env");
  const sent = await postJson("/api/auth/send-verification-code", {
    email: `verify-${Date.now()}@example.com`,
    password: "password123"
  });
  assert(sent.ok, "send verification should be a no-op when email verification is disabled");
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

async function inspectProjectClassifierV2() {
  const nextStaticZip = await createZipFromFiles("next-static-demo", {
    "package.json": JSON.stringify({
      scripts: { build: "next build" },
      dependencies: { next: "^15.0.0", react: "^19.0.0", "react-dom": "^19.0.0" }
    }),
    "next.config.js": "module.exports = { output: 'export' };",
    "out/index.html": "<!doctype html><html><body><h1>Next Static</h1></body></html>"
  });
  const nextStaticInspection = await postZip("/api/inspect", nextStaticZip);
  assert(nextStaticInspection.inspection?.canPublish, "Next static export should be publishable");
  assert(nextStaticInspection.inspection?.projectProfile?.frontendFrameworks?.some((item) => item.code === "next"), "Next static project should identify Next.js");
  assert(nextStaticInspection.inspection?.projectAssessment?.support?.publishMode === "static", "Next static export should publish as static output");

  const nextSsrZip = await createZipFromFiles("next-ssr-demo", {
    "package.json": JSON.stringify({
      scripts: { build: "next build", start: "next start" },
      dependencies: { next: "^15.0.0", react: "^19.0.0", "react-dom": "^19.0.0" }
    }),
    "next.config.js": "module.exports = {};",
    "app/page.tsx": "export default function Page(){ return <h1>Next SSR</h1>; }"
  });
  const nextSsrInspection = await postZip("/api/inspect", nextSsrZip);
  assert(nextSsrInspection.inspection?.hostingMode === "node_runtime", "Next SSR should be planned for node runtime architecture");
  assert(!nextSsrInspection.inspection?.canPublish, "Next SSR should remain blocked when runtime is disabled");
  assert(nextSsrInspection.inspection?.projectProfile?.assessment?.support?.publishMode === "node_runtime", "Next SSR should expose node runtime mode");

  const tanStackZip = await createZipFromFiles("tanstack-start-demo", {
    "package.json": JSON.stringify({
      scripts: { dev: "vinxi dev", build: "vinxi build", start: "vinxi start" },
      dependencies: { "@tanstack/react-start": "^1.0.0", react: "^19.0.0" }
    }),
    "app/routes/index.tsx": "export default function Home(){ return <h1>TanStack Start</h1>; }"
  });
  const tanStackInspection = await postZip("/api/inspect", tanStackZip);
  assert(tanStackInspection.inspection?.projectProfile?.frontendFrameworks?.some((item) => item.code === "tanstack_start"), "TanStack Start should be identified");
  assert(tanStackInspection.inspection?.projectAssessment?.support?.publishMode === "node_runtime", "TanStack Start should be marked as node runtime mode");

  const nuxtZip = await createZipFromFiles("nuxt-demo", {
    "package.json": JSON.stringify({
      scripts: { build: "nuxt build", start: "node .output/server/index.mjs" },
      dependencies: { nuxt: "^4.0.0", vue: "^3.0.0" }
    }),
    "nuxt.config.ts": "export default defineNuxtConfig({});",
    "pages/index.vue": "<template><h1>Nuxt</h1></template>"
  });
  const nuxtInspection = await postZip("/api/inspect", nuxtZip);
  assert(nuxtInspection.inspection?.projectProfile?.frontendFrameworks?.some((item) => item.code === "nuxt"), "Nuxt should be identified");
  assert(nuxtInspection.inspection?.projectAssessment?.support?.publishMode === "node_runtime", "Nuxt should be marked as node runtime mode");

  const honoZip = await createZipFromFiles("hono-demo", {
    "package.json": JSON.stringify({
      scripts: { start: "node server.js" },
      dependencies: { hono: "^4.0.0" }
    }),
    "server.js": "console.log('hono demo');"
  });
  const honoInspection = await postZip("/api/inspect", honoZip);
  assert(honoInspection.inspection?.projectProfile?.backendFrameworks?.some((item) => item.code === "hono"), "Hono should be identified");
  assert(honoInspection.inspection?.projectAssessment?.support?.publishMode === "node_runtime", "Hono should use node runtime mode");

  const supabaseZip = await createZipFromFiles("supabase-demo", {
    "package.json": JSON.stringify({
      scripts: { start: "node server.js" },
      dependencies: { express: "^4.0.0", "@supabase/supabase-js": "^2.0.0" }
    }),
    ".env.example": "SUPABASE_URL=\nSUPABASE_ANON_KEY=\nOPENAI_API_KEY=\n",
    "server.js": "console.log(process.env.SUPABASE_URL);"
  });
  const supabaseInspection = await postZip("/api/inspect", supabaseZip);
  assert(supabaseInspection.inspection?.projectProfile?.databases?.some((item) => item.code === "supabase"), "Supabase should be identified");
  assert(supabaseInspection.inspection?.projectAssessment?.environmentVariables?.required?.includes("SUPABASE_URL"), "Supabase env should be identified");
  assert(supabaseInspection.inspection?.projectAssessment?.support?.missingRequirements?.includes("external_backend_config"), "Supabase should require external backend config");
  assert(!supabaseInspection.inspection?.projectAssessment?.support?.missingRequirements?.includes("unsupported_database"), "Supabase should not be treated as unsupported database");
  assert(supabaseInspection.inspection?.externalBackend?.provider === "supabase", "Supabase external backend status should be exposed");
  assert(supabaseInspection.inspection?.externalBackend?.missingEnv?.includes("SUPABASE_URL"), "Supabase missing URL should be exposed");

  const prismaZip = await createZipFromFiles("prisma-postgres-demo", {
    "package.json": JSON.stringify({
      scripts: { start: "node server.js" },
      dependencies: { express: "^4.0.0", prisma: "^6.0.0", "@prisma/client": "^6.0.0", pg: "^8.0.0" }
    }),
    ".env.example": "DATABASE_URL=postgresql://user:pass@localhost:5432/app\n",
    "prisma/schema.prisma": "datasource db { provider = \"postgresql\" url = env(\"DATABASE_URL\") }",
    "server.js": "console.log('prisma postgres demo');"
  });
  const prismaInspection = await postZip("/api/inspect", prismaZip);
  assert(prismaInspection.inspection?.projectProfile?.databases?.some((item) => item.code === "prisma"), "Prisma should be identified");
  assert(prismaInspection.inspection?.projectProfile?.databases?.some((item) => item.code === "postgres"), "Postgres should be identified");
  assert(prismaInspection.inspection?.projectAssessment?.signals?.hasDatabaseSchema, "Prisma schema should be identified as database schema");
}

async function testSupabaseExternalBackendConfig() {
  const supabaseStaticZip = await createZipFromFiles("supabase-static-config-demo", {
    "index.html": "<!doctype html><html><body><script type=\"module\" src=\"/src/main.js\"></script></body></html>",
    "src/main.js": "console.log(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);",
    ".env.example": "VITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY=\n"
  });
  const deploy = await postZip("/api/deploy", supabaseStaticZip, { name: "supabase-static-config-demo" });
  assert(deploy.id, "Supabase static demo should deploy");
  assert(deploy.externalBackend?.provider === "supabase", "Supabase deploy should expose external backend");
  assert(deploy.externalBackend?.status === "missing", "Supabase deploy should require config before saving env");
  assert(deploy.applicationReadiness?.kind === "frontend_supabase", "Supabase deploy should expose frontend Supabase readiness");
  assert(deploy.applicationReadiness?.checklist?.some((item) => item.code === "external_backend" && item.status === "missing"), "Supabase readiness should require external backend config");

  const unsafeSave = await postJsonExpectStatus(`/api/demos/${deploy.id}/runtime-env`, {
    env: {
      VITE_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
    }
  }, 400);
  assert(unsafeSave.error?.includes("service_role"), "service_role key should be rejected");

  const saved = await postJson(`/api/demos/${deploy.id}/runtime-env`, {
    env: {
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_ANON_KEY: "anon-test-key"
    }
  });
  assert(saved.externalBackend?.provider === "supabase", "saving Supabase env should return external backend");
  assert(["failed", "warning", "ready", "configured"].includes(saved.externalBackend?.status), "Supabase connection result should be exposed");
  assert(saved.demo?.runtimeEnv?.VITE_SUPABASE_ANON_KEY?.maskedValue, "Supabase anon key should be masked in public demo response");
  assert(!saved.demo?.runtimeEnv?.SUPABASE_SERVICE_ROLE_KEY, "service_role key should never appear in public demo response");
  assert(saved.demo?.applicationReadiness?.kind === "frontend_supabase", "saving Supabase env should refresh readiness");

  const detail = await getJson(`/api/demos/${deploy.id}`);
  assert(detail.demo?.externalBackend?.provider === "supabase", "demo detail should persist external backend status");
  assert(detail.demo?.runtimeEnv?.VITE_SUPABASE_URL?.maskedValue, "demo detail should expose masked Supabase URL config");
  assert(detail.demo?.applicationReadiness?.summary, "demo detail should expose application readiness summary");
  await postJson(`/api/demos/${deploy.id}/offline`, {});
  await postJson(`/api/demos/${deploy.id}/delete`, {});
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
  assert(backendInspection.inspection?.hostingMode === "node_runtime", "backend project should be classified into node runtime architecture");
  assert(backendInspection.inspection?.runtime?.status === "planned", "backend project should expose planned runtime status while runtime is disabled");
  assert(backendInspection.inspection?.userStatusLabel === "暂不支持", "backend project should have unsupported user label");
  assert((backendInspection.inspection?.unsupportedNotes || []).some((item) => item.includes("数据库") || item.includes("多服务") || item.includes("运行器")), "backend project should explain runtime boundary");
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
  const leadZip = await createZipFromFiles("lead-generation-demo", {
    "index.html": `<!doctype html><html><body>
      <h1>产品体验预约</h1>
      <p>填写姓名、手机号和公司名称，获取产品演示方案。</p>
      <form>
        <input name="name" placeholder="姓名" required>
        <input name="phone" placeholder="手机号" required>
        <input name="company" placeholder="公司名称">
        <textarea name="message" placeholder="咨询内容"></textarea>
        <button>提交需求</button>
      </form>
      <p>也可以扫码加微信群，或联系微信 demogo-service。</p>
    </body></html>`
  });
  const leadInspection = await postZip("/api/inspect", leadZip);
  assert(leadInspection.inspection?.canPublish, "normal lead generation page should be publishable");
  assert(leadInspection.inspection?.contentReview?.status === "passed", "normal lead generation should pass content review");
  assert((leadInspection.inspection?.contentReview?.findings || []).some((item) => item.severity === "notice"), "normal lead generation should keep notice findings");

  const sensitiveZip = await createZipFromFiles("sensitive-collection-demo", {
    "index.html": `<!doctype html><html><body>
      <h1>实名认证</h1>
      <form>
        <input name="idCard" placeholder="身份证号" required>
        <input name="smsCode" placeholder="短信验证码" required>
        <input name="password" placeholder="登录密码" required>
      </form>
    </body></html>`
  });
  const sensitiveInspection = await postZip("/api/inspect", sensitiveZip);
  assert(!sensitiveInspection.inspection?.canPublish, "highly sensitive data collection should be blocked");
  assert(sensitiveInspection.inspection?.contentReview?.status === "blocked", "sensitive data collection should be blocked by content review");

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
  assert(blockedReview.resolutionStatus === "pending_review", "blocked content review should wait for admin handling");
  const handled = await adminPost(`/api/admin/content-reviews/${blockedReview.id}/status`, {
    resolutionStatus: "confirmed_violation",
    adminNote: "smoke test confirmed"
  });
  assert(handled.review?.resolutionStatus === "confirmed_violation", "admin should update content review resolution");
  const confirmed = await adminGet("/api/admin/content-reviews?resolutionStatus=confirmed_violation");
  assert((confirmed.reviews || []).some((item) => item.id === blockedReview.id), "admin should filter handled content reviews");

  const riskyHtml = "<!doctype html><html><body><h1>\u9ad8\u6536\u76ca \u6295\u8d44\u8fd4\u5229</h1><p>\u7a33\u8d5a\u4e0d\u8d54\uff0c\u5feb\u901f\u56de\u672c\u3002</p></body></html>";
  const riskyZip = await createZipFromFiles("high-return-risk-zip-demo", {
    "index.html": riskyHtml
  });
  const riskyZipDeploy = await postZipExpectStatus("/api/deploy", riskyZip, { name: "high-return-risk-zip-demo" }, 400);
  assert(riskyZipDeploy.contentReview?.status === "blocked" || riskyZipDeploy.inspection?.contentReview?.status === "blocked", "zip risk content deploy should be blocked");

  const riskyTar = await createTarGzFromFiles("high-return-risk-tar-demo", {
    "index.html": riskyHtml
  });
  const riskyTarDeploy = await postZipExpectStatus("/api/deploy", riskyTar, { name: "high-return-risk-tar-demo" }, 400);
  assert(riskyTarDeploy.contentReview?.status === "blocked" || riskyTarDeploy.inspection?.contentReview?.status === "blocked", "tar.gz risk content deploy should be blocked");
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

async function testNodeRuntimeWithHostDriver() {
  const runtimeRoot = path.join(testRoot, "runtime-host");
  await fs.rm(runtimeRoot, { recursive: true, force: true });
  await fs.mkdir(path.join(runtimeRoot, "data"), { recursive: true });
  await fs.mkdir(path.join(runtimeRoot, "uploads"), { recursive: true });
  await fs.mkdir(path.join(runtimeRoot, "site", "d"), { recursive: true });
  const runtimePort = 3120;
  const runtimeBaseUrl = `http://127.0.0.1:${runtimePort}`;
  const runtimeChild = spawn(process.execPath, ["src/server.js"], {
    cwd: serverRoot,
    env: {
      ...process.env,
      PORT: String(runtimePort),
      PUBLIC_BASE_URL: runtimeBaseUrl,
      DEMOGO_DATA_DIR: path.join(runtimeRoot, "data"),
      DEMOGO_UPLOAD_DIR: path.join(runtimeRoot, "uploads"),
      DEMOGO_DEMO_ROOT: path.join(runtimeRoot, "site", "d"),
      DEMOGO_ADMIN_USER: adminUser,
      DEMOGO_ADMIN_PASSWORD: adminPassword,
      DEMOGO_EMAIL_VERIFICATION_ENABLED: "0",
      DEMOGO_DEPLOY_RATE_LIMIT: "20",
      DEMOGO_RATE_LIMIT_DISABLED: "1",
      DEMOGO_BUILD_MODE: "host",
      DEMOGO_RUNTIME_ENABLED: "1",
      DEMOGO_RUNTIME_NODE_ENABLED: "1",
      DEMOGO_RUNTIME_DRIVER: "host",
      DEMOGO_DEMO_DB_ENABLED: "0",
      DEMOGO_DB_HOST: "",
      DEMOGO_DB_NAME: "",
      DEMOGO_DB_USER: "",
      DEMOGO_DB_PASSWORD: ""
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  const previousCookie = cookie;
  const previousBaseUrl = globalThis.__demogoBaseUrl;
  globalThis.__demogoBaseUrl = runtimeBaseUrl;
  cookie = "";
  try {
    await waitForRuntimeHealth(runtimeBaseUrl);
    const capabilities = await requestJsonWithBase(runtimeBaseUrl, "/api/hosting/capabilities");
    assert(capabilities.capabilities?.modes?.nodeRuntime?.status === "available", "node runtime should be available when enabled");
    await requestJsonWithBase(runtimeBaseUrl, "/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "runtime@example.com", password: "password123" })
    });
    const runtimeZip = await createZipFromFiles("node-runtime-demo", {
      "package.json": JSON.stringify({
        type: "commonjs",
        scripts: { start: "node server.js" }
      }),
      "server.js": `const http = require("http");
const port = process.env.PORT;
http.createServer((req, res) => {
  if (req.url.startsWith("/api/hello")) {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, from: "node-runtime" }));
    return;
  }
  res.end("<!doctype html><html><body><h1>Node Runtime Demo</h1></body></html>");
}).listen(port);`
    });
    const inspection = await postZipWithBase(runtimeBaseUrl, "/api/inspect", runtimeZip);
    assert(inspection.inspection?.hostingMode === "node_runtime", "node runtime inspection should expose node_runtime hosting mode");
    assert(inspection.inspection?.canPublish, "node runtime inspection should be publishable when runtime is enabled");
    assert(inspection.inspection?.projectProfile?.type === "node_service", "node runtime inspection should expose node service profile");
    const deploy = await postZipWithBase(runtimeBaseUrl, "/api/deploy", runtimeZip, { name: "node-runtime-demo" });
    assert(deploy.hostingMode === "node_runtime", "node runtime deploy should expose runtime hosting mode");
    const page = await fetchTextWithBase(runtimeBaseUrl, `/d/${deploy.slug}/`);
    assert(page.includes("Node Runtime Demo"), "node runtime page should proxy to running service");
    const apiPayload = await requestJsonWithBase(runtimeBaseUrl, `/d/${deploy.slug}/api/hello`);
    assert(apiPayload.from === "node-runtime", "node runtime API should proxy to running service");
    await requestJsonWithBase(runtimeBaseUrl, `/api/demos/${deploy.id}/runtime/restart`, { method: "POST" });
    const restartedPayload = await requestJsonWithBase(runtimeBaseUrl, `/d/${deploy.slug}/api/hello`);
    assert(restartedPayload.from === "node-runtime", "node runtime should respond after explicit restart");
    // Retry offline on Windows to handle EBUSY file locks
    let offlineDone = false;
    for (let retry = 0; retry < 5 && !offlineDone; retry++) {
      try {
        await requestJsonWithBase(runtimeBaseUrl, `/api/demos/${deploy.id}/offline`, { method: "POST" });
        offlineDone = true;
      } catch (err) {
        if (retry < 4 && err.message && err.message.includes("EBUSY")) {
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
        throw err;
      }
    }
    // Retry delete on Windows to handle EBUSY file locks
    let deleteDone = false;
    for (let retry = 0; retry < 5 && !deleteDone; retry++) {
      try {
        await requestJsonWithBase(runtimeBaseUrl, `/api/demos/${deploy.id}/delete`, { method: "POST" });
        deleteDone = true;
      } catch (err) {
        if (retry < 4 && err.message && err.message.includes("EBUSY")) {
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
        throw err;
      }
    }

    const envZip = await createZipFromFiles("env-runtime-demo", {
      "package.json": JSON.stringify({
        type: "commonjs",
        scripts: { start: "node server.js" }
      }),
      ".env.example": "OPENAI_API_KEY=\n",
      "server.js": `const http = require("http");
http.createServer((req, res) => {
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ hasKey: Boolean(process.env.OPENAI_API_KEY) }));
}).listen(process.env.PORT);`
    });
    const envDeploy = await postZipWithBase(runtimeBaseUrl, "/api/deploy", envZip, { name: "env-runtime-demo" });
    assert(envDeploy.runtime?.status === "config_required", "env runtime should wait for user configuration");
    assert(envDeploy.runtimeConfig?.missing?.includes("OPENAI_API_KEY"), "env runtime should expose missing env key");
    assert(envDeploy.runtime?.failureDiagnosis?.category === "runtime_env", "env runtime should expose runtime env diagnosis");
    assert(envDeploy.inspection?.failureDiagnosis?.category === "runtime_env", "env runtime inspection should expose diagnosis");
    const envSave = await requestJsonWithBase(runtimeBaseUrl, `/api/demos/${envDeploy.id}/runtime-env`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ env: { OPENAI_API_KEY: "sk-test-value" } })
    });
    assert(envSave.demo?.runtimeEnv?.OPENAI_API_KEY?.maskedValue, "runtime env should be masked in public response");
    await requestJsonWithBase(runtimeBaseUrl, `/api/demos/${envDeploy.id}/runtime/restart`, { method: "POST" });
    const envRuntimePayload = await requestJsonWithBase(runtimeBaseUrl, `/d/${envDeploy.slug}/`);
    assert(envRuntimePayload.hasKey === true, "runtime should receive saved env configuration");
    await requestJsonWithBase(runtimeBaseUrl, `/api/demos/${envDeploy.id}/offline`, { method: "POST" });
    await requestJsonWithBase(runtimeBaseUrl, `/api/demos/${envDeploy.id}/delete`, { method: "POST" });

    const nextRuntimeZip = await createZipFromFiles("next-runtime-shim-demo", {
      "package.json": JSON.stringify({
        type: "commonjs",
        scripts: { build: "node build.js", start: "node server.js" },
        dependencies: { next: "file:./vendor/next", react: "file:./vendor/react", "react-dom": "file:./vendor/react-dom" }
      }),
      "vendor/next/package.json": JSON.stringify({ name: "next", version: "15.0.0", main: "index.js" }),
      "vendor/next/index.js": "module.exports = {};",
      "vendor/react/package.json": JSON.stringify({ name: "react", version: "19.0.0", main: "index.js" }),
      "vendor/react/index.js": "module.exports = {};",
      "vendor/react-dom/package.json": JSON.stringify({ name: "react-dom", version: "19.0.0", main: "index.js" }),
      "vendor/react-dom/index.js": "module.exports = {};",
      "next.config.js": "module.exports = {};",
      "app/page.tsx": "export default function Page(){ return 'Next Runtime'; }",
      "build.js": "console.log('build ok');",
      "server.js": `const http = require("http");
http.createServer((req, res) => res.end("Next runtime shim")).listen(process.env.PORT);`
    });
    const nextRuntimeInspection = await postZipWithBase(runtimeBaseUrl, "/api/inspect", nextRuntimeZip);
    assert(nextRuntimeInspection.inspection?.canPublish, "supported SSR single service should be publishable when runtime is enabled");
    assert(nextRuntimeInspection.inspection?.hostingMode === "node_runtime", "supported SSR should use node runtime hosting mode");
    const nextRuntimeDeploy = await postZipWithBase(runtimeBaseUrl, "/api/deploy", nextRuntimeZip, { name: "next-runtime-shim-demo" });
    const nextRuntimePage = await fetchTextWithBase(runtimeBaseUrl, `/d/${nextRuntimeDeploy.slug}/`);
    assert(nextRuntimePage.includes("Next runtime shim"), "supported SSR runtime should proxy to service");
    await requestJsonWithBase(runtimeBaseUrl, `/api/demos/${nextRuntimeDeploy.id}/offline`, { method: "POST" });
    await requestJsonWithBase(runtimeBaseUrl, `/api/demos/${nextRuntimeDeploy.id}/delete`, { method: "POST" });

    const fastifyZip = await createZipFromFiles("fastify-runtime-demo", {
      "package.json": JSON.stringify({
        scripts: { start: "node server.js" },
        dependencies: { fastify: "^4.0.0" }
      }),
      "server.js": `const http = require("http");
const port = process.env.PORT;
http.createServer((req, res) => res.end("Fastify style demo")).listen(port);`
    });
    const fastifyInspection = await postZipWithBase(runtimeBaseUrl, "/api/inspect", fastifyZip);
    assert(fastifyInspection.inspection?.projectProfile?.type === "node_service", "fastify dependency should classify as node service");
    assert(fastifyInspection.inspection?.runtime?.framework === "fastify", "fastify dependency should expose runtime framework");

    const startProdZip = await createZipFromFiles("start-prod-runtime-demo", {
      "package.json": JSON.stringify({
        scripts: {
          start: "node server.js",
          "start:prod": "node server.js"
        },
        dependencies: { koa: "^2.0.0" }
      }),
      "server.js": `const http = require("http");
http.createServer((req, res) => res.end("start prod")).listen(process.env.PORT);`
    });
    const startProdInspection = await postZipWithBase(runtimeBaseUrl, "/api/inspect", startProdZip);
    assert(startProdInspection.inspection?.runtime?.hasStartProdScript, "start:prod should be detected");
    assert(startProdInspection.inspection?.runtime?.selectedStartCommand === "npm run start:prod", "start:prod should be selected");

    const databaseZip = await createZipFromFiles("database-runtime-demo", {
      "package.json": JSON.stringify({
        scripts: { start: "node server.js" },
        dependencies: { express: "file:./vendor/express", mysql2: "file:./vendor/mysql2" }
      }),
      "vendor/express/package.json": JSON.stringify({ name: "express", version: "4.0.0", main: "index.js" }),
      "vendor/express/index.js": "module.exports = {};",
      "vendor/mysql2/package.json": JSON.stringify({ name: "mysql2", version: "3.0.0", main: "index.js" }),
      "vendor/mysql2/index.js": "module.exports = {};",
      "server.js": `const http = require("http");
http.createServer((req, res) => res.end("db demo")).listen(process.env.PORT);`
    });
    const databaseInspection = await postZipWithBase(runtimeBaseUrl, "/api/inspect", databaseZip);
    assert(!databaseInspection.inspection?.canPublish, "database runtime project should be blocked for now");
    assert(databaseInspection.inspection?.runtime?.requiresDatabase, "database runtime project should expose database dependency");
    assert(databaseInspection.inspection?.runtime?.requiresMysql, "mysql dependency should be detected separately");
    assert((databaseInspection.inspection?.unsupportedNotes || []).some((item) => item.includes("MySQL") || item.includes("数据库")), "database block should be user-visible");
  } finally {
    cookie = previousCookie;
    globalThis.__demogoBaseUrl = previousBaseUrl;
    runtimeChild.kill("SIGTERM");
  }
}

async function testNodeRuntimeWithMysqlTrialDatabase() {
  const runtimeRoot = path.join(testRoot, "runtime-mysql");
  await fs.rm(runtimeRoot, { recursive: true, force: true });
  await fs.mkdir(path.join(runtimeRoot, "data"), { recursive: true });
  await fs.mkdir(path.join(runtimeRoot, "uploads"), { recursive: true });
  await fs.mkdir(path.join(runtimeRoot, "site", "d"), { recursive: true });
  const runtimePort = 3121;
  const runtimeBaseUrl = `http://127.0.0.1:${runtimePort}`;
  const runtimeChild = spawn(process.execPath, ["src/server.js"], {
    cwd: serverRoot,
    env: {
      ...process.env,
      PORT: String(runtimePort),
      PUBLIC_BASE_URL: runtimeBaseUrl,
      DEMOGO_DATA_DIR: path.join(runtimeRoot, "data"),
      DEMOGO_UPLOAD_DIR: path.join(runtimeRoot, "uploads"),
      DEMOGO_DEMO_ROOT: path.join(runtimeRoot, "site", "d"),
      DEMOGO_ADMIN_USER: adminUser,
      DEMOGO_ADMIN_PASSWORD: adminPassword,
      DEMOGO_EMAIL_VERIFICATION_ENABLED: "0",
      DEMOGO_DEPLOY_RATE_LIMIT: "20",
      DEMOGO_RATE_LIMIT_DISABLED: "1",
      DEMOGO_BUILD_MODE: "host",
      DEMOGO_RUNTIME_ENABLED: "1",
      DEMOGO_RUNTIME_NODE_ENABLED: "1",
      DEMOGO_RUNTIME_DRIVER: "host",
      DEMOGO_DEMO_DB_ENABLED: "1",
      DEMOGO_DEMO_DB_MOCK: "1",
      DEMOGO_DEMO_DB_MOCK_VALIDATE_SCHEMA: "1",
      DEMOGO_DEMO_DB_HOST: "127.0.0.1",
      DEMOGO_DEMO_DB_PORT: "3306",
      DEMOGO_DB_HOST: "",
      DEMOGO_DB_NAME: "",
      DEMOGO_DB_USER: "",
      DEMOGO_DB_PASSWORD: ""
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  const previousCookie = cookie;
  const previousBaseUrl = globalThis.__demogoBaseUrl;
  globalThis.__demogoBaseUrl = runtimeBaseUrl;
  cookie = "";
  try {
    await waitForRuntimeHealth(runtimeBaseUrl);
    const capabilities = await requestJsonWithBase(runtimeBaseUrl, "/api/hosting/capabilities");
    assert(capabilities.capabilities?.database?.mysql?.status === "available", "mysql trial database should be available when enabled");
    await requestJsonWithBase(runtimeBaseUrl, "/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "runtime-mysql@example.com", password: "password123" })
    });
    const runtimePlanRequest = await requestJsonWithBase(runtimeBaseUrl, "/api/plan-upgrade-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: "pro",
        contact: "runtime-mysql@example.com",
        message: "Use Pro quota for complex application smoke tests"
      })
    });
    await adminPost(`/api/admin/plan-upgrade-requests/${runtimePlanRequest.request.id}/status`, { status: "approved" });
    const databaseZip = await createZipFromFiles("mysql-runtime-demo", {
      "package.json": JSON.stringify({
        scripts: { start: "node server.js" },
        dependencies: { express: "file:./vendor/express", mysql2: "file:./vendor/mysql2" }
      }),
      "vendor/express/package.json": JSON.stringify({ name: "express", version: "4.0.0", main: "index.js" }),
      "vendor/express/index.js": "module.exports = {};",
      "vendor/mysql2/package.json": JSON.stringify({ name: "mysql2", version: "3.0.0", main: "index.js" }),
      "vendor/mysql2/index.js": "module.exports = {};",
      "server.js": `const http = require("http");
http.createServer((req, res) => {
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({
    ok: true,
    mysqlHost: process.env.MYSQL_HOST,
    mysqlDatabase: process.env.MYSQL_DATABASE,
    hasPassword: Boolean(process.env.MYSQL_PASSWORD)
  }));
}).listen(process.env.PORT);`
    });
    const inspection = await postZipWithBase(runtimeBaseUrl, "/api/inspect", databaseZip);
    assert(inspection.inspection?.canPublish, "mysql runtime project should be publishable when trial database is enabled");
    assert(inspection.inspection?.runtime?.requiresMysql, "mysql runtime project should expose mysql dependency");
    const deploy = await postZipWithBase(runtimeBaseUrl, "/api/deploy", databaseZip, { name: "mysql-runtime-demo" });
    assert(deploy.database?.enabled, "deploy should expose public database metadata");
    assert(deploy.database?.engine === "mysql", "database metadata should identify mysql");
    assert(deploy.applicationReadiness?.kind === "frontend_node_mysql" || deploy.applicationReadiness?.kind === "node_mysql", "mysql runtime deploy should expose application readiness");
    assert(deploy.applicationReadiness?.checklist?.some((item) => item.code === "database" && item.status === "ready"), "mysql readiness should mark database ready");
    assert(deploy.applicationReadiness?.deliveryReport?.verdict === "ready_to_share", "mysql runtime deploy should expose ready trial delivery report");
    assert(deploy.applicationReadiness?.deliveryReport?.feedbackReady === true, "ready trial delivery report should mark feedback ready");
    assert(!JSON.stringify(deploy.database).includes("MYSQL_PASSWORD"), "public database metadata must not expose password env");
    assert(!JSON.stringify(deploy.database).includes("DATABASE_URL"), "public database metadata must not expose database url");
    const payload = await requestJsonWithBase(runtimeBaseUrl, `/d/${deploy.slug}/`);
    assert(payload.mysqlHost === "127.0.0.1", "runtime should receive mysql host env");
    assert(payload.mysqlDatabase === deploy.database.databaseName, "runtime should receive mysql database env");
    assert(payload.hasPassword === true, "runtime should receive mysql password env");
    assert(deploy.database?.schema?.status === "skipped", "database without schema should be marked skipped");
    await requestJsonWithBase(runtimeBaseUrl, `/api/demos/${deploy.id}/offline`, { method: "POST" });

    const schemaZip = await createZipFromFiles("mysql-schema-runtime-demo", {
      "package.json": JSON.stringify({
        scripts: { start: "node server.js" },
        dependencies: { express: "file:./vendor/express", mysql2: "file:./vendor/mysql2" }
      }),
      "vendor/express/package.json": JSON.stringify({ name: "express", version: "4.0.0", main: "index.js" }),
      "vendor/express/index.js": "module.exports = {};",
      "vendor/mysql2/package.json": JSON.stringify({ name: "mysql2", version: "3.0.0", main: "index.js" }),
      "vendor/mysql2/index.js": "module.exports = {};",
      "schema.sql": "CREATE TABLE smoke_items (id INT PRIMARY KEY);",
      "server.js": `const http = require("http");
http.createServer((req, res) => res.end("schema ok")).listen(process.env.PORT);`
    });
    const schemaDeploy = await postZipWithBase(runtimeBaseUrl, "/api/deploy", schemaZip, { name: "mysql-schema-runtime-demo" });
    assert(schemaDeploy.database?.schema?.status === "ready", "schema.sql should initialize mock mysql database");
    assert(schemaDeploy.applicationReadiness?.checklist?.some((item) => item.code === "database" && item.detail?.includes("schema.sql")), "schema deploy readiness should mention schema initialization");
    const resetPayload = await requestJsonWithBase(runtimeBaseUrl, `/api/demos/${schemaDeploy.id}/database/reset`, { method: "POST" });
    assert(resetPayload.database?.schema?.status === "ready", "database reset should re-run schema initialization");
    assert(resetPayload.demo?.applicationReadiness?.checklist?.some((item) => item.code === "database" && item.status === "ready"), "database reset should refresh readiness");
    assert(resetPayload.demo?.applicationReadiness?.deliveryReport?.verdict === "ready_to_share", "database reset should refresh delivery report");
    await requestJsonWithBase(runtimeBaseUrl, `/api/demos/${schemaDeploy.id}/offline`, { method: "POST" });
    await requestJsonWithBase(runtimeBaseUrl, `/api/demos/${schemaDeploy.id}/delete`, { method: "POST" });
    await testComplexCommerceTrialSample(runtimeBaseUrl);
    await testComplexSchemaFailureSample(runtimeBaseUrl);
    await testComplexFailureSamples(runtimeBaseUrl);
    await requestJsonWithBase(runtimeBaseUrl, `/api/demos/${deploy.id}/delete`, { method: "POST" });
  } finally {
    cookie = previousCookie;
    globalThis.__demogoBaseUrl = previousBaseUrl;
    runtimeChild.kill("SIGTERM");
  }
}

async function testComplexCommerceTrialSample(runtimeBaseUrl) {
  const sampleZip = await createComplexCommerceTrialZip("commerce-trial-demo", "v1");
  const inspection = await postZipWithBase(runtimeBaseUrl, "/api/inspect", sampleZip);
  assert(inspection.inspection?.canPublish, "complex commerce sample should be publishable");
  assert(inspection.inspection?.runtime?.requiresMysql, "complex commerce sample should require mysql");
  assert(inspection.inspection?.projectProfile?.backendFrameworks?.some((item) => item.code === "express" || item.code === "node"), "complex commerce sample should expose backend framework");

  const deploy = await postZipWithBase(runtimeBaseUrl, "/api/deploy", sampleZip, { name: "Complex Commerce Trial" });
  assert(deploy.hostingMode === "node_runtime", "complex commerce sample should use node runtime");
  assert(deploy.database?.schema?.status === "ready", "complex commerce sample should initialize mysql schema");
  assert(deploy.applicationReadiness?.kind === "frontend_node_mysql", "complex commerce sample should be classified as frontend node mysql readiness");
  assert(deploy.applicationReadiness?.status === "ready", "complex commerce sample readiness should be ready");
  assert(deploy.applicationReadiness?.deliveryReport?.verdict === "ready_to_share", "complex commerce sample should be ready to share");
  assert(deploy.applicationReadiness?.deliveryReport?.proofPoints?.some((item) => item.includes("数据库")), "complex commerce delivery report should mention database proof");

  const page = await fetchTextWithBase(runtimeBaseUrl, `/d/${deploy.slug}/`);
  assert(page.includes("DemoGo Commerce Trial v1"), "complex commerce sample page should render");
  const products = await requestJsonWithBase(runtimeBaseUrl, `/d/${deploy.slug}/api/products`);
  assert(products.products?.length === 2, "complex commerce sample products API should respond");
  assert(products.database === deploy.database.databaseName, "complex commerce sample API should receive mysql database env");
  const lead = await requestJsonWithBase(runtimeBaseUrl, `/d/${deploy.slug}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Smoke Buyer", phone: "13800000000", productId: "sku-1" })
  });
  assert(lead.ok && lead.received?.name === "Smoke Buyer", "complex commerce sample lead API should accept JSON payload");

  const updateZip = await createComplexCommerceTrialZip("commerce-trial-demo-update", "v2");
  const updated = await postZipWithBase(runtimeBaseUrl, `/api/demos/${deploy.id}/update`, updateZip);
  assert(updated.id === deploy.id, "complex commerce sample update should keep demo id");
  assert(updated.slug === deploy.slug, "complex commerce sample update should keep slug");
  assert(updated.version === 2, "complex commerce sample update should increment version");
  assert(updated.applicationReadiness?.status === "ready", "complex commerce sample update should keep readiness ready");
  assert(updated.applicationReadiness?.deliveryReport?.feedbackReady === true, "complex commerce update should keep delivery report feedback ready");
  const updatedPage = await fetchTextWithBase(runtimeBaseUrl, `/d/${deploy.slug}/`);
  assert(updatedPage.includes("DemoGo Commerce Trial v2"), "complex commerce sample updated page should render on same link");

  await requestJsonWithBase(runtimeBaseUrl, `/api/demos/${deploy.id}/offline`, { method: "POST" });
  await requestJsonWithBase(runtimeBaseUrl, `/api/demos/${deploy.id}/delete`, { method: "POST" });
}

async function testComplexSchemaFailureSample(runtimeBaseUrl) {
  const badSchemaZip = await createZipFromFiles("failure-schema-demo", {
    "package.json": JSON.stringify({
      scripts: { start: "node server.js" },
      dependencies: { express: "file:./vendor/express", mysql2: "file:./vendor/mysql2" }
    }),
    "vendor/express/package.json": JSON.stringify({ name: "express", version: "4.0.0", main: "index.js" }),
    "vendor/express/index.js": "module.exports = {};",
    "vendor/mysql2/package.json": JSON.stringify({ name: "mysql2", version: "3.0.0", main: "index.js" }),
    "vendor/mysql2/index.js": "module.exports = {};",
    "schema.sql": "CREATE TABLE broken_items (id INT PRIMARY KEY);\n-- DEMOGO_SCHEMA_ERROR",
    "index.html": "<!doctype html><html><body><h1>Schema Failure Demo</h1></body></html>",
    "server.js": "require('http').createServer((req, res) => res.end('schema failure')).listen(process.env.PORT);"
  });
  const failure = await postZipWithBase(runtimeBaseUrl, "/api/deploy", badSchemaZip, { name: "Failure Schema" }, { expectedStatus: 400 });
  assert(failure.diagnosis?.category === "database_init", `bad schema should expose database_init diagnosis, got ${failure.diagnosis?.category || "none"}`);
  assert(failure.diagnosis?.aiPrompt?.includes("schema.sql"), "bad schema diagnosis should tell AI to fix schema.sql");
  assert(failure.diagnosis?.evidence?.some((item) => item.includes("数据库")), "bad schema diagnosis should include database evidence");
}

async function testComplexFailureSamples(runtimeBaseUrl) {
  const missingStartZip = await createZipFromFiles("failure-missing-start-demo", {
    "package.json": JSON.stringify({
      dependencies: { express: "file:./vendor/express" }
    }),
    "vendor/express/package.json": JSON.stringify({ name: "express", version: "4.0.0", main: "index.js" }),
    "vendor/express/index.js": "module.exports = {};",
    "server.js": "require('http').createServer((req, res) => res.end('missing start')).listen(process.env.PORT);"
  });
  const missingStart = await postZipWithBase(runtimeBaseUrl, "/api/deploy", missingStartZip, { name: "Failure Missing Start" }, { expectedStatus: 400 });
  assert(
    missingStart.diagnosis?.category === "runtime_start",
    `missing start should expose runtime_start diagnosis, got ${missingStart.diagnosis?.category || "none"}: ${missingStart.error || missingStart.diagnosis?.summary || ""}`
  );
  assert(missingStart.diagnosis?.aiPrompt?.includes("start"), "missing start diagnosis should tell AI to add start command");

  const missingEnvZip = await createZipFromFiles("failure-missing-env-demo", {
    "package.json": JSON.stringify({
      scripts: { start: "node server.js" },
      dependencies: { express: "file:./vendor/express" }
    }),
    "vendor/express/package.json": JSON.stringify({ name: "express", version: "4.0.0", main: "index.js" }),
    "vendor/express/index.js": "module.exports = {};",
    ".env.example": "OPENAI_API_KEY=\n",
    "server.js": "require('http').createServer((req, res) => res.end(process.env.OPENAI_API_KEY || 'missing')).listen(process.env.PORT);"
  });
  const missingEnv = await postZipWithBase(runtimeBaseUrl, "/api/deploy", missingEnvZip, { name: "Failure Missing Env" });
  assert(missingEnv.runtime?.status === "config_required", "missing env should create config_required runtime state");
  assert(missingEnv.failureDiagnosis?.category === "runtime_env" || missingEnv.inspection?.failureDiagnosis?.category === "runtime_env", "missing env should expose runtime_env diagnosis");
  assert(missingEnv.runtimeConfig?.missing?.includes("OPENAI_API_KEY"), "missing env should list OPENAI_API_KEY");
  await requestJsonWithBase(runtimeBaseUrl, `/api/demos/${missingEnv.id}/offline`, { method: "POST" });
  await requestJsonWithBase(runtimeBaseUrl, `/api/demos/${missingEnv.id}/delete`, { method: "POST" });

  const portTimeoutZip = await createZipFromFiles("failure-port-timeout-demo", {
    "package.json": JSON.stringify({
      scripts: { start: "node server.js" },
      dependencies: { express: "file:./vendor/express" }
    }),
    "vendor/express/package.json": JSON.stringify({ name: "express", version: "4.0.0", main: "index.js" }),
    "vendor/express/index.js": "module.exports = {};",
    "server.js": "setInterval(() => {}, 1000);"
  });
  const portTimeout = await postZipWithBase(runtimeBaseUrl, "/api/deploy", portTimeoutZip, { name: "Failure Port Timeout" }, { expectedStatus: 400 });
  assert(portTimeout.diagnosis?.category === "runtime_start", "port timeout should expose runtime_start diagnosis");
  assert(portTimeout.diagnosis?.aiPrompt?.includes("process.env.PORT"), "port timeout diagnosis should mention process.env.PORT");

  const dependencyZip = await createZipFromFiles("failure-dependency-demo", {
    "package.json": JSON.stringify({
      scripts: { start: "node server.js" },
      dependencies: { "missing-private-package": "99.99.99" }
    }),
    "server.js": "require('http').createServer((req, res) => res.end('dependency')).listen(process.env.PORT);"
  });
  const dependencyFailure = await postZipWithBase(runtimeBaseUrl, "/api/deploy", dependencyZip, { name: "Failure Dependency" }, { expectedStatus: 400 });
  assert(
    dependencyFailure.diagnosis?.category === "dependency_install",
    `dependency failure should expose dependency_install diagnosis, got ${dependencyFailure.diagnosis?.category || "none"}: ${dependencyFailure.error || dependencyFailure.diagnosis?.summary || ""}`
  );
  assert(dependencyFailure.diagnosis?.aiPrompt?.includes("npm install"), "dependency diagnosis should mention npm install");

  const redisZip = await createZipFromFiles("failure-redis-demo", {
    "package.json": JSON.stringify({
      scripts: { start: "node server.js" },
      dependencies: { express: "file:./vendor/express", redis: "^4.0.0" }
    }),
    "vendor/express/package.json": JSON.stringify({ name: "express", version: "4.0.0", main: "index.js" }),
    "vendor/express/index.js": "module.exports = {};",
    "server.js": "require('http').createServer((req, res) => res.end('redis')).listen(process.env.PORT);"
  });
  const redisFailure = await postZipWithBase(runtimeBaseUrl, "/api/deploy", redisZip, { name: "Failure Redis" }, { expectedStatus: 400 });
  assert(
    redisFailure.diagnosis?.category === "unsupported",
    `redis project should expose unsupported diagnosis, got ${redisFailure.diagnosis?.category || "none"}: ${redisFailure.error || redisFailure.diagnosis?.summary || ""}`
  );
  assert(redisFailure.diagnosis?.aiPrompt?.includes("Redis"), "redis diagnosis should mention Redis");
}

async function createComplexCommerceTrialZip(name, versionLabel) {
  return createZipFromFiles(name, {
    "package.json": JSON.stringify({
      scripts: { start: "node server.js" },
      dependencies: {
        express: "file:./vendor/express",
        mysql2: "file:./vendor/mysql2"
      }
    }),
    "vendor/express/package.json": JSON.stringify({ name: "express", version: "4.0.0", main: "index.js" }),
    "vendor/express/index.js": "module.exports = {};",
    "vendor/mysql2/package.json": JSON.stringify({ name: "mysql2", version: "3.0.0", main: "index.js" }),
    "vendor/mysql2/index.js": "module.exports = {};",
    "schema.sql": [
      "CREATE TABLE products (id VARCHAR(32) PRIMARY KEY, name VARCHAR(120), price INT);",
      "CREATE TABLE trial_leads (id INT PRIMARY KEY, name VARCHAR(80), phone VARCHAR(32), product_id VARCHAR(32));"
    ].join("\n"),
    "index.html": `<!doctype html><html><head><meta charset="utf-8"><title>DemoGo Commerce Trial</title></head><body><main><h1>DemoGo Commerce Trial ${versionLabel}</h1><p>Commerce trial page for DemoGo full application smoke testing.</p><button id="lead">Book trial</button><script>fetch("./api/products").then(r=>r.json()).then(data=>{document.body.insertAdjacentHTML("beforeend","<pre>"+JSON.stringify(data.products,null,2)+"</pre>")});document.getElementById("lead").onclick=()=>fetch("./api/leads",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:"Web User",phone:"13800000000",productId:"sku-1"})});</script></main></body></html>`,
    "server.js": `const http = require("http");
const fs = require("fs");
const path = require("path");
const products = [
  { id: "sku-1", name: "DemoGo Starter Kit", price: 199 },
  { id: "sku-2", name: "DemoGo Pro Kit", price: 499 }
];
const page = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => resolve(body));
  });
}
http.createServer(async (req, res) => {
  if (req.url.startsWith("/api/products")) {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, products, database: process.env.MYSQL_DATABASE || "" }));
    return;
  }
  if (req.url.startsWith("/api/leads") && req.method === "POST") {
    const payload = JSON.parse(await readBody(req) || "{}");
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, received: payload, hasDatabasePassword: Boolean(process.env.MYSQL_PASSWORD) }));
    return;
  }
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(page);
}).listen(process.env.PORT);`
  });
}

async function createStaticZip(name = "smoke-demo", title = "Smoke Demo") {
  return createZipFromFiles(name, {
    "index.html": `<!doctype html><html><body><h1>${title}</h1></body></html>`
  });
}

async function createBlockedContentZip() {
  return createZipFromFiles(`blocked-content-${Date.now()}`, {
    "index.html": "<!doctype html><html><body><h1>高额回报</h1><p>导师带单，稳赚不赔，先垫付后返利。</p></body></html>"
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
  const { fileField = "project", ...requestOptions } = options;
  const form = new FormData();
  const bytes = await fs.readFile(zipPath);
  const type = zipPath.endsWith(".zip") ? "application/zip" : "application/gzip";
  form.append(fileField, new Blob([bytes], { type }), path.basename(zipPath));
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, String(value));
  }
  return requestJson(endpoint, {
    method: "POST",
    body: form,
    ...requestOptions
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
  return fetchTextWithBase(currentBaseUrl(), endpoint);
}

async function fetchTextWithBase(sourceBaseUrl, endpoint) {
  const response = await fetch(`${sourceBaseUrl}${endpoint}`, {
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
  return requestJsonWithBase(currentBaseUrl(), endpoint, options);
}

async function requestJsonWithBase(sourceBaseUrl, endpoint, options = {}) {
  const headers = {
    ...(options.headers || {})
  };
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(`${sourceBaseUrl}${endpoint}`, {
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

async function postZipWithBase(sourceBaseUrl, endpoint, zipPath, fields = {}, options = {}) {
  const { fileField = "project", ...requestOptions } = options;
  const form = new FormData();
  const bytes = await fs.readFile(zipPath);
  const type = zipPath.endsWith(".zip") ? "application/zip" : "application/gzip";
  form.append(fileField, new Blob([bytes], { type }), path.basename(zipPath));
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, String(value));
  }
  return requestJsonWithBase(sourceBaseUrl, endpoint, {
    method: "POST",
    body: form,
    ...requestOptions
  });
}

async function waitForRuntimeHealth(sourceBaseUrl) {
  for (let index = 0; index < 80; index += 1) {
    try {
      const health = await requestJsonWithBase(sourceBaseUrl, "/api/health");
      if (health.version === serviceVersion) return;
    } catch {
      // keep waiting
    }
    await sleep(250);
  }
  throw new Error(`runtime smoke server did not become healthy at ${sourceBaseUrl}`);
}

function currentBaseUrl() {
  return globalThis.__demogoBaseUrl || baseUrl;
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
