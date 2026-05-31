import { profileUsesSupabase, isSupportedSingleServiceSsr } from "./runtime-service.js";

export function createHostingCapabilities(config = {}) {

  const runtimeEnabled = Boolean(config.runtimeEnabled);
  const nodeRuntimeEnabled = runtimeEnabled && Boolean(config.runtimeNodeEnabled);
  const demoDatabaseReady = Boolean(config.demoDatabaseReady);
  return {
    version: config.version || "0.5.0",
    modes: {
      static: {
        code: "static",
        label: "静态试用链接",
        status: "available",
        description: "用于 HTML 页面、前端构建产物和可直接打开的网页项目。"
      },
      frontendBuild: {
        code: "frontend_build",
        label: "前端源码构建",
        status: "available",
        description: "用于可以生成网页产物的 React、Vue、Vite 等前端项目。"
      },
      nodeRuntime: {
        code: "node_runtime",
        label: "Node.js 应用试用环境",
        status: nodeRuntimeEnabled ? "available" : "planned",
        description: nodeRuntimeEnabled
          ? "用于 Node.js 单服务应用，系统会创建独立运行环境。"
          : "架构已预留，当前环境尚未开启真实运行器。"
      }
    },
    runtime: {
      enabled: runtimeEnabled,
      nodeEnabled: nodeRuntimeEnabled,
      image: config.runtimeDockerImage || "node:20-alpine",
      memory: config.runtimeMemory || "512m",
      cpus: config.runtimeCpus || "1",
      ttlMinutes: Number(config.runtimeTtlMinutes || 120),
      startTimeoutSeconds: Number(config.runtimeStartTimeoutSeconds || 45),
      maxInstances: Number(config.runtimeMaxInstances || 10)
    },
    database: {
      mysql: {
        code: "mysql",
        label: "MySQL 试用数据库",
        status: demoDatabaseReady ? "available" : "planned",
        description: demoDatabaseReady
          ? "用于 Node.js 单服务项目的隔离试用数据库。"
          : "架构已预留，当前环境尚未开启 MySQL 试用数据库。"
      }
    }
  };
}

export function createHostingPlan(inspection = {}, config = {}) {
  const detectedType = String(inspection.detectedType || "");
  const hasBackend = Boolean(inspection.hasBackend);
  const hasSsr = Boolean(inspection.hasSsr);
  const hasStartScript = Boolean(inspection.runtime?.startCommand || inspection.runtime?.hasStartScript);
  const requiresMysql = Boolean(inspection.runtime?.requiresMysql);
  const usesSupabaseExternalBackend = profileUsesSupabase(inspection.projectProfile || {}) || inspection.externalBackend?.provider === "supabase";
  const supportedSsrRuntime = isSupportedSingleServiceSsr(inspection);
  const unsupportedRuntimeDependency = Boolean(
    inspection.runtime?.requiresRedis ||
    inspection.runtime?.requiresMongo ||
    (inspection.runtime?.requiresPostgres && !usesSupabaseExternalBackend) ||
    (inspection.runtime?.requiresOtherDatabase && !usesSupabaseExternalBackend) ||
    inspection.runtime?.requiresWebSocket ||
    (inspection.runtime?.requiresDatabase && !requiresMysql && !usesSupabaseExternalBackend)
  );
  const mysqlBlocked = requiresMysql && !Boolean(config.demoDatabaseReady);
  const runtimeBlocked = unsupportedRuntimeDependency || mysqlBlocked;
  const runtimeEngine = String(inspection.runtime?.engine || "").toLowerCase();
  const runtimeEnabled = Boolean(config.runtimeEnabled);
  const nodeRuntimeEnabled = runtimeEnabled && Boolean(config.runtimeNodeEnabled);
  const runtimeBase = {
    engine: runtimeEngine || (hasBackend || detectedType === "backend" ? "server" : ""),
    entry: "",
    startCommand: inspection.runtime?.startCommand || "",
    expectedPortEnv: "PORT",
    status: "not_required",
    statusLabel: "无需运行环境",
    exposedPath: "",
    apiPath: "",
    limits: createRuntimeLimits(config),
    lifecycle: {
      stage: "none",
      stageLabel: "无需启动",
      startedAt: null,
      expiresAt: null,
      stoppedAt: null
    }
  };

  if ((hasBackend || detectedType === "backend") && runtimeEngine && runtimeEngine !== "node") {
    return {
      mode: "runtime_required",
      modeLabel: "需要服务端运行",
      architectureStage: "unsupported_runtime",
      routeStrategy: {
        publicPath: "/d/{slug}/",
        staticPath: "",
        apiPath: "",
        description: "该类项目需要对应语言的服务端运行环境支持。"
      },
      runtime: {
        ...runtimeBase,
        status: "unsupported",
        statusLabel: "暂未开放"
      },
      capabilities: ["项目识别", "失败原因说明"],
      limitations: ["暂不支持 Python/Java/Go 等后端服务托管", "当前只为 Node.js 单服务分配 MySQL 试用库", "不支持多服务编排"]
    };
  }

  if (hasBackend || detectedType === "backend" || supportedSsrRuntime) {
    const supported = nodeRuntimeEnabled && hasStartScript && !runtimeBlocked;
    return {
      mode: "node_runtime",
      modeLabel: supportedSsrRuntime ? "完整应用试用环境" : "Node.js 应用试用环境",
      architectureStage: supported ? "runtime_ready" : "runtime_planned",
      routeStrategy: {
        publicPath: "/d/{slug}/",
        staticPath: "/d/{slug}/",
        apiPath: "/d/{slug}/api/*",
        description: "网页入口和后端接口统一放在同一个试用链接下。"
      },
      runtime: {
        ...runtimeBase,
        status: supported ? "ready" : (runtimeBlocked ? "unsupported" : "planned"),
        statusLabel: supported ? "可创建运行环境" : (runtimeBlocked ? "依赖服务暂不支持或未开启" : (hasStartScript ? "运行器待开启" : "缺少启动命令")),
        exposedPath: "/d/{slug}/",
        apiPath: "/d/{slug}/api/*",
        lifecycle: {
          ...runtimeBase.lifecycle,
          stage: supported ? "ready_to_start" : (runtimeBlocked ? "blocked" : "planned"),
          stageLabel: supported ? "等待启动" : (runtimeBlocked ? "依赖服务暂不支持或未开启" : "架构已预留")
        }
      },
      capabilities: supported
        ? [
            "独立运行环境",
            "接口访问",
            ...(supportedSsrRuntime ? ["SSR 页面运行"] : []),
            ...(requiresMysql ? ["MySQL 试用数据库"] : []),
            ...(usesSupabaseExternalBackend ? ["Supabase 外部后端连接"] : []),
            "日志状态",
            "生命周期管理"
          ]
        : ["项目识别", "路由规划", "运行状态模型", "生命周期模型"],
      limitations: supported
        ? [
            ...(requiresMysql ? ["MySQL 为空试用库，不自动建表或迁移"] : ["如项目需要 MySQL，可在平台开启试用数据库后分配"]),
            usesSupabaseExternalBackend ? "Supabase 由用户自行提供，DemoGo 只做配置注入和基础检测" : "不支持 Redis、MongoDB、PostgreSQL",
            "不支持多服务编排",
            "不作为长期生产托管"
          ]
        : [
            ...(inspection.runtime?.unsupportedReasons || []),
            hasStartScript ? "当前环境尚未开启真实后端运行器" : "项目缺少 start 启动命令",
            requiresMysql ? "MySQL 试用数据库尚未开启" : "当前只支持 MySQL 试用数据库",
            "不支持多服务编排"
          ]
    };
  }

  if (isStaticHostingType(detectedType) && !hasSsr) {
    return {
      mode: "static",
      modeLabel: "静态试用链接",
      architectureStage: "static_hosting",
      routeStrategy: {
        publicPath: "/d/{slug}/",
        staticPath: "/d/{slug}/",
        apiPath: "",
        description: "直接托管网页文件。"
      },
      runtime: runtimeBase,
      capabilities: ["网页访问", "表单托管", "链接分享", "访问统计"],
      limitations: hasSupabaseProject(inspection) ? ["Supabase 由用户自行提供，DemoGo 只保存 anon key 并做基础连接检测"] : []
    };
  }

  if (isFrontendBuildType(detectedType) && !hasBackend && !hasSsr) {
    return {
      mode: "frontend_build",
      modeLabel: "前端源码构建",
      architectureStage: "build_then_static_hosting",
      routeStrategy: {
        publicPath: "/d/{slug}/",
        staticPath: "/d/{slug}/",
        apiPath: "",
        description: "先构建网页产物，再托管生成后的静态文件。"
      },
      runtime: runtimeBase,
      capabilities: ["自动构建", "网页访问", "表单托管", "链接分享", "访问统计"],
      limitations: hasSupabaseProject(inspection) ? ["如果构建需要 Supabase 变量，请先在项目详情页保存配置，再更新版本"] : []
    };
  }

  if (hasSsr || detectedType === "runtime") {
    return {
      mode: "runtime_required",
      modeLabel: "需要服务端运行",
      architectureStage: "unsupported_runtime",
      routeStrategy: {
        publicPath: "/d/{slug}/",
        staticPath: "",
        apiPath: "",
        description: "该类项目需要后续运行环境能力支持。"
      },
      runtime: {
        ...runtimeBase,
        status: "unsupported",
        statusLabel: "暂未开放"
      },
      capabilities: ["项目识别", "失败原因说明"],
      limitations: ["暂不支持服务端渲染项目", "暂不支持多服务运行"]
    };
  }

  return {
    mode: "unknown",
    modeLabel: "暂未识别",
    architectureStage: "unsupported",
    routeStrategy: {
      publicPath: "",
      staticPath: "",
      apiPath: "",
      description: "需要整理成 DemoGo 支持的项目结构。"
    },
    runtime: {
      ...runtimeBase,
      status: "unsupported",
      statusLabel: "暂未开放"
    },
    capabilities: [],
    limitations: ["暂未识别项目结构"]
  };
}

export function createProjectArchitecture(inspection = {}, config = {}) {
  const hosting = createHostingPlan(inspection, config);
  return {
    version: config.version || "0.5.0",
    projectKind: hosting.mode,
    projectKindLabel: hosting.modeLabel,
    hosting,
    layers: [
      {
        code: "detect",
        label: "项目识别",
        status: "ready"
      },
      {
        code: "build",
        label: "构建流水线",
        status: ["frontend_build", "static"].includes(hosting.mode) ? "ready" : "planned"
      },
      {
        code: "runtime",
        label: "应用运行环境",
        status: hosting.runtime.status === "ready" ? "ready" : hosting.runtime.status
      },
      {
        code: "route",
        label: "访问路由",
        status: hosting.routeStrategy.publicPath ? "ready" : "planned"
      },
      {
        code: "lifecycle",
        label: "生命周期管理",
        status: hosting.runtime.status === "not_required" ? "ready" : "planned"
      },
      {
        code: "observability",
        label: "日志与状态",
        status: hosting.runtime.status === "not_required" ? "ready" : "planned"
      }
    ]
  };
}

export function createRuntimeLimits(config = {}) {
  return {
    memory: config.runtimeMemory || "512m",
    cpus: config.runtimeCpus || "1",
    ttlMinutes: Number(config.runtimeTtlMinutes || 120),
    startTimeoutSeconds: Number(config.runtimeStartTimeoutSeconds || 45),
    maxInstances: Number(config.runtimeMaxInstances || 10)
  };
}

export function isRuntimeHostingMode(mode) {
  return ["node_runtime", "runtime_required"].includes(String(mode || ""));
}

function isStaticHostingType(type) {
  return [
    "static-root",
    "dist",
    "build",
    "out",
    "public",
    "single-html",
    "built-dist",
    "built-build",
    "built-out",
    "built-public"
  ].includes(type);
}

function isFrontendBuildType(type) {
  return type === "source";
}


function hasSupabaseProject(inspection = {}) {
  return profileUsesSupabase(inspection.projectProfile || {}) || inspection.externalBackend?.provider === "supabase";
}


