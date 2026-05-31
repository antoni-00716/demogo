﻿// DemoGo v0.9.3 - Inspection builder functions (extracted from server.js)
// Enhanced backup: inspection-builder.js.enhanced
import path from "node:path";
import fs from "node:fs/promises";
import { hasSourceProjectIndicators, hasBackendIndicators, hasSsrIndicators, detectSingleHtmlEntry } from "./archive-analyzer.js";
import { filterAutoHostableFormFields } from "./form-field-utils.js";
import { classifyProject } from "../services/project-classifier-service.js";

export function createInspectionBuilder(deps) {
  const { isSupportedArchiveName, detectArchiveType, maxExtractedFiles, maxExtractedBytes } = deps;

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value >= 1024 * 1024 * 1024) return (value / 1024 / 1024 / 1024).toFixed(1) + "GB";
  if (value >= 1024 * 1024) return (value / 1024 / 1024).toFixed(1) + "MB";
  if (value >= 1024) return Math.round(value / 1024) + "KB";
  return value + "B";
}

function readZipEntryText(entry) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    entry.stream()
      .on("data", (chunk) => {
        total += chunk.length;
        if (total <= 256 * 1024) chunks.push(chunk);
      })
      .on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
      .on("error", reject);
  });
}

async function readArchiveEntryText(item) {
  if (item?.archiveType === "tar.gz") {
    const bytes = await fs.readFile(item.tempPath);
    return bytes.subarray(0, 256 * 1024).toString("utf8");
  }
  return readZipEntryText(item?.entry || item);
}

function extractFormFields(content, sourceFile) {
  const fields = [];
  const inputPattern = /<(input|textarea|select)\b([^>]*)>/gi;
  let match;
  while ((match = inputPattern.exec(content))) {
    const tag = match[1].toLowerCase();
    const attrs = parseHtmlAttributes(match[2] || "");
    const type = attrs.type || (tag === "textarea" ? "textarea" : tag === "select" ? "select" : "text");
    if (["hidden", "submit", "button", "reset", "file", "image"].includes(type.toLowerCase())) continue;
    const name = attrs.name || attrs.id || attrs["v-model"] || attrs["formcontrolname"] || "";
    const label = inferFieldLabel(name || attrs.placeholder || attrs["aria-label"] || type);
    if (!name && !label) continue;
    fields.push({
      name,
      label,
      type,
      required: Object.prototype.hasOwnProperty.call(attrs, "required"),
      sourceFile,
      autoHostEligible: isCollectableFormField({ name, label, type, sourceFile })
    });
  }

  for (const fieldName of inferFieldNamesFromCode(content)) {
    fields.push({
      name: fieldName,
      label: inferFieldLabel(fieldName),
      type: inferFieldType(fieldName),
      required: false,
      sourceFile,
      autoHostEligible: isCollectableFormField({
        name: fieldName,
        label: inferFieldLabel(fieldName),
        type: inferFieldType(fieldName),
        sourceFile
      })
    });
  }

  return fields;
}

function isCollectableFormField(field) {
  const text = `${field?.name || ""} ${field?.label || ""}`.toLowerCase();
  if (isNonCollectableControl(text)) return false;
  return /name|姓名|phone|mobile|tel|手机号|电话|email|邮箱|company|公司|message|留言|remark|备注|contact|联系|wechat|微信|address|地址/.test(text);
}

function isNonCollectableControl(text) {
  return /price|cost|fee|amount|total|rate|toggle|switch|slider|model|deepseek|gpt|claude|gemini|token|temperature|quantity|count|number|calculator|calc|预算|价格|费用|金额|总价|费率|模型|开关|数量|人数|计算/.test(String(text || "").toLowerCase());
}

function parseHtmlAttributes(text) {
  const attrs = {};
  const pattern = /([:@\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let match;
  while ((match = pattern.exec(text))) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attrs;
}

function inferFieldNamesFromCode(content) {
  const names = new Set();
  const patterns = [
    /\b(name|phone|mobile|tel|email|company|message|remark|remarks|contact|address|wechat)\s*:/gi,
    /\bset(Name|Phone|Mobile|Email|Company|Message|Remark|Address)\b/g
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content))) {
      names.add((match[1] || "").toString().replace(/^[A-Z]/, (value) => value.toLowerCase()));
    }
  }
  return Array.from(names).filter(Boolean).slice(0, 12);
}

function inferFieldType(name) {
  const lower = String(name || "").toLowerCase();
  if (lower.includes("phone") || lower.includes("mobile") || lower.includes("tel")) return "phone";
  if (lower.includes("email")) return "email";
  if (lower.includes("count") || lower.includes("quantity") || lower.includes("number")) return "number";
  if (lower.includes("message") || lower.includes("remark")) return "textarea";
  return "text";
}

function inferFieldLabel(name) {
  const lower = String(name || "").toLowerCase();
  const labels = [
    ["phone", "手机号"],
    ["mobile", "手机号"],
    ["tel", "电话"],
    ["email", "邮箱"],
    ["company", "公司"],
    ["message", "留言"],
    ["remark", "备注"],
    ["address", "地址"],
    ["quantity", "数量"],
    ["count", "人数"],
    ["name", "姓名"]
  ];
  return labels.find(([key]) => lower.includes(key))?.[1] || String(name || "").trim();
}

function extractApiCalls(content, sourceFile) {
  const calls = [];
  const patterns = [
    { type: "fetch", regex: /fetch\s*\(\s*(['"`])([^'"`]+)\1/gi },
    { type: "axios", regex: /axios\.(get|post|put|patch|delete)\s*\(\s*(['"`])([^'"`]+)\2/gi }
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.regex.exec(content))) {
      const method = pattern.type === "axios" ? match[1].toUpperCase() : "UNKNOWN";
      const url = pattern.type === "axios" ? match[3] : match[2];
      if (!url || url.startsWith("data:")) continue;
      calls.push({
        type: pattern.type,
        method,
        url,
        isLocal: isLocalApiUrl(url),
        sourceFile
      });
    }
  }

  return calls;
}

function isLocalApiUrl(url) {
  return /^\/api\//.test(url) || /^api\//.test(url) || /^\.\.?\/api\//.test(url);
}

function createRuleReport(context) {
  const hasForms = context.formFields.length > 0;
  const localApis = context.apiCalls.filter((item) => item.isLocal);
  const risks = [];
  const recommendations = [];
  let projectCategory = inspectionTypeLabel(context.detectedType);

  const autoHostableFields = filterAutoHostableFormFields(context.formFields);
  if (autoHostableFields.length) {
    projectCategory = inferProjectCategoryFromFields(context.formFields);
    recommendations.push("页面可以生成试用链接；DemoGo 会在生成链接时自动识别并开启基础表单收集。");
  } else if (hasForms) {
    recommendations.push("页面可以生成试用链接；检测到的填写控件不像报名、预约或留言表单，DemoGo 不会自动收集这些内容。");
  }

  if (localApis.length) {
    risks.push("这个项目里有提交或保存数据的功能，需要接入可用的收集入口。DemoGo 不会自动运行项目自带的后台接口。");
    recommendations.push("如果是报名、预约或留言这类基础收集，DemoGo 会尝试自动接管；如果是完整业务后台、订单、支付或登录，当前暂不支持。");
  }

  if (context.hasPackageJson && !context.hasBuildScript && !context.entryFile) {
    risks.push("这个项目像是 AI 生成的网页源码，但缺少生成网页的命令。");
    recommendations.push("请让 AI 编程工具补充生成命令，并确保生成可访问的网页文件。");
  }

  return {
    projectCategory,
    publishability: context.status === "blocked" ? "暂不支持" : (risks.length ? "页面支持，提交功能需要接入" : "支持"),
    risks,
    recommendations,
    fixPrompt: createFixPrompt({ ...context, risks, recommendations })
  };
}

function inferProjectCategoryFromFields(fields) {
  const names = fields.map((field) => `${field.name} ${field.label}`.toLowerCase()).join(" ");
  if (names.includes("company") || names.includes("公司") || names.includes("phone") || names.includes("手机号")) return "报名/预约/留资页面";
  if (names.includes("message") || names.includes("留言")) return "留言反馈页面";
  return "包含表单的页面";
}

function createFixPrompt(context) {
  const parts = [];
  const localApis = context.localApis || context.apiCalls?.filter((item) => item.isLocal) || [];
  if (localApis.length) {
    parts.push("请检查当前项目中的表单提交或数据保存逻辑。项目发布到 DemoGo 后，不会自动运行 /api/ 开头的自定义后台接口。基础报名、预约或留言表单可以由 DemoGo 自动接管；完整业务后台需要后续后端托管能力。");
  }
  if (context.hasPackageJson && !context.hasBuildScript && !context.entryFile) {
    parts.push("请把这个项目整理成可发布的网页版本：补充标准 npm run build 命令，并确保执行后生成 dist/index.html、build/index.html 或 out/index.html。");
  }
  if (context.formFields?.length) {
    const autoHostableFields = filterAutoHostableFormFields(context.formFields);
    if (autoHostableFields.length) {
      parts.push(`项目中疑似报名/留言字段包括：${context.formFields.slice(0, 8).map((field) => field.name || field.label).join("、")}。请确认字段命名清晰，避免把报名、预约或留言表单做成必须依赖自定义后台接口才能提交。`);
    } else {
      parts.push(`项目中检测到填写控件：${context.formFields.slice(0, 8).map((field) => field.name || field.label).join("、")}。如果这些只是计算器、价格配置或开关控件，不需要改成提交表单；如果确实要收集报名/留言，请补充姓名、手机号、邮箱或留言字段。`);
    }
  }
  if (!parts.length) {
    parts.push("请把这个项目整理成 DemoGo 可发布的网页版本：确保压缩包内包含 index.html，或项目可以通过 npm run build 生成 dist/index.html、build/index.html 或 out/index.html。不要把 .env、node_modules、密钥文件打包进去。");
  }
  return parts.join("\n\n");
}

function detectRuntime(profile, flags) {
  const needsRuntime = Boolean(flags.hasBackend || flags.hasSsr || profile.type === "node_service" || profile.type === "fullstack_framework");
  if (!needsRuntime) return null;
  return {
    engine: profile.backendFrameworks?.[0]?.code || "node",
    status: "planned",
    statusLabel: "????",
    hasStartScript: Boolean(profile.assessment?.signals?.hasStartScript),
    requiresDatabase: Boolean(profile.databases?.length),
    requiresMysql: Boolean(profile.databases?.some((d) => d.code === "mysql")),
    requiresPostgres: Boolean(profile.databases?.some((d) => d.code === "postgres")),
    requiresMongo: Boolean(profile.databases?.some((d) => d.code === "mongo")),
    requiresRedis: false,
    requiresOtherDatabase: false,
    requiresWebSocket: false
  };
}

function createExternalBackendSummary(profile) {
  const databases = profile.databases || [];
  const supabaseDb = databases.find((item) => item.code === "supabase");
  if (!supabaseDb) return null;
  const required = (profile.environmentVariables?.required || []);
  const missingEnv = [];
  const hasUrl = required.some((k) => /SUPABASE_URL/i.test(k));
  const hasAnonKey = required.some((k) => /SUPABASE_ANON_KEY/i.test(k));
  if (hasUrl) missingEnv.push("SUPABASE_URL");
  if (hasAnonKey) missingEnv.push("SUPABASE_ANON_KEY");
  return {
    provider: "supabase",
    configured: false,
    status: missingEnv.length ? "missing" : "pending",
    missingEnv,
    connectionChecked: false
  };
}

function createInspectionSummary(analysis) {
  const hasRootIndex = analysis.paths.includes("index.html");
  const hasDistIndex = analysis.paths.includes("dist/index.html");
  const hasBuildIndex = analysis.paths.includes("build/index.html");
  const hasOutIndex = analysis.paths.includes("out/index.html");
  const hasPublicIndex = analysis.paths.includes("public/index.html");
  const hasPackageJson = analysis.hasPackageJson || analysis.paths.includes("package.json");
  const hasBuildScript = Boolean(analysis.hasBuildScript);
  const hasSourceIndicators = hasSourceProjectIndicators(analysis.paths || []);
  const hasBackend = hasBackendIndicators(analysis.paths || [], analysis.packageScripts || {});
  const hasSsr = hasSsrIndicators(analysis.paths || []);
  const singleHtmlEntry = detectSingleHtmlEntry(analysis.paths || []);
  const hasBuiltEntry = hasDistIndex || hasBuildIndex || hasOutIndex;
  const status = determineInspectionStatus(analysis, { hasRootIndex, hasDistIndex, hasBuildIndex, hasOutIndex, hasPublicIndex, hasPackageJson, hasBuildScript, hasBackend, hasSsr, singleHtmlEntry });
  const detectedType = detectInspectionType({ hasRootIndex, hasDistIndex, hasBuildIndex, hasOutIndex, hasPublicIndex, hasPackageJson, hasBuildScript, hasSourceIndicators, hasBackend, hasSsr, singleHtmlEntry });
    const projectProfile = classifyProject(analysis, { detectedType, hasBackend, hasSsr, hasPackageJson, hasBuildScript });
  const projectAssessment = projectProfile.assessment || null;
  const externalBackend = createExternalBackendSummary(projectProfile);
  const runtime = detectRuntime(projectProfile, { hasBackend, hasSsr, hasPackageJson, hasBuildScript });
  const issues = [];
  const suggestions = [];
  const ignoredNames = analysis.ignoredFiles.slice(0, 5);
  const entryFile = analysis.entryFile;
  const formFields = analysis.formFields || [];
  const apiCalls = analysis.apiCalls || [];

  if (analysis.rawFileCount === 0) {
    issues.push("压缩包为空，未找到可发布文件。");
    suggestions.push("请重新打包项目，确保压缩包内包含 index.html 或 dist/build 目录。");
  }

  if (analysis.blockedFiles.length) {
    issues.push(`项目包包含敏感或不支持发布的文件：${analysis.blockedFiles.slice(0, 3).join("、")}。`);
    suggestions.push("请删除密钥、环境变量、脚本或可执行文件后重新上传。");
  }

  if (!hasRootIndex && !hasBuiltEntry && !hasPublicIndex && !singleHtmlEntry && !hasPackageJson && analysis.rawFileCount > 0) {
    issues.push("未找到可访问的首页文件或可生成网页的项目配置。");
    suggestions.push("请确认压缩包内包含 index.html、一个单独的 HTML 页面，或包含 dist/index.html、build/index.html、out/index.html。");
  }

  if (hasBackend && !hasBuiltEntry) {
    issues.push("检测到这个项目需要服务器长期运行，当前 DemoGo 暂不支持这类项目的完整功能。");
    suggestions.push("请让 AI 编程工具导出一个纯网页演示版本，或等待后续后端托管能力。");
  }

  if (hasSsr && !hasOutIndex) {
    issues.push("检测到这个项目可能需要服务端渲染，当前 DemoGo 暂不支持这类运行方式。");
    suggestions.push("如果项目可以导出静态网页，请先生成 dist/build/out 后再上传。");
  }

  if (hasPackageJson && !hasRootIndex && !hasBuiltEntry && !hasPublicIndex && !singleHtmlEntry) {
    suggestions.push("已识别为 AI 生成的网页源码，DemoGo 会自动生成网页后发布。");
  }

  if (hasPackageJson && !hasBuildScript && !hasRootIndex && !hasBuiltEntry && !hasPublicIndex && !singleHtmlEntry) {
    issues.push("检测到项目源码，但没有生成网页的命令。");
    suggestions.push("请让 AI 编程工具补充生成命令，或先生成 dist/build/out 后重新上传。");
  }

  if (formFields.length) {
    const autoHostableFields = filterAutoHostableFormFields(formFields);
    suggestions.push(`${autoHostableFields.length ? "检测到疑似报名/留言字段" : "检测到页面填写控件"}：${formFields.slice(0, 5).map((field) => field.label || field.name).join("、")}。`);
  }

  if (apiCalls.some((item) => item.isLocal)) {
    suggestions.push("检测到本地 API 调用。DemoGo 当前不托管自定义后端，发布后相关提交或数据保存功能可能不可用。");
  }

  if (analysis.publishableFileCount > maxExtractedFiles) {
    issues.push(`需要发布的文件较多，当前最多支持 ${maxExtractedFiles} 个文件。`);
    suggestions.push("请删除不必要的素材、缓存和历史产物后重新上传。");
  }

  if (analysis.publishableBytes > maxExtractedBytes) {
    issues.push(`项目包体积过大，当前最多支持 ${formatBytes(maxExtractedBytes)}。`);
    suggestions.push("请压缩大图片、视频或删除无关资源后重新上传。");
  }

  if (ignoredNames.length) {
    suggestions.push(`系统已自动忽略无关文件：${ignoredNames.join("、")}${analysis.ignoredFiles.length > ignoredNames.length ? " 等" : ""}。`);
  }

  return {
    status,
    canPublish: status === "pass" || status === "warning",
    detectedType,
    projectProfile,
    projectCategory: projectProfile.label,
    projectAssessment,
    hostingMode: projectAssessment.support.publishMode || "",
    hostingModeLabel: projectAssessment.projectKindLabel || "",
    externalBackend,
    runtime,
    label: inspectionTypeLabel(detectedType),
    summary: inspectionSummary(status, detectedType),
    issues,
    suggestions,
    rawFileCount: analysis.rawFileCount,
    publishableFileCount: analysis.publishableFileCount,
    rawBytes: analysis.rawBytes,
    publishableBytes: analysis.publishableBytes,
    ignoredFileCount: analysis.ignoredFiles.length,
    ignoredFiles: analysis.ignoredFiles,
    blockedFiles: analysis.blockedFiles,
    rootEntries: analysis.rootEntries,
    entryFile,
    singleHtmlEntry,
    projectTitle: analysis.projectTitle || "",
    pageHeading: analysis.pageHeading || "",
    hasPackageJson,
    hasBuildScript,
    hasBackend,
    hasSsr,
    formFields,
    apiCalls,
    ruleReport: createRuleReport({
      status,
      detectedType,
      entryFile,
      singleHtmlEntry,
      hasPackageJson,
      hasBuildScript,
      hasSourceIndicators,
      hasBackend,
      hasSsr,
      formFields,
      apiCalls,
      issues
    }),
    ...createUserFacingInspection({
      status,
      projectProfile,
      detectedType,
      entryFile,
      singleHtmlEntry,
      hasPackageJson,
      hasBuildScript,
      hasBackend,
      hasSsr,
      formFields,
      apiCalls,
      issues
    })
  };
}

function determineInspectionStatus(analysis, flags) {
  if (analysis.rawFileCount === 0 || analysis.blockedFiles.length > 0) return "blocked";
  if (analysis.publishableFileCount > maxExtractedFiles || analysis.publishableBytes > maxExtractedBytes) return "blocked";
  if (flags.hasBackend && !flags.hasDistIndex && !flags.hasBuildIndex && !flags.hasOutIndex) return "blocked";
  if (flags.hasSsr && !flags.hasOutIndex) return "blocked";
  if (flags.hasRootIndex || flags.hasDistIndex || flags.hasBuildIndex || flags.hasOutIndex || flags.hasPublicIndex || flags.singleHtmlEntry) return analysis.ignoredFiles.length ? "warning" : "pass";
  if (flags.hasPackageJson && !flags.hasBuildScript) return "blocked";
  if (flags.hasPackageJson) return "warning";
  return "blocked";
}

function detectInspectionType(flags) {
  if (flags.hasOutIndex) return "out";
  if (flags.hasSsr) return "runtime";
  if (flags.hasBackend && !flags.hasDistIndex && !flags.hasBuildIndex) return "backend";
  if (flags.hasPackageJson && flags.hasBuildScript && flags.hasSourceIndicators && flags.hasRootIndex) return "source";
  if (flags.hasRootIndex) return "static-root";
  if (flags.hasDistIndex) return "dist";
  if (flags.hasBuildIndex) return "build";
  if (flags.hasPublicIndex) return "public";
  if (flags.singleHtmlEntry) return "single-html";
  if (flags.hasPackageJson) return "source";
  return "unknown";
}

function createInvalidZipInspection(error) {
  const technicalReason = error instanceof Error ? error.message : "";
  return createInvalidArchiveInspection("ZIP", technicalReason);
}

function createInvalidArchiveInspection(archiveType, technicalReason = "") {
  return {
    status: "blocked",
    canPublish: false,
    detectedType: "unknown",
    label: inspectionTypeLabel("unknown"),
    summary: "压缩包不完整或格式异常，DemoGo 无法读取项目文件。",
    issues: [
      `压缩包缺少完整的 ${archiveType} 目录信息，可能是生成、下载或上传过程中被截断。`
    ],
    suggestions: [
      "请从原项目文件夹重新压缩后上传，不要上传正在生成或传输未完成的文件。",
      "如果文件来自其他工具导出，请先在本地解压验证，确认能正常打开后再上传。"
    ],
    rawFileCount: 0,
    publishableFileCount: 0,
    rawBytes: 0,
    publishableBytes: 0,
    ignoredFileCount: 0,
    ignoredFiles: [],
    blockedFiles: [],
    rootEntries: [],
    entryFile: null,
    projectTitle: "",
    pageHeading: "",
    hasPackageJson: false,
    hasBuildScript: false,
    formFields: [],
    apiCalls: [],
    ruleReport: {
      projectCategory: inspectionTypeLabel("unknown"),
      publishability: "暂时无法发布",
      risks: technicalReason ? [`${archiveType} 读取失败：${technicalReason}`] : [],
      recommendations: [
        "重新打包后再上传。"
      ],
      fixPrompt: "请重新导出或重新压缩项目，确保生成的是完整 .zip、.tar.gz 或 .tgz 文件，且压缩包内包含 index.html、dist/index.html 或 build/index.html。"
    }
  };
}

function inspectionTypeLabel(type) {
  const labels = {
    "static-root": "普通网页项目",
    dist: "已生成的网页项目",
    build: "已生成的网页项目",
    out: "已生成的网页项目",
    public: "普通网页项目",
    "single-html": "单页网页项目",
    source: "AI 生成的网页项目",
    "built-dist": "AI 生成的网页项目",
    "built-build": "AI 生成的网页项目",
    "built-out": "AI 生成的网页项目",
    "built-public": "AI 生成的网页项目",
    backend: "需要服务器的项目",
    runtime: "需要服务器的项目",
    unknown: "暂未识别"
  };
  return labels[type] || labels.unknown;
}

function inspectionSummary(status, type) {
  if (status === "blocked") return "项目暂时无法发布，请根据提示调整后重新上传。";
  if (type === "source") return "已识别为 AI 生成的网页项目，DemoGo 会自动生成网页后发布。";
  if (type === "single-html") return "已识别为单个网页文件，DemoGo 会自动作为首页发布。";
  if (status === "warning") return "项目可以发布，系统会自动忽略部分无关文件。";
  return "项目检测通过，可以继续发布。";
}

function createUserFacingInspection(context) {
  const localApis = context.apiCalls.filter((item) => item.isLocal);
  const unsupportedNotes = [...(context.projectProfile?.unsupportedReasons || [])];
  const supportNotes = [];
  let userLabel = inspectionTypeLabel(context.detectedType);
  let userSummary = "这个项目可以发布，别人能打开页面。";

  if (context.hasBackend && context.status === "blocked") {
    userLabel = "需要服务器的项目";
    userSummary = "这个项目不只是网页，还需要服务器长期运行。当前 DemoGo 暂不支持这类项目的完整发布。";
    unsupportedNotes.push("需要服务器处理业务逻辑");
  } else if (context.hasSsr && context.status === "blocked") {
    userLabel = "需要服务器的项目";
    userSummary = "这个项目需要服务器生成页面。当前 DemoGo 主要支持可直接打开的网页项目。";
    unsupportedNotes.push("需要服务器生成页面");
  } else if (context.detectedType === "source") {
    userLabel = "AI 生成的网页项目";
    userSummary = "这个项目可以发布。DemoGo 会先自动生成可访问网页，再生成试用链接。";
    supportNotes.push("会自动生成网页");
  } else if (["dist", "build", "out", "built-dist", "built-build", "built-out"].includes(context.detectedType)) {
    userLabel = "已生成的网页项目";
    supportNotes.push("已经包含可访问网页");
  } else if (context.detectedType === "static-root") {
    userLabel = "普通网页项目";
    supportNotes.push("已经包含首页文件");
  } else if (context.detectedType === "single-html") {
    userLabel = "单页网页项目";
    userSummary = "这个项目可以发布。DemoGo 会把这个 HTML 页面作为首页生成试用链接。";
    supportNotes.push("单个 HTML 页面可直接发布");
  } else if (context.detectedType === "public") {
    userLabel = "普通网页项目";
    supportNotes.push("已经包含可访问网页");
  }

  if (context.formFields.length) {
    supportNotes.push("页面展示可以发布");
    if (filterAutoHostableFormFields(context.formFields).length) {
      supportNotes.push("发布时会自动开启基础表单收集");
      userSummary = "这个页面可以发布，并检测到报名、预约或留言表单。DemoGo 会在发布时自动开启基础表单收集。";
    } else {
      userSummary = "这个页面可以发布。页面里有填写控件，但不像报名、预约或留言表单，DemoGo 不会自动收集这些内容。";
    }
  }

  if (localApis.length) {
    unsupportedNotes.push("项目自带后台接口不会自动运行");
    userSummary = "这个页面可以发布，但项目自带后台接口不会自动运行。基础报名、预约或留言表单会尝试由 DemoGo 自动收集；完整业务后台暂不支持。";
  }

  if (context.status === "blocked" && !context.hasBackend && !context.hasSsr) {
    userSummary = context.issues[0] || "这个项目当前暂不支持发布，请按提示调整后重新上传。";
  }

  let autoFormEnabled = false;
  let autoFormReason = "";
  if (context.formFields.length) {
    const hostable = filterAutoHostableFormFields(context.formFields);
    if (hostable.length) {
      autoFormEnabled = true;
    } else {
      autoFormEnabled = false;
      autoFormReason = "检测到页面填写控件，但不像报名、预约或留言表单，已跳过自动表单收集";
    }
  }

  return {
    userLabel,
    userSummary,
    userStatus: context.status === "blocked" ? "unsupported" : "supported",
    userStatusLabel: context.status === "blocked" ? "暂不支持" : "支持",
    supportNotes,
    unsupportedNotes,
    autoFormEnabled,
    autoFormReason: autoFormReason || void 0,
    fixPrompt: createFixPrompt(context)
  };
}

function createProjectError(inspection, message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.inspection = {
    ...inspection,
    status: "blocked",
    canPublish: false,
    summary: message
  };
  return error;
}

  return {
    readZipEntryText, extractFormFields, isCollectableFormField, isNonCollectableControl,
    parseHtmlAttributes, inferFieldNamesFromCode, inferFieldType, inferFieldLabel,
    extractApiCalls, isLocalApiUrl,
    createRuleReport, inferProjectCategoryFromFields, createFixPrompt,
    createInspectionSummary, determineInspectionStatus, detectInspectionType,
    createInvalidZipInspection, createInvalidArchiveInspection,
    inspectionTypeLabel, inspectionSummary, createUserFacingInspection,
    createProjectError
  };
}
