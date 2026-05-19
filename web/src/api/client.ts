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
};

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const hasBody = options.body !== undefined && !(options.body instanceof FormData);
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers
  });
  const text = await response.text();
  const payload = parseResponsePayload(text);

  if (options.expectedStatus && response.status !== options.expectedStatus) {
    throw new ApiError(readableErrorMessage(response, payload, text), response.status, payload);
  }

  if (!options.expectedStatus && !response.ok) {
    throw new ApiError(readableErrorMessage(response, payload, text), response.status, payload);
  }

  return payload as T;
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
    return String((payload as { error?: unknown }).error || `请求失败：${response.status}`);
  }

  if (response.status === 401) return "登录状态已失效，请重新登录。";
  if (response.status === 413) return "项目包太大，请压缩后重新上传。";
  if (response.status === 502 || response.status === 504) {
    return "服务器处理时间过长，本次发布没有完成。建议上传已生成好的网页版本，或稍后再试。";
  }
  if (text.trim().startsWith("<")) {
    return "服务器返回了异常页面，本次操作没有完成。请稍后重试，或重新上传项目包。";
  }
  return `请求失败：${response.status}`;
}
