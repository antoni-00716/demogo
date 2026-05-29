#!/usr/bin/env node
import { mkdir, mkdtemp, readFile, rm, unlink, writeFile, stat } from "node:fs/promises";
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
  getProjectDetails,
  normalizeApiBase,
  safeArchiveName,
  summarizeProject,
  updateArchive
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

  if (command === "update") {
    await handleUpdate(rest);
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
  const { apiBase, token, projectDir, projectName } = await resolvePublishContext(options, "deploy");
  const existingProject = await readProjectRecord(projectDir);
  if (existingProject?.demoRef && !options.new) {
    console.log("DemoGo 发现当前项目目录已有发布记录，本次将更新原试用链接。");
    console.log(`原访问链接：${existingProject.publicUrl || existingProject.demoRef}`);
    await publishUpdate({
      apiBase,
      token,
      projectDir,
      projectName,
      demoRef: existingProject.demoRef,
      source: "cli"
    });
    return;
  }

  const archivePath = path.join(await mkdtemp(path.join(os.tmpdir(), "demogo-cli-")), `${safeArchiveName(projectName)}.tar.gz`);
  try {
    const archiveStats = await packProject(projectDir, archivePath);
    console.log(`项目包已生成：${formatBytes(archiveStats.size)}`);
    console.log("DemoGo 正在生成试用链接...");
    const result = await deployArchive({ apiBase, token, archivePath, projectName, source: "cli" });
    await printDeployResult(result);
    await writeProjectRecord(projectDir, result);
  } finally {
    await rm(path.dirname(archivePath), { recursive: true, force: true });
  }
}

async function handleUpdate(args) {
  const options = parseOptions(args);
  const demoRef = String(options.id || options.demo || options.slug || options.url || "").trim();
  if (!demoRef) {
    fail("缺少要更新的项目。请使用：demogo update --id <Demo ID 或原试用链接>");
  }

  const { apiBase, token, projectDir, projectName } = await resolvePublishContext(options, "update");
  await publishUpdate({ apiBase, token, projectDir, projectName, demoRef, source: "cli" });
}

async function publishUpdate({ apiBase, token, projectDir, projectName, demoRef, source }) {
  const archivePath = path.join(await mkdtemp(path.join(os.tmpdir(), "demogo-cli-")), `${safeArchiveName(projectName || demoRef)}.tar.gz`);
  try {
    console.log("DemoGo 正在准备更新已有试用链接...");
    const archiveStats = await packProject(projectDir, archivePath);
    console.log(`项目包已生成：${formatBytes(archiveStats.size)}`);
    console.log("DemoGo 正在更新试用项目，原链接会保持不变...");
    const result = await updateArchive({ apiBase, token, archivePath, demoRef, source });
    await printDeployResult(result, { action: "update" });
    await writeProjectRecord(projectDir, result);
  } finally {
    await rm(path.dirname(archivePath), { recursive: true, force: true });
  }
}

async function resolvePublishContext(options, action = "deploy") {
  const config = await readConfig();
  const apiBase = normalizeApiBase(options.api || config.apiBase || process.env.DEMOGO_API_BASE);
  const token = String(options.token || config.token || process.env.DEMOGO_AGENT_TOKEN || "").trim();
  const projectDir = path.resolve(String(options.dir || "."));
  const projectName = String(options.name || path.basename(projectDir)).trim();

  if (!apiBase) {
    fail([
      "缺少 DemoGo 平台地址。",
      "可以直接运行：",
      `demogo ${action} --api <DemoGo平台地址> --token <你的AI发布口令>`
    ].join("\n"));
  }

  if (!token) {
    fail([
      "缺少 DemoGo AI 发布口令。",
      "可以直接运行：",
      `demogo ${action} --api ${apiBase || "<DemoGo平台地址>"} --token <你的AI发布口令>`
    ].join("\n"));
  }

  await assertDirectory(projectDir);
  assertSafeProjectDirectory(projectDir);
  return { apiBase, token, projectDir, projectName };
}

async function packProject(projectDir, archivePath) {
  const fileList = await collectFiles(projectDir);
  if (!fileList.length) fail("当前目录没有可发布文件。");

  console.log("DemoGo 正在准备当前项目...");
  printProjectSummary(summarizeProject(projectDir, fileList));
  console.log("DemoGo 正在打包项目...");
  await createProjectArchive(projectDir, fileList, archivePath);
  const archiveStats = await stat(archivePath);
  if (archiveStats.size > MAX_BYTES) {
    fail([
      `打包后文件超过 50MB，当前约 ${formatBytes(archiveStats.size)}。`,
      "你可能在错误目录执行了发布。请切换到真正的项目目录，或使用 --dir 指定干净项目文件夹。"
    ].join("\n"));
  }
  return archiveStats;
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
  if (!token) {
    console.log("AI 发布口令：未配置");
    console.log("提示：没有 AI 发布口令时只能检查平台地址，不能直接发布项目。");
    return;
  }
  try {
    const tokenCheck = await checkAgentToken(apiBase, token);
    const prefix = tokenCheck.token?.prefix ? `（${tokenCheck.token.prefix}）` : "";
    const owner = tokenCheck.user?.email ? `，账号：${tokenCheck.user.email}` : "";
    console.log(`AI 发布口令：有效${prefix}${owner}`);
  } catch (error) {
    fail(error instanceof Error ? `AI 发布口令：无效或已重置。\n${error.message}` : "AI 发布口令：无效或已重置。");
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

async function readProjectRecord(projectDir) {
  try {
    const record = JSON.parse(await readFile(projectRecordPath(projectDir), "utf8"));
    const demoRef = String(record.demoId || record.id || record.publicUrl || record.slug || "").trim();
    return demoRef ? { ...record, demoRef } : null;
  } catch {
    return null;
  }
}

async function writeProjectRecord(projectDir, result) {
  if (!result?.id && !result?.publicUrl) return;
  const record = {
    demoId: result.id || "",
    slug: result.slug || "",
    publicUrl: result.publicUrl || "",
    projectName: result.projectName || result.name || "",
    version: result.version || null,
    updatedAt: new Date().toISOString()
  };
  const recordPath = projectRecordPath(projectDir);
  await mkdir(path.dirname(recordPath), { recursive: true });
  await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

function projectRecordPath(projectDir) {
  return path.join(projectDir, ".demogo", "project.json");
}

async function printDeployResult(result, options = {}) {
  console.log("");
  console.log(options.action === "update" ? "DemoGo 试用项目已更新，原链接保持不变。" : "DemoGo 试用链接已生成。");
  console.log(`项目名称：${result.projectName || result.name || result.slug || "-"}`);
  console.log(`访问链接：${result.publicUrl || "-"}`);
  if (result.version) console.log(`当前版本：v${result.version}`);
  console.log(`发布方式：${result.deploySourceLabel || "DemoGo CLI"}`);
  console.log(`页面类型：${result.detectedType || "-"}`);
  console.log(`内容检查：${result.contentReview?.statusLabel || result.contentReviewStatus || "已通过"}`);
  console.log(`报名/留言收集：${result.autoFormEnabled || result.inspection?.autoFormEnabled ? "已自动开启" : "未自动开启"}`);
  if (result.nextStep) console.log(`下一步：${result.nextStep}`);

  // 查询项目详情，显示运行环境和数据库状态
  const demoId = result.id || result.demoId;
  if (demoId) {
    try {
      const config = await readConfig();
      const apiBase = normalizeApiBase(config.apiBase || process.env.DEMOGO_API_BASE);
      const token = String(config.token || process.env.DEMOGO_AGENT_TOKEN || "").trim();
      if (apiBase && token) {
        const details = await getProjectDetails(apiBase, token, demoId);
        const demo = details.demo;
        if (demo) {
          console.log("");
          console.log("运行环境状态：");
          if (demo.runtime) {
            console.log(`  状态：${demo.runtime.status || "未知"}`);
            if (demo.runtime.containerId) console.log(`  容器ID：${demo.runtime.containerId.substring(0, 12)}`);
          } else {
            console.log("  状态：未启用");
          }
          if (demo.database) {
            console.log("数据库状态：");
            console.log(`  类型：${demo.database.type || "未知"}`);
            console.log(`  状态：${demo.database.status || "未知"}`);
          } else {
            console.log("数据库状态：未启用");
          }
          if (demo.runtimeEnv && Object.keys(demo.runtimeEnv).length > 0) {
            console.log(`环境变量：${Object.keys(demo.runtimeEnv).length} 个`);
          }
        }
      }
    } catch (error) {
      // 查询失败不影响发布结果，静默处理
    }
  }
}

function printProjectSummary(summary) {
  console.log(`项目目录：${summary.projectDir}`);
  console.log(`准备上传：${summary.fileCount} 个文件，约 ${formatBytes(summary.totalBytes)}`);
  if (summary.hasPackageJson) console.log("DemoGo 会自动判断是否需要生成网页版本。");
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
  demogo deploy --new
  demogo update --id <Demo ID 或原试用链接>
  demogo deploy --api <DemoGo地址> --token <AI发布口令>
  demogo deploy --name <项目名称> --dir <项目目录>
  demogo update --id <Demo ID 或原试用链接> --dir <项目目录>

本地安装：
  解压 dist/demogo-cli-v${VERSION}.zip 后，在解压目录执行 npm install -g .
  安装完成后运行 demogo --version 验证。

环境变量：
  DEMOGO_API_BASE       DemoGo API 地址
  DEMOGO_AGENT_TOKEN    DemoGo AI 发布口令

示例：
  demogo config set --api https://your-demogo.example.com --token dmg_xxx_xxx
  demogo deploy --api https://your-demogo.example.com --token dmg_xxx_xxx
  demogo deploy --new
  demogo update --id https://your-demogo.example.com/d/try-xxxxxx/ --dir ./my-project
  demogo deploy --name 我的报名页
`.trim());
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
