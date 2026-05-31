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
  if (input.statusCode === 403 || /棰濆害|套餐|娆℃暟|鍦ㄧ嚎璇曠敤椤圭洰|quota|limit/.test(text)) return "quota";
  if (input.contentReview?.status && input.contentReview.status !== "passed") return "content";
  if (/内容|椋庨櫓|鎷︽埅|人工确认|违规|璇堥獥|璧屽崥|鑹叉儏|杩濇硶|楂樻晱/.test(text)) return "content";
  if (/schema\.sql|初始化脚本|初始化失败|sql syntax|mysql.*error|table .* doesn't exist|unknown column|foreign key/i.test(text)) return "database_init";
  if (/supabase|外部后端|anon key|apikey|rest\/v1/.test(lower)) return "external_backend";
  if (/missing_start_script|start.{0,20}(script|command|\u547d\u4ee4)|(\u7f3a\u5c11|\u8865\u9f50).{0,20}start|process\.env\.port|\bport\b|端口|listen|启动超时|启动失败|运行环境.{0,20}(启动|澶辫触|瓒呮椂)|container|docker|health|eaddrinuse|connection refused/i.test(lower)) return "runtime_start";
  if (/暂不支持|redis|mongodb|postgres|postgresql|websocket|多服务|docker compose|支付|鐧诲綍|python|java|fastapi|django|flask|remix|sveltekit|astro|\bgo\b/.test(lower)) return "unsupported";
  if (/缺少运行配置|环境变量|\.env|api key|secret|token|database_url|mysql_|supabase_url|anon_key/i.test(text)) return "runtime_env";
  if (/npm (ci|install)|依赖安装|package.*not found|could not resolve|enoent.*package|peer dep|node-gyp/i.test(text)) return "dependency_install";
  if (/npm run build|鏋勫缓|build failed|vite|webpack|next build|nuxt build|tsc|typescript|eslint/i.test(text)) return "build";
  if (/鍘嬬缉鍖厊椤圭洰鍖厊涓婁紶|zip|tar|瑙ｅ帇|不安全路径|文件过多|浣撶Н杩囧ぇ|缂哄皯.*目录信息/.test(text)) return "package";
  return "other";
}

const templates = {
  quota: {
    severity: "warning",
    title: "额度或套餐限制",
    summary: (message) => message || "项目本身可能没有问题，但当前账号额度不足。",
    userActions: [
      "????????????????? Demo ???",
      "如果还需要继续发布或更新，申请 Lite / Pro 套餐。",
      "不要反复重新上传同一个包，先处理额度问题。"
    ]
  },
  content: {
    severity: "blocked",
    title: "内容安全检鏌ユ湭閫氳繃",
    summary: (message) => message || "???????????????????????",
    userActions: [
      "??????????????????????????????????",
      "???????????????????????????????",
      "???????????????????????????????"
    ]
  },
  package: {
    severity: "warning",
    title: "项目包结构或文件问题",
    summary: (message) => message || "DemoGo 没有读到可发布或可运行的项目文件。",
    userActions: [
      "?????????????????????????????????",
      "???????? index.html?dist/build/out ?????? package.json?",
      "???? node_modules?.env???????????????"
    ]
  },
  unsupported: {
    severity: "warning",
    title: "当前运行能力暂不支持",
    summary: (message) => message || "椤圭洰渚濊禆 DemoGo 当前还没有开放的运行能力。",
    userActions: [
      "????????????????????",
      "??????????????? Node.js ?? + ???? + MySQL?",
      "?? Redis?MongoDB?PostgreSQL???????WebSocket??????????????",
    ]
  },
  runtime_env: {
    severity: "warning",
    title: "缺少运行配置",
    summary: (message) => message || "???????????????????????",
    userActions: [
      "在项目详情页填写缺少的运行配置。",
      "????? .env.example??????????????",
      "?????? .env ????????",
    ]
  },
  external_backend: {
    severity: "warning",
    title: "外部后端连接问题",
    summary: (message) => message || "??????????? Supabase??????????????",
    userActions: [
      "???????? Supabase URL ? anon key?",
      "???? service_role ??????",
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
      "? AI ??????? npm install ? npm start ?????????",
    ]
  },
  build: {
    severity: "warning",
    title: "椤圭洰鏋勫缓澶辫触",
    summary: (message) => message || "项目没有成功生成可发布产物。",
    userActions: [
      "? AI ?????? npm run build?",
      "??????? dist?build ? out ???",
      "????????????????????? Node.js ????",
    ]
  },
  runtime_start: {
    severity: "warning",
    title: "运行环境启动失败",
    summary: (message) => message || "项目文件已接收，但服务没有在试用环境中成功启动。",
    userActions: [
      "?? package.json ? start ???",
      "鏈嶅姟蹇呴』鐩戝惉 process.env.PORT，不能写死本地端口。",
      "?????????? DemoGo ??? MYSQL_* ? DATABASE_URL?",
    ]
  },
  database_init: {
    severity: "warning",
    title: "鏁版嵁搴撳垵濮嬪寲澶辫触",
    summary: (message) => message || "MySQL 试用数据库已创建，但初始化脚本执行失败。",
    userActions: [
      "?? schema.sql ??? MySQL ???",
      "确认建表顺序、字段类型和外键约束正确。",
      "修复后在项目详情页重置试用数据库。"
    ]
  },
  other: {
    severity: "warning",
    title: "鍙戝竷澶辫触",
    summary: (message) => message || "这次没有生成试用链接，需要根据提示调整后重试。",
    userActions: [
      "?????????????????????????",
      "把诊断信息复制给 AI 工具，让它按 DemoGo 要求修复。",
      "修复后重新打包并再次发布。"
    ]
  }
};

function extractEvidence({ message, inspection, runtime, database, contentReview, externalBackend, logs, databaseError }) {
  return [
    message,
    inspection?.detectedType ? `?????${inspection.detectedType}` : "",
    inspection?.hostingMode ? `托管方式：${inspection.hostingMode}` : "",
    inspection?.projectProfile?.summary ? `?????${inspection.projectProfile.summary}` : "",
    runtime?.selectedStartCommand || runtime?.startCommand ? `启动命令：${runtime.selectedStartCommand || runtime.startCommand}` : "",
    runtime?.statusLabel ? `?????${runtime.statusLabel}` : "",
    database?.schema?.statusLabel ? `???????${database.schema.statusLabel}` : "",
    contentReview?.statusLabel ? `内容检鏌ワ細${contentReview.statusLabel}` : "",
    externalBackend?.statusLabel ? `外部后端：${externalBackend.statusLabel}` : "",
    externalBackend?.connection?.message ? `?????${externalBackend.connection.message}` : "",
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
    result.unshift(`?????${Array.from(new Set(missing)).slice(0, 8).join("?")}`);
  }
  if (category === "external_backend" && externalBackend?.missingEnv?.length) {
    result.unshift(`?????${externalBackend.missingEnv.join("?")}`);
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
    profile ? `?????${profile}` : "",
    `?????${templates[category]?.title || "????"}`,
    message ? `?????${message}` : "",
    missingEnv.length ? `????????${missingEnv.join("?")}` : "",
    externalBackend?.provider === "supabase" ? "???? Supabase???? DemoGo ??? VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY?? Next.js ? NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY" : "",
    externalBackend?.connection?.message ? `?????${externalBackend.connection.message}` : "",
    databaseError ? `数据库初始化错误：${databaseError}` : "",
    logs ? `运行/构建日志摘要：\n${lastLines(logs, 12)}` : "",
    "DemoGo ?????????????? index.html ? dist/build/out?Node.js ?????????? start ?????? process.env.PORT?",
    "???? MySQL???? MYSQL_HOST?MYSQL_PORT?MYSQL_DATABASE?MYSQL_USER?MYSQL_PASSWORD ? DATABASE_URL ????????????? MySQL ??? schema.sql?",
    "???? Redis?MongoDB???????WebSocket??????????????Postgres/Supabase ?????????????? DemoGo ?????",
    userActions?.length ? `??????${userActions.join("?")}` : ""
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
