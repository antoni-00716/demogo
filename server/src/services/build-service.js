// DemoGo v0.9.3 - Build service functions (extracted from server.js)
// Enhanced backup: build-service.js.enhanced
import crypto from "node:crypto";
import { runCommand } from "../lib/process-utils.js";
import { isNonCollectableControl, filterAutoHostableFormFields } from "../lib/form-field-utils.js";
import { normalizeFormFields } from "./form-service.js";
import { promoteSingleHtmlEntry } from "../lib/archive-analyzer.js";
import { exists, formatBytes, stripBom } from "../lib/utils.js";
import { withDockerSlot } from "../lib/concurrency.js";
import { buildMode, buildTimeoutMs, dockerImage, dockerMemory, dockerCpus } from "../config.js";


// Standalone exports for use by routes and other modules
export { formatBytes };

export function createBuildService(deps) {
  const {
    exists, createProjectError, inspectionTypeLabel, createUserFacingInspection,
    readJson, writeJson, formsFile, formSubmissionsFile,
    writeAuditLog, publicForm, publicBaseUrl, calculateFormQuota,
    demosFile
  } = deps;

async function detectBuildAndNormalizeOutput(targetDir, inspection) {
  const packageJsonPath = path.join(targetDir, "package.json");
  const hasPackageJson = await exists(packageJsonPath);
  const shouldBuildSourceProject = hasPackageJson && inspection?.detectedType === "source" && inspection?.hasBuildScript;

  if (shouldBuildSourceProject) {
    let buildLog = "";
    try {
      buildLog = await buildNodeProject(targetDir);
    } catch (error) {
      throw createProjectError(inspection, explainBuildError(error));
    }

    const builtOutput = await findPublishableOutput(targetDir, { built: true });
    if (builtOutput) {
      await promoteDirectory(builtOutput.dir, targetDir);
      return { detectedType: builtOutput.type, buildLog };
    }

    throw createProjectError(inspection, "项目已完成生成，但未找到可发布的网页入口。请让 AI 工具生成 dist/index.html、build/index.html 或 out/index.html。");
  }

  const existingOutput = await findPublishableOutput(targetDir, { built: false });
  if (existingOutput) {
    if (existingOutput.dir !== targetDir) {
      await promoteDirectory(existingOutput.dir, targetDir);
    }
    return { detectedType: existingOutput.type, buildLog: "" };
  }

  if (inspection?.detectedType === "single-html" && await promoteSingleHtmlEntry(targetDir, inspection.entryFile)) {
    return { detectedType: "single-html", buildLog: "" };
  }

  if (hasPackageJson) {
    let buildLog = "";
    try {
      buildLog = await buildNodeProject(targetDir);
    } catch (error) {
      throw createProjectError(inspection, explainBuildError(error));
    }
    const builtOutput = await findPublishableOutput(targetDir, { built: true });
    if (builtOutput) {
      await promoteDirectory(builtOutput.dir, targetDir);
      return { detectedType: builtOutput.type, buildLog };
    }
    throw createProjectError(inspection, "项目已完成生成，但未找到可发布的网页入口。请让 AI 工具生成 dist/index.html、build/index.html 或 out/index.html。");
  }

  throw createProjectError(inspection, "未找到可访问的首页文件。请上传包含 index.html、dist/index.html、build/index.html 或 out/index.html 的项目包。");
}

async function findPublishableOutput(targetDir, options = {}) {
  const prefix = options.built ? "built-" : "";
  const candidates = [
    { dir: targetDir, type: "static-root", allowWhenBuilt: false },
    { dir: path.join(targetDir, "dist"), type: `${prefix}dist`, allowWhenBuilt: true },
    { dir: path.join(targetDir, "build"), type: `${prefix}build`, allowWhenBuilt: true },
    { dir: path.join(targetDir, "out"), type: `${prefix}out`, allowWhenBuilt: true },
    { dir: path.join(targetDir, "public"), type: `${prefix}public`, allowWhenBuilt: false }
  ];

  for (const candidate of candidates) {
    if (options.built && !candidate.allowWhenBuilt) continue;
    if (await exists(path.join(candidate.dir, "index.html"))) return candidate;
  }
  return null;
}

async function summarizePublishedDirectory(rootDir) {
  const summary = { fileCount: 0, totalBytes: 0 };
  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      const stat = await fs.stat(fullPath);
      summary.fileCount += 1;
      summary.totalBytes += stat.size;
    }
  }
  await walk(rootDir);
  return summary;
}

async function promoteDirectory(sourceDir, targetDir) {
  const stagingDir = `${targetDir}-staging-${crypto.randomBytes(3).toString("hex")}`;
  await fs.rename(sourceDir, stagingDir);
  const entries = await fs.readdir(targetDir);

  for (const entry of entries) {
    await fs.rm(path.join(targetDir, entry), { recursive: true, force: true });
  }

  const promotedEntries = await fs.readdir(stagingDir);
  for (const entry of promotedEntries) {
    await fs.rename(path.join(stagingDir, entry), path.join(targetDir, entry));
  }
  await fs.rm(stagingDir, { recursive: true, force: true });
}

async function ensureAutoHostedForm({ user, demo, inspection, targetDir, now = new Date().toISOString() }) {
  const allFields = Array.isArray(inspection?.formFields) ? inspection.formFields : [];
  const autoHostableFields = filterAutoHostableFormFields(allFields);
  const detectedFields = normalizeFormFields(autoHostableFields);
  if (!allFields.length) {
    return { reason: "未检测到可自动接管的表单" };
  }
  if (!detectedFields.length) {
    return { reason: "检测到页面填写控件，但不像报名、预约或留言表单，已跳过自动表单收集" };
  }

  const [forms, submissions] = await Promise.all([
    readJson(formsFile, []),
    readJson(formSubmissionsFile, [])
  ]);
  const existingIndex = forms.findIndex((form) => form.demoId === demo.id && form.userId === user.id && form.status !== "deleted");
  const quota = calculateFormQuota(user, forms, submissions);
  if (existingIndex === -1 && quota.forms.limit && quota.forms.used >= quota.forms.limit) {
    return { reason: `当前套餐最多托管 ${quota.forms.limit} 个表单，已跳过自动表单收集` };
  }

  const item = existingIndex >= 0
    ? {
        ...forms[existingIndex],
        demoSlug: demo.slug,
        demoName: demo.name || demo.slug,
        fields: detectedFields.length ? detectedFields : normalizeFormFields(forms[existingIndex].fields || []),
        status: forms[existingIndex].status || "active",
        updatedAt: now
      }
    : {
        id: crypto.randomUUID(),
        userId: user.id,
        userEmail: user.email,
        demoId: demo.id,
        demoSlug: demo.slug,
        demoName: demo.name || demo.slug,
        publicToken: crypto.randomBytes(24).toString("hex"),
        name: `${demo.name || demo.slug} 表单`,
        status: "active",
        fields: detectedFields,
        submissionCount: 0,
        autoCreated: true,
        createdAt: now,
        updatedAt: now
      };

  if (existingIndex >= 0) {
    forms[existingIndex] = item;
  } else {
    forms.unshift(item);
  }
  await writeJson(formsFile, forms.slice(0, 2000));
  const pubForm = publicForm(item, { publicBaseUrl });
  await injectAutoFormScript(targetDir, pubForm);
  await writeAuditLog({
    action: existingIndex >= 0 ? "refresh_auto_form_hosting" : "auto_create_form_hosting",
    actorType: "system",
    actorId: user.id,
    targetType: "form",
    targetId: item.id,
    metadata: {
      demoId: demo.id,
      demoSlug: demo.slug,
      fieldCount: item.fields.length
    }
  });
  return { form: pubForm };
}


async function injectAutoFormScript(targetDir, form) {
  const indexPath = path.join(targetDir, "index.html");
  if (!await exists(indexPath)) return;

  const fields = normalizeFormFields(form.fields || []).map((field) => field.name);
  const config = JSON.stringify({
    submitUrl: form.submitUrl,
    fields
  }).replace(/</g, "\\u003c");
  const script = [
    "<script>",
    "(function(){",
    "if(window.__DEMOGO_AUTO_FORM__)return;",
    `window.__DEMOGO_AUTO_FORM__=${config};`,
    "var cfg=window.__DEMOGO_AUTO_FORM__;",
    "function named(el){return el&&((el.getAttribute('name')||el.id||'').trim());}",
    "function setText(form,text,ok){var box=form.querySelector('[data-demogo-form-status]');if(!box){box=document.createElement('div');box.setAttribute('data-demogo-form-status','');box.style.marginTop='10px';box.style.fontSize='14px';form.appendChild(box);}box.textContent=text;box.style.color=ok?'#087a69':'#b54708';}",
    "document.addEventListener('submit',function(event){",
    "var form=event.target;if(!form||form.tagName!=='FORM')return;",
    "var controls=Array.prototype.slice.call(form.querySelectorAll('input,textarea,select')).filter(function(el){return named(el)&&el.type!=='button'&&el.type!=='submit'&&el.type!=='reset';});",
    "if(!controls.length)return;",
    "event.preventDefault();",
    "var payload={};controls.forEach(function(el){var key=named(el);if(!key)return;if((el.type==='checkbox'||el.type==='radio')&&!el.checked)return;payload[key]=el.value;});",
    "fetch(cfg.submitUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(function(res){if(!res.ok)throw new Error('submit failed');return res.json();}).then(function(){setText(form,'提交成功，我们会尽快联系你。',true);form.reset();}).catch(function(){setText(form,'提交失败，请稍后重试。',false);});",
    "},true);",
    "})();",
    "</script>"
  ].join("");

  const html = await fs.readFile(indexPath, "utf8");
  const cleaned = html.replace(/<script>\s*\(function\(\)\{\s*if\(window\.__DEMOGO_AUTO_FORM__\)[\s\S]*?<\/script>\s*/g, "");
  const updated = cleaned.includes("</body>")
    ? cleaned.replace("</body>", `${script}\n</body>`)
    : `${cleaned}\n${script}`;
  await fs.writeFile(indexPath, updated, "utf8");
}

async function buildNodeProject(projectDir) {
  const packageJsonContent = await fs.readFile(path.join(projectDir, "package.json"), "utf8");
  const packageJson = JSON.parse(packageJsonContent.replace(/^\uFEFF/, ""));
  if (!packageJson.scripts?.build) {
    throw new Error("检测到 package.json，但未找到 scripts.build，无法自动构建");
  }

  if (buildMode !== "host" && await commandAvailable("docker")) {
    return buildNodeProjectInDocker(projectDir);
  }

  if (buildMode === "docker") {
    throw new Error("已配置 Docker 构建模式，但服务器未检测到 docker 命令");
  }

  return buildNodeProjectOnHost(projectDir);
}

async function buildNodeProjectOnHost(projectDir) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const installCommand = await exists(path.join(projectDir, "package-lock.json")) ? [npmCommand, ["ci"]] : [npmCommand, ["install"]];
  const installLog = await runCommand(installCommand[0], installCommand[1], { cwd: projectDir, timeout: buildTimeoutMs });
  const buildLog = await runCommand(npmCommand, ["run", "build"], { cwd: projectDir, timeout: buildTimeoutMs });
  return ["[host build]", installLog, buildLog].join("\n");
}

async function buildNodeProjectInDocker(projectDir) {
  return withDockerSlot(async () => {
    const installCommand = await exists(path.join(projectDir, "package-lock.json")) ? "npm ci" : "npm install";
    const script = `${installCommand} && npm run build`;
    const args = [
      "run",
      "--rm",
      "--network=bridge",
      "--memory",
      dockerMemory,
      "--cpus",
      dockerCpus,
      "-v",
      `${path.resolve(projectDir)}:/workspace`,
      "-w",
      "/workspace",
      dockerImage,
      "sh",
      "-lc",
      script
    ];
    const log = await runCommand("docker", args, { cwd: projectDir, timeout: buildTimeoutMs });
    return [`[docker build] image=${dockerImage} memory=${dockerMemory} cpus=${dockerCpus}`, log].join("\n");
  });
}

async function commandAvailable(command) {
  const checkCommand = process.platform === "win32" ? "where" : "which";
  try {
    await runCommand(checkCommand, [command], { cwd: process.cwd(), timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

function explainBuildError(error) {
  console.error("[BUILD ERROR]", error?.message || error);
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

// DIVERGENCE from lib/tracking.js: The canonical signature is
// injectTrackingScript(targetDir, demosFile) but this local copy uses
// (targetDir, detectedType) — the 2nd param differs and is currently unused.
// Kept as a local copy until the signatures are reconciled.
async function injectTrackingScript(targetDir, detectedType) {
  const indexPath = path.join(targetDir, "index.html");
  if (!await exists(indexPath)) return;

  const script = [
    "<script>",
    "(function(){",
    "var p=location.pathname.match(/\\/d\\/([^\\/]+)/);",
    "if(!p)return;",
    "var b=0;",
    "try{b=performance.getEntriesByType('resource').reduce(function(s,r){return s+(r.transferSize||0);},0);}catch(e){}",
    "var s=document.createElement('script');",
    "s.src='/api/demo-track/'+encodeURIComponent(p[1])+'?bytes='+Math.max(0,Math.round(b));",
    "s.async=true;",
    "document.head.appendChild(s);",
    "})();",
    "</script>"
  ].join("");
  const html = await fs.readFile(indexPath, "utf8");
  if (html.includes("/api/demo-track/")) return;
  const updated = html.includes("</body>")
    ? html.replace("</body>", `${script}\n</body>`)
    : `${html}\n${script}`;
  await fs.writeFile(indexPath, updated, "utf8");
}

const pendingUsage = new Map();

// DIVERGENCE from lib/tracking.js: recordDemoVisit signature is identical,
// but it shares the pendingUsage Map with flushUsageStats below, which has a
// different signature (see note). Replacing one without the other would split
// the shared state across modules, so both are kept as local copies for now.
function recordDemoVisit(slug, estimatedBytes, ip) {
  const now = new Date().toISOString();
  const current = pendingUsage.get(slug) || {
    visits: 0,
    estimatedBytes: 0,
    uniqueIps: new Set(),
    lastVisitedAt: now
  };
  current.visits += 1;
  current.estimatedBytes += Math.max(0, Math.min(Number(estimatedBytes) || 0, 50 * 1024 * 1024));
  if (ip) current.uniqueIps.add(ip);
  current.lastVisitedAt = now;
  pendingUsage.set(slug, current);
}

// DIVERGENCE from lib/tracking.js: The canonical signature is
// flushUsageStats(demosFile) with its own imported readJson/writeJson.
// This local copy takes no arguments — it uses demosFile, readJson, and
// writeJson from the createBuildService closure (DI pattern).
async function flushUsageStats() {
  if (!pendingUsage.size) return;
  const updates = Array.from(pendingUsage.entries());
  pendingUsage.clear();

  const demos = await readJson(demosFile, []);
  let changed = false;
  for (const [slug, usage] of updates) {
    const demo = demos.find((item) => item.slug === slug);
    if (!demo) continue;
    const current = demo.usage || {};
    demo.usage = {
      visits: Number(current.visits || 0) + usage.visits,
      estimatedBytes: Number(current.estimatedBytes || 0) + usage.estimatedBytes,
      uniqueVisitorsEstimate: Number(current.uniqueVisitorsEstimate || 0) + usage.uniqueIps.size,
      lastVisitedAt: usage.lastVisitedAt
    };
    changed = true;
  }

  if (changed) {
    await writeJson(demosFile, demos);
  }
}

  return {
    detectBuildAndNormalizeOutput, findPublishableOutput,
    summarizePublishedDirectory, promoteDirectory,
    ensureAutoHostedForm, filterAutoHostableFormFields, injectAutoFormScript,
    buildNodeProject, buildNodeProjectOnHost, buildNodeProjectInDocker,
    runCommand, commandAvailable, explainBuildError,
    injectTrackingScript, recordDemoVisit, flushUsageStats,
    formatBytes, stripBom
  };
}
