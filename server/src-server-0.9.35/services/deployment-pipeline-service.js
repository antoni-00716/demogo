import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  dataDir,
  demoDbAdminHost,
  demoDbAdminPassword,
  demoDbAdminPort,
  demoDbAdminUser,
  demoDbEnabled,
  demoDbHost,
  demoDbMock,
  demoDbPort,
  maxExtractedBytes,
  maxExtractedFiles,
  runtimeCpus,
  runtimeDriver,
  runtimeDockerImage,
  runtimeEnabled,
  runtimeMaxInstances,
  runtimeMemory,
  runtimeNodeEnabled,
  runtimeRootDir,
  runtimeStartTimeoutSeconds,
  runtimeTtlMinutes,
  serviceVersion,
  contentReviewFailClosed,
  contentReviewMaxTextBytes,
  contentReviewMode,
  contentReviewExternalEndpoint,
  contentReviewExternalToken,
  publicBaseUrl,
} from "../config.js";
import {
  publicContentReview,
  reviewArchiveContent,
  attachContentReviewToInspection,
  createAndPersistContentReview,
  persistPreflightContentReview,
  createHttpError,
  createContentReviewError,
} from "./content-review-service.js";
import {
  classifyFailureCategory,
  createFailureDiagnosis,
  createInspectionSummary,
  inspectionTypeLabel,
  createUserFacingInspection,
} from "./failure-diagnosis-service.js";
import {
  createHostingCapabilities,
  createProjectArchitecture,
} from "./hosting-architecture-service.js";
import {
  createApplicationReadiness,
  publicApplicationReadiness,
} from "./application-readiness-service.js";
import {
  analyzeArchiveEntries,
  cleanupArchiveAnalysis,
  writeArchiveEntry,
  readArchiveEntryText,
  stripArchiveExtension,
  createProjectError,
} from "../lib/archive-analyzer.js";
import { cleanProjectName, isGenericProjectName } from "../lib/project-utils.js";
import { deploySourceLabel } from "../lib/deploy-helpers.js";
import {
  createDeploymentSteps,
  markDeploymentStep,
  completeDeploymentSteps,
  failedDeploymentSteps,
} from "../lib/deployment-steps.js";
import {
  createDemoDatabase,
  deleteDemoDatabase,
  demoDatabaseBlockReason,
  demoDatabaseEnv,
  initializeDemoDatabase,
  isDemoDatabaseReady,
  needsMysqlDatabase,
  publicDemoDatabase,
} from "./demo-database-service.js";
import {
  canStartNodeRuntime,
  createRuntimeConfig,
  prepareRuntimeProject,
} from "./runtime-service.js";

import {
  getDeployEvents,
} from "./quota-service.js";

import {
  createExternalBackendConfigStatus,
  externalBackendEnvValues,
  publicExternalBackend,
} from "./external-backend-service.js";
import {
  createRuntimeConfigStatus,
  runtimeEnvForDemo,
  publicRuntimeEnv,
} from "../lib/admin-helpers.js";
import { exists } from "../lib/utils.js";
import { isSlugClaimedByDemo, canUseCustomDomain, isExpired, getArchivedDemoDir } from "../lib/slug-utils.js";

export function createDeploymentPipelineService(deps) {
  const {
    readJson, writeJson,
    demosFile, demoRoot,
    checkDeployRateLimit, calculateQuota,
    startNodeRuntime, stopRuntime,
    writeAuditLog, writeTrialEvent, summarizeResponseLimits,
  } = deps;

  // File handlers injected lazily to break circular dependency with lifecycle service
  let expireDemoFiles = deps.expireDemoFiles || (() => { throw new Error("expireDemoFiles not yet injected"); });
  let copyDemoArchive = deps.copyDemoArchive || (() => { throw new Error("copyDemoArchive not yet injected"); });

  // Build functions injected lazily to break circular dependency with build service
  let detectBuildAndNormalizeOutput = () => { throw new Error("detectBuildAndNormalizeOutput not yet injected"); };
  let summarizePublishedDirectory = () => { throw new Error("summarizePublishedDirectory not yet injected"); };
  let injectTrackingScript = () => { throw new Error("injectTrackingScript not yet injected"); };
  let ensureAutoHostedForm = () => { throw new Error("ensureAutoHostedForm not yet injected"); };

  function setFileHandlers(handlers) {
    if (handlers.expireDemoFiles) expireDemoFiles = handlers.expireDemoFiles;
    if (handlers.copyDemoArchive) copyDemoArchive = handlers.copyDemoArchive;
  }

  function setBuildFunctions(fns) {
    if (fns.detectBuildAndNormalizeOutput) detectBuildAndNormalizeOutput = fns.detectBuildAndNormalizeOutput;
    if (fns.summarizePublishedDirectory) summarizePublishedDirectory = fns.summarizePublishedDirectory;
    if (fns.injectTrackingScript) injectTrackingScript = fns.injectTrackingScript;
    if (fns.ensureAutoHostedForm) ensureAutoHostedForm = fns.ensureAutoHostedForm;
  }

  // --- Local helpers ---

  async function appendDeploymentEvents(events) {
    const deploymentEventsFile = path.join(dataDir, "deployment-events.json");
    const items = Array.isArray(events) ? events.filter(Boolean) : [];
    if (!items.length) return;
    const existing = await readJson(deploymentEventsFile, []);
    await writeJson(deploymentEventsFile, [...items, ...existing].slice(0, 5000));
  }

  // --- Extracted pipeline functions ---

function hostingConfig() {
  const config = {
    version: serviceVersion,
    dataDir,
    runtimeEnabled,
    runtimeNodeEnabled,
    runtimeDriver,
    runtimeRootDir: runtimeRootDir || path.join(dataDir, "runtime-projects"),
    runtimeDockerImage,
    runtimeMemory,
    runtimeCpus,
    runtimeTtlMinutes,
    runtimeStartTimeoutSeconds,
    runtimeMaxInstances,
    demoDbEnabled,
    demoDbMock,
    demoDbAdminHost,
    demoDbAdminPort,
    demoDbAdminUser,
    demoDbAdminPassword,
    demoDbHost,
    demoDbPort
  };
  return {
    ...config,
    demoDatabaseReady: isDemoDatabaseReady(config)
  };
}

function hostingCapabilities() {
  return createHostingCapabilities(hostingConfig());
}

function isNodeRuntimeInspection(inspection = {}) {
  return inspection.analysis.hostingMode === "node_runtime" ||
    inspection.analysis.projectProfile?.type === "node_service" ||
    (inspection.analysis.projectProfile?.type === "fullstack_framework" && inspection.hosting?.mode === "node_runtime") ||
    (inspection.analysis.hasBackend && inspection.runtime?.engine === "node");
}

function createConfigRequiredRuntime(previousRuntime = null, runtimeConfigStatus = {}, diagnosis = null) {
  return {
    ...(previousRuntime || {}),
    status: "config_required",
    statusLabel: "等待配置就绪",
    logs: previousRuntime?.logs || "",
    logSummary: runtimeConfigStatus.nextAction || "",
    failureDiagnosis: diagnosis || createFailureDiagnosis({
      message: runtimeConfigStatus.nextAction || "暂不支持自动部署配置。",
      category: "runtime_env",
      runtime: previousRuntime
    }),
    lifecycle: {
      ...(previousRuntime?.lifecycle || {}),
      stage: "config_required",
      stageLabel: "等待配置就绪",
      startedAt: null,
      stoppedAt: null
    },
    config: runtimeConfigStatus
  };
}

function attachRuntimeToInspection(inspection = {}, runtime = {}) {
  return {
    ...inspection,
    runtime: {
      ...(inspection.runtime || {}),
      ...runtime,
      status: runtime.status,
      statusLabel: runtime.statusLabel
    },
    hosting: {
      ...(inspection.hosting || {}),
      runtime: {
        ...(inspection.hosting?.runtime || {}),
        ...runtime,
        status: runtime.status,
        statusLabel: runtime.statusLabel
      }
    }
  };
}

function canPublishNodeRuntimeInspection(inspection = {}) {
  if (!isNodeRuntimeInspection(inspection)) return false;
  const config = hostingConfig();
  const databaseReason = demoDatabaseBlockReason(inspection, config);
  if (databaseReason) return false;
  const runtimeCheck = canStartNodeRuntime(inspection, createRuntimeConfig(config));
  return runtimeCheck.ok || runtimeCheck.configRequired;
}

function nodeRuntimeBlockReason(inspection = {}) {
  if (!isNodeRuntimeInspection(inspection)) return "";
  const config = hostingConfig();
  const databaseReason = demoDatabaseBlockReason(inspection, config);
  if (databaseReason) return databaseReason;
  const runtimeCheck = canStartNodeRuntime(inspection, createRuntimeConfig(config));
  if (runtimeCheck.configRequired) return "";
  return runtimeCheck.reason;
}

function attachArchitectureToInspection(inspection) {
  const config = hostingConfig();
  const projectArchitecture = createProjectArchitecture(inspection, config);
  const runtimeReady = projectArchitecture.projectKind === "node_runtime" &&
    projectArchitecture.hosting?.runtime?.status === "ready";
  const runtimeWarnings = inspection.runtime?.warnings || [];
  const runtimeUnsupportedReasons = inspection.runtime?.unsupportedReasons || [];
  const databaseBlockReason = demoDatabaseBlockReason(inspection, config);
  const nextInspection = {
    ...inspection,
    projectArchitecture,
    hosting: projectArchitecture.hosting,
    analysis: {
      ...(inspection.analysis || {}),
      hostingMode: projectArchitecture.projectKind,
      hostingModeLabel: projectArchitecture.projectKindLabel,
    },
    runtime: {
      ...(inspection.runtime || {}),
      ...(projectArchitecture.hosting.runtime || {})
    }
  };
  nextInspection.hosting = {
    ...(nextInspection.hosting || {}),
    runtime: nextInspection.runtime
  };
  nextInspection.projectArchitecture = {
    ...projectArchitecture,
    hosting: nextInspection.hosting
  };
  if (runtimeWarnings.length || runtimeUnsupportedReasons.length) {
    nextInspection.presentation.supportNotes = Array.from(new Set([
      ...(nextInspection.presentation.supportNotes || []),
      ...runtimeWarnings
    ]));
    nextInspection.presentation.unsupportedNotes = Array.from(new Set([
      ...(nextInspection.presentation.unsupportedNotes || []),
      ...runtimeUnsupportedReasons
    ]));
    nextInspection.presentation.ruleReport = {
      ...(nextInspection.presentation.ruleReport || {}),
      risks: Array.from(new Set([
        ...((nextInspection.presentation.ruleReport || {}).risks || []),
        ...runtimeUnsupportedReasons
      ]))
    };
  }
  if (databaseBlockReason) {
    nextInspection.presentation.unsupportedNotes = Array.from(new Set([
      ...(nextInspection.presentation.unsupportedNotes || []),
      databaseBlockReason
    ]));
    nextInspection.presentation.ruleReport = {
      ...(nextInspection.presentation.ruleReport || {}),
      risks: Array.from(new Set([
        ...((nextInspection.presentation.ruleReport || {}).risks || []),
        databaseBlockReason
      ]))
    };
  }
  const externalBackend = createExternalBackendConfigStatus(nextInspection, {}, nextInspection.externalBackend);
  if (externalBackend) {
    nextInspection.externalBackend = externalBackend;
    nextInspection.presentation.supportNotes = Array.from(new Set([
      ...(nextInspection.presentation.supportNotes || []),
      externalBackend.status === "missing"
        ? "检测到 Supabase 外部后端，需要在项目设置页面填写 URL 和 anon key"
        : "检测到 Supabase 外部后端"
    ]));
    nextInspection.presentation.ruleReport = {
      ...(nextInspection.presentation.ruleReport || {}),
      recommendations: Array.from(new Set([
        ...((nextInspection.presentation.ruleReport || {}).recommendations || []),
        "Supabase 项目未提供 DemoGo 所需的 anon key，这会增加集成难度，在管理后端配置时请注意相关设置。"
      ]))
    };
  }
  if (inspection.runtime?.requiresMysql && !inspection.runtime?.unsupportedReasons?.length) {
    nextInspection.presentation.supportNotes = Array.from(new Set([
      ...(nextInspection.presentation.supportNotes || []),
      "运行时需要使用 MySQL 数据库"
    ]));
    nextInspection.presentation.ruleReport = {
      ...(nextInspection.presentation.ruleReport || {}),
      recommendations: Array.from(new Set([
        ...((nextInspection.presentation.ruleReport || {}).recommendations || []),
        "检测到 MySQL 运行时依赖，部署时将自动创建项目所需的数据库。"
      ]))
    };
  }
  if (runtimeReady) {
    nextInspection.status = "warning";
    nextInspection.canPublish = true;
    nextInspection.summary = inspection.analysis.hasSsr
      ? "识别为基于服务端渲染的现代应用项目，可以支持服务端渲染和自动化部署"
      : "识别为 Node.js 后端服务项目，可以支持服务端渲染和自动化部署";
    nextInspection.presentation.userStatus = "supported";
    nextInspection.presentation.userStatusLabel = "支持";
    nextInspection.presentation.userSummary = inspection.analysis.hasSsr
      ? "服务端渲染应用可以集成服务端渲染功能，将页面渲染和接口处理合并到同一个服务进程中运行。"
      : "您的项目可以集成 Node.js 后端服务，为用户提供服务端渲染和接口处理，将页面渲染和接口处理合并到同一个服务进程中运行。";
    nextInspection.presentation.ruleReport = {
      ...(nextInspection.presentation.ruleReport || {}),
      publishability: "支持",
      recommendations: Array.from(new Set([
        ...((nextInspection.presentation.ruleReport || {}).recommendations || []),
        inspection.runtime?.requiresMysql
          ? "Node.js 运行时已就绪，内置 MySQL 数据库支持已开启，可以直接使用数据库功能。"
          : "Node.js 运行时已就绪，可以支持服务端渲染和自动化部署"
      ]))
    };
  } else if (projectArchitecture.projectKind === "node_runtime") {
    nextInspection.status = "blocked";
    nextInspection.canPublish = false;
    nextInspection.presentation.userStatus = "unsupported";
    nextInspection.presentation.userStatusLabel = "暂不支持";
    nextInspection.summary = projectArchitecture.hosting?.runtime?.statusLabel || "当前项目运行时环境未就绪";
    nextInspection.presentation.userSummary = "您的项目需要应用运行时环境，但当前平台暂时不支持该类型的运行时部署，后续将提供更多可配置选项来支持更多运行时类型。";
    nextInspection.presentation.unsupportedNotes = Array.from(new Set([
      ...(nextInspection.presentation.unsupportedNotes || []),
      nextInspection.summary
    ]));
  }
  nextInspection.applicationReadiness = createApplicationReadiness({ inspection: nextInspection });
  return {
    projectArchitecture,
    inspection: nextInspection
  };
}

function inferProjectDisplayName({ requestedName, uploadedFileName, inspection }) {
  const candidates = [
    requestedName,
    inspection?.entries?.projectTitle,
    inspection?.entries?.pageHeading,
    stripArchiveExtension(inspection?.entries?.singleHtmlEntry || ""),
    stripArchiveExtension(uploadedFileName)
  ].map(cleanProjectName).filter(Boolean);

  const strong = candidates.find((name) => !isGenericProjectName(name));
  return (strong || candidates[0] || "DemoGo 演示项目").slice(0, 80);
}

async function createAvailableSlug(_input, existingDemos = []) {
  const base = `try-${crypto.randomBytes(4).toString("hex")}`;
  let slug = base;
  let index = 1;

  while (isSlugClaimedByDemo(slug, existingDemos) || await exists(path.join(demoRoot, slug)) || await exists(getArchivedDemoDir(slug))) {
    index += 1;
    slug = `${base}-${index}`;
  }

  return slug;
}

async function inspectProjectArchive(archivePath, fileName = "") {
  const analysis = await analyzeArchiveEntries(archivePath, fileName, { keepTempFiles: true });
  try {
    let inspection = attachArchitectureToInspection(createInspectionSummary(analysis)).inspection;
    const review = await reviewArchiveContent(analysis, {
      mode: contentReviewMode,
      maxTextBytes: contentReviewMaxTextBytes,
      externalEndpoint: contentReviewExternalEndpoint,
      externalToken: contentReviewExternalToken,
      readText: readArchiveEntryText
    });
    return attachContentReviewToInspection(inspection, review);
  } finally {
    await cleanupArchiveAnalysis(analysis);
  }
}

async function extractStaticDemo(archivePath, targetDir, options = {}) {
  const steps = options.steps || [];
  const analysis = await analyzeArchiveEntries(archivePath, options.fileName, { keepTempFiles: true });
  try {
  markDeploymentStep(steps, "extract", "success", `解压文件完成，识别到 ${analysis.rawFileCount} 个文件`, { archiveType: analysis.archiveType });
  markDeploymentStep(steps, "security_check", analysis.blockedFiles.length ? "安全检查未通过" : "安全检查已通过", analysis.blockedFiles.length ? "安全检查未通过" : "安全检查已通过", {
    ignoredFiles: analysis.ignoredFiles,
    blockedFiles: analysis.blockedFiles
  });
  const inspection = createInspectionSummary(analysis);
  markDeploymentStep(steps, "inspect", inspection.canPublish ? "success" : "failed", inspection.summary, {
    detectedType: inspection.analysis.detectedType,
    entryFile: inspection.entries.entryFile
  });
  const files = analysis.publishableEntries;

  if (!inspection.canPublish) {
    throw createProjectError(inspection, inspection.presentation.issues[0] || inspection.summary);
  }

  if (files.length === 0) {
    throw createProjectError(inspection, "压缩包中没有可发布的文件");
  }

  if (files.length > maxExtractedFiles) {
    throw createProjectError(inspection, `项目需要的文件数量过多，当前最多支持 ${maxExtractedFiles} 个文件。请删除无关资源后重新上传。`);
  }

  const commonRoot = analysis.commonRoot;
  let extractedBytes = 0;
  let fileCount = 0;

  for (const item of files) {
    const entry = item.entry;
    const relativePath = item.relativePath;

    if (!relativePath || relativePath.endsWith("/")) {
      continue;
    }

    extractedBytes += Number(item.bytes || entry?.uncompressedSize || 0);

    if (extractedBytes > maxExtractedBytes) {
      throw createProjectError(inspection, `项目文件太大，当前最多支持 ${formatBytes(maxExtractedBytes)}。请压缩图片或删除无关文件后重新上传。`);
    }

    const destination = path.resolve(targetDir, relativePath);
    const targetRoot = path.resolve(targetDir);

    if (!destination.startsWith(`${targetRoot}${path.sep}`)) {
      throw new Error("压缩包包含不安全路径");
    }

    await fs.mkdir(path.dirname(destination), { recursive: true });
    await writeArchiveEntry(item, destination);
    fileCount += 1;
  }

  const result = await detectBuildAndNormalizeOutput(targetDir, inspection, {
    env: externalBackendEnvValues(inspection, options.demo?.runtimeEnv || {})
  });
  markDeploymentStep(steps, "build", result.buildLog ? "自动构建完成" : "无需构建，直接发布静态文件", result.buildLog ? "自动构建完成" : "无需构建，直接发布静态文件", { detectedType: result.detectedType });
  const publishableStats = await summarizePublishedDirectory(targetDir);
  const userFacing = createUserFacingInspection({
    status: "pass",
    detectedType: result.detectedType,
    projectProfile: inspection.analysis.projectProfile,
    projectAssessment: inspection.analysis.projectAssessment,
    entryFile: inspection.entries.entryFile,
    singleHtmlEntry: inspection.entries.singleHtmlEntry,
    hasPackageJson: inspection.analysis.hasPackageJson,
    hasBuildScript: inspection.analysis.hasBuildScript,
    hasBackend: inspection.analysis.hasBackend,
    hasSsr: inspection.analysis.hasSsr,
    formFields: inspection.forms.formFields,
    apiCalls: inspection.forms.apiCalls,
    runtime: inspection.runtime,
    issues: inspection.presentation.issues || [],
  });
  const finalInspection = {
    ...inspection,
    analysis: {
      ...(inspection.analysis || {}),
      detectedType: result.detectedType,
      label: inspectionTypeLabel(result.detectedType),
    },
    entries: {
      ...(inspection.entries || {}),
      entryFile: result.detectedType === "single-html" ? "index.html" : inspection.entries.entryFile,
    },
    files: {
      ...(inspection.files || {}),
      publishableFileCount: publishableStats.fileCount || fileCount,
      publishableBytes: publishableStats.totalBytes || extractedBytes,
    },
    presentation: {
      ...(inspection.presentation || {}),
      userLabel: userFacing.userLabel,
      userSummary: userFacing.userSummary,
      userStatus: userFacing.userStatus,
      userStatusLabel: userFacing.userStatusLabel,
      supportNotes: userFacing.supportNotes,
      unsupportedNotes: userFacing.unsupportedNotes,
      fixPrompt: userFacing.fixPrompt,
    },
    forms: {
      ...(inspection.forms || {}),
      autoFormEnabled: userFacing.autoFormEnabled,
      autoFormReason: userFacing.autoFormReason,
    },
  };
  const contentReview = await createAndPersistContentReview({
    analysis,
    inspection: finalInspection,
    fileName: options.fileName,
    actor: options.actor,
    action: options.action,
    user: options.user,
    demo: options.demo,
    projectName: options.projectName,
    deploymentId: options.deploymentId,
    targetDir
  });
  finalInspection.contentReview = publicContentReview(contentReview);
  markDeploymentStep(
    steps,
    "content_review",
    contentReview.status === "passed" ? "success" : "failed",
    contentReview.summary,
    { contentReviewId: contentReview.id, contentReviewStatus: contentReview.status }
  );
    if (contentReview.status !== "passed" && contentReviewFailClosed) {
      const error = createProjectError(finalInspection, contentReview.summary);
      error.contentReview = contentReview;
      throw error;
    }
    finalInspection.externalBackend = createExternalBackendConfigStatus(finalInspection, options.demo?.runtimeEnv || {}, options.demo?.externalBackend);
    await injectTrackingScript(targetDir, result.detectedType);
  markDeploymentStep(steps, "publish", "success", "所有文件准备就绪", { fileCount, extractedBytes });
  markDeploymentStep(steps, "success", "发布成功！已返回访问地址。");
  return {
    detectedType: result.detectedType,
    buildLog: result.buildLog,
    fileCount: publishableStats.fileCount || fileCount,
    extractedBytes: publishableStats.totalBytes || extractedBytes,
    ignoredFiles: analysis.ignoredFiles,
    contentReview,
    inspection: finalInspection
  };
  } finally {
    await cleanupArchiveAnalysis(analysis);
  }
}

async function extractRuntimeDemo(archivePath, targetDir, options = {}) {
  const steps = options.steps || [];
  const analysis = await analyzeArchiveEntries(archivePath, options.fileName, { keepTempFiles: true });
  try {
    markDeploymentStep(steps, "extract", "success", `解压文件完成，识别到 ${analysis.rawFileCount} 个文件`, { archiveType: analysis.archiveType });
    markDeploymentStep(steps, "security_check", analysis.blockedFiles.length ? "安全检查未通过" : "安全检查已通过", analysis.blockedFiles.length ? "安全检查未通过" : "安全检查已通过", {
      ignoredFiles: analysis.ignoredFiles,
      blockedFiles: analysis.blockedFiles
    });
    let inspection = attachArchitectureToInspection(createInspectionSummary(analysis)).inspection;
    markDeploymentStep(steps, "inspect", inspection.analysis.hostingMode === "node_runtime" ? "success" : "failed", inspection.summary, {
      detectedType: inspection.analysis.detectedType,
      hostingMode: inspection.analysis.hostingMode
    });
    const runtimeEligibility = canStartNodeRuntime(inspection, createRuntimeConfig(hostingConfig()));
    if (!runtimeEligibility.ok && !runtimeEligibility.configRequired) {
      throw createProjectError(inspection, runtimeEligibility.reason);
    }
    let configRequiredRuntime = null;
    if (runtimeEligibility.configRequired) {
      configRequiredRuntime = createConfigRequiredRuntime(null, createRuntimeConfigStatus(inspection, {}, null), createFailureDiagnosis({
        message: runtimeEligibility.reason,
        category: "runtime_env",
        inspection,
        runtime: null,
        database: null
      }));
      inspection.runtime = { ...(inspection.runtime || {}), ...configRequiredRuntime };
      inspection = attachDiagnosisToInspection(inspection, createFailureDiagnosis({
        message: runtimeEligibility.reason,
        category: "runtime_env",
        inspection,
        runtime: configRequiredRuntime,
        database: null
      }));
    }
    if (analysis.blockedFiles.length) {
      throw createProjectError(inspection, "项目中包含运行时不支持的文件类型");
    }
    if (!analysis.publishableEntries.length) {
      throw createProjectError(inspection, "压缩包中没有可部署的文件。");
    }
    const stats = await prepareRuntimeProject({
      archiveEntries: analysis.publishableEntries,
      targetDir,
      maxFiles: maxExtractedFiles,
      maxBytes: maxExtractedBytes,
      writeEntry: writeArchiveEntry
    });
    markDeploymentStep(steps, "build", "skipped", "Node.js 项目无需构建，直接从代码运行", { detectedType: inspection.analysis.detectedType });
    const contentReview = await createAndPersistContentReview({
      analysis,
      inspection,
      fileName: options.fileName,
      actor: options.actor,
      action: options.action,
      user: options.user,
      demo: options.demo,
      projectName: options.projectName,
      deploymentId: options.deploymentId,
      targetDir
    });
    inspection.contentReview = publicContentReview(contentReview);
    markDeploymentStep(
      steps,
      "content_review",
      contentReview.status === "passed" ? "success" : "failed",
      contentReview.summary,
      { contentReviewId: contentReview.id, contentReviewStatus: contentReview.status }
    );
    if (contentReview.status !== "passed" && contentReviewFailClosed) {
      const error = createProjectError(inspection, contentReview.summary);
      error.contentReview = contentReview;
      throw error;
    }
    inspection.externalBackend = createExternalBackendConfigStatus(inspection, options.demo?.runtimeEnv || {}, options.demo?.externalBackend);
    markDeploymentStep(steps, "form_hosting", "skipped", "Node.js 后端项目暂不支持自动托管页面");
    const runtime = configRequiredRuntime || {
      status: "ready",
      statusLabel: "等待启动",
      lifecycle: {
        stage: "ready_to_start",
        stageLabel: "等待启动",
        startedAt: null,
        expiresAt: null,
        stoppedAt: null
      },
      logs: ""
    };
    const finalInspection = {
      ...inspection,
      runtime: {
        ...(inspection.runtime || {}),
        ...runtime,
        status: runtime.status,
        statusLabel: runtime.statusLabel
      },
      hosting: {
        ...(inspection.hosting || {}),
        runtime: {
          ...(inspection.hosting?.runtime || {}),
          ...runtime,
          status: runtime.status,
          statusLabel: runtime.statusLabel
        }
      },
      canPublish: true,
      status: "pass",
      presentation: {
        ...(inspection.presentation || {}),
        userStatus: "supported",
        userStatusLabel: "支持",
        userSummary: "该 Node.js 后端服务项目已创建成功，运行时环境就绪，用户可以通过访问地址访问页面和接口。"
      }
    };
    markDeploymentStep(steps, "publish", "success", "运行时项目文件准备就绪", { runtimeStatus: "pending" });
    return {
      detectedType: inspection.analysis.detectedType,
      buildLog: runtime.logs || "",
      fileCount: stats.fileCount,
      extractedBytes: stats.extractedBytes,
      ignoredFiles: analysis.ignoredFiles,
      contentReview,
      inspection: finalInspection,
      runtime
    };
  } catch (error) {
    throw error;
  } finally {
    await cleanupArchiveAnalysis(analysis);
  }
}

async function performCreateDeployment({ uploadedFile, requestedName = "", user, clientIp = "", actor = "user", deploySource = "web", deploymentId = "" }) {
  if (!uploadedFile) {
    throw createHttpError("请上传 .zip、.tar.gz 或 .tgz 项目包", 400);
  }

  const existingDemos = await readJson(demosFile, []);
  let slug = "";
  let targetDir = "";
  let createdDatabase = null;
  const currentDeploymentId = deploymentId || crypto.randomUUID();
  const steps = createDeploymentSteps({ userId: user.id, deploymentId: currentDeploymentId, action: "create" });

  try {
    const rate = await checkDeployRateLimit(user, clientIp);
    if (!rate.allowed) {
      throw createHttpError("上传过于频繁，请稍后再试", 429);
    }
    const preInspection = await inspectProjectArchive(uploadedFile.path, uploadedFile.originalname);
    const canPublishRuntime = canPublishNodeRuntimeInspection(preInspection);
    if ((isNodeRuntimeInspection(preInspection) && !canPublishRuntime) || (!preInspection.canPublish && !canPublishRuntime)) {
      const persistedReview = await persistPreflightContentReview({
        inspection: preInspection,
        user,
        fileName: uploadedFile.originalname,
        projectName: inferProjectDisplayName({
          requestedName,
          uploadedFileName: uploadedFile.originalname,
          inspection: preInspection
        }),
        actor,
        action: "create",
        deploymentId: currentDeploymentId
      });
      if (persistedReview) {
        preInspection.contentReview = publicContentReview(persistedReview);
      }
      markDeploymentStep(steps, "inspect", "failed", preInspection.summary || "项目检查未通过", {
        detectedType: preInspection.analysis.detectedType,
        contentReviewStatus: preInspection.contentReview?.status
      });
      const error = createProjectError(preInspection, nodeRuntimeBlockReason(preInspection) || preInspection.presentation.issues?.[0] || preInspection.summary || "该项目暂时无法发布，请检查项目结构后重试。查看检查报告了解更多细节。");
      error.statusCode = 400;
      error.contentReview = preInspection.contentReview || null;
      error.deploymentEvents = completeDeploymentSteps(steps, { userId: user.id, deploymentId: currentDeploymentId });
      await appendDeploymentEvents(failedDeploymentSteps(error, steps, { userId: user.id, deploymentId: currentDeploymentId }));
      throw error;
    }
    const inferredName = inferProjectDisplayName({
      requestedName,
      uploadedFileName: uploadedFile.originalname,
      inspection: preInspection
    });
    slug = await createAvailableSlug(inferredName, existingDemos);
    targetDir = path.join(demoRoot, slug);
    const quota = calculateQuota(user, existingDemos);
    if (quota.onlineDemos.used >= quota.onlineDemos.limit) {
      const error = createHttpError(`当前套餐最多保留 ${quota.onlineDemos.limit} 个在线Demo项目。要发布新项目，请先通过升级套餐，或者删除已有项目后再尝试添加。`, 403);
      error.inspection = preInspection;
      error.contentReview = preInspection.contentReview || null;
      throw error;
    }
    if (quota.monthlyDeploys.used >= quota.monthlyDeploys.limit) {
      const error = createHttpError("本月发布/更新次数已达上限。要发布新项目请通过升级套餐或下个月后再试。", 403);
      error.inspection = preInspection;
      error.contentReview = preInspection.contentReview || null;
      throw error;
    }

    await fs.rm(targetDir, { recursive: true, force: true });
    await fs.mkdir(targetDir, { recursive: true });

    const result = canPublishRuntime
      ? await extractRuntimeDemo(uploadedFile.path, targetDir, {
          fileName: uploadedFile.originalname,
          steps,
          actor,
          action: "create",
          user,
          projectName: inferredName,
          deploymentId: currentDeploymentId,
          slug,
          startRuntime: false
        })
      : await extractStaticDemo(uploadedFile.path, targetDir, {
          fileName: uploadedFile.originalname,
          steps,
          actor,
          action: "create",
          user,
          projectName: inferredName,
          deploymentId: currentDeploymentId
    });
    const architecture = attachArchitectureToInspection(result.inspection);
    if (result.runtime) {
      architecture.projectArchitecture.hosting.runtime = {
        ...(architecture.projectArchitecture.hosting.runtime || {}),
        ...result.runtime
      };
      architecture.inspection.runtime = {
        ...(architecture.inspection.runtime || {}),
        ...result.runtime
      };
      architecture.inspection.hosting = architecture.projectArchitecture.hosting;
      architecture.inspection.projectArchitecture = architecture.projectArchitecture;
    }
    result.inspection = architecture.inspection;
    if (result.contentReview?.status !== "passed") {
      throw createContentReviewError(result.contentReview);
    }
    const now = new Date().toISOString();
    const publicUrl = `${publicBaseUrl.replace(/\/$/, "")}/d/${slug}/`;
    const demoId = crypto.randomUUID();
    let demoDatabase = null;
    let runtime = result.runtime || null;
    if (canPublishRuntime && needsMysqlDatabase(result.inspection)) {
      markDeploymentStep(steps, "database", "pending", "正在创建 MySQL 数据库");
      demoDatabase = await createDemoDatabase({
        slug,
        demoId,
        inspection: result.inspection,
        config: hostingConfig()
      });
      demoDatabase = await initializeDemoDatabase(demoDatabase, {
        projectDir: targetDir,
        config: hostingConfig()
      });
      createdDatabase = demoDatabase;
      if (demoDatabase.schema?.status === "failed") {
        const error = createHttpError(`MySQL 数据库已创建，但初始化脚本执行失败。${demoDatabase.schema.error}`, 400);
        error.inspection = result.inspection;
        error.database = demoDatabase;
        error.databaseError = demoDatabase.schema.error;
        throw error;
      }
      markDeploymentStep(steps, "database", "success", demoDatabase.schema?.status === "ready" ? "MySQL 数据库已创建并完成初始化" : "MySQL 数据库已创建", {
        engine: demoDatabase.engine,
        databaseName: demoDatabase.databaseName,
        schemaStatus: demoDatabase.schema?.status || "skipped"
      });
    } else {
      markDeploymentStep(steps, "database", "skipped", "该项目不需要数据库");
    }
    if (canPublishRuntime && (!runtime || runtime.status === "ready" || runtime.lifecycle?.stage === "ready_to_start")) {
      const runtimeConfigStatus = createRuntimeConfigStatus(result.inspection, {}, demoDatabase);
      if (runtimeConfigStatus.missing.length) {
        const diagnosis = createFailureDiagnosis({
          message: runtimeConfigStatus.nextAction,
          category: "runtime_env",
          inspection: result.inspection,
          runtime,
          database: demoDatabase
        });
        runtime = createConfigRequiredRuntime(runtime, runtimeConfigStatus, diagnosis);
        result.runtime = runtime;
        result.inspection = attachRuntimeToInspection(result.inspection, runtime);
        result.inspection = attachDiagnosisToInspection(result.inspection, diagnosis);
        architecture.projectArchitecture.hosting.runtime = {
          ...(architecture.projectArchitecture.hosting.runtime || {}),
          ...runtime
        };
        architecture.inspection = result.inspection;
        architecture.inspection.projectArchitecture = architecture.projectArchitecture;
        markDeploymentStep(steps, "publish", "skipped", "项目已保存，但需要补充环境变量配置后才能发布", { missingEnv: runtimeConfigStatus.missing });
        markDeploymentStep(steps, "success", "运行时项目已创建，等待补充配置后即可访问");
      } else {
        markDeploymentStep(steps, "publish", "pending", "正在安装 Node.js 运行时依赖，首次安装大约需要 1-3 分钟");
        runtime = await startNodeRuntime({
          slug,
          projectDir: targetDir,
          inspection: result.inspection,
          config: hostingConfig(),
          env: {
            ...demoDatabaseEnv(demoDatabase),
            ...externalBackendEnvValues(result.inspection, {})
          }
        });
        result.runtime = runtime;
        result.buildLog = runtime.logs || result.buildLog || "";
        result.inspection = attachRuntimeToInspection(result.inspection, runtime);
        architecture.projectArchitecture.hosting.runtime = {
          ...(architecture.projectArchitecture.hosting.runtime || {}),
          ...runtime
        };
        architecture.inspection = result.inspection;
        architecture.inspection.projectArchitecture = architecture.projectArchitecture;
        markDeploymentStep(steps, "publish", "success", "运行时就绪，项目页面和接口已可访问", { runtimeStatus: runtime.status, driver: runtime.driver });
        markDeploymentStep(steps, "success", "发布成功！已返回访问地址。");
      }
    }
    const demo = {
      id: demoId,
      userId: user.id,
      userEmail: user.email,
      slug,
      name: inferredName,
      linkMode: "random",
      customDomainEligible: canUseCustomDomain(user.plan),
      status: "published",
      publicUrl,
      deploySource,
      deploySourceLabel: deploySourceLabel(deploySource),
      architecture: architecture.projectArchitecture,
      hosting: architecture.projectArchitecture.hosting,
      hostingMode: architecture.projectArchitecture.projectKind,
      hostingModeLabel: architecture.projectArchitecture.projectKindLabel,
      runtime: architecture.projectArchitecture.hosting.runtime,
      database: demoDatabase || null,
      runtimeEnv: {},
      runtimeConfig: createRuntimeConfigStatus(result.inspection, {}, demoDatabase),
      externalBackend: createExternalBackendConfigStatus(result.inspection, {}, null),
      projectProfile: result.inspection.analysis.projectProfile || null,
      projectCategory: result.inspection.analysis.projectCategory || result.inspection.analysis.projectProfile?.label || "",
      detectedType: result.detectedType,
      fileCount: result.fileCount,
      extractedBytes: result.extractedBytes,
      ignoredFiles: result.ignoredFiles,
      inspection: result.inspection,
      contentReview: publicContentReview(result.contentReview),
      sourceFileName: uploadedFile.originalname,
      usage: {
        visits: 0,
        estimatedBytes: 0,
        lastVisitedAt: null
      },
      version: 1,
      createdAt: now,
      deployEvents: [{ type: "create", at: now, status: "success" }],
      expiresAt: new Date(Date.now() + quota.plan.demoRetentionDays * 24 * 60 * 60 * 1000).toISOString()
    };
    demo.inspection = {
      ...demo.inspection,
      externalBackend: demo.externalBackend
    };
    const autoForm = demo.hostingMode === "node_runtime"
      ? { reason: "Node.js 后端项目暂不支持自动托管页面" }
      : await ensureAutoHostedForm({
          user,
          demo,
          inspection: result.inspection,
          targetDir,
          now
        });
    if (autoForm?.form) {
      demo.autoFormId = autoForm.form.id;
      demo.inspection = {
        ...demo.inspection,
        forms: {
          ...(demo.inspection.forms || {}),
          autoFormEnabled: true,
          autoFormId: autoForm.form.id,
          autoFormSubmitUrl: publicForm(autoForm.form, { publicBaseUrl }).submitUrl
        }
      };
      result.inspection = demo.inspection;
      markDeploymentStep(steps, "form_hosting", "success", "已启用自动表单数据收集", { formId: autoForm.form.id });
    } else if (autoForm?.reason) {
      demo.inspection = {
        ...demo.inspection,
        forms: {
          ...(demo.inspection.forms || {}),
          autoFormEnabled: false,
          autoFormReason: autoForm.reason
        }
      };
      result.inspection = demo.inspection;
      markDeploymentStep(steps, "form_hosting", "skipped", autoForm.reason);
    }
    demo.externalBackend = createExternalBackendConfigStatus(demo.inspection, demo.runtimeEnv, demo.externalBackend);
    demo.inspection = {
      ...demo.inspection,
      externalBackend: demo.externalBackend
    };
    demo.applicationReadiness = createApplicationReadiness({ demo, inspection: demo.inspection });
    demo.inspection = {
      ...demo.inspection,
      applicationReadiness: demo.applicationReadiness
    };
    result.inspection = demo.inspection;
    for (const step of steps) {
      step.demoId = demo.id;
      step.userId = user.id;
    }
    const demos = await readJson(demosFile, []);
    demos.unshift(demo);
    await writeJson(demosFile, demos);
    await writeAuditLog({
      action: actor === "agent" ? "agent_deploy_demo" : "deploy_demo",
      actorType: actor === "agent" ? "agent" : "user",
      actorId: user.id,
      targetType: "demo",
      targetId: demo.id,
      ip: clientIp,
      metadata: {
        slug,
        sourceFileName: uploadedFile.originalname,
        detectedType: result.detectedType,
        buildLog: result.buildLog,
        extractedBytes: result.extractedBytes,
        contentReviewId: result.contentReview?.id,
        contentReviewStatus: result.contentReview?.status,
        databaseEngine: demoDatabase?.engine || "",
        source: deploySource
      }
    });
    const deploymentEvents = completeDeploymentSteps(steps, { demoId: demo.id, userId: user.id, deploymentId: currentDeploymentId });
    await appendDeploymentEvents(deploymentEvents);

    const response = {
      ok: true,
      id: demo.id,
      slug,
      status: "published",
      name: demo.name,
      projectName: demo.name,
      publicUrl,
      linkMode: demo.linkMode,
      customDomainEligible: demo.customDomainEligible,
      deploySource,
      deploySourceLabel: demo.deploySourceLabel,
      architecture: demo.architecture,
      hosting: demo.hosting,
      hostingMode: demo.hostingMode,
      hostingModeLabel: demo.hostingModeLabel,
      runtime: demo.runtime,
      database: publicDemoDatabase(demo.database),
      runtimeEnv: publicRuntimeEnv(demo.runtimeEnv),
      runtimeConfig: demo.runtimeConfig,
      externalBackend: publicExternalBackend(demo.externalBackend),
      applicationReadiness: publicApplicationReadiness(demo.applicationReadiness),
      projectProfile: demo.projectProfile,
      projectCategory: demo.projectCategory,
      detectedType: result.detectedType,
      autoFormEnabled: Boolean(result.inspection?.forms?.autoFormEnabled),
      autoFormSubmitUrl: result.inspection?.forms?.autoFormSubmitUrl || "",
      contentReviewStatus: result.contentReview?.status || "",
      fileCount: result.fileCount,
      extractedBytes: result.extractedBytes,
      ignoredFiles: result.ignoredFiles,
      inspection: result.inspection,
      contentReview: publicContentReview(result.contentReview),
      buildLog: result.buildLog,
      deploymentEvents,
      version: demo.version,
      quota: calculateQuota(user, demos),
      limits: summarizeResponseLimits(calculateQuota(user, demos))
    };
    if (actor === "agent") {
      response.message = "发布成功！已生成可访问链接。";
      response.nextStep = "已发布并生成访问地址，用户打开首页后可以检查页面是否符合预期。";
    }
    await writeTrialEvent({
      eventType: "deploy_success",
      userId: user.id,
      userEmail: user.email,
      source: deploySource,
      path: actor === "agent" ? "/api/agent/deploy" : "/api/deploy",
      ip: clientIp,
      metadata: {
        demoId: demo.id,
        demoSlug: slug,
        actor,
        deploySource,
        detectedType: result.detectedType,
        databaseEngine: demoDatabase?.engine || ""
      }
    });
    return response;
  } catch (error) {
    if (!error.deploymentEvents) {
      await appendDeploymentEvents(failedDeploymentSteps(error, steps, { userId: user.id, deploymentId: currentDeploymentId }));
    }
    if (slug) {
      await stopRuntime(slug);
    }
    if (createdDatabase) {
      await deleteDemoDatabase(createdDatabase, hostingConfig()).catch(() => null);
    }
    if (targetDir) {
      await fs.rm(targetDir, { recursive: true, force: true });
    }
    throw error;
  } finally {
    await fs.rm(uploadedFile.path, { force: true });
  }
}

async function performUpdateDeployment({ demoId, uploadedFile, user, clientIp = "", actor = "user", deploySource = "", deploymentId = "" }) {
  if (!uploadedFile) {
    throw createHttpError("请上传 .zip、.tar.gz 或 .tgz 项目包", 400);
  }

  const currentDeploymentId = deploymentId || crypto.randomUUID();
  const stagingDir = path.join(dataDir, "update-staging", `${demoId}-${crypto.randomBytes(4).toString("hex")}`);
  const backupDir = path.join(dataDir, "update-backups", `${demoId}-${crypto.randomBytes(4).toString("hex")}`);
  const steps = createDeploymentSteps({ demoId, userId: user.id, deploymentId: currentDeploymentId, action: "update" });
  let createdDatabase = null;

  try {
    const demos = await readJson(demosFile, []);
    const demoIndex = demos.findIndex((demo) => demo.id === demoId && demo.userId === user.id);

    if (demoIndex === -1) {
      throw createHttpError("未找到该 Demo", 404);
    }

    const demo = demos[demoIndex];
    if (isExpired(demo)) {
      await expireDemoFiles(demo);
      demos[demoIndex] = {
        ...demo,
        status: "expired",
        expiredAt: new Date().toISOString()
      };
      await writeJson(demosFile, demos);
      throw createHttpError("已归档 Demo 不能更新，请重新上传部署", 409);
    }

    if (demo.status !== "published") {
      throw createHttpError("只有已发布的 Demo 才可以更新，请先发布新的或恢复已归档的 Demo", 409);
    }

    const rate = await checkDeployRateLimit(user, clientIp);
    if (!rate.allowed) {
      throw createHttpError("上传过于频繁，请稍后再试", 429);
    }

    const quota = calculateQuota(user, demos);
    if (quota.monthlyDeploys.used >= quota.monthlyDeploys.limit) {
      throw createHttpError("本月发布/更新次数已达上限，请升级套餐后再试", 403);
    }

    await fs.mkdir(stagingDir, { recursive: true });
    const preInspection = await inspectProjectArchive(uploadedFile.path, uploadedFile.originalname);
    const canPublishRuntime = canPublishNodeRuntimeInspection(preInspection);
    if ((isNodeRuntimeInspection(preInspection) && !canPublishRuntime) || (!preInspection.canPublish && !canPublishRuntime)) {
      const persistedReview = await persistPreflightContentReview({
        inspection: preInspection,
        user,
        fileName: uploadedFile.originalname,
        projectName: demo.name || demo.slug,
        actor,
        action: "update",
        deploymentId: currentDeploymentId,
        demo
      });
      if (persistedReview) {
        preInspection.contentReview = publicContentReview(persistedReview);
      }
      markDeploymentStep(steps, "inspect", "failed", preInspection.summary || "项目检查未通过", {
        detectedType: preInspection.analysis.detectedType,
        contentReviewStatus: preInspection.contentReview?.status
      });
      const error = createProjectError(preInspection, nodeRuntimeBlockReason(preInspection) || preInspection.presentation.issues?.[0] || preInspection.summary || "该项目暂时无法发布，请检查项目结构后重试。查看检查报告了解更多细节。");
      error.statusCode = 400;
      error.contentReview = preInspection.contentReview || null;
      error.deploymentEvents = completeDeploymentSteps(steps, { demoId, userId: user.id, deploymentId: currentDeploymentId });
      await appendDeploymentEvents(failedDeploymentSteps(error, steps, { demoId, userId: user.id, deploymentId: currentDeploymentId }));
      throw error;
    }

    const previousDatabase = demo.database || null;
    const result = canPublishRuntime
      ? await extractRuntimeDemo(uploadedFile.path, stagingDir, {
          fileName: uploadedFile.originalname,
          steps,
          actor,
          action: "update",
          user,
          demo,
          projectName: demo.name || demo.slug,
          deploymentId: currentDeploymentId,
          slug: demo.slug,
          startRuntime: false
        })
      : await extractStaticDemo(uploadedFile.path, stagingDir, {
          fileName: uploadedFile.originalname,
          steps,
          actor,
          action: "update",
          user,
          demo,
          projectName: demo.name || demo.slug,
          deploymentId: currentDeploymentId
        });
    if (result.contentReview?.status !== "passed") {
      throw createContentReviewError(result.contentReview);
    }
    const architecture = attachArchitectureToInspection(result.inspection);
    result.inspection = architecture.inspection;
    const liveDir = path.join(demoRoot, demo.slug);

    if (await exists(liveDir)) {
      await fs.mkdir(path.dirname(backupDir), { recursive: true });
      await copyDemoArchive(liveDir, backupDir);
    }

    await stopRuntime(demo.slug);
    await fs.rm(liveDir, { recursive: true, force: true });
    try {
      await fs.cp(stagingDir, liveDir, { recursive: true });
    } catch (swapError) {
      await fs.rm(liveDir, { recursive: true, force: true });
      if (await exists(backupDir)) {
        await fs.cp(backupDir, liveDir, { recursive: true });
      }
      throw swapError;
    }

    let runtime = null;
    let nextDatabase = canPublishRuntime ? previousDatabase : null;
    try {
      if (canPublishRuntime && needsMysqlDatabase(result.inspection) && !nextDatabase?.enabled) {
        markDeploymentStep(steps, "database", "pending", "正在创建 MySQL 数据库");
        nextDatabase = await createDemoDatabase({
          slug: demo.slug,
          demoId: demo.id,
          inspection: result.inspection,
          config: hostingConfig()
        });
        nextDatabase = await initializeDemoDatabase(nextDatabase, {
          projectDir: liveDir,
          config: hostingConfig()
        });
        createdDatabase = nextDatabase;
        if (nextDatabase.schema?.status === "failed") {
          const error = createHttpError(`MySQL 数据库已创建，但初始化脚本执行失败。${nextDatabase.schema.error}`, 400);
          error.inspection = result.inspection;
          error.database = nextDatabase;
          error.databaseError = nextDatabase.schema.error;
          throw error;
        }
        markDeploymentStep(steps, "database", "success", nextDatabase.schema?.status === "ready" ? "MySQL 数据库已创建并完成初始化" : "MySQL 数据库已创建", {
          engine: nextDatabase.engine,
          databaseName: nextDatabase.databaseName,
          schemaStatus: nextDatabase.schema?.status || "skipped"
        });
      } else if (canPublishRuntime && needsMysqlDatabase(result.inspection)) {
        nextDatabase = await initializeDemoDatabase(nextDatabase, {
          projectDir: liveDir,
          config: hostingConfig()
        });
        if (nextDatabase.schema?.status === "failed") {
          const error = createHttpError(`MySQL 数据库初始化失败。${nextDatabase.schema.error}`, 400);
          error.inspection = result.inspection;
          error.database = nextDatabase;
          error.databaseError = nextDatabase.schema.error;
          throw error;
        }
        markDeploymentStep(steps, "database", "success", "继续使用已有的 MySQL 数据库", {
          engine: nextDatabase.engine,
          databaseName: nextDatabase.databaseName,
          schemaStatus: nextDatabase.schema?.status || "skipped"
        });
      } else {
        markDeploymentStep(steps, "database", "skipped", "该项目不需要数据库");
      }
      if (canPublishRuntime) {
        markDeploymentStep(steps, "publish", "pending", "正在安装 Node.js 运行时依赖，首次安装大约需要 1-3 分钟");
      }
      if (canPublishRuntime) {
        const runtimeConfigStatus = createRuntimeConfigStatus(result.inspection, demo.runtimeEnv, nextDatabase);
        runtime = runtimeConfigStatus.missing.length
          ? createConfigRequiredRuntime(null, runtimeConfigStatus, createFailureDiagnosis({
              message: runtimeConfigStatus.nextAction,
              category: "runtime_env",
              inspection: result.inspection,
              database: nextDatabase
            }))
          : await startNodeRuntime({
              slug: demo.slug,
              projectDir: liveDir,
              inspection: result.inspection,
              config: hostingConfig(),
              env: runtimeEnvForDemo({ ...demo, database: nextDatabase, inspection: result.inspection })
            });
        if (runtimeConfigStatus.missing.length) {
          const diagnosis = runtime.failureDiagnosis || createFailureDiagnosis({
            message: runtimeConfigStatus.nextAction,
            category: "runtime_env",
            inspection: result.inspection,
            runtime,
            database: nextDatabase
          });
          result.inspection = attachDiagnosisToInspection(result.inspection, diagnosis);
          markDeploymentStep(steps, "publish", "skipped", "项目已更新，但需要补充环境变量配置后才能发布", { missingEnv: runtimeConfigStatus.missing });
        }
      }
    } catch (runtimeError) {
      await fs.rm(liveDir, { recursive: true, force: true });
      if (await exists(backupDir)) {
        await fs.cp(backupDir, liveDir, { recursive: true });
      }
      if (demo.hostingMode === "node_runtime" && await exists(liveDir)) {
        try {
          await startNodeRuntime({
            slug: demo.slug,
            projectDir: liveDir,
            inspection: demo.inspection || {},
            config: hostingConfig(),
            env: runtimeEnvForDemo({ ...demo, database: previousDatabase })
          });
        } catch {
          // Original runtime may remain offline, but files are restored.
        }
      }
      throw runtimeError;
    }
    if (runtime) {
      markDeploymentStep(steps, "publish", "success", "运行时就绪，项目页面和接口已可访问", { runtimeStatus: runtime.status, driver: runtime.driver });
      markDeploymentStep(steps, "success", "发布成功！已返回访问地址。");
      architecture.projectArchitecture.hosting.runtime = {
        ...(architecture.projectArchitecture.hosting.runtime || {}),
        ...runtime
      };
      architecture.inspection.runtime = {
        ...(architecture.inspection.runtime || {}),
        ...runtime
      };
      architecture.inspection.hosting = architecture.projectArchitecture.hosting;
      architecture.inspection.projectArchitecture = architecture.projectArchitecture;
      result.inspection = architecture.inspection;
    }

    const now = new Date().toISOString();
    const updatedDemo = {
      ...demo,
      status: "published",
      detectedType: result.detectedType,
      architecture: architecture.projectArchitecture,
      hosting: architecture.projectArchitecture.hosting,
      hostingMode: architecture.projectArchitecture.projectKind,
      hostingModeLabel: architecture.projectArchitecture.projectKindLabel,
      runtime: architecture.projectArchitecture.hosting.runtime,
      database: nextDatabase,
      runtimeConfig: createRuntimeConfigStatus(result.inspection, demo.runtimeEnv, nextDatabase),
      externalBackend: createExternalBackendConfigStatus(result.inspection, demo.runtimeEnv, demo.externalBackend),
      projectProfile: result.inspection.analysis.projectProfile || null,
      projectCategory: result.inspection.analysis.projectCategory || result.inspection.analysis.projectProfile?.label || "",
      fileCount: result.fileCount,
      extractedBytes: result.extractedBytes,
      ignoredFiles: result.ignoredFiles,
      inspection: result.inspection,
      contentReview: publicContentReview(result.contentReview),
      lastSourceFileName: uploadedFile.originalname,
      updatedAt: now,
      version: Number(demo.version || 1) + 1,
      expiresAt: new Date(Date.now() + quota.plan.demoRetentionDays * 24 * 60 * 60 * 1000).toISOString(),
      deployEvents: [
        ...getDeployEvents(demo),
        { type: "update", at: now, status: "success" }
      ]
    };
    updatedDemo.inspection = {
      ...updatedDemo.inspection,
      externalBackend: updatedDemo.externalBackend
    };
    const autoForm = updatedDemo.hostingMode === "node_runtime"
      ? { reason: "Node.js 后端项目暂不支持自动托管页面" }
      : await ensureAutoHostedForm({
          user,
          demo: updatedDemo,
          inspection: result.inspection,
          targetDir: liveDir,
          now
        });
    if (autoForm?.form) {
      updatedDemo.autoFormId = autoForm.form.id;
      updatedDemo.inspection = {
        ...updatedDemo.inspection,
        forms: {
          ...(updatedDemo.inspection.forms || {}),
          autoFormEnabled: true,
          autoFormId: autoForm.form.id,
          autoFormSubmitUrl: publicForm(autoForm.form, { publicBaseUrl }).submitUrl
        }
      };
      result.inspection = updatedDemo.inspection;
      markDeploymentStep(steps, "form_hosting", "success", "已启用自动表单数据收集", { formId: autoForm.form.id });
    } else if (autoForm?.reason) {
      updatedDemo.inspection = {
        ...updatedDemo.inspection,
        forms: {
          ...(updatedDemo.inspection.forms || {}),
          autoFormEnabled: false,
          autoFormReason: autoForm.reason
        }
      };
      result.inspection = updatedDemo.inspection;
      markDeploymentStep(steps, "form_hosting", "skipped", autoForm.reason);
    }
    updatedDemo.externalBackend = createExternalBackendConfigStatus(updatedDemo.inspection, updatedDemo.runtimeEnv, updatedDemo.externalBackend);
    updatedDemo.inspection = {
      ...updatedDemo.inspection,
      externalBackend: updatedDemo.externalBackend
    };
    updatedDemo.applicationReadiness = createApplicationReadiness({ demo: updatedDemo, inspection: updatedDemo.inspection });
    updatedDemo.inspection = {
      ...updatedDemo.inspection,
      applicationReadiness: updatedDemo.applicationReadiness
    };
    result.inspection = updatedDemo.inspection;
    if (previousDatabase?.enabled && previousDatabase.databaseName !== nextDatabase?.databaseName) {
      await deleteDemoDatabase(previousDatabase, hostingConfig()).catch((cleanupError) => {
        logger.error({ err: cleanupError }, "Failed to cleanup old demo database");
      });
    }
    demos[demoIndex] = updatedDemo;
    await writeJson(demosFile, demos);
    await writeAuditLog({
      action: actor === "agent" ? "agent_update_demo" : "update_demo",
      actorType: actor === "agent" ? "agent" : "user",
      actorId: user.id,
      targetType: "demo",
      targetId: demo.id,
      ip: clientIp,
      metadata: {
        slug: demo.slug,
        sourceFileName: uploadedFile.originalname,
        detectedType: result.detectedType,
        buildLog: result.buildLog,
        extractedBytes: result.extractedBytes,
        contentReviewId: result.contentReview?.id,
        contentReviewStatus: result.contentReview?.status,
        databaseEngine: nextDatabase?.engine || "",
        source: deploySource || (actor === "agent" ? "agent_api" : "web")
      }
    });
    const deploymentEvents = completeDeploymentSteps(steps, { demoId: demo.id, userId: user.id, deploymentId: currentDeploymentId });
    await appendDeploymentEvents(deploymentEvents);

    return {
      id: demos[demoIndex].id,
      slug: demos[demoIndex].slug,
      name: demos[demoIndex].name,
      projectName: demos[demoIndex].name,
      status: demos[demoIndex].status,
      publicUrl: demos[demoIndex].publicUrl,
      linkMode: demos[demoIndex].linkMode || "readable",
      customDomainEligible: Boolean(demos[demoIndex].customDomainEligible),
      deploySource: deploySource || demos[demoIndex].deploySource || "web",
      deploySourceLabel: deploySourceLabel(deploySource || demos[demoIndex].deploySource || "web"),
      architecture: architecture.projectArchitecture,
      hosting: architecture.projectArchitecture.hosting,
      hostingMode: architecture.projectArchitecture.projectKind,
      hostingModeLabel: architecture.projectArchitecture.projectKindLabel,
      runtime: architecture.projectArchitecture.hosting.runtime,
      database: publicDemoDatabase(demos[demoIndex].database),
      runtimeEnv: publicRuntimeEnv(demos[demoIndex].runtimeEnv),
      runtimeConfig: demos[demoIndex].runtimeConfig,
      externalBackend: publicExternalBackend(demos[demoIndex].externalBackend),
      applicationReadiness: publicApplicationReadiness(demos[demoIndex].applicationReadiness),
      projectProfile: result.inspection.analysis.projectProfile || null,
      projectCategory: result.inspection.analysis.projectCategory || result.inspection.analysis.projectProfile?.label || "",
      detectedType: demos[demoIndex].detectedType,
      autoFormEnabled: Boolean(result.inspection?.forms?.autoFormEnabled),
      autoFormSubmitUrl: result.inspection?.forms?.autoFormSubmitUrl || "",
      contentReviewStatus: result.contentReview?.status || "",
      fileCount: demos[demoIndex].fileCount,
      extractedBytes: demos[demoIndex].extractedBytes,
      ignoredFiles: demos[demoIndex].ignoredFiles,
      inspection: result.inspection,
      contentReview: publicContentReview(result.contentReview),
      buildLog: result.buildLog,
      deploymentEvents,
      version: demos[demoIndex].version,
      quota: calculateQuota(user, demos),
      limits: summarizeResponseLimits(calculateQuota(user, demos))
    };
  } catch (error) {
    if (!error.deploymentEvents) {
      await appendDeploymentEvents(failedDeploymentSteps(error, steps, { demoId, userId: user.id, deploymentId: currentDeploymentId }));
    }
    if (createdDatabase) {
      await deleteDemoDatabase(createdDatabase, hostingConfig()).catch(() => null);
    }
    throw error;
  } finally {
    await fs.rm(uploadedFile.path, { force: true });
    await fs.rm(stagingDir, { recursive: true, force: true });
    await fs.rm(backupDir, { recursive: true, force: true });
  }
}

  return {
    performCreateDeployment,
    performUpdateDeployment,
    inspectProjectArchive,
    hostingConfig,
    hostingCapabilities,
    attachArchitectureToInspection,
    isNodeRuntimeInspection,
    createConfigRequiredRuntime,
    attachRuntimeToInspection,
    canPublishNodeRuntimeInspection,
    nodeRuntimeBlockReason,
    extractStaticDemo,
    extractRuntimeDemo,
    inferProjectDisplayName,
    createAvailableSlug,
    setFileHandlers,
    setBuildFunctions,
  };
}
