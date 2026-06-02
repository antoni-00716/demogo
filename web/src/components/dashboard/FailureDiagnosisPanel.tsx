// DemoGo v0.9.14 - Failure diagnosis panel (extracted from UserDashboard)
import { Badge } from "../Badge";
import type { FailureDiagnosis } from "../../types";

function failureCategoryLabel(category?: string) {
  const labels: Record<string, string> = {
    quota: "配额",
    content: "内容",
    package: "打包",
    unsupported: "不支持",
    runtime_env: "运行环境",
    dependency_install: "依赖安装",
    build: "构建",
    runtime_start: "启动",
    database_init: "数据库"
  };
  return labels[category || ""] || "未知";
}

export function FailureDiagnosisPanel({ diagnosis }: { diagnosis: FailureDiagnosis }) {
  const tone = diagnosis.severity === "blocked" ? "warning" : "info";
  return (
    <div className="failure-diagnosis">
      <div className="section-mini-head">
        <div>
          <h3>{diagnosis.title || "发布失败"}</h3>
          <p>{diagnosis.summary || "诊断信息无法获取，请查看原始错误信息。"}</p>
        </div>
        <Badge tone={tone}>{failureCategoryLabel(diagnosis.category)}</Badge>
      </div>
      {diagnosis.evidence?.length ? (
        <div className="diagnosis-grid">
          <div>
            <strong>失败原因</strong>
            <ul>{diagnosis.evidence.slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          {diagnosis.userActions?.length ? (
            <div>
              <strong>建议操作</strong>
              <ul>{diagnosis.userActions.slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
