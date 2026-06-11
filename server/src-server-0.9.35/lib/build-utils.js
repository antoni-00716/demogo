// DemoGo v0.9.6 - Build utility functions (extracted from server.js)
import { execFile } from "node:child_process";
import { buildTimeoutMs } from "../config.js";
import { normalizeEnvKey, isPlatformEnvKey } from "./env-utils.js";

/**
 * Run a command with timeout and log sanitization.
 */
export function runCommand(command, args, cwd, env = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, {
      cwd,
      shell: process.platform === "win32",
      timeout: buildTimeoutMs,
      maxBuffer: 1024 * 1024 * 2,
      env: {
        ...process.env,
        ...sanitizeBuildEnv(env),
        CI: "true"
      }
    }, (error, stdout, stderr) => {
      const output = [
        `$ ${command} ${formatCommandArgsForLog(args).join(" ")}`,
        stdout,
        stderr
      ].filter(Boolean).join("\n");

      if (error) {
        const commandError = new Error(`构建命令失败：${command} ${args.join(" ")}\n${error.message}\n${output}`);
        commandError.code = error.code;
        commandError.signal = error.signal;
        commandError.killed = error.killed;
        reject(commandError);
        return;
      }
      resolve(output);
    });
  });
}

/**
 * Sanitize command arguments for logging (mask secrets).
 */
export function formatCommandArgsForLog(args = []) {
  return (args || []).map((arg, index) => {
    const text = String(arg);
    const previous = String(args[index - 1] || "");
    if (previous === "-e" && /^[A-Z_][A-Z0-9_]*=/.test(text)) {
      const [key] = text.split("=");
      return `${key}=***`;
    }
    if (/^(.*(?:KEY|SECRET|TOKEN|PASS|PASSWORD|ANON).*)=/i.test(text)) {
      return text.replace(/=.*/, "=***");
    }
    return text;
  });
}

/**
 * Sanitize environment variables for build execution.
 */
export function sanitizeBuildEnv(env = {}, { isUnsafeExternalSecretKey } = {}) {
  const result = {};
  for (const [rawKey, rawValue] of Object.entries(env || {})) {
    const key = normalizeEnvKey(rawKey);
    if (!key || isPlatformEnvKey(key)) continue;
    if (isUnsafeExternalSecretKey && isUnsafeExternalSecretKey(key)) continue;
    const value = String(rawValue ?? "").trim();
    if (!value) continue;
    result[key] = value;
  }
  return result;
}

/**
 * Check if a command is available on the system.
 */
export async function commandAvailable(command) {
  const checkCommand = process.platform === "win32" ? "where" : "which";
  try {
    await runCommand(checkCommand, [command], process.cwd());
    return true;
  } catch {
    return false;
  }
}

/**
 * Translate build errors into user-friendly Chinese messages.
 */
export function explainBuildError(error) {
  const message = String(error?.message || "");
  if (error?.killed || message.includes("ETIMEDOUT")) {
    return "项目生成时间过长，系统已停止处理。常见原因是依赖过多、上传了无关依赖目录，或项目配置异常。建议先在 AI 编程工具中生成 dist/build 后再上传。";
  }
  if (message.includes("scripts.build") || message.includes("未找到 scripts.build")) {
    return "检测到 package.json，但未找到生成网页的 build 命令。请先在 AI 编程工具中生成可发布版本，或补充 build 命令后重新上传。";
  }
  if (message.includes("JSON")) {
    return "package.json 解析失败，请检查项目配置文件格式是否正确。";
  }
  if (message.includes("npm") || message.includes("构建命令失败")) {
    return "项目自动生成失败。常见原因是依赖安装失败、项目配置不完整，或源码需要本地特殊环境。建议先生成 dist/build 后再上传。";
  }
  return "项目自动生成失败，请检查项目配置，或先生成 dist/build 后重新上传。";
}