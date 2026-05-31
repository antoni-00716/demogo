export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

type RequestOptions = RequestInit & {
  expectedStatus?: number;
  timeoutMs?: number;
  retries?: number;
};

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_RETRIES = 1;
const RETRYABLE_STATUSES = new Set([502, 503, 504]);

function getCookie(name: string): string | null {
  const prefix = name + "=";
  const cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i++) {
    const c = cookies[i].trim();
    if (c.startsWith(prefix)) {
      return decodeURIComponent(c.substring(prefix.length));
    }
  }
  return null;
}

function csrfHeaders(): Record<string, string> {
  const token = getCookie("csrf_token");
  return token ? { "x-csrf-token": token } : {};
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return RETRYABLE_STATUSES.has(error.status);
  }
  if (error instanceof TypeError) {
    return true;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function api< T >(path: string, options: RequestOptions = {}): Promise< T > {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = DEFAULT_RETRIES, expectedStatus, ...fetchOptions } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers = new Headers(fetchOptions.headers);
      const hasBody = fetchOptions.body !== undefined && !(fetchOptions.body instanceof FormData);
      if (hasBody && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      const method = (fetchOptions.method || "GET").toUpperCase();
      if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
        const csrf = csrfHeaders();
        if (csrf["x-csrf-token"] && !headers.has("x-csrf-token")) {
          headers.set("x-csrf-token", csrf["x-csrf-token"]);
        }
      }

      const response = await fetch(path, {
        ...fetchOptions,
        method,
        credentials: "include",
        headers,
        signal: controller.signal
      });

      const text = await response.text();
      const payload = parseResponsePayload(text);

      if (expectedStatus && response.status !== expectedStatus) {
        throw new ApiError(readableErrorMessage(response, payload, text), response.status, payload);
      }

      if (!expectedStatus && !response.ok) {
        throw new ApiError(readableErrorMessage(response, payload, text), response.status, payload);
      }

      return payload as T;
    } catch (error) {
      lastError = error;

      if (error instanceof DOMException && error.name === "AbortError") {
        lastError = new ApiError("请求超时（" + (timeoutMs / 1000) + "秒），请检查网络后重试", 408);
      }

      if (attempt < retries && isRetryableError(lastError)) {
        await sleep(Math.min(1000 * Math.pow(2, attempt), 4000));
        continue;
      }

      throw lastError;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

export function toJsonBody(value: unknown) {
  return JSON.stringify(value);
}

function parseResponsePayload(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function readableErrorMessage(response: Response, payload: unknown, text: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    return String((payload as { error?: unknown }).error || "请求失败 (" + response.status + ")");
  }

  if (response.status === 401) return "登录状态已失效，请重新登录。";
  if (response.status === 403) return "请求被拒绝，请刷新页面后重试。";
  if (response.status === 408) return "请求超时，请检查网络后重试。";
  if (response.status === 413) return "项目包太大，请压缩后重新上传。";
  if (response.status === 502 || response.status === 504) {
    return "服务器处理时间过长，本次发布没有完成。建议上传已生成好的网页版本，或稍后再试。";
  }
  if (text.trim().startsWith("<")) {
    return "服务器返回了异常页面，本次操作没有完成。请稍后重试，或重新上传项目包。";
  }
  return "请求失败 (" + response.status + ")";
}