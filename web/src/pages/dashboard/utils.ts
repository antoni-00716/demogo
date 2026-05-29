import type { DeploymentStep, FailureDiagnosis, AgentToken, HostedForm } from "../../types";
import { getDeploymentJob, type Inspection, type DeploymentJob } from "../../api/demos";
export function isSupportedArchive(fileName: string) {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".zip") || lower.endsWith(".tar.gz") || lower.endsWith(".tgz");
}

export function createClientDeploymentSteps(status: "running" | "success" = "running"): DeploymentStep[] {
  const labels = [
    ["receive", "接收文件"],
    ["extract", "解压项目"],
    ["security_check", "安全检查"],
    ["inspect", "生成前检查"],
    ["build", "构建检查"],
    ["database", "试用数据库"],
    ["content_review", "内容检查"],
    ["form_hosting", "表单收集"],
    ["publish", "生成链接"],
    ["success", "生成链接"]
  ];
  return labels.map(([eventType, label], index) => ({
    id: `client-${eventType}`,
    eventType,
    status: status === "success" || index === 0 ? "success" : "pending",
    message: status === "success" ? `${label}完成` : (index === 0 ? "文件已提交，等待服务器处理" : "等待处理"),
    createdAt: new Date().toISOString()
  }));
}

export function markClientStepsFailed(steps: DeploymentStep[]) {
  const current = steps.length ? steps : createClientDeploymentSteps();
  return current.map((step, index) => (
    index === current.length - 1
      ? { ...step, status: "failed", message: "生成失败，请根据提示调整后重试" }
      : step
  ));
}

export function createFailureInspection(message: string, statusCode?: number, diagnosis?: FailureDiagnosis | null): Inspection {
  const fixPrompt = diagnosis?.aiPrompt || createFailureFixPrompt(message, statusCode);
  return {
    canPublish: false,
    status: "failed",
    userStatus: "unsupported",
    userStatusLabel: diagnosis?.title || "需要调整",
    userLabel: diagnosis?.title || "这次没有生成试用链接",
    userSummary: diagnosis?.summary || message || "发布失败，请根据提示调整后重新上传。",
    summary: message,
    issues: diagnosis?.evidence?.length ? diagnosis.evidence : [message],
    recommendations: diagnosis?.userActions?.length ? diagnosis.userActions : [fixPrompt],
    failureDiagnosis: diagnosis || undefined,
    fixPrompt
  };
}

export function createGenericFixPrompt(inspection: Inspection) {
  return [
    "请根据 DemoGo 的检查结果修改当前项目，然后重新打包发布。",
    `检查结果：${inspection.userSummary || inspection.summary || "项目暂时无法生成试用链接。"}`,
    inspection.issues?.length ? `主要问题：${inspection.issues.join("；")}` : "",
    "请确保项目能生成可直接打开的网页；如需后端能力，当前只支持 Node.js 单服务和 MySQL 空试用库，不支持支付、登录系统或 SSR 运行时。",
    "如果是单个 HTML 页面，请保留页面和必要的 CSS/JS/图片资源；不要把桌面、下载目录、node_modules、.env 或密钥文件一起打包。"
  ].filter(Boolean).join("\n");
}

export function createFailureFixPrompt(message: string, statusCode?: number) {
  const text = String(message || "");
  if (/额度|套餐|次数|在线试用项目/.test(text) || statusCode === 403) {
    return "DemoGo 提示当前额度不足。请不要继续反复发布，先下线旧项目，或让用户在 DemoGo 工作台申请 Lite / Pro 套餐后再发布。";
  }
  if (/内容|风险|拦截|人工确认|违规/.test(text)) {
    return "DemoGo 发布前内容检查未通过。请删除或改写可能涉及诈骗、违法交易、博彩、色情低俗、恶意下载、高风险金融引导，或身份证、银行卡、验证码、密码等高敏信息收集的内容。正常姓名、手机号、邮箱、预约报名和咨询留资可以保留。";
  }
  if (/后端|数据库|支付|登录|WebSocket|SSR|服务端|暂不支持/.test(text)) {
    return "当前 DemoGo 支持可直接打开的网页，也支持 Node.js 单服务和 MySQL 空试用库。请确认项目有 start 命令、监听 process.env.PORT，并通过 MYSQL_HOST、MYSQL_DATABASE、MYSQL_USER、MYSQL_PASSWORD 或 DATABASE_URL 读取数据库连接。请移除支付、完整登录系统、WebSocket、多服务或 SSR 运行时依赖。";
  }
  if (/PORT|端口|启动|运行环境|listen|依赖安装|container|Docker|超时/.test(text)) {
    return "请检查 Node.js 服务是否能正常启动：package.json 需要有 start 命令，服务必须监听 process.env.PORT，不能写死 3000/5173 等本地端口。若需要 MySQL，请在启动时自动建表或执行初始化 SQL，然后重新发布。";
  }
  if (/build|构建|生成命令|npm/.test(text)) {
    return "请检查项目是否有可运行的构建命令，并能生成 dist、build、out 或 public 这类网页目录。修复依赖和构建错误后，再重新打包发布。";
  }
  return "请只保留当前项目文件，确认入口页面存在，删除无关文件、node_modules、.env 和密钥文件后重新打包发布。";
}

export async function waitForDeploymentJob(jobId: string, onProgress: (job: DeploymentJob) => void) {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    const payload = await getDeploymentJob(jobId);
    onProgress(payload.job);
    if (payload.job.status === "success" || payload.job.status === "failed") {
      return payload.job;
    }
    await sleep(attempt < 10 ? 800 : 1500);
  }
  throw new Error("生成时间较长，请稍后在项目列表或发布记录中查看结果。");
}

export function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function createAgentInstruction(token: AgentToken | null) {
  if (!token?.enabled) return "";
  const value = token?.value || "";
  const apiBase = getDemoGoApiBase();
  return [
    "请把当前项目发布到 DemoGo，生成一个可以分享给用户试用的链接，并把最终链接告诉我。",
    "",
    `DemoGo 平台地址：${apiBase}`,
    value ? `DemoGo AI 发布口令：${value}` : "DemoGo AI 发布口令：使用你已经保存好的 DEMOGO_AGENT_TOKEN，不要要求用户重新生成口令。",
    "",
    "请优先使用 DemoGo CLI：",
    value
      ? `   npx --yes @demogo-cn/cli deploy --api ${apiBase} --token 上面的AI发布口令`
      : `   npx --yes @demogo-cn/cli deploy --api ${apiBase} --token 已保存的AI发布口令`,
    "",
    "如果当前项目已经发布过，并且存在 .demogo/project.json，请更新原链接，不要新建链接。",
    "如果我提供了原 DemoGo 链接或 Demo ID，请用下面的方式更新原链接：",
    value
      ? `   npx --yes @demogo-cn/cli update --api ${apiBase} --token 上面的AI发布口令 --id <原DemoGo链接>`
      : `   npx --yes @demogo-cn/cli update --api ${apiBase} --token 已保存的AI发布口令 --id <原DemoGo链接>`,
    "",
    "操作要求：",
    "1. 发布前检查项目结构，不要上传 node_modules、.git、.env、日志文件、密钥文件和无关大文件。",
    "2. 不要要求我手动改文件名或判断技术栈；能自动处理的请自动处理。",
    "3. 首次发布由 DemoGo 自动生成随机试用链接，不要让我选择链接后缀。",
    "4. 如果 CLI 不可用，再尝试 DemoGo MCP 或 Agent API 兜底，并明确说明使用了兜底方式。",
    "5. 如果发布失败，请根据 DemoGo 返回的失败诊断修复项目；无法修复时，请告诉我失败原因和下一步怎么改。",
    "6. 发布成功后，只需要返回 DemoGo 试用链接和需要我注意的限制。"
  ].join("\n");
}

export function getDemoGoApiBase() {
  if (typeof window === "undefined") return "<DemoGo平台地址>";
  return window.location.origin;
}

export function createFormIntegrationInstruction(form: HostedForm) {
  const fields = (form.fields || []).map((field) => `${field.name}${field.required ? "（必填）" : ""}`).join("、");
  return [
    "请把当前页面里的报名、预约、留资或留言表单接入 DemoGo 报名/留言收集。",
    "",
    `收集入口：${form.submitUrl}`,
    `字段：${fields || "name、phone、message"}`,
    "",
    "实现要求：",
    "1. 用户点击提交时，不要跳转到新页面。",
    "2. 用 POST 请求把表单内容提交到上面的收集入口。",
    "3. 请求格式使用 JSON，字段名必须和上面字段保持一致。",
    "4. 提交成功后，在页面上提示“提交成功，我们会尽快联系你”。",
    "5. 提交失败时，提示用户稍后重试，不要让页面空白。",
    "6. 不要加入支付、登录、Redis、WebSocket 或多服务逻辑；如需要 MySQL，请读取 DemoGo 注入的环境变量。"
  ].join("\n");
}

export function deploymentStepLabel(type: string) {
  const labels: Record<string, string> = {
    receive: "接收文件",
    extract: "解压项目",
    security_check: "安全检查",
    inspect: "生成前检查",
    build: "构建检查",
    database: "试用数据库",
    content_review: "内容检查",
    form_hosting: "表单收集",
    publish: "生成链接",
    success: "生成链接",
    failed: "生成失败"
  };
  return labels[type] || type;
}

export function stepStatusIcon(status: string) {
  if (status === "success") return "✓";
  if (status === "failed") return "!";
  if (status === "skipped") return "·";
  return "…";
}
