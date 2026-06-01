import type { Demo, User, Quota } from "../../types";

import { Button } from "../../components/Button";
import { Badge } from "../../components/Badge";
import { planName } from "../../config/plans";

type DashboardView = "overview" | "projects" | "upload" | "agent" | "plan" | "history" | "feedback";
export function WorkspaceHero({
  user,
  demos,
  quota,
  monthUsage,
  setActiveView,
  onCreate
}: {
  user: User;
  demos: Demo[];
  quota: Quota | null;
  monthUsage: { used: number; limit: number } | null;
  setActiveView: (view: DashboardView) => void;
  onCreate: () => void;
}) {
  const online = quota?.onlineDemos;
  const deploys = quota?.monthlyDeploys || monthUsage;
  return (
    <section className="workspace-hero">
      <div className="workspace-hero-copy">
        <Badge tone="success">工作台</Badge>
        <h2>先生成一个能发出去的链接，再看真实反馈。</h2>
        <p>
          上传 AI 做好的页面，DemoGo 会先检查能不能打开、表单能不能收、内容是否适合公开分享，再生成访问链接和转发文案。
        </p>
        <div className="hero-proof dashboard-proof">
          <span>免服务器</span>
          <span>免域名配置</span>
          <span>发布前检查</span>
          <span>复制转发文案</span>
        </div>
        <div className="workspace-hero-primary-actions">
          <Button variant="primary" onClick={onCreate}>生成新链接</Button>
          <Button onClick={() => setActiveView("agent")}>让 AI 帮我发布</Button>
          <Button onClick={() => setActiveView("projects")}>查看试用项目</Button>
        </div>
      </div>
      <div className="workspace-hero-status">
        <strong>{user.planName || quota?.plan?.name || planName(user.plan)}</strong>
        <span>当前套餐</span>
        <small>{online?.used || 0}/{online?.limit || 1} 在线试用项目 · {deploys?.used || 0}/{deploys?.limit || 0} 本月生成/更新</small>
      </div>
      <div className="workspace-hero-stats" aria-label="当前使用情况">
        <div>
          <strong>{online?.used || 0}/{online?.limit || 1}</strong>
          <span>在线试用项目</span>
        </div>
        <div>
          <strong>{deploys?.used || 0}/{deploys?.limit || 0}</strong>
          <span>本月生成/更新</span>
        </div>
        <div>
          <strong>{demos.length}</strong>
          <span>累计项目</span>
        </div>
      </div>
    </section>
  );
}
