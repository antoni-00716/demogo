import type { Demo } from "../../types";
import { Badge } from "../../components/Badge";
import { FailureDiagnosisPanel } from "../../components/dashboard/FailureDiagnosisPanel";

export function HostingArchitecturePanel({
  hosting,
  architecture,
  runtime,
  compact = false
}: {
  hosting?: Demo["hosting"] | null;
  architecture?: Demo["architecture"] | null;
  runtime?: Demo["runtime"] | null;
  compact?: boolean;
}) {
  const currentHosting = hosting || architecture?.hosting || null;
  const currentRuntime = runtime || currentHosting?.runtime || null;
  if (!currentHosting && !architecture) return null;
  const layers = architecture?.layers || [];
  return (
    <div className={`hosting-architecture ${compact ? "compact" : ""}`}>
      <div className="section-mini-head">
        <div>
          <h3>{compact ? "托管方式" : "应用托管架构"}</h3>
          <p>{currentHosting?.routeStrategy?.description || "DemoGo 会按项目类型选择网页托管或应用运行环境。"}</p>
        </div>
        <Badge tone={currentRuntime?.status === "ready" || currentRuntime?.status === "not_required" ? "success" : "info"}>
          {currentHosting?.modeLabel || architecture?.projectKindLabel || "托管架构"}
        </Badge>
      </div>
      <div className="hosting-route-grid">
        <span>访问入口：{currentHosting?.routeStrategy?.publicPath || "/d/{slug}/"}</span>
        <span>接口路径：{currentHosting?.routeStrategy?.apiPath || "无需接口转发"}</span>
        <span>运行状态：{currentRuntime?.statusLabel || "无需运行环境"}</span>
        <span>生命周期：{currentRuntime?.lifecycle?.stageLabel || "按试用链接有效期管理"}</span>
        {currentRuntime?.frameworkLabel ? <span>服务框架：{currentRuntime.frameworkLabel}</span> : null}
        {currentRuntime?.selectedStartCommand ? <span>启动命令：{currentRuntime.selectedStartCommand}</span> : null}
      </div>
      {!compact && layers.length ? (
        <div className="architecture-layer-list">
          {layers.map((layer) => (
            <span key={layer.code || layer.label} className={`layer-${layer.status || "planned"}`}>
              {layer.label || layer.code}
            </span>
          ))}
        </div>
      ) : null}
      {!compact && currentRuntime?.limits ? (
        <p className="muted">
          运行边界：{currentRuntime.limits.memory || "512m"} 内存，{currentRuntime.limits.cpus || "1"} CPU，默认保留 {currentRuntime.limits.ttlMinutes || 120} 分钟。
        </p>
      ) : null}
      {!compact && currentHosting?.mode === "node_runtime" ? (
        <div className="runtime-help-box">
          <strong>Node.js 项目要求</strong>
          <ul>
            <li>项目必须有 start 命令，并监听 process.env.PORT。</li>
            <li>当前支持单服务试用，不支持多服务编排、Redis、MongoDB、PostgreSQL、WebSocket 和 SSR 运行态。</li>
            <li>首次启动会安装依赖，耗时比静态网页更长；启动失败时可以把日志摘要复制给 AI 修改。</li>
          </ul>
        </div>
      ) : null}
      {!compact && currentRuntime?.logSummary ? (
        <div className="runtime-log-panel">
          <strong>运行日志摘要</strong>
          <pre>{currentRuntime.logSummary}</pre>
        </div>
      ) : null}
      {!compact && currentRuntime?.failureDiagnosis ? <FailureDiagnosisPanel diagnosis={currentRuntime.failureDiagnosis} /> : null}
      {!compact && currentHosting?.limitations?.length ? (
        <ul>
          {currentHosting.limitations.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}
    </div>
  );
}
