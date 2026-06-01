// DemoGo v0.9.14 - Failure diagnosis panel (extracted from UserDashboard)
import { Badge } from "../Badge";
import type { FailureDiagnosis } from "../../types";

function failureCategoryLabel(category?: string) {
  const labels: Record<string, string> = {
    quota: "??",
    content: "??",
    package: "???",
    unsupported: "????",
    runtime_env: "????",
    dependency_install: "??",
    build: "??",
    runtime_start: "??",
    database_init: "???"
  };
  return labels[category || ""] || "??";
}

export function FailureDiagnosisPanel({ diagnosis }: { diagnosis: FailureDiagnosis }) {
  const tone = diagnosis.severity === "blocked" ? "warning" : "info";
  return (
    <div className="failure-diagnosis">
      <div className="section-mini-head">
        <div>
          <h3>{diagnosis.title || "????"}</h3>
          <p>{diagnosis.summary || "????????????????????"}</p>
        </div>
        <Badge tone={tone}>{failureCategoryLabel(diagnosis.category)}</Badge>
      </div>
      {diagnosis.evidence?.length ? (
        <div className="diagnosis-grid">
          <div>
            <strong>????</strong>
            <ul>{diagnosis.evidence.slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          {diagnosis.userActions?.length ? (
            <div>
              <strong>???</strong>
              <ul>{diagnosis.userActions.slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
