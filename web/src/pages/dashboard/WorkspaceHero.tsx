import type { User, Quota } from "../../types";
import { planName } from "../../config/plans";

type DashboardView = "overview" | "projects" | "upload" | "agent" | "plan" | "history" | "feedback";

export function WorkspaceHero({
  user,
  quota,
  monthUsage,
  demos,
}: {
  user: User;
  quota: Quota | null;
  monthUsage: { used: number; limit: number } | null;
  setActiveView?: (view: DashboardView) => void;
  onCreate?: () => void;
  demos?: unknown[];
}) {
  const online = quota?.onlineDemos;
  const deploys = quota?.monthlyDeploys || monthUsage;

  return (
    <>
    <div className="welcome-bar">
      <div className="welcome-greeting">
        <span className="welcome-avatar">
          {(user.email || "U").slice(0, 1).toUpperCase()}
        </span>
        <div>
          <strong>你好，{user.email?.split("@")[0] || "用户"}</strong>
          <span>
            {planName(user.plan)} · 在线 {online?.used || 0}/{online?.limit || 1} · 本月 {deploys?.used || 0}/{deploys?.limit || 0} 次
          </span>
        </div>
      </div>
    </div>
    {demos && demos.length === 0 ? (
      <div className="onboarding-banner">
        <div className="onboarding-content">
          <strong>欢迎来到 DemoGo</strong>
          <span>上传你的项目文件，立刻生成一个可分享的试用链接。</span>
        </div>
        <div className="onboarding-steps">
          <span>1. 上传文件</span>
          <span className="onboarding-arrow">&rarr;</span>
          <span>2. 选择发布方式</span>
          <span className="onboarding-arrow">&rarr;</span>
          <span>3. 分享链接</span>
        </div>
      </div>
    ) : null}
    </>
  );
}
