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
