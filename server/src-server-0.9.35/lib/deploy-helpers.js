const deploySourceLabels = {
  web: "网页上传",
  cli: "DemoGo CLI",
  mcp: "DemoGo MCP",
  agent_api: "AI 助手 API"
};

export function detectDeploySource(req, actor = "user") {
  if (actor !== "agent") return "web";
  const requested = normalizeDeploySource(req.body?.source || req.get("x-demogo-deploy-source"));
  if (requested) return requested;
  const userAgent = String(req.get("user-agent") || "").toLowerCase();
  if (userAgent.includes("demogo-mcp")) return "mcp";
  if (userAgent.includes("demogo-cli")) return "cli";
  return "agent_api";
}

export function normalizeDeploySource(value) {
  const source = String(value || "").trim().toLowerCase();
  return ["web", "cli", "mcp", "agent_api"].includes(source) ? source : "";
}

export function deploySourceLabel(source) {
  return deploySourceLabels[source] || deploySourceLabels.agent_api;
}
