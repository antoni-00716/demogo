const SUPABASE_URL_KEYS = [
  "VITE_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL"
];

const SUPABASE_ANON_KEY_KEYS = [
  "VITE_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY"
];

const SUPABASE_ALIAS_KEYS = [
  ...SUPABASE_URL_KEYS,
  ...SUPABASE_ANON_KEY_KEYS
];

export function hasSupabaseProject(inspection = {}) {
  const profile = inspection.projectProfile || {};
  const assessment = inspection.projectAssessment || profile.assessment || {};
  const databaseItems = [
    ...(profile.databases || []),
    ...(assessment.frameworks?.database || [])
  ];
  const requiredEnv = [
    ...(profile.environmentVariables?.required || []),
    ...(assessment.environmentVariables?.required || [])
  ];
  const signals = [
    ...(profile.signals || []),
    ...(inspection.signals || [])
  ];
  const text = [
    profile.framework,
    profile.summary,
    profile.label,
    ...databaseItems.map((item) => `${item.code || ""} ${item.label || ""}`),
    ...requiredEnv,
    ...signals
  ].join(" ").toLowerCase();
  return text.includes("supabase");
}

export function externalBackendEnvKeys(inspection = {}) {
  if (!hasSupabaseProject(inspection)) return [];
  return preferredSupabaseKeys(inspection).required;
}

export function externalBackendEnvValues(inspection = {}, runtimeEnv = {}) {
  if (!hasSupabaseProject(inspection)) return {};
  const values = normalizeEnvValues(runtimeEnv);
  const url = findFirstValue(values, SUPABASE_URL_KEYS);
  const anonKey = findFirstValue(values, SUPABASE_ANON_KEY_KEYS);
  if (!url || !anonKey) return {};
  return Object.fromEntries([
    ...SUPABASE_URL_KEYS.map((key) => [key, url]),
    ...SUPABASE_ANON_KEY_KEYS.map((key) => [key, anonKey])
  ]);
}

export function createExternalBackendConfigStatus(inspection = {}, runtimeEnv = {}, existing = null) {
  if (!hasSupabaseProject(inspection)) return null;
  const values = normalizeEnvValues(runtimeEnv);
  const preferred = preferredSupabaseKeys(inspection);
  const urlKey = findFirstKey(values, [preferred.urlKey, ...SUPABASE_URL_KEYS]);
  const anonKeyKey = findFirstKey(values, [preferred.anonKey, ...SUPABASE_ANON_KEY_KEYS]);
  const missingEnv = [
    urlKey ? "" : preferred.urlKey,
    anonKeyKey ? "" : preferred.anonKey
  ].filter(Boolean);
  const configuredEnv = [urlKey, anonKeyKey].filter(Boolean);
  const unsafeKeys = Object.keys(values).filter(isUnsafeExternalSecretKey);
  const connection = existing?.provider === "supabase" ? existing.connection || null : null;
  const warnings = [
    ...unsafeKeys.map(() => "检测到 Supabase service_role 高权限密钥线索，请改用 anon key。"),
    ...(connection?.status === "warning" && connection.message ? [connection.message] : [])
  ];
  const status = inferExternalBackendStatus({ missingEnv, connection, warnings });
  return {
    provider: "supabase",
    label: "Supabase",
    status,
    statusLabel: externalBackendStatusLabel(status),
    requiredEnv: preferred.required,
    acceptedEnv: SUPABASE_ALIAS_KEYS,
    configuredEnv,
    missingEnv,
    connection,
    warnings: Array.from(new Set(warnings)),
    features: inferSupabaseFeatures(inspection),
    nextAction: externalBackendNextAction(status, preferred.required, connection)
  };
}

export async function createExternalBackendConfigWithConnection(inspection = {}, runtimeEnv = {}, existing = null) {
  const status = createExternalBackendConfigStatus(inspection, runtimeEnv, existing);
  if (!status || status.provider !== "supabase" || status.missingEnv.length) return status;
  const values = normalizeEnvValues(runtimeEnv);
  const connection = await checkSupabaseConnection({
    url: findFirstValue(values, SUPABASE_URL_KEYS),
    anonKey: findFirstValue(values, SUPABASE_ANON_KEY_KEYS)
  });
  return createExternalBackendConfigStatus(inspection, runtimeEnv, {
    provider: "supabase",
    connection
  });
}

export async function checkSupabaseConnection({ url, anonKey } = {}) {
  const checkedAt = new Date().toISOString();
  const normalizedUrl = normalizeSupabaseUrl(url);
  if (!normalizedUrl || !anonKey) {
    return {
      checkedAt,
      status: "missing",
      statusLabel: "缺少配置",
      message: "请填写 Supabase URL 和 anon key。"
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${normalizedUrl}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`
      },
      signal: controller.signal
    });
    if (response.status >= 200 && response.status < 400) {
      return {
        checkedAt,
        status: "connected",
        statusLabel: "连接正常",
        message: "DemoGo 已能访问 Supabase REST 接口。"
      };
    }
    if ([401, 403].includes(response.status)) {
      return {
        checkedAt,
        status: "failed",
        statusLabel: "连接失败",
        message: "Supabase 地址可以访问，但 anon key 无效或权限被拒绝。"
      };
    }
    return {
      checkedAt,
      status: "warning",
      statusLabel: "已访问但需确认",
      message: `Supabase 返回 ${response.status}，请确认项目 URL、API Key 和 API 设置。`
    };
  } catch (error) {
    return {
      checkedAt,
      status: "failed",
      statusLabel: "连接失败",
      message: error?.name === "AbortError"
        ? "连接 Supabase 超时，请确认项目地址是否可访问。"
        : `连接 Supabase 失败：${error instanceof Error ? error.message : "网络异常"}`
    };
  } finally {
    clearTimeout(timer);
  }
}

export function publicExternalBackend(value = null) {
  if (!value || typeof value !== "object") return null;
  return {
    provider: value.provider || "",
    label: value.label || "",
    status: value.status || "",
    statusLabel: value.statusLabel || "",
    requiredEnv: Array.isArray(value.requiredEnv) ? value.requiredEnv : [],
    acceptedEnv: Array.isArray(value.acceptedEnv) ? value.acceptedEnv : [],
    configuredEnv: Array.isArray(value.configuredEnv) ? value.configuredEnv : [],
    missingEnv: Array.isArray(value.missingEnv) ? value.missingEnv : [],
    connection: value.connection || null,
    warnings: Array.isArray(value.warnings) ? value.warnings : [],
    features: value.features || {},
    nextAction: value.nextAction || ""
  };
}

export function isUnsafeExternalSecretKey(value) {
  const key = String(value || "").trim().toUpperCase();
  return key.includes("SERVICE_ROLE");
}

function preferredSupabaseKeys(inspection = {}) {
  const required = [
    ...(inspection.projectProfile?.environmentVariables?.required || []),
    ...(inspection.projectAssessment?.environmentVariables?.required || [])
  ].map(normalizeEnvKey).filter(Boolean);
  const urlKey = required.find((key) => SUPABASE_URL_KEYS.includes(key));
  const anonKey = required.find((key) => SUPABASE_ANON_KEY_KEYS.includes(key));
  if (urlKey && anonKey) return { urlKey, anonKey, required: [urlKey, anonKey] };

  const frameworks = [
    inspection.projectProfile?.framework,
    ...(inspection.projectProfile?.frontendFrameworks || []).map((item) => item.code)
  ].map((item) => String(item || "").toLowerCase()).filter(Boolean);
  if (frameworks.includes("next")) {
    return {
      urlKey: "NEXT_PUBLIC_SUPABASE_URL",
      anonKey: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      required: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    };
  }
  if (inspection.hostingMode === "node_runtime" && !frameworks.length) {
    return {
      urlKey: "SUPABASE_URL",
      anonKey: "SUPABASE_ANON_KEY",
      required: ["SUPABASE_URL", "SUPABASE_ANON_KEY"]
    };
  }
  return {
    urlKey: "VITE_SUPABASE_URL",
    anonKey: "VITE_SUPABASE_ANON_KEY",
    required: ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]
  };
}

function normalizeEnvValues(value = {}) {
  const result = {};
  for (const [rawKey, rawValue] of Object.entries(value || {})) {
    const key = normalizeEnvKey(rawKey);
    if (!key) continue;
    const nextValue = typeof rawValue === "object" && rawValue !== null ? rawValue.value : rawValue;
    if (nextValue === undefined || nextValue === null || String(nextValue).trim() === "") continue;
    result[key] = String(nextValue).trim();
  }
  return result;
}

export function normalizeEnvKey(value) {
  const key = String(value || "").trim().toUpperCase();
  return /^[A-Z_][A-Z0-9_]*$/.test(key) ? key : "";
}
export function isPlatformEnvKey(key) {
  return ["PORT", "NODE_ENV"].includes(String(key || "").toUpperCase());
}

function findFirstKey(values, keys) {
  return keys.find((key) => key && values[key]) || "";
}

function findFirstValue(values, keys) {
  const key = findFirstKey(values, keys);
  return key ? values[key] : "";
}

function normalizeSupabaseUrl(value) {
  const raw = String(value || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function inferExternalBackendStatus({ missingEnv, connection, warnings }) {
  if (missingEnv.length) return "missing";
  if (connection?.status === "connected") return "ready";
  if (connection?.status === "failed") return "failed";
  if (connection?.status === "warning" || warnings.length) return "warning";
  return "configured";
}

function externalBackendStatusLabel(status) {
  const labels = {
    missing: "缺少 Supabase 配置",
    configured: "已保存，待检测",
    ready: "连接正常",
    warning: "需要确认",
    failed: "连接失败"
  };
  return labels[status] || "外部后端";
}

function externalBackendNextAction(status, requiredEnv, connection) {
  if (status === "missing") return `请填写 ${requiredEnv.join("、")}，保存后 DemoGo 会做基础连接检测。`;
  if (status === "ready") return "Supabase 连接已通过基础检测。发布更新版本时，DemoGo 会注入这些配置。";
  if (status === "failed") return connection?.message || "请检查 Supabase URL 和 anon key。";
  if (status === "warning") return connection?.message || "配置已保存，但还需要确认 Supabase 项目设置。";
  return "配置已保存。建议执行一次连接检测或更新版本。";
}

function inferSupabaseFeatures(inspection = {}) {
  const text = [
    ...(inspection.projectProfile?.signals || []),
    ...(inspection.projectAssessment?.environmentVariables?.required || []),
    ...(inspection.projectProfile?.environmentVariables?.required || []),
    inspection.projectProfile?.summary || ""
  ].join(" ").toLowerCase();
  return {
    auth: /auth|login|signin|signup|用户|登录|注册/.test(text),
    storage: /storage|bucket|upload|file/.test(text),
    realtime: /realtime|channel|broadcast|presence/.test(text),
    edgeFunctions: /functions|edge/.test(text),
    migrations: /migration|schema\.sql|prisma|drizzle/.test(text)
  };
}
