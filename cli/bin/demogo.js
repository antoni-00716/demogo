#!/usr/bin/env node
import { mkdir, mkdtemp, readFile, rm, unlink, writeFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import {
  MAX_BYTES,
  VERSION,
  assertDirectory,
  collectFiles,
  createProjectArchive,
  deployArchive,
  formatBytes,
  checkApiHealth,
  normalizeApiBase,
  safeArchiveName,
  summarizeProject
} from "../lib/core.js";

const CONFIG_DIR = path.join(os.homedir(), ".demogo");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

main().catch((error) => {
  fail(error instanceof Error ? error.message : "DemoGo CLI 执行失败。");
});

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const rest = args.slice(1);

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "version" || command === "--version" || command === "-v") {
    console.log(VERSION);
    return;
  }

  if (command === "config") {
    await handleConfig(rest);
    return;
  }

  if (command === "deploy") {
    await handleDeploy(rest);
    return;
  }

  if (command === "doctor") {
    await handleDoctor(rest);
    return;
  }

  fail(`未知命令：${command}\n运行 demogo help 查看可用命令。`);
}

async function handleConfig(args) {
  const subcommand = args[0];
  if (subcommand === "set") {
    const options = parseOptions(args.slice(1));
    const current = await readConfig();
    const next = {
      ...current,
      ...(options.api ? { apiBase: normalizeApiBase(options.api) } : {}),
      ...(options.token ? { token: String(options.token).trim() } : {})
    };
    await writeConfig(next);
    console.log("DemoGo CLI 配置已保存。");
    console.log(`API 地址：${next.apiBase || "未配置"}`);
    console.log(`AI 发布口令：${next.token ? maskToken(next.token) : "未配置"}`);
    return;
  }

  if (subcommand === "show") {
    const config = await readConfig();
    const token = config.token || process.env.DEMOGO_AGENT_TOKEN || "";
    console.log(`API 地址：${config.apiBase || process.env.DEMOGO_API_BASE || "未配置"}`);
    console.log(`AI 发布口令：${token ? maskToken(token) : "未配置"}`);
    return;
  }

  if (subcommand === "clear") {
    await clearConfig();
    console.log("DemoGo CLI 本机配置已清除。");
    return;
  }

  if (subcommand === "test") {
    await handleDoctor(args.slice(1));
    return;
  }

  fail("用法：demogo config set --api <地址> --token <AI发布口令>、demogo config show、demogo config clear，或 demogo doctor");
}

async function handleDeploy(args) {
  const options = parseOptions(args);
  const config = await readConfig();
  const apiBase = normalizeApiBase(options.api || config.apiBase || process.env.DEMOGO_API_BASE);
  const token = String(options.token || config.token || process.env.DEMOGO_AGENT_TOKEN || "").trim();
  const projectDir = path.resolve(String(options.dir || "."));
  const projectName = String(options.name || path.basename(projectDir)).trim();

  if (!apiBase) {
    fail([
      "缺少 DemoGo 平台地址。",
      "请先在 DemoGo 工作台复制平台地址，然后运行：",
      "demogo config set --api <DemoGo平台地址> --token <你的AI发布口令>"
    ].join("\n"));
  }

  if (!token) {
    fail([
      "缺少 DemoGo AI 发布口令。",
      "请先在 DemoGo 工作台生成口令，然后运行：",
      `demogo config set --api ${apiBase || "<DemoGo平台地址>"} --token <你的AI发布口令>`
    ].join("\n"));
  }

  await assertDirectory(projectDir);
  const fileList = await collectFiles(projectDir);
  if (!fileList.length) fail("当前目录没有可发布文件。");

  const archivePath = path.join(await mkdtemp(path.join(os.tmpdir(), "demogo-cli-")), `${safeArchiveName(projectName)}.tar.gz`);
  try {
    console.log("DemoGo 正在检查当前项目...");
    printProjectSummary(summarizeProject(projectDir, fileList));
    console.log("DemoGo 正在打包项目...");
    await createProjectArchive(projectDir, fileList, archivePath);
    const archiveStats = await stat(archivePath);
    if (archiveStats.size > MAX_BYTES) {
      fail(`打包后文件超过 50MB，请减少大文件后重试。当前约 ${formatBytes(archiveStats.size)}。`);
    }
    console.log(`项目包已生成：${formatBytes(archiveStats.size)}`);
    console.log("DemoGo 正在生成试用链接...");
    const result = await deployArchive({ apiBase, token, archivePath, projectName, source: "cli" });
    printDeployResult(result);
  } finally {
    await rm(path.dirname(archivePath), { recursive: true, force: true });
  }
}

async function handleDoctor(args) {
  const options = parseOptions(args);
  const config = await readConfig();
  const apiBase = normalizeApiBase(options.api || config.apiBase || process.env.DEMOGO_API_BASE);
  const token = String(options.token || config.token || process.env.DEMOGO_AGENT_TOKEN || "").trim();

  if (!apiBase) {
    fail("缺少 DemoGo 平台地址。请先运行 demogo config set --api <DemoGo地址> --token <AI发布口令>。");
  }

  console.log("DemoGo 正在检查平台地址...");
  const health = await checkApiHealth(apiBase);
  console.log(`平台连接正常：${health.service || "demogo-server"} ${health.version || ""}`.trim());
  console.log(`AI 发布口令：${token ? "已配置" : "未配置"}`);
  if (!token) {
    console.log("提示：没有 AI 发布口令时只能检查平台地址，不能直接发布项目。");
  }
}

function parseOptions(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const item = args[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    index += 1;
  }
  return options;
}

async function readConfig() {
  try {
    return JSON.parse(await readFile(CONFIG_FILE, "utf8"));
  } catch {
    return {};
  }
}

async function writeConfig(value) {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_FILE, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function clearConfig() {
  await unlink(CONFIG_FILE).catch((error) => {
    if (error?.code !== "ENOENT") throw error;
  });
}

function printDeployResult(result) {
  console.log("");
  console.log("DemoGo 试用链接已生成。");
  console.log(`项目名称：${result.projectName || result.name || result.slug || "-"}`);
  console.log(`访问链接：${result.publicUrl || "-"}`);
  console.log(`发布方式：${result.deploySourceLabel || "DemoGo CLI"}`);
  console.log(`页面类型：${result.detectedType || "-"}`);
  console.log(`内容检查：${result.contentReview?.statusLabel || result.contentReviewStatus || "已通过"}`);
  console.log(`报名/留言收集：${result.autoFormEnabled || result.inspection?.autoFormEnabled ? "已自动开启" : "未自动开启"}`);
  if (result.nextStep) console.log(`下一步：${result.nextStep}`);
}

function printProjectSummary(summary) {
  console.log(`项目目录：${summary.projectDir}`);
  console.log(`准备上传：${summary.fileCount} 个文件，约 ${formatBytes(summary.totalBytes)}`);
  console.log(`页面入口：${summary.hasReadyPage ? "已发现" : (summary.singleHtmlEntry ? `已发现单页 ${summary.singleHtmlEntry}` : "未直接发现，DemoGo 会继续检测")}`);
  if (summary.hasPackageJson) console.log("源码项目：已发现 package.json");
}

function maskToken(token) {
  const value = String(token || "");
  if (value.length <= 14) return "已配置";
  return `${value.slice(0, 10)}...${value.slice(-4)}`;
}

function printHelp() {
  console.log(`
DemoGo CLI ${VERSION}

常用命令：
  demogo config set --api <DemoGo地址> --token <AI发布口令>
  demogo config show
  demogo config clear
  demogo doctor
  demogo deploy
  demogo deploy --name <项目名称> --dir <项目目录>

本地安装：
  解压 dist/demogo-cli-v${VERSION}.zip 后，在解压目录执行 npm install -g .
  安装完成后运行 demogo --version 验证。

环境变量：
  DEMOGO_API_BASE       DemoGo API 地址
  DEMOGO_AGENT_TOKEN    DemoGo AI 发布口令

示例：
  demogo config set --api https://your-demogo.example.com --token dmg_xxx_xxx
  demogo deploy --name 我的报名页
`.trim());
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
