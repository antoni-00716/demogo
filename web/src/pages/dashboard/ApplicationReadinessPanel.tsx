import type { Demo, ApplicationReadiness } from "../../types";
import type { Inspection } from "../../api/demos";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";

function readinessCheckLabel(status?: string) {
  return status === "passed" ? "已通过" : status === "failed" ? "未通过" : status === "blocked" ? "被阻挡" : "待检查";
}

export function ApplicationReadinessPanel({
  demo,
  inspection,
  onCopyText
}: {
  demo: Demo;
  inspection?: Inspection | null;
  onCopyText: (text: string, successMessage?: string) => void;
}) {
  const readiness: ApplicationReadiness | null = demo.applicationReadiness || inspection?.applicationReadiness || null;
  if (!readiness) return null;
  const tone = readiness.status === "ready" ? "success" : readiness.status === "blocked" ? "warning" : "info";
  const checks = readiness.checklist || [];
  const visibleChecks = checks.filter((item: { status?: string }) => item.status !== "not_required").slice(0, 8);
  const report = readiness.deliveryReport;
  return (
    <div className="hosting-architecture application-readiness-panel">
      <div className="section-mini-head">
        <div>
          <h3>{readiness.label || "完整应用试用闭环"}</h3>
          <p>{readiness.summary || "DemoGo 正在判断这个项目是否已经具备可试用、可更新、可反馈的完整链路。"}</p>
        </div>
        <Badge tone={tone}>{readiness.statusLabel || "待检查"} · {readiness.score || 0}%</Badge>
      </div>
      {report ? (
        <div className={`trial-delivery-report delivery-${report.verdict || "unknown"}`}>
          <div>
            <span>{report.verdictLabel || "试用交付报告"}</span>
            <strong>{report.headline || "试用交付报告"}</strong>
            <p>{report.userMessage || readiness.summary}</p>
          </div>
          <div className="delivery-score">
            <strong>{report.score || readiness.score || 0}%</strong>
            <span>{report.feedbackReady ? "可开始收集反馈" : report.shareable ? "可先小范围分享" : "暂不建议分享"}</span>
          </div>
          {report.primaryAction ? <p className="delivery-primary-action">{report.primaryAction}</p> : null}
          {report.nextSteps?.length ? (
            <div className="delivery-grid">
              <div>
                <strong>下一步</strong>
                <ul>{report.nextSteps.slice(0, 4).map((item: string) => <li key={item}>{item}</li>)}</ul>
              </div>
              {report.proofPoints?.length ? (
                <div>
                  <strong>已具备</strong>
                  <ul>{report.proofPoints.slice(0, 4).map((item: string) => <li key={item}>{item}</li>)}</ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {visibleChecks.length ? (
        <div className="readiness-check-grid">
          {visibleChecks.map((item: { code?: string; label?: string; status?: string; statusLabel?: string; detail?: string }) => (
            <div key={item.code || item.label} className={`readiness-check readiness-${item.status || "unknown"}`}>
              <strong>{item.label}</strong>
              <span>{item.statusLabel || readinessCheckLabel(item.status)}</span>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      ) : null}
      {readiness.missingActions?.length ? (
        <div className="runtime-help-box">
          <strong>下一步</strong>
          <ul>{readiness.missingActions.slice(0, 4).map((item: string) => <li key={item}>{item}</li>)}</ul>
        </div>
      ) : null}
      {readiness.aiPrompt ? (
        <div className="row-actions compact">
          <Button onClick={() => onCopyText(readiness.aiPrompt || "", "完整应用验收说明已复制。")}>复制给 AI 怎么改</Button>
        </div>
      ) : null}
    </div>
  );
}
