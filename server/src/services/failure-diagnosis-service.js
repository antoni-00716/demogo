export function createFailureDiagnosis(input = {}) {
  // 防御性处理：确保 input 是对象
  const safeInput = input && typeof input === "object" ? input : {};
  input = safeInput;
  const message = cleanText(input.message || input.error?.message || "发布失败，请根据提示调整后重试。");
  const inspection = input.inspection || {};
  const runtime = input.runtime || inspection.runtime || {};
  const database = input.database || {};
  const contentReview = input.contentReview || inspection.contentReview || {};
  const externalBackend = input.externalBackend || inspection.externalBackend || {};
  const logs = cleanText(input.logs || runtime.logSummary || runtime.logs || "");
  const databaseError = cleanText(input.databaseError || database.schema?.error || "");
  const category = input.category || classifyFailureCategory({
    message,
    inspection,
    runtime,
    database,
    contentReview,
    logs,
    databaseError,
    statusCode: input.statusCode
  });
  const template = templates[category] || templates.other;
  const evidence = Array.from(new Set([
    ...extractEvidence({ message, inspection, runtime, database, contentReview, externalBackend, logs, databaseError }),
    ...(input.evidence || [])
  ].map(cleanText).filter(Boolean))).slice(0, 6);
  const userActions = Array.from(new Set([
    ...(template.userActions || []),
    ...extraUserActions(category, { inspection, runtime, database, contentReview, externalBackend })
  ].map(cleanText).filter(Boolean))).slice(0, 5);
  const aiPrompt = input.aiPrompt || createAiFixPrompt({
    category,
    message,
    inspection,
    runtime,
    database,
    externalBackend,
    logs,
    databaseError,
    userActions
  });
  return {
    category,
    severity: template.severity || "warning",
    title: template.title,
    summary: template.summary(message),
    evidence,
    userActions,
    aiPrompt,
    createdAt: new Date().toISOString()
  };
}

export function classifyFailureCategory(input = {}) {
  const text = [
    input.message,
    input.logs,
    input.databaseError,
    input.inspection?.summary,
    input.inspection?.projectAssessment?.support?.nextAction,
    ...(input.inspection?.projectAssessment?.support?.missingRequirements || []),
    ...(input.inspection?.issues || []),
    ...(input.inspection?.unsupportedNotes || []),
    ...(input.inspection?.projectProfile?.unsupportedReasons || [])
  ].map(cleanText).join("\n");
  const lower = text.toLowerCase();
  if (input.statusCode === 403 || /额度|套餐|次数|在线试用项目|quota|limit/.test(text)) return "quota";
  if (input.contentReview?.status && input.contentReview.status !== "passed") return "content";
  if (/内容|风险|拦截|人工确认|违规|诈骗|赌博|色情|违法|高敏/.test(text)) return "content";
  if (/schema\.sql|初始化脚本|初始化失败|sql syntax|mysql.*error|table .* doesn't exist|unknown column|foreign key/i.test(text)) return "database_init";
  if (/supabase|外部后端|anon key|apikey|rest\/v1/.test(lower)) return "external_backend";
  if (/missing_start_script|start.{0,20}(script|command|\u547d\u4ee4)|(\u7f3a\u5c11|\u8865\u9f50).{0,20}start|process\.env\.port|\bport\b|端口|listen|启动超时|启动失败|运行环境.{0,20}(启动|失败|超时)|container|docker|health|eaddrinuse|connection refused/i.test(lower)) return "runtime_start";
  if (/暂不支持|redis|mongodb|postgres|postgresql|websocket|多服务|docker compose|支付|登录|python|java|fastapi|django|flask|remix|sveltekit|astro|\bgo\b/.test(lower)) return "unsupported";
  if (/缺少运行配置|环境变量|\.env|api key|secret|token|database_url|mysql_|supabase_url|anon_key/i.test(text)) return "runtime_env";
  if (/npm (ci|install)|依赖安装|package.*not found|could not resolve|enoent.*package|peer dep|node-gyp/i.test(text)) return "dependency_install";
  if (/npm run build|构建|build failed|vite|webpack|next build|nuxt build|tsc|typescript|eslint/i.test(text)) return "build";
  if (/压缩包|项目包|上传|zip|tar|解压|不安全路径|文件过多|体积过大|缺少.*目录信息/.test(text)) return "package";
  return "other";
}

const templates = {
  quota: {
    severity: "warning",
    title: "额度或套餐限制",
    summary: (message) => message || "项目本身可能没有问题，但当前账号额度不足。",
    userActions: [
      "先下线不常用的试用 Demo，释放在线额度。",
      "如果还需要继续发布或更新，申请 Lite / Pro 套餐。",
      "不要反复重新上传同一个包，先处理额度问题。"
    ]
  },
  content: {
    severity: "blocked",
    title: "内容安全检查未通过",
    summary: (message) => message || "项目内容包含不可发布的信息，未通过安全检查。",
    userActions: [
      "检查项目内容是否包含违规、敏感或不适宜公开展示的信息。",
      "删除或替换相关敏感内容后重新上传发布。",
      "如果确认是正常内容被误判，请联系 DemoGo 管理员复核。"
    ]
  },
  package: {
    severity: "warning",
    title: "项目包结构或文件问题",
    summary: (message) => message || "DemoGo 没有读到可发布或可运行的项目文件。",
    userActions: [
      "上传前确认项目包里包含了可发布的网页文件。",
      "确认项目包里有 index.html、dist/build/out 目录，或 package.json？",
      "排除 node_modules、.env 等不需要上传的大文件目录。"
    ]
  },
  unsupported: {
    severity: "warning",
    title: "当前运行能力暂不支持",
    summary: (message) => message || "椤圭洰渚濊禆 DemoGo 当前还没有开放的运行能力。",
    userActions: [
      "检查当前使用的技术栈 DemoGo 是否支持。",
      "DemoGo 当前仅支持：静态网页 + Node.js 单服务 + 表单收集 + MySQL。",
      "去掉 Redis、MongoDB、PostgreSQL 依赖、WebSocket 长连接或多服务编排功能。",
    ]
  },
  runtime_env: {
    severity: "warning",
    title: "缺少运行配置",
    summary: (message) => message || "项目缺少运行所需的环境变量或配置。",
    userActions: [
      "在项目详情页填写缺少的运行配置。",
      "参考 .env.example 补全缺少的环境变量。",
      "不要把 .env 文件打包上传到 DemoGo。",
    ]
  },
  external_backend: {
    severity: "warning",
    title: "外部后端连接问题",
    summary: (message) => message || "检测到 Supabase 等外部后端，需要填写连接信息才能正常访问。",
    userActions: [
      "在项目详情页填写正确的 Supabase URL 和 anon key。",
      "不要使用 service_role 高权限密钥，只用 anon key。",
      "保存后重新检测；如果前端构建依赖这些变量，请保存配置后更新版本。"
    ]
  },
  dependency_install: {
    severity: "warning",
    title: "依赖安装失败",
    summary: (message) => message || "运行环境安装项目依赖时失败。",
    userActions: [
      "确认 package.json銆乴ock 文件和依赖版本一致。",
      "删除本地专用依赖或需要系统二进制环境的依赖。",
      "让 AI 工具检查 package.json 依赖版本和 npm install / npm start 流程。",
    ]
  },
  build: {
    severity: "warning",
    title: "椤圭洰构建失败",
    summary: (message) => message || "项目没有成功生成可发布产物。",
    userActions: [
      "让 AI 工具检查和修复 npm run build 报错。",
      "确认构建产物在 dist、build 或 out 目录。",
      "如果不需要服务端运行，改为部署静态构建产物而不是 Node.js 源码。",
    ]
  },
  runtime_start: {
    severity: "warning",
    title: "运行环境启动失败",
    summary: (message) => message || "项目文件已接收，但服务没有在试用环境中成功启动。",
    userActions: [
      "检查 package.json 的 start 脚本是否配置正确",
      "服务必须监听 process.env.PORT，不能写死本地端口。",
      "如果使用数据库，需从环境变量读取 DemoGo 分配的 MYSQL_* 或 DATABASE_URL。",
    ]
  },
  database_init: {
    severity: "warning",
    title: "数据库初始化失败",
    summary: (message) => message || "MySQL 试用数据库已创建，但初始化脚本执行失败。",
    userActions: [
      "检查 schema.sql 的 MySQL 语法是否正确",
      "确认建表顺序、字段类型和外键约束正确。",
      "修复后在项目详情页重置试用数据库。"
    ]
  },
  other: {
    severity: "warning",
    title: "发布失败",
    summary: (message) => message || "这次没有生成试用链接，需要根据提示调整后重试。",
    userActions: [
      "先查看上面的问题分类和具体提示。",
      "把诊断信息复制给 AI 工具，让它按 DemoGo 要求修复。",
      "修复后重新打包并再次发布。"
    ]
  }
};

function extractEvidence({ message, inspection, runtime, database, contentReview, externalBackend, logs, databaseError }) {
  return [
    message,
    inspection?.detectedType ? `项目类型：${inspection.detectedType}` : "",
    inspection?.hostingMode ? `托管方式：${inspection.hostingMode}` : "",
    inspection?.projectProfile?.summary ? `项目概况：${inspection.projectProfile.summary}` : "",
    runtime?.selectedStartCommand || runtime?.startCommand ? `启动命令：${runtime.selectedStartCommand || runtime.startCommand}` : "",
    runtime?.statusLabel ? `运行状态：${runtime.statusLabel}` : "",
    database?.schema?.statusLabel ? `数据库状态：${database.schema.statusLabel}` : "",
    contentReview?.statusLabel ? `内容检查：${contentReview.statusLabel}` : "",
    externalBackend?.statusLabel ? `外部后端：${externalBackend.statusLabel}` : "",
    externalBackend?.connection?.message ? `外部后端：${externalBackend.connection.message}` : "",
    databaseError ? `数据库错误：${truncate(databaseError, 500)}` : "",
    logs ? `日志摘要：${truncate(lastLines(logs, 6), 900)}` : ""
  ];
}

function extraUserActions(category, { inspection, runtime, externalBackend }) {
  const result = [];
  const missing = [
    ...(inspection?.runtimeConfig?.missing || []),
    ...(runtime?.config?.missing || []),
    ...(inspection?.projectAssessment?.support?.missingRequirements || [])
  ].filter(Boolean);
  if (category === "runtime_env" && missing.length) {
    result.unshift(`请填写缺少的运行配置：${Array.from(new Set(missing)).slice(0, 8).join("、")}`);
  }
  if (category === "external_backend" && externalBackend?.missingEnv?.length) {
    result.unshift(`请填写缺少的环境变量：${externalBackend.missingEnv.join("、")}`);
  }
  if (inspection?.projectAssessment?.support?.nextAction) {
    result.push(inspection.projectAssessment.support.nextAction);
  }
  return result;
}

function createAiFixPrompt({ category, message, inspection, runtime, database, externalBackend, logs, databaseError, userActions }) {
  const profile = inspection?.projectProfile?.summary || inspection?.projectCategory || "";
  const missingEnv = Array.from(new Set([
    ...(runtime?.config?.missing || []),
    ...(inspection?.runtimeConfig?.missing || []),
    ...(inspection?.projectProfile?.environmentVariables?.required || []),
    ...(inspection?.projectAssessment?.environmentVariables?.required || [])
  ].filter(Boolean)));
  return [
    "请把这个项目改到可以在 DemoGo 试用环境运行或发布。",
    profile ? `项目概况：${profile}` : "",
    `失败原因：${templates[category]?.title || "未知"}`,
    message ? `具体信息：${message}` : "",
    missingEnv.length ? `缺少的环境变量：${missingEnv.join("、")}` : "",
    externalBackend?.provider === "supabase" ? "如果使用 Supabase，需在 DemoGo 项目详情页填写 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY；Next.js 项目则填 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY" : "",
    externalBackend?.connection?.message ? `外部后端状态：${externalBackend.connection.message}` : "",
    databaseError ? `数据库初始化错误：${databaseError}` : "",
    logs ? `运行/构建日志摘要：\n${lastLines(logs, 12)}` : "",
    "DemoGo 支持：静态网页需要 index.html 在根目录或 dist/build/out；Node.js 项目需要 package.json 中有 start 命令且服务监听 process.env.PORT。",
    "如需 MySQL 试用数据库，请从环境变量读取 MYSQL_HOST、MYSQL_PORT、MYSQL_DATABASE、MYSQL_USER、MYSQL_PASSWORD 或 DATABASE_URL，不要在代码里写死连接信息。可以放入 schema.sql 初始化脚本。",
    "去掉 Redis、MongoDB 依赖、WebSocket 长连接或多服务编排。如需 Postgres/Supabase，请在项目详情页填写外部后端连接信息，DemoGo 暂不自动托管 Postgres。",
    userActions?.length ? `建议操作：${userActions.join("、")}` : ""
  ].filter(Boolean).join("\n\n");
}

function cleanText(value) {
  return String(value || "").replace(/\r/g, "").trim();
}

function truncate(value, maxLength) {
  const text = cleanText(value);
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function lastLines(value, count) {
  return cleanText(value)
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .slice(-count)
    .join("\n");
}


export function createRuleReport(context) {
  const hasForms = context.formFields.length > 0;
  const localApis = context.apiCalls.filter((item) => item.isLocal);
  const risks = [];
  const recommendations = [];
  let projectCategory = context.projectProfile?.label || inspectionTypeLabel(context.detectedType);

  if (context.projectProfile?.summary) {
    recommendations.push(`项目类型：${context.projectProfile.summary}。`);
  }

  for (const reason of context.projectProfile?.unsupportedReasons || []) {
    if (!risks.includes(reason)) risks.push(reason);
  }

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

  if (context.hasPackageJson && !context.hasBuildScript && !context.entryFile && context.projectProfile?.type !== "node_service") {
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


export function inferProjectCategoryFromFields(fields) {
  const names = fields.map((field) => `${field.name} ${field.label}`.toLowerCase()).join(" ");
  if (names.includes("company") || names.includes("公司") || names.includes("phone") || names.includes("手机号")) return "报名/预约/留资页面";
  if (names.includes("message") || names.includes("留言")) return "留言反馈页面";
  return "包含表单的页面";
}


export function createFixPrompt(context) {
  const parts = [];
  const localApis = context.localApis || context.apiCalls?.filter((item) => item.isLocal) || [];
  if (context.projectProfile?.type === "node_service") {
    parts.push("请确认这是一个 Node.js 单服务项目：package.json 里需要有 scripts.start，服务必须监听 process.env.PORT，不要写死 3000/3001 端口；当前不要依赖 Redis、WebSocket 或多个服务同时运行。");
    if (context.runtime?.unsupportedReasons?.length) {
      parts.push(`当前检测到的阻塞点：${context.runtime.unsupportedReasons.join("；")}。请先改成无 Redis、无 WebSocket、无多服务的演示版本。`);
    } else if (context.runtime?.requiresMysql) {
      parts.push("项目可以使用 DemoGo 分配的 MySQL 试用数据库。请从环境变量读取 MYSQL_HOST、MYSQL_PORT、MYSQL_DATABASE、MYSQL_USER、MYSQL_PASSWORD 或 DATABASE_URL，不要写死数据库连接信息。");
      parts.push("第一版只提供空库，不会自动建表或执行迁移。请在应用启动时自行建表，或让演示逻辑在表不存在时自动初始化。");
    }
    if (context.runtime?.hasStartProdScript) {
      parts.push("运行器会优先使用 npm run start:prod，请确认这个命令可以在生产模式启动，并监听 process.env.PORT。");
    } else if (context.runtime?.buildBeforeStart) {
      parts.push("运行器会先执行 npm run build，再执行 npm start。请确认 build 能生成 start 需要的 dist/build 文件。");
    }
  }
  if (["mini_program_source", "desktop_app_source", "mobile_native_source"].includes(context.projectProfile?.type)) {
    parts.push("请导出一个可以在浏览器打开的 H5/Web 版本，再上传生成试用链接。当前不要上传小程序源码、桌面应用源码或 App 源码作为最终发布包。");
  }
  if (context.projectProfile?.type === "fullstack_framework") {
    parts.push("请将 Next/Nuxt/Remix 等项目导出为静态网页产物后再上传，例如生成 out/dist/build 目录；当前不要依赖 SSR 服务端运行态。");
  }
  if (localApis.length) {
    parts.push("请检查当前项目中的表单提交或数据保存逻辑。项目发布到 DemoGo 后，不会自动运行 /api/ 开头的自定义后台接口。基础报名、预约或留言表单可以由 DemoGo 自动接管；完整业务后台需要后续后端托管能力。");
  }
  if (context.hasPackageJson && !context.hasBuildScript && !context.entryFile && context.projectProfile?.type !== "node_service") {
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


export function createInspectionSummary(analysis) {
  const hasRootIndex = analysis.paths.includes("index.html");
  const hasDistIndex = analysis.paths.includes("dist/index.html");
  const hasBuildIndex = analysis.paths.includes("build/index.html");
  const hasOutIndex = analysis.paths.includes("out/index.html");
  const hasPublicIndex = analysis.paths.includes("public/index.html");
  const hasPackageJson = analysis.hasPackageJson || analysis.paths.includes("package.json");
  const hasBuildScript = Boolean(analysis.hasBuildScript);
  const hasSourceIndicators = hasSourceProjectIndicators(analysis.paths || []);
  const hasBackend = hasBackendIndicators(analysis.paths || [], analysis.packageScripts || {}) || hasNodeRuntimeDependency(analysis);
  const hasSsr = hasSsrIndicators(analysis.paths || []);
  const singleHtmlEntry = detectSingleHtmlEntry(analysis.paths || []);
  const hasBuiltEntry = hasDistIndex || hasBuildIndex || hasOutIndex || hasPublicIndex;
  const detectedType = detectInspectionType({ hasRootIndex, hasDistIndex, hasBuildIndex, hasOutIndex, hasPublicIndex, hasPackageJson, hasBuildScript, hasSourceIndicators, hasBackend, hasSsr, singleHtmlEntry });
  const projectProfile = classifyProject(analysis, { detectedType, hasBackend, hasSsr, hasPackageJson, hasBuildScript });
  const projectAssessment = projectProfile.assessment || null;
  const runtime = detectRuntimeMetadata(analysis, { hasBackend, hasSsr });
  const status = determineInspectionStatus(analysis, { hasRootIndex, hasDistIndex, hasBuildIndex, hasOutIndex, hasPublicIndex, hasPackageJson, hasBuildScript, hasBackend, hasSsr, singleHtmlEntry, detectedType, projectProfile, runtime });
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
    if (projectProfile.type === "node_service") {
      const runtime = detectRuntimeMetadata(analysis, { hasBackend, hasSsr });
      suggestions.push("已识别为 Node.js 单服务项目。当前运行器要求项目提供 start 命令，并监听 process.env.PORT。");
      if (runtime.framework) {
        suggestions.push(`识别到 ${formatRuntimeFramework(runtime.framework)} 项目。`);
      }
      if (runtime.hasStartProdScript) {
        suggestions.push("检测到 start:prod 命令，运行器会优先使用 npm run start:prod。");
      } else if (runtime.buildBeforeStart) {
        suggestions.push("检测到需要先构建再启动，运行器会先执行 npm run build，再执行 npm start。");
      }
      for (const warning of runtime.warnings || []) {
        suggestions.push(warning);
      }
      for (const reason of runtime.unsupportedReasons || []) {
        if (!issues.includes(reason)) issues.push(reason);
      }
      if (!analysis.packageScripts?.start) {
        issues.push("检测到 Node.js 项目，但缺少 start 启动命令。");
        suggestions.push("请让 AI 编程工具补充 start 命令，并确保服务监听 process.env.PORT。");
      }
    } else {
      issues.push("检测到这个项目需要服务器长期运行，当前 DemoGo 暂不支持这类项目的完整功能。");
      suggestions.push("请让 AI 编程工具导出一个纯网页演示版本，或等待后续后端托管能力。");
    }
  }

  if ((hasSsr || projectProfile.type === "fullstack_framework") && !hasOutIndex && !hasDistIndex && !hasBuildIndex && !isSingleServiceSsrProfile(projectProfile)) {
    issues.push("检测到这个项目可能需要服务端渲染，当前 DemoGo 暂不支持这类运行方式。");
    suggestions.push("如果项目可以导出静态网页，请先生成 dist/build/out 后再上传。");
  } else if ((hasSsr || projectProfile.type === "fullstack_framework") && isSingleServiceSsrProfile(projectProfile)) {
    suggestions.push("已识别为可单服务运行的完整应用项目。运行器会先构建，再按 start 命令启动，并要求监听 process.env.PORT。");
    if (!analysis.packageScripts?.start) {
      issues.push("检测到完整应用项目，但缺少 start 启动命令。");
      suggestions.push("请让 AI 编程工具补充 start 命令，并确保服务监听 process.env.PORT。");
    }
  }

  if (hasPackageJson && !hasRootIndex && !hasBuiltEntry && !hasPublicIndex && !singleHtmlEntry && projectProfile.type !== "node_service") {
    suggestions.push("已识别为 AI 生成的网页源码，DemoGo 会自动生成网页后发布。");
  }

  if (hasPackageJson && !hasBuildScript && !hasRootIndex && !hasBuiltEntry && !hasPublicIndex && !singleHtmlEntry && projectProfile.type !== "node_service") {
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
    projectAssessment,
    projectCategory: projectProfile.label,
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
    runtime,
    ruleReport: createRuleReport({
      status,
      detectedType,
      projectProfile,
      projectAssessment,
      entryFile,
      singleHtmlEntry,
      hasPackageJson,
      hasBuildScript,
      hasSourceIndicators,
      hasBackend,
      hasSsr,
      formFields,
      apiCalls,
      runtime,
      issues
    }),
    ...createUserFacingInspection({
      status,
      detectedType,
      projectProfile,
      projectAssessment,
      entryFile,
      singleHtmlEntry,
      hasPackageJson,
      hasBuildScript,
      hasBackend,
      hasSsr,
      formFields,
      apiCalls,
      runtime,
      issues
    })
  };
}


export function determineInspectionStatus(analysis, flags) {
  if (analysis.rawFileCount === 0 || analysis.blockedFiles.length > 0) return "blocked";
  if (analysis.publishableFileCount > maxExtractedFiles || analysis.publishableBytes > maxExtractedBytes) return "blocked";
  if (flags.projectProfile?.type === "node_service" && flags.runtime?.unsupportedReasons?.length) return "blocked";
  const hasOutput = flags.hasDistIndex || flags.hasBuildIndex || flags.hasOutIndex || flags.hasPublicIndex;
  if (flags.projectProfile?.type === "node_service" && !hasOutput) return "blocked";
  if (flags.hasBackend && flags.projectProfile?.type !== "node_service" && !hasOutput) return "blocked";
  if ((flags.hasSsr || flags.projectProfile?.type === "fullstack_framework") && !hasOutput) {
    if (isSingleServiceSsrProfile(flags.projectProfile) && flags.runtime?.startCommand && !flags.runtime?.unsupportedReasons?.length) return "warning";
    return "blocked";
  }
  if (flags.hasRootIndex || flags.hasDistIndex || flags.hasBuildIndex || flags.hasOutIndex || flags.hasPublicIndex || flags.singleHtmlEntry) return analysis.ignoredFiles.length ? "warning" : "pass";
  if (flags.hasPackageJson && !flags.hasBuildScript) return "blocked";
  if (flags.hasPackageJson) return "warning";
  return "blocked";
}



export function inspectionTypeLabel(type) {
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


export function inspectionSummary(status, type) {
  if (status === "blocked") return "项目暂时无法发布，请根据提示调整后重新上传。";
  if (type === "source") return "已识别为 AI 生成的网页项目，DemoGo 会自动生成网页后发布。";
  if (type === "single-html") return "已识别为单个网页文件，DemoGo 会自动作为首页发布。";
  if (status === "warning") return "项目可以发布，系统会自动忽略部分无关文件。";
  return "项目检测通过，可以继续发布。";
}


export function createUserFacingInspection(context) {
  const localApis = context.apiCalls.filter((item) => item.isLocal);
  const unsupportedNotes = [];
  const supportNotes = [];
  let userLabel = context.projectProfile?.label || inspectionTypeLabel(context.detectedType);
  let userSummary = "这个项目可以发布，别人能打开页面。";

  if (context.projectProfile?.notes?.length) {
    supportNotes.push(...context.projectProfile.notes);
  }
  if (context.projectProfile?.unsupportedReasons?.length) {
    unsupportedNotes.push(...context.projectProfile.unsupportedReasons);
  }
  if (context.projectAssessment?.support?.nextAction && context.status !== "blocked") {
    supportNotes.push(context.projectAssessment.support.nextAction);
  }

  if (context.projectProfile?.type === "node_service") {
    userLabel = "Node.js 单服务应用";
    userSummary = context.status === "blocked"
      ? "这个项目需要 Node.js 运行环境，但还缺少启动命令或运行器未满足条件。"
      : (context.runtime?.requiresMysql
          ? "这个项目可以进入 Node.js 单服务试用环境，并会获得一个隔离的 MySQL 试用数据库。"
          : "这个项目可以进入 Node.js 单服务试用环境，页面和接口会放在同一个试用链接下。");
    supportNotes.push("支持单个 Node.js 服务");
    if (context.projectProfile?.framework) {
      supportNotes.push(`${formatRuntimeFramework(context.projectProfile.framework)} 项目`);
    }
    supportNotes.push("必须监听 PORT");
    if (context.runtime?.requiresMysql) {
      supportNotes.push("支持 MySQL 试用数据库");
      supportNotes.push("数据库为空库，不自动建表");
    }
    if (context.runtime?.hasStartProdScript) supportNotes.push("优先使用 start:prod");
    if (context.runtime?.buildBeforeStart) supportNotes.push("会先构建再启动");
  } else if (context.projectAssessment?.support?.publishMode === "ssr_runtime_planned") {
    userLabel = "全栈网页应用";
    userSummary = "DemoGo 已识别出这个项目不只是静态网页，还需要服务器生成页面或处理运行逻辑。当前版本先给出诊断；如果项目能导出静态网页，可以先发布静态版本。";
    unsupportedNotes.push("需要完整应用运行能力");
  } else if (context.projectAssessment?.support?.publishMode === "full_app_planned") {
    userLabel = "完整应用项目";
    userSummary = "DemoGo 已识别出这个项目包含后端、运行配置或数据库能力。当前版本先给出诊断，完整应用发布能力会在后续增强。";
    unsupportedNotes.push("需要后端、运行配置或数据库能力");
  } else if (context.hasBackend && context.status === "blocked") {
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

  if (context.status === "blocked" && context.projectAssessment?.support?.nextAction) {
    unsupportedNotes.unshift(context.projectAssessment.support.nextAction);
  }

  return {
    userLabel,
    userSummary,
    userStatus: context.status === "blocked" ? "unsupported" : "supported",
    userStatusLabel: context.status === "blocked" ? "暂不支持" : "支持",
    supportNotes: Array.from(new Set(supportNotes.filter(Boolean))),
    unsupportedNotes: Array.from(new Set(unsupportedNotes.filter(Boolean))),
    fixPrompt: context.projectAssessment?.aiFixPrompt || createFixPrompt(context)
  };
}


