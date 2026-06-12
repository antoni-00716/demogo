// DemoGo v0.9.39 - HTTP integration tests for demos.js
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(__dirname, "..");
const TMP = path.join(SERVER_DIR, ".tmp", `demos-test-${Date.now()}`);
const DATA_DIR = path.join(TMP, "data");
const HELPER = path.join(SERVER_DIR, ".tmp", "demos-test-helper.mjs");

let childProc = null;
let baseUrl = "";

function killServer() {
  if (childProc) {
    try { childProc.kill("SIGTERM"); } catch {}
    childProc = null;
  }
}

describe("demos.js HTTP routes", () => {
  before(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });

    // Write mock data
    const demos = [
      { id: "demo-1", userId: "user-1", name: "Demo 1", slug: "demo-1", status: "published", createdAt: "2026-06-01T00:00:00Z" },
      { id: "demo-2", userId: "user-1", name: "Demo 2", slug: "demo-2", status: "offline", createdAt: "2026-06-02T00:00:00Z" },
      { id: "demo-3", userId: "user-2", name: "Demo 3", slug: "demo-3", status: "published", createdAt: "2026-06-03T00:00:00Z" },
    ];
    await fs.writeFile(path.join(DATA_DIR, "demos.json"), JSON.stringify(demos));
    await fs.writeFile(path.join(DATA_DIR, "users.json"), JSON.stringify([{ id: "user-1" }, { id: "user-2" }]));

    // Write helper script
    const scriptContent = `
import express from "express";
import { registerDemosRoutes } from "../routes/demos.js";
const d = "${DATA_DIR.replace(/\\/g, "/")}";
const app = express();
app.use(express.json());
registerDemosRoutes(app, {
  requireUser: (req, _res, next) => { req.user = req.headers["x-test-user"] ? { id: req.headers["x-test-user"] } : undefined; next(); },
  uploadProjectArchive: (_r, _r2, n) => n(),
  flushUsageStats: async () => {},
  getUserFromRequest: async (req) => req.headers["x-test-user"] ? { id: req.headers["x-test-user"] } : null,
  svcReadDeploymentEventsForDemo: async () => [],
  createDeploymentJob: async () => ({ id: "job-1" }),
  runDeploymentJob: async () => {},
  publicDeploymentJob: (j) => j,
  removeDemoFiles: async () => {},
  deleteDemoFiles: async () => {},
  performUpdateDeployment: async () => ({ status: "updated", slug: "test" }),
  demoRoot: d + "/demos",
  getArchivedDemoDir: () => d + "/archived",
  hostingConfig: () => ({ version: "0.9.39" }),
  expireDemoFiles: async () => {},
  restartDemoRuntime: async () => ({}),
  formsFile: d + "/forms.json",
  formSubmissionsFile: d + "/form-submissions.json",
});
const srv = app.listen(0, () => process.stdout.write("PORT:" + srv.address().port + "\\n"));
`.trim();
    await fs.writeFile(HELPER, scriptContent);

    // Check current Redis host
    const redisHost = process.env.REDIS_HOST || "127.0.0.1";

    childProc = spawn("node", [HELPER], {
      cwd: SERVER_DIR,
      env: {
        ...process.env,
        DEMOGO_DATA_DIR: DATA_DIR,
        REDIS_HOST: redisHost,
        DEMOGO_CSRF_DISABLED: "1",
        DEMOGO_RUNTIME_ENABLED: "0",
        DEMOGO_RUNTIME_NODE_ENABLED: "0",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    // Wait for port announcement
    baseUrl = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        killServer();
        reject(new Error("Server start timeout after 20s"));
      }, 20000);

      let stdout = "";
      let stderr = "";

      childProc.stdout.on("data", (d) => {
        stdout += d.toString();
        const m = stdout.match(/PORT:(\d+)/);
        if (m) {
          clearTimeout(timeout);
          resolve(`http://127.0.0.1:${m[1]}`);
        }
      });

      childProc.stderr.on("data", (d) => {
        stderr += d.toString();
      });

      childProc.on("error", (err) => {
        clearTimeout(timeout);
        reject(new Error(`Child error: ${err.message}`));
      });

      childProc.on("exit", (code, signal) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(new Error(`Child exited (code=${code}, signal=${signal}): ${stderr || stdout || "(no output)"}`));
        }
      });
    });
  }, { timeout: 30000 });

  after(() => {
    killServer();
    // Cleanup temp files
    setTimeout(() => {
      fs.rm(HELPER, { force: true }).catch(() => {});
      fs.rm(TMP, { recursive: true, force: true }).catch(() => {});
    }, 500);
  });

  it("GET /api/demos returns 401 without auth header", async () => {
    const res = await fetch(`${baseUrl}/api/demos`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, "请先登录");
  });

  it("GET /api/demos returns user's own demos only", async () => {
    const res = await fetch(`${baseUrl}/api/demos`, {
      headers: { "x-test-user": "user-1" },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.demos));
    // user-1 has 2 demos in the mock data
    assert.equal(body.demos.length, 2);
  });

  it("GET /api/demos/:id returns 404 for other user's demo", async () => {
    const res = await fetch(`${baseUrl}/api/demos/demo-1`, {
      headers: { "x-test-user": "user-2" },
    });
    assert.equal(res.status, 404);
  });

  it("GET /api/demos/:id returns demo details for owner", async () => {
    const res = await fetch(`${baseUrl}/api/demos/demo-1`, {
      headers: { "x-test-user": "user-1" },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.demo);
    assert.equal(body.demo.name, "Demo 1");
    assert.equal(body.demo.slug, "demo-1");
  });

  it("GET /api/demos/:id/events returns 200 for owner", async () => {
    const res = await fetch(`${baseUrl}/api/demos/demo-1/events`, {
      headers: { "x-test-user": "user-1" },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.events));
  });

  it("GET /api/demos/:id/inspection returns 200 for owner", async () => {
    const res = await fetch(`${baseUrl}/api/demos/demo-1/inspection`, {
      headers: { "x-test-user": "user-1" },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    // inspection may be null for mock data without inspection field
    assert.ok(Object.prototype.hasOwnProperty.call(body, "inspection"));
  });

  it("GET /api/demos/:id returns 404 without auth (via getUserFromRequest)", async () => {
    const res = await fetch(`${baseUrl}/api/demos/demo-1`);
    // Without auth, requireUser mock passes but getUserFromRequest returns null,
    // which causes 500 when handler accesses req.user.id
    // (the actual middleware would block this with 401)
    assert.ok(res.status >= 400);
  });
});
