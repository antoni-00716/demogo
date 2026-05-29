export function createFailureDiagnosis(input = {}) {
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
      "先下线不再使用的试用项目，释放在线 Demo 名额。",
      "如果还需要继续发布或更新，申请 Lite / Pro 套餐。",
      "不要反复重新上传同一个包，先处理额度问题。"
    ]
  },
  content: {
    severity: "blocked",
    title: "内容安全检查未通过",
    summary: (message) => message || "发布前内容检查发现风险内容，需要调整后再发布。",
    userActions: [
      "删除诈骗、赌博、色情低俗、违法交易、恶意下载、高风险金融引导等内容。",
      "不要收集身份证号、银行卡号、验证码、密码、人脸照片等高敏信息。",
      "正常报名、预约、咨询、姓名、手机号、邮箱、公司和职位可以保留。"
    ]
  },
  package: {
    severity: "warning",
    title: "项目包结构或文件问题",
    summary: (message) => message || "DemoGo 没有读到可发布或可运行的项目文件。",
    userActions: [
      "从项目根目录重新打包，不要把桌面、下载目录或外层无关目录一起上传。",
      "确认压缩包里包含 index.html、dist/build/out 产物，或标准 package.json。",
      "不要上传 node_modules、.env、密钥文件、安装包或脚本文件。"
    ]
  },
  unsupported: {
    severity: "warning",
    title: "当前运行能力暂不支持",
    summary: (message) => message || "项目依赖 DemoGo 当前还没有开放的运行能力。",
    userActions: [
      "如果只是演示页面，先导出静态网页后发布。",
      "如果是完整应用，当前先改成单个 Node.js 服务 + 一个端口 + MySQL。",
      "移除 Redis、MongoDB、PostgreSQL、多服务编排、WebSocket、真实支付或生产级登录依赖。"
    ]
  },
  runtime_env: {
    severity: "warning",
    title: "缺少运行配置",
    summary: (message) => message || "项目需要第三方服务地址或密钥，补齐后才能启动。",
    userActions: [
      "在项目详情页填写缺少的运行配置。",
      "项目内保留 .env.example，说明每个变量应该如何填写。",
      "不要上传真实 .env 文件或明文密钥。"
    ]
  },
  external_backend: {
    severity: "warning",
    title: "外部后端连接问题",
    summary: (message) => message || "项目需要连接用户自己的 Supabase，当前配置缺失或连接未通过。",
    userActions: [
      "在项目详情页填写 Supabase URL 和 anon key。",
      "不要填写 service_role 高权限密钥。",
      "保存后重新检测；如果前端构建依赖这些变量，请保存配置后更新版本。"
    ]
  },
  dependency_install: {
    severity: "warning",
    title: "依赖安装失败",
    summary: (message) => message || "运行环境安装项目依赖时失败。",
    userActions: [
      "确认 package.json、lock 文件和依赖版本一致。",
      "删除本地专用依赖或需要系统二进制环境的依赖。",
      "让 AI 在干净环境执行 npm install 和 npm start 复现后再重新发布。"
    ]
  },
  build: {
    severity: "warning",
    title: "项目构建失败",
    summary: (message) => message || "项目没有成功生成可发布产物。",
    userActions: [
      "让 AI 先在本地修复 npm run build。",
      "确认最终能生成 dist、build 或 out 目录。",
      "如果是纯后端项目，不要走静态网页发布，改成 Node.js 单服务。"
    ]
  },
  runtime_start: {
    severity: "warning",
    title: "运行环境启动失败",
    summary: (message) => message || "项目文件已接收，但服务没有在试用环境中成功启动。",
    userActions: [
      "确认 package.json 有 start 命令。",
      "服务必须监听 process.env.PORT，不能写死本地端口。",
      "如果需要数据库，使用 DemoGo 注入的 MYSQL_* 或 DATABASE_URL。"
    ]
  },
  database_init: {
    severity: "warning",
    title: "数据库初始化失败",
    summary: (message) => message || "MySQL 试用数据库已创建，但初始化脚本执行失败。",
    userActions: [
      "检查 schema.sql 是否是 MySQL 语法。",
      "确认建表顺序、字段类型和外键约束正确。",
      "修复后在项目详情页重置试用数据库。"
    ]
  },
  other: {
    severity: "warning",
    title: "发布失败",
    summary: (message) => message || "这次没有生成试用链接，需要根据提示调整后重试。",
    userActions: [
      "先按页面提示检查项目结构、运行配置和内容安全结果。",
      "把诊断信息复制给 AI 工具，让它按 DemoGo 要求修复。",
      "修复后重新打包并再次发布。"
    ]
  }
};

function extractEvidence({ message, inspection, runtime, database, contentReview, externalBackend, logs, databaseError }) {
  return [
    message,
    inspection?.detectedType ? `识别类型：${inspection.detectedType}` : "",
    inspection?.hostingMode ? `托管方式：${inspection.hostingMode}` : "",
    inspection?.projectProfile?.summary ? `项目类型：${inspection.projectProfile.summary}` : "",
    runtime?.selectedStartCommand || runtime?.startCommand ? `启动命令：${runtime.selectedStartCommand || runtime.startCommand}` : "",
    runtime?.statusLabel ? `运行状态：${runtime.statusLabel}` : "",
    database?.schema?.statusLabel ? `数据库初始化：${database.schema.statusLabel}` : "",
    contentReview?.statusLabel ? `内容检查：${contentReview.statusLabel}` : "",
    externalBackend?.statusLabel ? `外部后端：${externalBackend.statusLabel}` : "",
    externalBackend?.connection?.message ? `连接检测：${externalBackend.connection.message}` : "",
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
    result.unshift(`优先补齐：${Array.from(new Set(missing)).slice(0, 8).join("、")}`);
  }
  if (category === "external_backend" && externalBackend?.missingEnv?.length) {
    result.unshift(`优先补齐：${externalBackend.missingEnv.join("、")}`);
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
    profile ? `项目识别：${profile}` : "",
    `失败类型：${templates[category]?.title || "发布失败"}`,
    message ? `失败信息：${message}` : "",
    missingEnv.length ? `需要的运行配置：${missingEnv.join("、")}` : "",
    externalBackend?.provider === "supabase" ? "项目使用 Supabase：请读取 DemoGo 注入的 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY，或 Next.js 的 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY，服务端可读取 SUPABASE_URL / SUPABASE_ANON_KEY。不要在前端使用 service_role。" : "",
    externalBackend?.connection?.message ? `Supabase 连接检测：${externalBackend.connection.message}` : "",
    databaseError ? `数据库初始化错误：${databaseError}` : "",
    logs ? `运行/构建日志摘要：\n${lastLines(logs, 12)}` : "",
    "DemoGo 当前要求：静态项目需要能生成 index.html 或 dist/build/out；Node.js 项目必须是单服务，有 start 命令，并监听 process.env.PORT。",
    "如果使用 MySQL，请通过 MYSQL_HOST、MYSQL_PORT、MYSQL_DATABASE、MYSQL_USER、MYSQL_PASSWORD 或 DATABASE_URL 读取连接；如需建表，请提供 MySQL 语法的 schema.sql。",
    "不要依赖 Redis、MongoDB、多服务编排、WebSocket、真实支付或生产级登录系统。Postgres/Supabase 请作为外部后端连接，不要要求 DemoGo 自动托管。",
    userActions?.length ? `请优先处理：${userActions.join("；")}` : ""
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
