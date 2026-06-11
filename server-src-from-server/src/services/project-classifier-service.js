const TYPE_LABELS = {
  static_site: "静态网站",
  mpa: "多页网站",
  spa: "单页应用",
  frontend_build: "前端源码项目",
  fullstack_framework: "全栈/元框架项目",
  h5_page: "移动 H5 页面",
  mini_program_source: "小程序源码",
  desktop_app_source: "桌面应用源码",
  mobile_native_source: "移动 App 源码",
  dashboard: "数据看板",
  big_screen: "数字大屏",
  ai_frontend: "AI 应用前端",
  web3_frontend: "Web3 应用前端",
  node_service: "Node.js 单服务应用",
  backend_service: "后端服务项目",
  unknown: "暂未识别"
};

const FRAMEWORK_LABELS = {
  vite: "Vite",
  react: "React",
  vue: "Vue",
  next: "Next.js",
  tanstack_start: "TanStack Start",
  nuxt: "Nuxt",
  sveltekit: "SvelteKit",
  svelte: "Svelte",
  astro: "Astro",
  solid: "Solid"
};

const BACKEND_LABELS = {
  express: "Express",
  koa: "Koa",
  fastify: "Fastify",
  nestjs: "NestJS",
  hono: "Hono",
  node: "Node.js"
};

const DATABASE_LABELS = {
  supabase: "Supabase",
  postgres: "Postgres",
  mysql: "MySQL",
  prisma: "Prisma",
  drizzle: "Drizzle",
  sequelize: "Sequelize",
  typeorm: "TypeORM",
  mongodb: "MongoDB",
  redis: "Redis"
};

export function classifyProject(analysis = {}, context = {}) {
  const paths = normalizePaths(analysis.paths || []);
  const dependencies = normalizeDependencies(analysis.packageDependencies || {});
  const scripts = analysis.packageScripts || {};
  const text = [
    paths.join(" "),
    Object.keys(dependencies).join(" "),
    Object.values(scripts).join(" "),
    (analysis.projectTitle || ""),
    (analysis.pageHeading || "")
  ].join(" ").toLowerCase();
  const detectedType = String(context.detectedType || "");
  const hasBackend = Boolean(context.hasBackend);
  const hasSsr = Boolean(context.hasSsr);
  const hasPackageJson = Boolean(context.hasPackageJson || analysis.hasPackageJson);
  const hasBuildScript = Boolean(context.hasBuildScript || analysis.hasBuildScript);
  const hasRootIndex = paths.includes("index.html");
  const htmlCount = paths.filter((item) => item.endsWith(".html")).length;
  const frontendFrameworks = inferFrontendFrameworks(paths, dependencies);
  const framework = frontendFrameworks[0]?.label || "";
  const buildTool = inferBuildTool(paths, dependencies);
  const backendFrameworks = inferNodeFrameworks(dependencies, paths);
  const databaseStack = inferDatabaseStack(paths, dependencies, scripts, analysis);
  const environmentVariables = inferEnvironmentVariables(paths, dependencies, scripts, analysis);
  const type = inferProjectType({
    paths,
    dependencies,
    text,
    detectedType,
    hasBackend,
    hasSsr,
    hasPackageJson,
    hasBuildScript,
    hasRootIndex,
    htmlCount,
    framework,
    buildTool
  });
  const nodeFramework = backendFrameworks[0]?.code || "";
  const support = inferSupportBoundary(type, {
    hasBackend,
    hasSsr,
    hasBuildScript,
    detectedType,
    nodeFramework,
    databaseStack,
    environmentVariables
  });
  const assessment = createProjectAssessment({
    type,
    paths,
    dependencies,
    scripts,
    detectedType,
    hasBackend,
    hasSsr,
    hasPackageJson,
    hasBuildScript,
    hasRootIndex,
    htmlCount,
    framework,
    frontendFrameworks,
    buildTool,
    backendFrameworks,
    databaseStack,
    environmentVariables,
    support
  });

  return {
    type,
    label: TYPE_LABELS[type] || TYPE_LABELS.unknown,
    summary: createProjectProfileSummary(type, framework, buildTool),
    framework: type === "node_service" ? nodeFramework : framework,
    frontendFrameworks,
    backendFrameworks,
    databases: databaseStack,
    environmentVariables,
    assessment,
    buildTool,
    platform: inferPlatform(type),
    supportStatus: support.status,
    supportLabel: support.label,
    supported: support.status === "supported",
    notes: support.notes,
    unsupportedReasons: support.unsupportedReasons,
    signals: createSignals({
      paths,
      dependencies,
      hasBackend,
      hasSsr,
      hasBuildScript,
      htmlCount,
      framework,
      buildTool,
      databaseStack,
      environmentVariables
    })
  };
}

export function projectTypeLabel(type) {
  return TYPE_LABELS[type] || TYPE_LABELS.unknown;
}

function inferProjectType(flags) {
  if (isMiniProgram(flags.paths, flags.dependencies)) return "mini_program_source";
  if (isDesktopApp(flags.paths, flags.dependencies)) return "desktop_app_source";
  if (isMobileNative(flags.paths, flags.dependencies)) return "mobile_native_source";
  if (["dist", "build", "out", "public", "built-dist", "built-build", "built-out", "built-public"].includes(flags.detectedType)) return "spa";
  if (["static-root", "single-html"].includes(flags.detectedType)) return "static_site";
  if (flags.hasSsr || isFullstackFramework(flags.paths, flags.dependencies)) return "fullstack_framework";
  if (flags.hasBackend && isNodeService(flags.paths, flags.dependencies)) return "node_service";
  if (flags.hasBackend) return "backend_service";
  if (isBigScreen(flags.text, flags.dependencies)) return "big_screen";
  if (isDashboard(flags.text, flags.dependencies)) return "dashboard";
  if (isAiFrontend(flags.text, flags.dependencies)) return "ai_frontend";
  if (isWeb3Frontend(flags.text, flags.dependencies)) return "web3_frontend";
  if (isH5Page(flags.text, flags.paths)) return "h5_page";
  if (flags.hasPackageJson && flags.hasBuildScript) return flags.framework || flags.buildTool ? "frontend_build" : "spa";
  if (flags.detectedType === "source") return "frontend_build";
  if (flags.hasRootIndex && flags.htmlCount > 1) return "mpa";
  return "unknown";
}

function inferFrontendFrameworks(paths, dependencies) {
  const names = Object.keys(dependencies);
  const result = [];
  const add = (code, evidence = "") => {
    if (!result.some((item) => item.code === code)) {
      result.push({ code, label: FRAMEWORK_LABELS[code] || code, evidence });
    }
  };
  if (names.includes("@tanstack/react-start") || names.includes("@tanstack/start") || paths.some((item) => item.includes("tanstack-start"))) add("tanstack_start", "@tanstack/start");
  if (names.includes("next") || paths.some((item) => item.startsWith("next.config."))) add("next", "next");
  if (names.includes("nuxt") || paths.some((item) => item.startsWith("nuxt.config."))) add("nuxt", "nuxt");
  if (names.includes("@sveltejs/kit") || paths.includes("svelte.config.js") || paths.includes("svelte.config.ts")) add("sveltekit", "@sveltejs/kit");
  if (names.includes("astro") || paths.some((item) => item.startsWith("astro.config."))) add("astro", "astro");
  if (names.includes("vite") || paths.some((item) => item.startsWith("vite.config."))) add("vite", "vite");
  if (names.includes("react") || names.includes("@vitejs/plugin-react") || paths.some((item) => /\.(jsx|tsx)$/.test(item))) add("react", "react");
  if (names.includes("vue") || names.includes("@vitejs/plugin-vue") || paths.some((item) => item.endsWith(".vue"))) add("vue", "vue");
  if (names.includes("svelte") || paths.some((item) => item.endsWith(".svelte"))) add("svelte", "svelte");
  if (names.includes("solid-js")) add("solid", "solid-js");
  return result;
}

function inferBuildTool(paths, dependencies) {
  const names = Object.keys(dependencies);
  if (paths.some((item) => item.startsWith("vite.config.")) || names.includes("vite")) return "Vite";
  if (paths.some((item) => item.startsWith("webpack.config.")) || names.includes("webpack")) return "Webpack";
  if (paths.some((item) => item.startsWith("rollup.config.")) || names.includes("rollup")) return "Rollup";
  if (names.includes("parcel")) return "Parcel";
  return "";
}

function inferSupportBoundary(type, context) {
  if (["static_site", "mpa", "spa", "frontend_build", "h5_page", "dashboard", "big_screen", "ai_frontend", "web3_frontend"].includes(type)) {
    return {
      status: "supported",
      label: "当前支持",
      notes: ["可生成试用链接", type === "frontend_build" ? "可自动构建网页产物" : "可直接托管网页产物"],
      unsupportedReasons: []
    };
  }
  if (type === "node_service") {
    const frameworkNote = context.nodeFramework ? `${formatNodeFramework(context.nodeFramework)} 单服务` : "Node.js 单服务";
    const unsupportedDatabaseReasons = (context.databaseStack || [])
      .filter((item) => ["postgres", "supabase", "mongodb", "redis"].includes(item.code))
      .map((item) => `当前暂不支持自动配置 ${item.label}`);
    return {
      status: context.hasBuildScript || context.detectedType === "backend" ? "runtime" : "runtime",
      label: "运行器支持范围内",
      notes: [`支持 ${frameworkNote}试用环境`, "必须有 start 命令，并监听 PORT", "可为 MySQL 项目分配空的试用数据库"],
      unsupportedReasons: [
        ...(unsupportedDatabaseReasons.length ? unsupportedDatabaseReasons : ["暂不支持 Redis、MongoDB、PostgreSQL 自动配置"]),
        "暂不支持多服务编排"
      ]
    };
  }
  if (type === "fullstack_framework") {
    const ssrRuntimeFramework = isSupportedSsrRuntimeFramework(context.frontendFrameworks || []);
    return {
      status: ssrRuntimeFramework ? "runtime" : "unsupported",
      label: ssrRuntimeFramework ? "运行器支持范围内" : "暂不支持",
      notes: ssrRuntimeFramework
        ? ["支持单服务 SSR 试用环境", "必须有 start 命令，并监听 PORT"]
        : ["可识别项目类型"],
      unsupportedReasons: ssrRuntimeFramework
        ? ["暂不支持多服务编排", "暂不支持 Redis、MongoDB、PostgreSQL 自动配置"]
        : ["暂不支持该全栈框架运行态", "如可导出静态网页，可先导出后上传"]
    };
  }
  if (type === "mini_program_source") {
    return {
      status: "unsupported",
      label: "暂不支持",
      notes: ["可识别小程序源码"],
      unsupportedReasons: ["暂不提供微信/支付宝/抖音小程序真实运行环境", "如有 H5 版本，可上传 H5 产物"]
    };
  }
  if (type === "desktop_app_source") {
    return {
      status: "unsupported",
      label: "暂不支持",
      notes: ["可识别桌面应用源码"],
      unsupportedReasons: ["暂不生成 Electron/Tauri 桌面安装包", "如有 Web 版本，可上传网页产物"]
    };
  }
  if (type === "mobile_native_source") {
    return {
      status: "unsupported",
      label: "暂不支持",
      notes: ["可识别跨端/移动 App 源码"],
      unsupportedReasons: ["暂不生成 App 安装包", "如有 H5 版本，可上传 H5 产物"]
    };
  }
  return {
    status: "unsupported",
    label: "暂未识别",
    notes: [],
    unsupportedReasons: ["请整理成包含 index.html、dist/build/out 产物，或标准 Node.js 单服务项目"]
  };
}

function createProjectProfileSummary(type, framework, buildTool) {
  const parts = [projectTypeLabel(type)];
  if (framework) parts.push(framework);
  if (buildTool) parts.push(buildTool);
  return parts.join(" · ");
}

function inferPlatform(type) {
  if (type === "h5_page") return "mobile_web";
  if (type === "mini_program_source") return "mini_program";
  if (type === "desktop_app_source") return "desktop";
  if (type === "mobile_native_source") return "mobile_app";
  if (type === "node_service" || type === "backend_service") return "server";
  return "web";
}

function inferNodeFrameworks(dependencies, paths) {
  const names = Object.keys(dependencies);
  const result = [];
  const add = (code, evidence = "") => {
    if (!result.some((item) => item.code === code)) {
      result.push({ code, label: BACKEND_LABELS[code] || code, evidence });
    }
  };
  if (names.includes("express")) add("express", "express");
  if (names.includes("koa")) add("koa", "koa");
  if (names.includes("fastify")) add("fastify", "fastify");
  if (names.includes("@nestjs/core")) add("nestjs", "@nestjs/core");
  if (names.includes("hono")) add("hono", "hono");
  if (!result.length && paths.some((item) => ["server.js", "src/server.js", "app.js", "src/app.js", "index.js"].includes(item))) add("node", "server entry");
  return result;
}

function formatNodeFramework(value) {
  return BACKEND_LABELS[value] || "Node.js";
}

function createSignals(flags) {
  return [
    flags.framework ? `framework:${flags.framework}` : "",
    flags.buildTool ? `build:${flags.buildTool}` : "",
    flags.hasBackend ? "backend" : "",
    flags.hasSsr ? "ssr" : "",
    flags.hasBuildScript ? "build-script" : "",
    flags.htmlCount > 1 ? "multi-html" : "",
    ...(flags.databaseStack || []).map((item) => `database:${item.code}`),
    ...(flags.environmentVariables?.required || []).slice(0, 8).map((item) => `env:${item}`)
  ].filter(Boolean);
}

function inferDatabaseStack(paths, dependencies, scripts, analysis = {}) {
  const names = Object.keys(dependencies);
  const text = [
    names.join(" "),
    Object.values(scripts || {}).join(" "),
    paths.join(" "),
    (analysis.envHints || []).join(" ")
  ].join(" ").toLowerCase();
  const result = [];
  const add = (code, evidence = "") => {
    if (!result.some((item) => item.code === code)) {
      result.push({ code, label: DATABASE_LABELS[code] || code, evidence });
    }
  };
  if (names.includes("@supabase/supabase-js") || /supabase_url|supabase_anon_key|supabase/.test(text)) add("supabase", "supabase");
  if (names.includes("pg") || /postgres|postgresql|database_url/.test(text)) add("postgres", "postgres");
  if (names.includes("mysql") || names.includes("mysql2") || /mysql_/.test(text)) add("mysql", "mysql");
  if (names.includes("prisma") || names.includes("@prisma/client") || paths.includes("prisma/schema.prisma")) add("prisma", "prisma");
  if (names.includes("drizzle-orm") || paths.some((item) => item.startsWith("drizzle.config."))) add("drizzle", "drizzle");
  if (names.includes("sequelize")) add("sequelize", "sequelize");
  if (names.includes("typeorm")) add("typeorm", "typeorm");
  if (names.includes("mongodb") || names.includes("mongoose")) add("mongodb", "mongodb");
  if (names.includes("redis") || names.includes("ioredis")) add("redis", "redis");
  return result;
}

function inferEnvironmentVariables(paths, dependencies, scripts, analysis = {}) {
  const hints = new Set([...(analysis.envHints || [])].map((item) => String(item || "").trim()).filter(Boolean));
  const text = [
    Object.keys(dependencies || {}).join(" "),
    Object.values(scripts || {}).join(" "),
    paths.join(" "),
    Array.from(hints).join(" ")
  ].join(" ").toUpperCase();
  const envFiles = paths.filter((item) => /^\.env(\.|$)/.test(item) || item.endsWith(".env.example") || item.endsWith(".env.template"));
  const common = [
    "DATABASE_URL",
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_API_KEY",
    "STRIPE_SECRET_KEY",
    "SMTP_HOST",
    "SMTP_USER",
    "SMTP_PASS",
    "MYSQL_HOST",
    "MYSQL_PORT",
    "MYSQL_DATABASE",
    "MYSQL_USER",
    "MYSQL_PASSWORD",
    "PORT"
  ];
  for (const name of common) {
    if (text.includes(name)) hints.add(name);
  }
  return {
    files: envFiles,
    required: Array.from(hints).filter((item) => item !== "PORT").slice(0, 30),
    platformProvided: Array.from(hints).includes("PORT") ? ["PORT"] : [],
    hasExample: envFiles.some((item) => /example|template/.test(item)),
    needsUserInput: Array.from(hints).some((item) => item !== "PORT")
  };
}

function createProjectAssessment(context) {
  const projectKind = inferProjectKind(context);
  const hasStaticOutput = hasStaticOutputType(context.detectedType);
  const requirements = {
    needsBuild: Boolean(context.hasPackageJson && context.hasBuildScript && !context.hasRootIndex && !hasStaticOutput && !["static_site", "mpa"].includes(context.type)),
    needsRuntime: Boolean(context.hasBackend || context.hasSsr || context.type === "node_service" || context.type === "fullstack_framework"),
    needsDatabase: Boolean((context.databaseStack || []).length),
    needsEnvironmentVariables: Boolean(context.environmentVariables?.needsUserInput)
  };
  const missingRequirements = inferMissingRequirements(context, requirements);
  const publishMode = inferPublishMode(context, projectKind, missingRequirements);
  const supportedNow = ["static", "frontend_build", "node_runtime"].includes(publishMode) && !missingRequirements.includes("unsupported_runtime");
  const canPublishNow = Boolean(
    supportedNow &&
    !missingRequirements.includes("missing_build_script") &&
    !missingRequirements.includes("missing_start_script") &&
    !missingRequirements.includes("unsupported_database") &&
    context.support.status !== "unsupported"
  );
  return {
    projectKind,
    projectKindLabel: projectKindLabel(projectKind),
    frameworks: {
      frontend: context.frontendFrameworks || [],
      backend: context.backendFrameworks || [],
      database: context.databaseStack || []
    },
    signals: {
      hasPackageJson: Boolean(context.hasPackageJson),
      hasBuildScript: Boolean(context.hasBuildScript),
      hasStartScript: Boolean(context.scripts?.start),
      hasStaticEntry: Boolean(context.hasRootIndex || context.detectedType === "single-html"),
      hasEnvExample: Boolean(context.environmentVariables?.hasExample),
      hasDatabaseSchema: context.paths.includes("schema.sql") ||
        context.paths.includes("prisma/schema.prisma") ||
        context.paths.some((item) => item.startsWith("migrations/"))
    },
    requirements,
    support: {
      canPublishNow,
      publishMode,
      supportedNow,
      missingRequirements,
      nextAction: createNextAction(context, publishMode, missingRequirements)
    },
    environmentVariables: context.environmentVariables,
    aiFixPrompt: createAssessmentFixPrompt(context, publishMode, missingRequirements)
  };
}

function inferProjectKind(context) {
  if (hasStaticOutputType(context.detectedType)) return "static";
  if (context.type === "node_service") return (context.databaseStack || []).length ? "backend_with_database" : "backend";
  if (context.type === "fullstack_framework") return (context.databaseStack || []).length ? "full_stack" : "ssr_app";
  if (["frontend_build", "spa"].includes(context.type)) return "frontend";
  if (["static_site", "mpa", "h5_page", "dashboard", "big_screen", "ai_frontend", "web3_frontend"].includes(context.type)) return "static";
  if (context.hasBackend && (context.databaseStack || []).length) return "backend_with_database";
  if (context.hasBackend) return "backend";
  return "unknown";
}

function inferPublishMode(context, projectKind, missingRequirements) {
  if (missingRequirements.includes("unsupported_runtime")) return "unsupported";
  if (projectKind === "static") return "static";
  if (projectKind === "frontend") return "frontend_build";
  if (projectKind === "backend" || projectKind === "backend_with_database") return "node_runtime";
  if (projectKind === "ssr_app" && isSupportedSsrRuntimeFramework(context.frontendFrameworks || [])) return "node_runtime";
  if (projectKind === "full_stack" && isSupportedSsrRuntimeFramework(context.frontendFrameworks || []) && !missingRequirements.includes("unsupported_database")) return "node_runtime";
  if (projectKind === "ssr_app") return "ssr_runtime_planned";
  if (projectKind === "full_stack") return "full_app_planned";
  return "unsupported";
}

function inferMissingRequirements(context, requirements) {
  const missing = [];
  const databaseCodes = (context.databaseStack || []).map((item) => item.code);
  const hasSupabase = databaseCodes.includes("supabase");
  if (context.hasPackageJson && !context.hasBuildScript && !requirements.needsRuntime && !context.hasRootIndex) {
    missing.push("missing_build_script");
  }
  if ((context.type === "node_service" || context.hasBackend) && !context.scripts?.start) {
    missing.push("missing_start_script");
  }
  if (!hasStaticOutputType(context.detectedType) && (context.hasSsr || context.type === "fullstack_framework") && !isSupportedSsrRuntimeFramework(context.frontendFrameworks || [])) {
    missing.push("ssr_runtime_planned");
  }
  if (!hasStaticOutputType(context.detectedType) && (context.hasSsr || context.type === "fullstack_framework") && isSupportedSsrRuntimeFramework(context.frontendFrameworks || []) && !context.scripts?.start) {
    missing.push("missing_start_script");
  }
  if (hasSupabase) {
    missing.push("external_backend_config");
  }
  if (databaseCodes.some((code) => ["mongodb", "redis"].includes(code)) || (databaseCodes.includes("postgres") && !hasSupabase)) {
    missing.push("unsupported_database");
  }
  if (requirements.needsEnvironmentVariables) {
    missing.push("environment_variables");
  }
  if (["mini_program_source", "desktop_app_source", "mobile_native_source", "backend_service"].includes(context.type)) {
    missing.push("unsupported_runtime");
  }
  return Array.from(new Set(missing));
}

function hasStaticOutputType(detectedType) {
  return ["dist", "build", "out", "public", "built-dist", "built-build", "built-out", "built-public", "static-root", "single-html"].includes(detectedType);
}

function createNextAction(context, publishMode, missingRequirements) {
  if (missingRequirements.includes("missing_build_script")) return "还缺少生成网页的命令。请让 AI 工具补齐后再发布。";
  if (missingRequirements.includes("missing_start_script")) return "还缺少应用启动命令。请让 AI 工具补齐后再发布。";
  if (missingRequirements.includes("ssr_runtime_planned")) return "这个项目需要完整应用运行能力。当前先识别诊断；如果能导出静态网页，可以先发布静态版本。";
  if (missingRequirements.includes("external_backend_config")) return "这个项目连接 Supabase。可以先发布试用链接，并在项目详情页填写 Supabase URL 和 anon key。";
  if (missingRequirements.includes("unsupported_database")) return "这个项目依赖外部数据库或数据服务。当前先识别诊断，数据库连接能力将在后续增强。";
  if (missingRequirements.includes("environment_variables")) return "这个项目需要运行配置或第三方密钥。请先准备配置说明，不要上传真实密钥。";
  if (publishMode === "static") return "可以直接生成试用链接。";
  if (publishMode === "frontend_build") return "可以先自动生成网页版本，再生成试用链接。";
  if (publishMode === "node_runtime") return "可以进入 Node.js 单服务试用环境。";
  return "请让 AI 工具整理成可打开网页，或整理成标准 Node.js 单服务项目后再发布。";
}

function isSupportedSsrRuntimeFramework(frameworks = []) {
  return (frameworks || []).some((item) => ["next", "nuxt", "tanstack_start"].includes(String(item.code || item).toLowerCase()));
}

function createAssessmentFixPrompt(context, publishMode, missingRequirements) {
  const parts = [
    `DemoGo 识别结果：${projectKindLabel(inferProjectKind(context))}。`,
    `建议处理方式：${publishModeLabel(publishMode)}。`
  ];
  if (context.frontendFrameworks?.length) {
    parts.push(`前端框架：${context.frontendFrameworks.map((item) => item.label).join("、")}。`);
  }
  if (context.backendFrameworks?.length) {
    parts.push(`后端框架：${context.backendFrameworks.map((item) => item.label).join("、")}。`);
  }
  if (context.databaseStack?.length) {
    parts.push(`数据库相关：${context.databaseStack.map((item) => item.label).join("、")}。`);
  }
  if (context.environmentVariables?.required?.length) {
    parts.push(`需要配置的环境变量：${context.environmentVariables.required.join("、")}。`);
  }
  if (missingRequirements.includes("missing_build_script")) {
    parts.push("请补充 package.json 的 build 命令，并确保能生成 dist/index.html、build/index.html 或 out/index.html。");
  }
  if (missingRequirements.includes("missing_start_script")) {
    parts.push("请补充 package.json 的 start 命令，并确保服务监听 process.env.PORT。");
  }
  if (missingRequirements.includes("ssr_runtime_planned")) {
    parts.push("如果项目支持静态导出，请生成 out、dist 或 build 这类可直接打开的网页产物；如果必须服务端渲染，请保留 start 命令和环境变量说明，等待 DemoGo 完整应用运行能力增强。");
  }
  if (missingRequirements.includes("unsupported_database")) {
    parts.push("请补充数据库连接说明和 .env.example，不要把真实密钥写入项目包。当前不要依赖 Postgres/MongoDB/Redis 自动托管。");
  }
  if (missingRequirements.includes("external_backend_config")) {
    parts.push("如果项目使用 Supabase，请在 DemoGo 项目详情页填写 Supabase URL 和 anon key。前端项目优先使用 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY，Next.js 使用 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY；不要使用 service_role。");
  }
  if (missingRequirements.includes("environment_variables")) {
    parts.push("请提供 .env.example，列出项目运行所需变量，但不要提交真实密钥。");
  }
  return parts.join("\n");
}

function projectKindLabel(kind) {
  const labels = {
    static: "静态网页项目",
    frontend: "前端构建项目",
    backend: "Node.js 后端应用",
    backend_with_database: "Node.js 后端 + 数据库项目",
    ssr_app: "SSR/全栈网页应用",
    full_stack: "完整应用项目",
    unknown: "暂未识别项目"
  };
  return labels[kind] || labels.unknown;
}

function publishModeLabel(mode) {
  const labels = {
    static: "静态发布",
    frontend_build: "前端构建发布",
    node_runtime: "Node.js 运行环境",
    ssr_runtime_planned: "完整应用运行能力待增强",
    full_app_planned: "完整应用能力待增强",
    unsupported: "当前暂不支持"
  };
  return labels[mode] || labels.unsupported;
}

function normalizePaths(paths) {
  return (Array.isArray(paths) ? paths : [])
    .map((item) => String(item || "").replace(/\\/g, "/").toLowerCase())
    .filter(Boolean);
}

function normalizeDependencies(dependencies) {
  const result = {};
  for (const [key, value] of Object.entries(dependencies || {})) {
    result[String(key || "").toLowerCase()] = value;
  }
  return result;
}

function isFullstackFramework(paths, dependencies) {
  const names = Object.keys(dependencies);
  return names.includes("next") ||
    names.includes("nuxt") ||
    names.includes("@tanstack/react-start") ||
    names.includes("@tanstack/start") ||
    names.includes("@remix-run/node") ||
    names.includes("@sveltejs/kit") ||
    names.includes("astro") ||
    paths.some((item) => [
      "next.config.js",
      "next.config.mjs",
      "next.config.ts",
      "nuxt.config.js",
      "nuxt.config.ts",
      "remix.config.js",
      "astro.config.js",
      "astro.config.mjs",
      "astro.config.ts",
      "svelte.config.js",
      "svelte.config.ts"
    ].includes(item));
}

function isNodeService(paths, dependencies) {
  const names = Object.keys(dependencies);
  return names.some((name) => ["express", "koa", "fastify", "hono", "@nestjs/core"].includes(name)) ||
    paths.some((item) => ["server.js", "app.js", "index.js", "src/server.js", "src/app.js", "src/main.js"].includes(item));
}

function isMiniProgram(paths, dependencies) {
  const names = Object.keys(dependencies);
  return paths.some((item) => ["app.json", "project.config.json", "mini.project.json"].includes(item)) ||
    names.some((name) => name.includes("miniprogram") || name.includes("@tarojs/"));
}

function isDesktopApp(paths, dependencies) {
  const names = Object.keys(dependencies);
  return names.includes("electron") || names.includes("@tauri-apps/api") || paths.some((item) => item.startsWith("src-tauri/"));
}

function isMobileNative(paths, dependencies) {
  const names = Object.keys(dependencies);
  return names.includes("react-native") ||
    names.includes("@dcloudio/uni-app") ||
    names.includes("flutter") ||
    paths.some((item) => ["pubspec.yaml", "app.vue", "manifest.json", "pages.json"].includes(item));
}

function isDashboard(text, dependencies) {
  const names = Object.keys(dependencies);
  return /dashboard|admin|chart|monitor|看板|后台|监控|运营/.test(text) ||
    names.some((name) => ["echarts", "@antv/g2", "@antv/g6", "chart.js", "recharts"].includes(name));
}

function isBigScreen(text, dependencies) {
  const names = Object.keys(dependencies);
  return /bigscreen|large-screen|大屏|数字孪生|指挥中心/.test(text) ||
    names.some((name) => ["three", "three.js", "babylonjs", "thingjs"].includes(name));
}

function isAiFrontend(text, dependencies) {
  const names = Object.keys(dependencies);
  return /chatbot|copilot|prompt|openai|deepseek|claude|gemini|ai |人工智能|智能体|绘图|视频生成/.test(text) ||
    names.some((name) => ["openai", "@langchain/openai", "langchain", "ai"].includes(name));
}

function isWeb3Frontend(text, dependencies) {
  const names = Object.keys(dependencies);
  return /web3|wallet|metamask|dapp|nft|区块链|钱包/.test(text) ||
    names.some((name) => ["ethers", "viem", "wagmi", "web3"].includes(name));
}

function isH5Page(text, paths) {
  return /h5|mobile|wechat|weixin|活动页|营销页|移动端|微信/.test(text) ||
    paths.some((item) => item.includes("vant") || item.includes("mobile"));
}
