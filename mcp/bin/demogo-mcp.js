#!/usr/bin/env node
import { mkdtemp, rm, stat } from "node:fs/promises";
import readline from "node:readline";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import {
  MAX_BYTES,
  VERSION,
  assertDirectory,
  assertSafeProjectDirectory,
  collectFiles,
  createProjectArchive,
  deployArchive,
  formatBytes,
  checkAgentToken,
  checkApiHealth,
  normalizeApiBase,
  safeArchiveName,
  summarizeProject,
  updateArchive
} from "../lib/core.js";

const tools = [
  {
    name: "demogo_check_project",
    description: "检查当前项目是否适合生成 DemoGo 试用链接。",
    inputSchema: {
      type: "object",
      properties: {
        dir: { type: "string", description: "项目目录，默认当前目录。" }
      }
    }
  },
  {
    name: "demogo_deploy_project",
    description: "打包当前项目并调用 DemoGo 生成试用链接。",
    inputSchema: {
      type: "object",
      properties: {
        dir: { type: "string", description: "项目目录，默认当前目录。" },
        name: { type: "string", description: "试用项目名称。" },
        apiBase: { type: "string", description: "DemoGo 平台地址。也可以通过 DEMOGO_API_BASE 环境变量提供。" },
        token: { type: "string", description: "DemoGo AI 发布口令，默认读取 DEMOGO_AGENT_TOKEN。" }
      },
      required: []
    }
  },
  {
    name: "demogo_update_project",
    description: "打包当前项目并更新已有 DemoGo 试用链接，原链接保持不变。",
    inputSchema: {
      type: "object",
      properties: {
        dir: { type: "string", description: "项目目录，默认当前目录。" },
        demoId: { type: "string", description: "要更新的 Demo ID、链接后缀或原试用链接。" },
        apiBase: { type: "string", description: "DemoGo 平台地址。也可以通过 DEMOGO_API_BASE 环境变量提供。" },
        token: { type: "string", description: "DemoGo AI 发布口令，默认读取 DEMOGO_AGENT_TOKEN。" }
      },
      required: ["demoId"]
    }
  },
  {
    name: "demogo_get_config",
    description: "查看 DemoGo MCP 当前可用配置来源。",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "demogo_doctor",
    description: "检查 DemoGo 平台地址和 AI 发布口令是否可用，适合发布前诊断。",
    inputSchema: {
      type: "object",
      properties: {
        apiBase: { type: "string", description: "DemoGo 平台地址。默认读取 DEMOGO_API_BASE。" },
        token: { type: "string", description: "DemoGo AI 发布口令。默认读取 DEMOGO_AGENT_TOKEN。" }
      },
      required: []
    }
  }
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on("line", async (line) => {
  if (!line.trim()) return;
  let request;
  try {
    request = JSON.parse(line);
  } catch {
    return;
  }
  const response = await handleRequest(request).catch((error) => ({
    jsonrpc: "2.0",
    id: request.id ?? null,
    error: {
      code: -32000,
      message: error instanceof Error ? error.message : "DemoGo MCP 调用失败。"
    }
  }));
  if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
});

async function handleRequest(request) {
  const { id, method, params = {} } = request;
  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "demogo-mcp", version: VERSION }
      }
    };
  }

  if (method === "notifications/initialized") return null;

  if (method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools } };
  }

  if (method === "tools/call") {
    const result = await callTool(params.name, params.arguments || {});
    return { jsonrpc: "2.0", id, result };
  }

  return {
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: `未知 MCP 方法：${method}` }
  };
}

async function callTool(name, args) {
  if (name === "demogo_get_config") return textResult(JSON.stringify(getConfigSummary(), null, 2));
  if (name === "demogo_doctor") return doctor(args);
  if (name === "demogo_check_project") return checkProject(args);
  if (name === "demogo_deploy_project") return deployProject(args);
  if (name === "demogo_update_project") return updateProject(args);
  throw new Error(`未知工具：${name}`);
}

async function doctor(args) {
  const apiBase = normalizeApiBase(args.apiBase || process.env.DEMOGO_API_BASE);
  const token = String(args.token || process.env.DEMOGO_AGENT_TOKEN || "").trim();
  if (!apiBase) {
    return textResult(JSON.stringify({
      ok: false,
      category: "missing_api_base",
      title: "缺少 DemoGo 平台地址",
      action: "请提供 apiBase，或设置 DEMOGO_API_BASE。"
    }, null, 2));
  }

  const health = await checkApiHealth(apiBase, `demogo-mcp/${VERSION}`);
  if (!token) {
    return textResult(JSON.stringify({
      ok: true,
      platform: {
        ok: true,
        service: health.service,
        version: health.version
      },
      token: {
        ok: false,
        category: "missing_agent_token",
        title: "缺少 DemoGo AI 发布口令",
        action: "请在 DemoGo 用户端生成 AI 发布口令，并设置 DEMOGO_AGENT_TOKEN。"
      }
    }, null, 2));
  }

  const tokenCheck = await checkAgentToken(apiBase, token, `demogo-mcp/${VERSION}`);
  return textResult(JSON.stringify({
    ok: true,
    platform: {
      ok: true,
      service: health.service,
      version: health.version
    },
    token: {
      ok: true,
      prefix: tokenCheck.prefix || "",
      account: tokenCheck.user?.email || tokenCheck.email || ""
    }
  }, null, 2));
}

async function checkProject(args) {
  const projectDir = path.resolve(String(args.dir || "."));
  await assertDirectory(projectDir);
  assertSafeProjectDirectory(projectDir);
  const files = await collectFiles(projectDir);
  const summary = summarizeProject(projectDir, files);
  return textResult([
    "DemoGo 项目检查结果：",
    `项目目录：${summary.projectDir}`,
    `文件数量：${summary.fileCount}`,
    `文件大小：${formatBytes(summary.totalBytes)}`,
    `页面入口：${summary.hasReadyPage ? "已发现" : (summary.singleHtmlEntry ? `已发现单页 ${summary.singleHtmlEntry}` : "未直接发现，DemoGo 发布时会继续检测")}`,
    `源码项目：${summary.hasPackageJson ? "已发现 package.json" : "未发现 package.json"}`
  ].join("\n"));
}

async function deployProject(args) {
  const apiBase = normalizeApiBase(args.apiBase || process.env.DEMOGO_API_BASE);
  const token = String(args.token || process.env.DEMOGO_AGENT_TOKEN || "").trim();
  if (!apiBase) throw new Error("缺少 DemoGo 平台地址。请提供 apiBase，或设置 DEMOGO_API_BASE。");
  if (!token) throw new Error("缺少 DemoGo AI 发布口令。请提供 token，或设置 DEMOGO_AGENT_TOKEN。");

  const projectDir = path.resolve(String(args.dir || "."));
  const projectName = String(args.name || path.basename(projectDir)).trim();
  await assertDirectory(projectDir);
  assertSafeProjectDirectory(projectDir);
  const files = await collectFiles(projectDir);
  if (!files.length) throw new Error("当前目录没有可发布文件。");

  const archivePath = path.join(await mkdtemp(path.join(os.tmpdir(), "demogo-mcp-")), `${safeArchiveName(projectName)}.tar.gz`);
  try {
    await createProjectArchive(projectDir, files, archivePath);
    const archiveStats = await stat(archivePath);
    if (archiveStats.size > MAX_BYTES) {
      throw new Error(`打包后文件超过 50MB，请减少大文件后重试。当前约 ${formatBytes(archiveStats.size)}。`);
    }
    const result = await deployArchive({
      apiBase,
      token,
      archivePath,
      projectName,
      source: "mcp",
      userAgent: `demogo-mcp/${VERSION}`
    });
    return textResult(JSON.stringify({
      ok: true,
      message: "DemoGo 试用链接已生成。",
      projectName: result.projectName || result.name || projectName,
      publicUrl: result.publicUrl,
      deploySource: result.deploySource || "mcp",
      deploySourceLabel: result.deploySourceLabel || "DemoGo MCP",
      detectedType: result.detectedType || "",
      autoFormEnabled: Boolean(result.autoFormEnabled || result.inspection?.autoFormEnabled),
      contentReviewStatus: result.contentReviewStatus || result.contentReview?.status || "",
      nextStep: result.nextStep || "请打开链接检查页面是否符合预期。"
    }, null, 2));
  } finally {
    await rm(path.dirname(archivePath), { recursive: true, force: true });
  }
}

async function updateProject(args) {
  const apiBase = normalizeApiBase(args.apiBase || process.env.DEMOGO_API_BASE);
  const token = String(args.token || process.env.DEMOGO_AGENT_TOKEN || "").trim();
  const demoRef = String(args.demoId || args.id || args.slug || args.url || "").trim();
  if (!apiBase) throw new Error("缺少 DemoGo 平台地址。请提供 apiBase，或设置 DEMOGO_API_BASE。");
  if (!token) throw new Error("缺少 DemoGo AI 发布口令。请提供 token，或设置 DEMOGO_AGENT_TOKEN。");
  if (!demoRef) throw new Error("缺少要更新的 Demo ID、链接后缀或原试用链接。");

  const projectDir = path.resolve(String(args.dir || "."));
  await assertDirectory(projectDir);
  assertSafeProjectDirectory(projectDir);
  const files = await collectFiles(projectDir);
  if (!files.length) throw new Error("当前目录没有可发布文件。");

  const archivePath = path.join(await mkdtemp(path.join(os.tmpdir(), "demogo-mcp-")), `${safeArchiveName(demoRef)}.tar.gz`);
  try {
    await createProjectArchive(projectDir, files, archivePath);
    const archiveStats = await stat(archivePath);
    if (archiveStats.size > MAX_BYTES) {
      throw new Error(`打包后文件超过 50MB，请减少大文件后重试。当前约 ${formatBytes(archiveStats.size)}。`);
    }
    const result = await updateArchive({
      apiBase,
      token,
      archivePath,
      demoRef,
      source: "mcp",
      userAgent: `demogo-mcp/${VERSION}`
    });
    return textResult(JSON.stringify({
      ok: true,
      message: "DemoGo 试用项目已更新，原链接保持不变。",
      projectName: result.projectName || result.name || "",
      publicUrl: result.publicUrl,
      version: result.version,
      deploySource: result.deploySource || "mcp",
      deploySourceLabel: result.deploySourceLabel || "DemoGo MCP",
      detectedType: result.detectedType || "",
      autoFormEnabled: Boolean(result.autoFormEnabled || result.inspection?.autoFormEnabled),
      contentReviewStatus: result.contentReviewStatus || result.contentReview?.status || "",
      nextStep: result.nextStep || "请刷新原链接检查页面是否符合预期。"
    }, null, 2));
  } finally {
    await rm(path.dirname(archivePath), { recursive: true, force: true });
  }
}

function getConfigSummary() {
  return {
    version: VERSION,
    apiBase: process.env.DEMOGO_API_BASE || "",
    hasApiBase: Boolean(process.env.DEMOGO_API_BASE),
    hasAgentToken: Boolean(process.env.DEMOGO_AGENT_TOKEN)
  };
}

function textResult(text) {
  return {
    content: [
      {
        type: "text",
        text
      }
    ]
  };
}
