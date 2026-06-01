import type { Demo, User, PlanRequest, DeployEvent, Quota } from "../../types";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { QuickCreatePanel } from "../../components/dashboard/DashPanels";
import { DeployHistory } from "../../components/dashboard/DeployHistory";
import { UpgradeBanner } from "../../components/dashboard/DashPanels";
import { WorkspaceHero } from "./WorkspaceHero";

type DashboardView = "overview" | "projects" | "upload" | "agent" | "plan" | "history" | "feedback";
import { CompactDemoList } from "./CompactDemoList";

export function OverviewView({
  user,
  demos,
  quota,
  requests,
  events,
  monthUsage,
  setActiveView,
  onCreate,
  onCopyLink,
  onCopyShare
}: {
  user: User;
  demos: Demo[];
  quota: Quota | null;
  requests: PlanRequest[];
  events: DeployEvent[];
  monthUsage: { used: number; limit: number } | null;
  setActiveView: (view: DashboardView) => void;
  onCreate: () => void;
  onCopyLink: (url?: string) => void;
  onCopyShare: (demo: Demo) => void;
}) {
  const activeProjects = demos.filter((demo) => demo.status === "published").length;
  const latestDemo = demos.find((demo) => demo.status === "published") || demos[0];
  return (
    <div className="view-stack">
      <UpgradeBanner user={user} requests={requests} quota={quota} setActiveView={setActiveView} />
      <WorkspaceHero
        user={user}
        demos={demos}
        quota={quota}
        monthUsage={monthUsage}
        setActiveView={setActiveView}
        onCreate={onCreate}
      />
      <div className="dashboard-focus-row">
        <div className="focus-item strong">
          <span>当前重点</span>
          <strong>{activeProjects ? `${activeProjects} 个链接正在试用` : "先生成第一个可分享链接"}</strong>
        </div>
        <div className="focus-item">
          <span>最近项目</span>
          <strong>{latestDemo ? latestDemo.name || latestDemo.slug : "暂无项目"}</strong>
        </div>
        <div className="focus-item">
          <span>下一步建议</span>
          <strong>{demos.length ? "复制链接发给别人试用" : "上传作品或让 AI 帮你"}</strong>
        </div>
      </div>
      <div className="dashboard-project-workspace">
        <Card className="panel">
          <div className="panel-head">
            <div>
              <h2>最近试用项目</h2>
              <p>直接复制链接或转发文案，减少从工作台跳来跳去。</p>
            </div>
            <Button onClick={() => setActiveView("projects")}>查看全部</Button>
          </div>
          <CompactDemoList demos={demos.slice(0, 5)} onCopyLink={onCopyLink} onCopyShare={onCopyShare} />
        </Card>
        <div className="dashboard-side-stack">
          <QuickCreatePanel onCreate={onCreate} />
          <DeployHistory events={events.slice(0, 5)} monthUsage={monthUsage} compact />
        </div>
      </div>
    </div>
  );
}
