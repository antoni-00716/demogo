import { Button } from "../../components/Button";
import type { Demo } from "../../types";
import type { Inspection } from "../../api/demos";
import { FailureDiagnosisPanel } from "../../components/dashboard/FailureDiagnosisPanel";

export function DemoFailureDiagnosisPanel({
  demo,
  inspection,
  onCopyText
}: {
  demo: Demo;
  inspection: Inspection | null;
  onCopyText: (text: string, successMessage?: string) => void;
}) {
  const diagnosis = demo.failureDiagnosis || demo.runtime?.failureDiagnosis || inspection?.failureDiagnosis || null;
  if (!diagnosis) return null;
  return (
    <div className="hosting-architecture failure-diagnosis-panel">
      <FailureDiagnosisPanel diagnosis={diagnosis} />
      {diagnosis.aiPrompt ? (
        <div className="row-actions compact">
          <Button onClick={() => onCopyText(diagnosis.aiPrompt || "", "失败修复说明已复制。")}>复制给 AI 怎么改</Button>
        </div>
      ) : null}
    </div>
  );
}
