import { Badge } from "../Badge";
import type { FailureDiagnosis } from "../../types";

function adminFailureCategoryLabel(category?: string) {
  const labels: Record<string, string> = {
    quota: "额度",
    content: "内容",
    package: "项目包",
    unsupported: "能力边界",
    runtime_env: "运行环境",
    build: "构建",
    other: "其他",
  };
  return labels[category || ""] || category || "未知";
}

interface AdminFailureDiagnosisProps {
  diagnosis: FailureDiagnosis;
}

export function AdminFailureDiagnosis({ diagnosis }: AdminFailureDiagnosisProps) {
  return (
    <div className="failure-diagnosis admin-diagnosis">
      <div className="section-mini-head">
        <div>
          <h3>{diagnosis.title || "失败诊断"}</h3>
          <p>{diagnosis.summary || "需要查看失败阶段和日志后处理。"}</p>
        </div>
        <Badge tone={diagnosis.severity === "blocked" ? "warning" : "info"}>{adminFailureCategoryLabel(diagnosis.category)}</Badge>
      </div>
      <div className="diagnosis-grid">
        {diagnosis.evidence?.length ? (
          <div>
            <strong>依据</strong>
            <ul>{diagnosis.evidence.slice(0, 6).map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        ) : null}
        {diagnosis.userActions?.length ? (
          <div>
            <strong>建议动作</strong>
            <ul>{diagnosis.userActions.slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
