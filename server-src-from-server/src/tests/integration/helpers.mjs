import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createWriteStream } from "node:fs";
import { gzipSync } from "node:zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");
const testRoot = path.join(projectRoot, ".tmp", "integration-test");

export const testConfig = {
  port: 3120,
  adminUser: "admin",
  adminPassword: "admin-test-pass",
  get baseUrl() {
    return `http://127.0.0.1:${this.port}`;
  },
};

export async function setupTestEnvironment() {
  await fs.rm(testRoot, { recursive: true, force: true });
  await fs.mkdir(path.join(testRoot, "data"), { recursive: true });
  await fs.mkdir(path.join(testRoot, "uploads"), { recursive: true });
  await fs.mkdir(path.join(testRoot, "site", "d"), { recursive: true });
  await fs.mkdir(path.join(testRoot, "logs"), { recursive: true });
}

export function startServer(env = {}) {
  const nodePath = process.execPath;
  const child = spawn(nodePath, ["src/server.js"], {
    cwd: path.join(projectRoot, "server"),
    env: {
      ...process.env,
      PATH: "C:\\Program Files\\nodejs;" + process.env.PATH,
      PORT: String(testConfig.port),
      PUBLIC_BASE_URL: testConfig.baseUrl,
      DEMOGO_DATA_DIR: path.join(testRoot, "data"),
      DEMOGO_UPLOAD_DIR: path.join(testRoot, "uploads"),
      DEMOGO_DEMO_ROOT: path.join(testRoot, "site", "d"),
      DEMOGO_ADMIN_USER: testConfig.adminUser,
      DEMOGO_ADMIN_PASSWORD: testConfig.adminPassword,
      DEMOGO_EMAIL_VERIFICATION_ENABLED: "0",
      DEMOGO_DEPLOY_RATE_LIMIT: "100",
      DEMOGO_BUILD_MODE: "host",
      DEMOGO_RUNTIME_ENABLED: "0",
      DEMOGO_RUNTIME_NODE_ENABLED: "0",
      DEMOGO_RUNTIME_DRIVER: "host",
      DEMOGO_CSRF_DISABLED: "1",
      DEMOGO_DB_HOST: "",
      DEMOGO_DB_NAME: "",
      DEMOGO_DB_USER: "",
      DEMOGO_DB_PASSWORD: "",
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stderr.pipe(process.stderr);
  return child;
}

export async function waitForServer(baseUrl, maxWaitMs = 30000) {
  const startTime = Date.now();
  console.error(`Waiting for server at ${baseUrl}...`);
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        console.error(`Server is ready after ${Date.now() - startTime}ms`);
        return true;
      }
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`Server did not start within ${maxWaitMs}ms`);
}

export async function httpRequest(method, endpoint, body = null, headers = {}) {
  const url = `${testConfig.baseUrl}${endpoint}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type");

  let data;
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return {
    status: response.status,
    headers: response.headers,
    data,
  };
}

export async function getJson(endpoint, headers = {}) {
  const response = await httpRequest("GET", endpoint, null, headers);
  if (typeof response.data === "string") {
    throw new Error(`Expected JSON but got: ${response.data}`);
  }
  return response.data;
}

export async function postJson(endpoint, body, headers = {}) {
  return httpRequest("POST", endpoint, body, headers);
}

export async function putJson(endpoint, body, headers = {}) {
  return httpRequest("PUT", endpoint, body, headers);
}

export async function deleteRequest(endpoint, headers = {}) {
  return httpRequest("DELETE", endpoint, null, headers);
}

export async function getText(endpoint, headers = {}) {
  const response = await httpRequest("GET", endpoint, null, headers);
  if (typeof response.data !== "string") {
    throw new Error(`Expected text but got JSON: ${JSON.stringify(response.data)}`);
  }
  return response.data;
}

export async function register(email, password, name = "Test User") {
  const result = await postJson("/api/auth/register", { email, password, name });
  return result;
}

export async function login(email, password) {
  const result = await postJson("/api/auth/login", { email, password });
  return result;
}

export async function logout(cookie) {
  return postJson("/api/auth/logout", {}, { Cookie: cookie });
}

export async function getMe(cookie) {
  return getJson("/api/me", { Cookie: cookie });
}

export async function registerAndLogin(email = "test@example.com", password = "password123") {
  await register(email, password);
  const loginResult = await login(email, password);
  const cookie = loginResult.headers.get("set-cookie");
  const cookieValue = extractCookieValue(cookie);
  return {
    email,
    password,
    cookie: cookieValue,
    user: loginResult.data,
  };
}

export function extractCookieValue(setCookieHeader) {
  if (!setCookieHeader) return "";
  const match = setCookieHeader.match(/^demogo_session=([^;]+)/);
  return match ? `demogo_session=${match[1]}` : "";
}

export async function createZipFromFiles(files) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  for (const [filePath, content] of Object.entries(files)) {
    zip.file(filePath, content);
  }

  const zipPath = path.join(testRoot, `test-${Date.now()}.zip`);
  await fs.mkdir(path.dirname(zipPath), { recursive: true });

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  await fs.writeFile(zipPath, zipBuffer);

  return zipPath;
}

export async function createTarFromFiles(files) {
  const tarPath = path.join(testRoot, `test-${Date.now()}.tar.gz`);

  const tarEntries = [];
  for (const [filePath, content] of Object.entries(files)) {
    tarEntries.push({ path: filePath, content });
  }

  const tarBuffer = createTarBuffer(tarEntries);
  await fs.writeFile(tarPath, tarBuffer);

  return tarPath;
}

function createTarBuffer(entries) {
  const buffers = [];
  const encoder = new TextEncoder();

  for (const entry of entries) {
    const content = typeof entry.content === "string"
      ? encoder.encode(entry.content)
      : entry.content;

    const header = createTarHeader(entry.path, content.length);
    buffers.push(Buffer.from(header));
    buffers.push(content);

    const padding = (512 - (content.length % 512)) % 512;
    if (padding > 0) {
      buffers.push(Buffer.alloc(padding));
    }
  }

  buffers.push(Buffer.alloc(1024));

  return Buffer.concat(buffers);
}

function createTarHeader(name, size) {
  const header = Buffer.alloc(512);
  const encoder = new TextEncoder();

  header.write(name.padEnd(100).slice(0, 100), 0, 100, "ascii");
  header.write("0000644", 100, 7, "octal");
  header.write("0000000", 107, 7, "octal");
  header.write("0000000", 116, 7, "octal");
  header.write("0000000", 124, 7, "octal");
  header.write("0000000", 132, 7, "octal");
  header.write(String(size).padStart(11, "0"), 124, 11, "octal");
  header.write("0", 156, 1);
  header.write("        ", 257, 8);

  let sum = 0;
  for (let i = 0; i < 512; i++) {
    sum += header[i];
  }
  header.write(String(sum).padStart(6, "0"), 148, 8, "octal");
  header.write(" ", 154, 1);

  return header;
}

export async function uploadZip(endpoint, zipPath, additionalFields = {}) {
  const FormData = (await import("node:form-data")).default;
  const form = new FormData();

  const fileStream = await fs.readFile(zipPath);
  form.append("file", fileStream, {
    filename: path.basename(zipPath),
    contentType: "application/zip",
  });

  for (const [key, value] of Object.entries(additionalFields)) {
    form.append(key, value);
  }

  const response = await fetch(`${testConfig.baseUrl}${endpoint}`, {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
  });

  const data = await response.json();
  return { status: response.status, data };
}

export async function inspectProject(zipPath, cookie = "") {
  return uploadZip("/api/inspect", zipPath, {}, cookie);
}

export async function deployProject(zipPath, options = {}, cookie = "") {
  return uploadZip("/api/deploy", zipPath, options, cookie);
}

export async function getDemos(cookie) {
  return getJson("/api/demos", { Cookie: cookie });
}

export async function getDemo(id, cookie) {
  return getJson(`/api/demos/${id}`, { Cookie: cookie });
}

export async function deleteDemo(id, cookie) {
  return deleteRequest(`/api/demos/${id}/delete`, { Cookie: cookie });
}

export async function updateDemoSlug(id, slug, cookie) {
  return postJson(`/api/demos/${id}/slug`, { slug }, { Cookie: cookie });
}

export async function getForms(cookie) {
  return getJson("/api/forms", { Cookie: cookie });
}

export async function getForm(id, cookie) {
  return getJson(`/api/forms/${id}`, { Cookie: cookie });
}

export async function getFormSubmissions(formId, cookie) {
  return getJson(`/api/forms/${formId}/submissions`, { Cookie: cookie });
}

export async function updateDemo(id, updates, cookie) {
  return postJson(`/api/demos/${id}`, updates, { Cookie: cookie });
}

export async function takeDemoOffline(id, cookie) {
  return postJson(`/api/demos/${id}/offline`, {}, { Cookie: cookie });
}

export async function restartRuntime(id, cookie) {
  return postJson(`/api/demos/${id}/runtime/restart`, {}, { Cookie: cookie });
}

export async function updateRuntimeEnv(id, env, cookie) {
  return postJson(`/api/demos/${id}/runtime/env`, { env }, { Cookie: cookie });
}

export async function resetDatabase(id, cookie) {
  return postJson(`/api/demos/${id}/database/reset`, {}, { Cookie: cookie });
}

export async function requestPlanUpgrade(plan, cookie) {
  return postJson("/api/plan-upgrade/request", { plan }, { Cookie: cookie });
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function assertEqual(actual, expected, message = "") {
  if (actual !== expected) {
    throw new Error(`Expected ${expected} but got ${actual}. ${message}`);
  }
}

export function assertContains(text, substring, message = "") {
  if (!text.includes(substring)) {
    throw new Error(`Expected text to contain "${substring}". ${message}`);
  }
}

export function assertHasProperty(obj, prop, message = "") {
  if (!(prop in obj)) {
    throw new Error(`Expected object to have property "${prop}". ${message}`);
  }
}

export function assertIsArray(arr, message = "") {
  if (!Array.isArray(arr)) {
    throw new Error(`Expected array but got ${typeof arr}. ${message}`);
  }
}

export function assertGreaterOrEqual(actual, expected, message) {
  if (actual < expected) {
    throw new Error(`Expected ${actual} to be >= ${expected}. ${message}`);
  }
}

export { testRoot, projectRoot };
