import type { Demo, DeploymentStep, FailureDiagnosis } from "../../types";
import { Button, LinkButton } from "../../components/Button";
import { PackageOpen, ScanSearch, Cog, ShieldCheck, Link, CheckCircle, AlertTriangle, Loader } from "lucide-react";

const stepLabels = [
  { key: "receive", label: "接收项目", icon: PackageOpen },
  { key: "inspect", label: "检查项目", icon: ScanSearch },
  { key: "build", label: "准备上线", icon: Cog },
  { key: "review", label: "内容审核", icon: ShieldCheck },
  { key: "publish", label: "生成链接", icon: Link },
];

function mapToStage(stepType: string): string {
  const map: Record<string, string> = {
    receive: "receive", extract: "receive",
    security_check: "inspect", inspect: "inspect",
    build: "build", database: "build",
    content_review: "review", form_hosting: "review",
    publish: "publish", success: "publish",
  };
  return map[stepType] || "inspect";
}

export function DeployProgressModal({
  steps,
  deploying,
  latestDemo,
  failureDiagnosis,
  onClose,
  onCopyLink,
  onCopyShare,
}: {
  steps: DeploymentStep[];
  deploying: boolean;
  latestDemo: Demo | null;
  failureDiagnosis?: FailureDiagnosis | null;
  onClose: () => void;
  onCopyLink: (url?: string) => void;
  onCopyShare: (demo: Demo) => void;
}) {
  const failed = failureDiagnosis || steps.some((s) => s.status === "failed");
  const succeeded = latestDemo && !deploying && !failed;

  // Compute which stages are done
  const completedStages = new Set<string>();
  let currentStage = "receive";
  if (steps.length) {
    for (const step of steps) {
      if (step.status === "success") completedStages.add(mapToStage(step.eventType));
      if (step.status === "in_progress") currentStage = mapToStage(step.eventType);
    }
  } else {
    currentStage = "receive";
  }

  const progressPercent = succeeded ? 100 : failed ? Math.max(20, (completedStages.size / 5) * 100) : Math.max(5, (completedStages.size / 5) * 100 + 5);

  return (
    <div className="deploy-overlay" role="dialog" aria-modal="true">
      <div className="deploy-modal">
        {/* Icon */}
        <div className={`deploy-modal-icon ${succeeded ? "success" : failed ? "failed" : ""}`}>
          {succeeded ? <CheckCircle size={32} /> : failed ? <AlertTriangle size={32} /> : <Loader size={32} />}
        </div>

        {/* Title */}
        <h2>{succeeded ? "发布成功！" : failed ? "发布未完成" : "正在发布..."}</h2>

        {/* Progress bar */}
        {!succeeded && !failed ? (
          <>
            <div className="deploy-progress-bar">
              <div className="deploy-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="deploy-steps-row">
              {stepLabels.map((s) => {
                const isDone = completedStages.has(s.key);
                const isCurrent = s.key === currentStage;
                return (
                  <div key={s.key} className={`deploy-step-dot ${isDone ? "done" : ""} ${isCurrent ? "current" : ""}`} />
                );
              })}
            </div>
            <p className="deploy-status-text">
              {steps.length ? steps[steps.length - 1].message || "处理中..." : "正在接收你的项目..."}
            </p>
          </>
        ) : null}

        {/* Success */}
        {succeeded ? (
          <>
            <p className="deploy-link">{latestDemo.publicUrl}</p>
            <div className="deploy-modal-actions">
              <LinkButton href={latestDemo.publicUrl || "#"} target="_blank" variant="primary">打开试用</LinkButton>
              <Button onClick={() => onCopyLink(latestDemo.publicUrl)}>复制链接</Button>
              <Button onClick={() => onCopyShare(latestDemo)}>转发文案</Button>
            </div>
            <Button variant="ghost" onClick={onClose}>返回工作台</Button>
          </>
        ) : null}

        {/* Failed */}
        {failed ? (
          <>
            <p className="deploy-status-text">
              {failureDiagnosis?.summary || "发布失败了，请根据提示调整后重试"}
            </p>
            {failureDiagnosis?.aiPrompt ? (
              <div className="agent-prompt-box">
                {failureDiagnosis.aiPrompt}
                <Button onClick={() => navigator.clipboard.writeText(failureDiagnosis.aiPrompt || "")}>复制</Button>
              </div>
            ) : null}
            <div className="deploy-modal-actions">
              <Button variant="primary" onClick={onClose}>重新上传</Button>
              <Button variant="ghost" onClick={onClose}>返回工作台</Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
