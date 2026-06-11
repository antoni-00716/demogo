export function createApplicationReadiness(input = {}) {
  const demo = input.demo || {};
  const inspection = input.inspection || demo.inspection || {};
  const profile = demo.projectProfile || inspection.analysis?.projectProfile || {};
  const assessment = profile.assessment || inspection.analysis?.projectAssessment || {};
  const runtime = demo.runtime || inspection.runtime || demo.hosting?.runtime || inspection.hosting?.runtime || null;
  const database = demo.database || null;
  const externalBackend = demo.externalBackend || inspection.externalBackend || null;
  const runtimeConfig = demo.runtimeConfig || runtime?.config || null;
  const failureDiagnosis = demo.failureDiagnosis || runtime?.failureDiagnosis || inspection.failureDiagnosis || null;

  const context = inferApplicationContext({ demo, inspection, profile, assessment, runtime, database, externalBackend });
  const checklist = [
    createFrontendCheck({ demo, inspection, profile, assessment }),
    createBackendCheck({ inspection, profile, runtime }),
    createRuntimeCheck({ demo, inspection, runtime, runtimeConfig }),
    createDatabaseCheck({ inspection, profile, database }),
    createExternalBackendCheck({ inspection, profile, externalBackend }),
    createConfigCheck({ runtimeConfig, externalBackend }),
    createVersioningCheck({ demo }),
    createDiagnosisCheck({ failureDiagnosis })
  ].filter(Boolean);

  const blocking = checklist.filter((item) => item.status === "blocked");
  const missing = checklist.filter((item) => item.status === "missing");
  const warning = checklist.filter((item) => item.status === "warning");
  const ready = checklist.filter((item) => item.status === "ready" || item.status === "not_required");
  const score = Math.round((ready.length / checklist.length) * 100);
  const status = blocking.length ? "blocked" : missing.length ? "needs_action" : warning.length ? "warning" : "ready";
  const missingActions = createMissingActions(checklist);

  return {
    version: "1.0",
    kind: context.kind,
    label: context.label,
    status,
    statusLabel: readinessStatusLabel(status),
    score,
    summary: createReadinessSummary({ context, status, blocking, missing, warning }),
    checklist,
    missingActions,
    deliveryReport: createTrialDeliveryReport({
      demo,
      context,
      checklist,
      status,
      score,
      missingActions,
      runtime,
      database,
      externalBackend,
      failureDiagnosis
    }),
    aiPrompt: createReadinessAiPrompt({ context, checklist, status })
  };
}

export function publicApplicationReadiness(value = null) {
  if (!value || typeof value !== "object") return null;
  return {
    version: value.version || "1.0",
    kind: value.kind || "",
    label: value.label || "",
    status: value.status || "",
    statusLabel: value.statusLabel || readinessStatusLabel(value.status),
    score: Number(value.score || 0),
    summary: value.summary || "",
    checklist: Array.isArray(value.checklist) ? value.checklist.map(publicReadinessCheck) : [],
    missingActions: Array.isArray(value.missingActions) ? value.missingActions : [],
    deliveryReport: publicDeliveryReport(value.deliveryReport),
    aiPrompt: value.aiPrompt || ""
  };
}

function inferApplicationContext({ demo, inspection, profile, assessment, runtime, database, externalBackend }) {
  const projectKind = assessment.projectKind || "";
  const hostingMode = demo.hostingMode || inspection.analysis?.hostingMode || "";
  const signals = assessment.signals || {};
  const hasFrontend = Boolean(
    ["static", "frontend", "full_stack", "ssr_app"].includes(projectKind) ||
    signals.hasStaticEntry ||
    profile.type === "frontend_build" ||
    profile.type === "fullstack_framework" ||
    profile.frontendFrameworks?.length ||
    inspection.entries?.entryFile ||
    inspection.analysis?.detectedType === "single-html"
  );
  const hasBackend = Boolean(hostingMode === "node_runtime" || inspection.analysis?.hasBackend || profile.backendFrameworks?.length || runtime?.engine);
  const hasMysql = Boolean(database?.enabled || runtime?.requiresMysql || profile.databases?.some((item) => item.code === "mysql"));
  const hasSupabase = Boolean(externalBackend?.provider === "supabase" || profile.databases?.some((item) => item.code === "supabase"));

  if (hasFrontend && hasBackend && hasMysql) {
    return {
      kind: "frontend_node_mysql",
      label: "前端 + Node.js + MySQL 试用闭环"
    };
  }
  if (hasFrontend && hasSupabase) {
    return {
      kind: "frontend_supabase",
      label: "前端 + Supabase 试用闭环"
    };
  }
  if (hasBackend && hasMysql) {
    return {
      kind: "node_mysql",
      label: "Node.js + MySQL 试用闭环"
    };
  }
  if (hasBackend) {
    return {
      kind: "node_runtime",
      label: "Node.js 单服务试用闭环"
    };
  }
  return {
    kind: hasFrontend ? "web_trial" : "unknown",
    label: hasFrontend ? "网页试用闭环" : "项目试用闭环"
  };
}

function createFrontendCheck({ demo, inspection, profile, assessment }) {
  const projectKind = assessment.projectKind || "";
  const signals = assessment.signals || {};
  const hasFrontend = Boolean(
    demo.publicUrl ||
    signals.hasStaticEntry ||
    inspection.entries?.entryFile ||
    inspection.analysis?.detectedType === "single-html" ||
    ["static", "frontend", "full_stack", "ssr_app"].includes(projectKind) ||
    profile.frontendFrameworks?.length
  );
  return {
    code: "frontend",
    label: "用户可打开的页面",
    status: hasFrontend ? "ready" : "missing",
    statusLabel: hasFrontend ? "已具备" : "缺少",
    detail: hasFrontend
      ? "项目已具备可生成或可访问的页面入口。"
      : "需要提供 index.html、构建产物，或可运行的页面入口。",
    action: hasFrontend ? "" : "让 AI 补齐前端入口或生成 dist/build/out 产物。"
  };
}

function createBackendCheck({ inspection, profile, runtime }) {
  const hasBackend = Boolean(inspection.analysis?.hasBackend || profile.backendFrameworks?.length || runtime?.engine);
  if (!hasBackend) {
    return {
      code: "backend",
      label: "后端接口",
      status: "not_required",
      statusLabel: "无需后端",
      detail: "该项目没有识别到必须运行的后端服务。",
      action: ""
    };
  }
  const hasStart = Boolean(runtime?.startCommand || runtime?.selectedStartCommand || inspection.runtime?.startCommand);
  return {
    code: "backend",
    label: "后端接口",
    status: hasStart ? "ready" : "missing",
    statusLabel: hasStart ? "已识别" : "缺少启动命令",
    detail: hasStart
      ? `已识别 Node.js 单服务启动方式：${runtime?.startCommand || runtime?.selectedStartCommand || inspection.runtime?.startCommand}。`
      : "后端项目必须有 package.json start 命令。",
    action: hasStart ? "" : "让 AI 在 package.json 中补齐 start 命令，并监听 process.env.PORT。"
  };
}

function createRuntimeCheck({ demo, inspection, runtime, runtimeConfig }) {
  const needsRuntime = Boolean(demo.hostingMode === "node_runtime" || inspection.analysis?.hostingMode === "node_runtime" || inspection.analysis?.hasBackend || inspection.analysis?.hasSsr);
  if (!needsRuntime) {
    return {
      code: "runtime",
      label: "运行环境",
      status: "not_required",
      statusLabel: "无需运行环境",
      detail: "静态页面或构建产物可以直接托管。",
      action: ""
    };
  }
  if (runtimeConfig?.missing?.length) {
    return {
      code: "runtime",
      label: "运行环境",
      status: "missing",
      statusLabel: "等待配置",
      detail: `缺少运行配置：${runtimeConfig.missing.join("、")}。`,
      action: "在项目详情页补齐运行配置后重启运行环境。"
    };
  }
  const status = String(runtime?.status || "").toLowerCase();
  const lifecycle = String(runtime?.lifecycle?.stage || "").toLowerCase();
  const running = status === "running" || lifecycle === "running";
  const ready = running || ["ready", "config_required"].includes(status) || ["ready_to_start"].includes(lifecycle);
  return {
    code: "runtime",
    label: "运行环境",
    status: ready ? "ready" : "blocked",
    statusLabel: running ? "运行中" : ready ? "可启动" : "未就绪",
    detail: ready
      ? (running ? "Node.js 运行环境已经启动。" : "项目已经具备进入运行环境的条件。")
      : "运行环境未就绪或启动失败。",
    action: ready ? "" : "查看运行日志和失败诊断，让 AI 修复依赖安装、启动命令或 PORT 监听问题。"
  };
}

function createDatabaseCheck({ inspection, profile, database }) {
  const databaseCodes = (profile.databases || []).map((item) => item.code);
  const needsMysql = Boolean(inspection.runtime?.requiresMysql || databaseCodes.includes("mysql"));
  const usesSupabase = databaseCodes.includes("supabase");
  const usesUnsupported = databaseCodes.some((code) => ["postgres", "mongodb", "redis"].includes(code)) && !usesSupabase;

  if (usesUnsupported) {
    return {
      code: "database",
      label: "试用数据库",
      status: "blocked",
      statusLabel: "暂不支持",
      detail: "当前只支持 MySQL 试用数据库，Postgres/MongoDB/Redis 仍不自动托管。",
      action: "改用 DemoGo MySQL 试用库，或使用 Supabase 外部后端。"
    };
  }
  if (!needsMysql) {
    return {
      code: "database",
      label: "试用数据库",
      status: "not_required",
      statusLabel: usesSupabase ? "使用外部后端" : "无需数据库",
      detail: usesSupabase ? "该项目通过 Supabase 连接外部后端。" : "未识别到必须托管的 MySQL 数据库。",
      action: ""
    };
  }
  if (!database?.enabled) {
    return {
      code: "database",
      label: "试用数据库",
      status: "missing",
      statusLabel: "未分配",
      detail: "项目需要 MySQL，但尚未分配试用数据库。",
      action: "确认平台 MySQL 试用数据库已开启，然后重新发布。"
    };
  }
  const schemaStatus = database.schema?.status || "skipped";
  return {
    code: "database",
    label: "试用数据库",
    status: database.status === "ready" && schemaStatus !== "failed" ? "ready" : "blocked",
    statusLabel: database.statusLabel || "已分配",
    detail: schemaStatus === "ready"
      ? "MySQL 试用数据库已创建，并已执行 schema.sql。"
      : schemaStatus === "skipped"
        ? "MySQL 试用数据库已创建，未发现 schema.sql。"
        : `MySQL 初始化失败：${database.schema?.error || "未知错误"}`,
    action: schemaStatus === "failed" ? "修复 schema.sql 后重置数据库或更新版本。" : ""
  };
}

function createExternalBackendCheck({ inspection, profile, externalBackend }) {
  const usesSupabase = Boolean(externalBackend?.provider === "supabase" || profile.databases?.some((item) => item.code === "supabase"));
  if (!usesSupabase) return null;
  const status = externalBackend?.status || "missing";
  const missing = externalBackend?.missingEnv || [];
  return {
    code: "external_backend",
    label: "Supabase 外部后端",
    status: status === "ready" ? "ready" : status === "failed" ? "warning" : "missing",
    statusLabel: externalBackend?.statusLabel || "缺少 Supabase 配置",
    detail: status === "ready"
      ? "Supabase 基础连接检测已通过。"
      : missing.length
        ? `缺少配置：${missing.join("、")}。`
        : externalBackend?.connection?.message || "Supabase 配置还需要确认。",
    action: status === "ready" ? "" : "在项目详情页填写 Supabase URL 和 anon key，不要填写 service_role。"
  };
}

function createConfigCheck({ runtimeConfig, externalBackend }) {
  const missing = [
    ...(runtimeConfig?.missing || []),
    ...(externalBackend?.missingEnv || [])
  ].filter(Boolean);
  if (!missing.length) {
    return {
      code: "configuration",
      label: "运行配置",
      status: "ready",
      statusLabel: "已满足",
      detail: "当前没有待用户补齐的必要配置。",
      action: ""
    };
  }
  return {
    code: "configuration",
    label: "运行配置",
    status: "missing",
    statusLabel: "待补齐",
    detail: `还需要补齐：${Array.from(new Set(missing)).join("、")}。`,
    action: "在项目详情页保存配置；配置保存后可重启运行环境或更新版本。"
  };
}

function createVersioningCheck({ demo }) {
  return {
    code: "versioning",
    label: "版本更新",
    status: demo.id ? "ready" : "missing",
    statusLabel: demo.version && demo.version > 1 ? `已更新到 V${demo.version}` : "可保持原链接更新",
    detail: demo.id
      ? `当前版本 V${demo.version || 1}。后续可更新项目文件，试用链接保持不变。`
      : "项目发布后才能使用版本更新。",
    action: ""
  };
}

function createDiagnosisCheck({ failureDiagnosis }) {
  if (!failureDiagnosis) {
    return {
      code: "diagnosis",
      label: "失败诊断",
      status: "ready",
      statusLabel: "无阻塞",
      detail: "当前没有失败诊断记录。",
      action: ""
    };
  }
  return {
    code: "diagnosis",
    label: "失败诊断",
    status: failureDiagnosis.severity === "blocked" ? "blocked" : "warning",
    statusLabel: failureDiagnosis.title || "需要处理",
    detail: failureDiagnosis.summary || "项目存在需要处理的问题。",
    action: failureDiagnosis.aiPrompt ? "复制给 AI 怎么改，并按提示修复后更新版本。" : "按失败诊断处理后重试。"
  };
}

function createMissingActions(checklist) {
  return checklist
    .filter((item) => ["missing", "blocked", "warning"].includes(item.status) && item.action)
    .map((item) => item.action)
    .filter((value, index, list) => list.indexOf(value) === index);
}

function createReadinessSummary({ context, status, blocking, missing, warning }) {
  if (status === "ready") return `${context.label}已具备，可以分享给用户试用并收集反馈。`;
  if (blocking.length) return `${context.label}还有阻塞项：${blocking.map((item) => item.label).join("、")}。`;
  if (missing.length) return `${context.label}已接近可用，还需要补齐：${missing.map((item) => item.label).join("、")}。`;
  if (warning.length) return `${context.label}可以继续试用，但建议关注：${warning.map((item) => item.label).join("、")}。`;
  return `${context.label}已完成基础检查。`;
}

function createTrialDeliveryReport({ demo, context, checklist, status, score, missingActions, runtime, database, externalBackend, failureDiagnosis }) {
  const blockers = checklist.filter((item) => ["missing", "blocked", "warning"].includes(item.status));
  const readyItems = checklist.filter((item) => item.status === "ready").map((item) => item.label);
  const shareable = Boolean(demo.publicUrl && status !== "blocked");
  const feedbackReady = Boolean(shareable && status === "ready");
  const verdict = status === "ready"
    ? "ready_to_share"
    : status === "warning"
      ? "share_with_attention"
      : status === "needs_action"
        ? "needs_configuration"
        : "blocked";
  const primaryAction = createPrimaryDeliveryAction({ status, blockers, missingActions, failureDiagnosis });
  const nextSteps = createDeliveryNextSteps({ status, blockers, missingActions, demo, runtime, database, externalBackend });
  return {
    verdict,
    verdictLabel: deliveryVerdictLabel(verdict),
    headline: createDeliveryHeadline({ context, status, shareable }),
    userMessage: createDeliveryUserMessage({ context, status, score, blockers }),
    shareable,
    feedbackReady,
    score,
    demoUrl: demo.publicUrl || "",
    primaryAction,
    nextSteps,
    proofPoints: createDeliveryProofPoints({ checklist, runtime, database, externalBackend }),
    risks: blockers.map((item) => `${item.label}：${item.detail}`).slice(0, 6)
  };
}

function createPrimaryDeliveryAction({ status, blockers, missingActions, failureDiagnosis }) {
  if (failureDiagnosis?.aiPrompt) return "复制失败诊断给 AI，修复后更新版本。";
  if (status === "ready") return "可以把试用链接发给用户，并开始收集反馈。";
  if (missingActions.length) return missingActions[0];
  if (blockers.length) return blockers[0].action || `先处理：${blockers[0].label}。`;
  return "检查页面、接口和表单后再分享给用户。";
}

function createDeliveryNextSteps({ status, blockers, missingActions, demo, runtime, database, externalBackend }) {
  if (status === "ready") {
    return [
      demo.publicUrl ? "打开试用链接做一次真实访问检查。" : "确认试用链接已经生成。",
      runtime?.status === "running" ? "检查关键接口是否能返回数据。" : "确认页面内容和交互符合预期。",
      database?.enabled ? "提交一次测试数据，确认数据库和接口链路正常。" : "邀请用户试用并记录反馈。"
    ];
  }
  const steps = [
    ...missingActions,
    ...blockers.map((item) => item.action).filter(Boolean)
  ];
  if (externalBackend?.provider === "supabase" && externalBackend.status !== "ready") {
    steps.unshift("先填写 Supabase URL 和 anon key，并完成连接检测。");
  }
  return Array.from(new Set(steps)).slice(0, 5);
}

function createDeliveryProofPoints({ checklist, runtime, database, externalBackend }) {
  const points = checklist
    .filter((item) => item.status === "ready")
    .map((item) => `${item.label}：${item.detail}`)
    .slice(0, 5);
  if (runtime?.statusLabel) points.push(`运行环境：${runtime.statusLabel}`);
  if (database?.schema?.statusLabel) points.push(`数据库初始化：${database.schema.statusLabel}`);
  if (externalBackend?.statusLabel) points.push(`外部后端：${externalBackend.statusLabel}`);
  return Array.from(new Set(points)).slice(0, 6);
}

function createDeliveryHeadline({ context, status, shareable }) {
  if (status === "ready") return "这个项目已经可以发给用户试用了";
  if (shareable) return "链接已生成，但建议先处理关键提醒";
  if (status === "needs_action") return "项目已接近可试用，还差几项配置";
  return `${context.label}还有阻塞项，暂不建议分享`;
}

function createDeliveryUserMessage({ context, status, score, blockers }) {
  if (status === "ready") return `${context.label}已形成可打开、可运行、可更新的试用闭环。`;
  if (blockers.length) return `当前完成度 ${score}%，主要卡在 ${blockers.map((item) => item.label).join("、")}。`;
  return `当前完成度 ${score}%，还需要补齐配置或确认外部服务后再分享。`;
}

function deliveryVerdictLabel(verdict) {
  const labels = {
    ready_to_share: "可以分享",
    share_with_attention: "可分享但需关注",
    needs_configuration: "待补齐配置",
    blocked: "暂不建议分享"
  };
  return labels[verdict] || "待检查";
}

function createReadinessAiPrompt({ context, checklist, status }) {
  const problemItems = checklist.filter((item) => ["missing", "blocked", "warning"].includes(item.status));
  const lines = [
    "请帮我把这个项目整理到可以通过 DemoGo 生成完整试用链接。",
    `DemoGo 验收类型：${context.label}。`,
    `当前状态：${readinessStatusLabel(status)}。`,
    "",
    "需要处理：",
    ...(problemItems.length
      ? problemItems.map((item) => `- ${item.label}：${item.detail}${item.action ? ` 处理建议：${item.action}` : ""}`)
      : ["- 当前没有明显阻塞，请保持现有结构。"]),
    "",
    "DemoGo 当前支持：静态页面、前端构建产物、Node.js 单服务、MySQL 试用数据库、用户自己的 Supabase。",
    "请不要依赖多服务编排、Redis、MongoDB、自动托管 Postgres、WebSocket、真实支付或生产级登录系统。"
  ];
  return lines.join("\n");
}

function publicReadinessCheck(item = {}) {
  return {
    code: item.code || "",
    label: item.label || "",
    status: item.status || "",
    statusLabel: item.statusLabel || "",
    detail: item.detail || "",
    action: item.action || ""
  };
}

function publicDeliveryReport(report = null) {
  if (!report || typeof report !== "object") return null;
  return {
    verdict: report.verdict || "",
    verdictLabel: report.verdictLabel || deliveryVerdictLabel(report.verdict),
    headline: report.headline || "",
    userMessage: report.userMessage || "",
    shareable: Boolean(report.shareable),
    feedbackReady: Boolean(report.feedbackReady),
    score: Number(report.score || 0),
    demoUrl: report.demoUrl || "",
    primaryAction: report.primaryAction || "",
    nextSteps: Array.isArray(report.nextSteps) ? report.nextSteps : [],
    proofPoints: Array.isArray(report.proofPoints) ? report.proofPoints : [],
    risks: Array.isArray(report.risks) ? report.risks : []
  };
}

function readinessStatusLabel(status) {
  const labels = {
    ready: "可试用",
    warning: "可试用但需关注",
    needs_action: "待补齐",
    blocked: "有阻塞"
  };
  return labels[status] || "待检查";
}
