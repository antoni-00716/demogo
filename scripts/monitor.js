// DemoGo v0.9.30 - Health monitoring script
// Usage: node scripts/monitor.js
// Run via cron/systemd timer every minute for continuous monitoring.
// Sends email alerts via SMTP on consecutive failures.

import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";

const BASE_URL = process.env.DEMOGO_MONITOR_URL || "http://localhost:3001";
const ALERT_EMAIL = process.env.DEMOGO_ALERT_EMAIL || "";
const FAILURE_THRESHOLD = 3;
const INTERVAL_SECONDS = 60;

let consecutiveFailures = 0;
let wasDown = false;

// SMTP config (reuses same env vars as server)
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;
const SMTP_SECURE = process.env.SMTP_SECURE === "1" || SMTP_PORT === 465;

function log(message) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${message}`);
}

async function checkHealth() {
  const url = new URL("/api/health", BASE_URL);
  const client = url.protocol === "https:" ? https : http;

  return new Promise((resolve) => {
    const req = client.get(url.toString(), { timeout: 10000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve({ ok: res.statusCode === 200 && json.status === "healthy", data: json });
        } catch {
          resolve({ ok: false, data: { status: "error", error: "Invalid JSON response" } });
        }
      });
    });
    req.on("error", (err) => {
      resolve({ ok: false, data: { status: "error", error: err.message } });
    });
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, data: { status: "error", error: "Request timeout" } });
    });
  });
}

async function sendAlertEmail(subject, body) {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !ALERT_EMAIL) {
    log("SMTP not configured or no alert email set, skipping email alert");
    return false;
  }

  return new Promise((resolve) => {
    try {
      let socket = SMTP_SECURE
        ? tls.connect({ host: SMTP_HOST, port: SMTP_PORT, servername: SMTP_HOST })
        : net.connect({ host: SMTP_HOST, port: SMTP_PORT });

      let buffer = "";
      socket.setEncoding("utf8");
      socket.on("data", (chunk) => { buffer += chunk; });

      const send = (cmd) => {
        return new Promise((resolveCmd) => {
          socket.once("data", () => resolveCmd());
          socket.write(cmd + "\r\n");
        });
      };

      const waitFor = (code) => {
        return new Promise((resolveCmd, reject) => {
          const check = () => {
            if (buffer.includes(code)) { resolveCmd(); }
            else if (buffer.includes("5")) { reject(new Error("SMTP error: " + buffer.slice(-80))); }
            else { setTimeout(check, 100); }
          };
          check();
        });
      };

      const doSend = async () => {
        await waitFor("220");
        await send("EHLO demogo-monitor");
        await waitFor("250");
        if (!SMTP_SECURE) {
          await send("STARTTLS");
          await waitFor("220");
          const tlsSocket = tls.connect({ socket, servername: SMTP_HOST });
          socket = tlsSocket;
          socket.setEncoding("utf8");
          socket.on("data", (chunk) => { buffer += chunk; });
          await send("EHLO demogo-monitor");
          await waitFor("250");
        }
        const auth = Buffer.from(`\x00${SMTP_USER}\x00${SMTP_PASS}`).toString("base64");
        await send("AUTH PLAIN " + auth);
        await waitFor("235");
        await send(`MAIL FROM:<${SMTP_FROM}>`);
        await waitFor("250");
        await send(`RCPT TO:<${ALERT_EMAIL}>`);
        await waitFor("250");
        await send("DATA");
        await waitFor("354");
        const message = [
          `From: DemoGo Monitor <${SMTP_FROM}>`,
          `To: <${ALERT_EMAIL}>`,
          `Subject: ${subject}`,
          "Content-Type: text/plain; charset=utf-8",
          "",
          body,
          ".",
        ].join("\r\n");
        await send(message);
        await waitFor("250");
        await send("QUIT");
        socket.end();
        resolve(true);
      };

      doSend().catch((err) => {
        log(`Failed to send alert email: ${err.message}`);
        socket.end();
        resolve(false);
      });
    } catch (err) {
      log(`Failed to send alert email: ${err.message}`);
      resolve(false);
    }
  });
}

async function runCheck() {
  const result = await checkHealth();

  if (result.ok) {
    if (wasDown) {
      log("SERVICE RECOVERED - sending recovery notification");
      await sendAlertEmail(
        "[DemoGo] 服务已恢复",
        `DemoGo 服务已恢复正常。\n\n健康检查通过。\n时间：${new Date().toISOString()}`
      );
      wasDown = false;
    }
    consecutiveFailures = 0;
    log(`Health OK - ${JSON.stringify(result.data.checks)}`);
  } else {
    consecutiveFailures++;
    log(`Health FAIL (${consecutiveFailures}/${FAILURE_THRESHOLD}) - ${JSON.stringify(result.data)}`);

    if (consecutiveFailures >= FAILURE_THRESHOLD && !wasDown) {
      log("ALERT: Service is down!");
      wasDown = true;
      await sendAlertEmail(
        "[DemoGo] 服务异常告警",
        `DemoGo 服务连续 ${FAILURE_THRESHOLD} 次健康检查失败。\n\n` +
        `错误信息：${result.data.error || result.data.status || "未知错误"}\n` +
        `时间：${new Date().toISOString()}\n\n` +
        `请立即检查服务器状态。`
      );
    }
  }
}

// Main
log("DemoGo monitor started");
log(`Monitoring: ${BASE_URL}/api/health`);
log(`Alert email: ${ALERT_EMAIL || "(not configured)"}`);
log(`Interval: ${INTERVAL_SECONDS}s, Threshold: ${FAILURE_THRESHOLD} failures`);
log("");

(async () => {\n  await runCheck();\n  // One-shot mode: run once and exit. Use cron or systemd timer for scheduling.\n  process.exit(0);\n})();