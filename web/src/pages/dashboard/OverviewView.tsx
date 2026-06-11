import type { Demo, User, Quota } from "../../types";
import { Button } from "../../components/Button";
import { Sparkles, Upload, ArrowRight, CreditCard } from "lucide-react";

type DashboardView = "overview" | "projects" | "upload" | "agent" | "plan" | "history" | "feedback";


function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`ws-stat-card${accent ? " ws-stat-accent" : ""}`}>
      <span className="ws-stat-label">{label}</span>
      <strong className="ws-stat-value">{value}</strong>
      {sub && <span className="ws-stat-sub">{sub}</span>}
    </div>
  );
}
export function OverviewView({
  user,
  demos,
  quota,
  monthUsage,
  setActiveView,
  onCreate,
  onCopyLink,
  onCopyShare,
  onSelectDemo,
}: {
  user: User;
  demos: Demo[];
  quota: Quota | null;
  monthUsage: { used: number; limit: number } | null;
  setActiveView: (view: DashboardView) => void;
  onCreate: () => void;
  onCopyLink: (url?: string) => void;
  onCopyShare: (demo: Demo) => void;
  onSelectDemo: (id: string) => void;
}) {
  const onlineDemos = quota?.onlineDemos;
  const deploys = quota?.monthlyDeploys || monthUsage;
  const isFree = user.plan === "free";
  const totalVisits = demos.reduce((sum, d) => sum + (d.usage?.visits || 0), 0);

  const hasProjects = demos.length > 0;



  return (
    <div className="workspace-home">
      {/* ===== Welcome ===== */}
      <div className="ws-welcome">
        <div className="ws-welcome-row">
          <div className="ws-welcome-avatar">
            {user.email?.match(/[A-Za-z]/)?.[0]?.toUpperCase() || user.email?.slice(0,1).toUpperCase() || "U"}
          </div>
          <div>
            <h1 className="ws-greeting">你好，{user.email?.split("@")[0] || "用户"}</h1>
          </div>
        </div>
      </div>

      {/* ===== Stats row ===== */}
      <div className="ws-stats">
        <StatCard
          label="在线作品"
          value={`${onlineDemos?.used || 0}/${onlineDemos?.limit || 5}`}
          sub={onlineDemos ? `剩余 ${onlineDemos.limit - onlineDemos.used} 个位置` : undefined}
        />
        <StatCard
          label="本月发布"
          value={`${deploys?.used || 0}/${deploys?.limit || 10}`}
          sub={deploys ? `剩余 ${deploys.limit - deploys.used} 次` : undefined}
        />
        <StatCard
          label="累计访问"
          value={String(totalVisits)}
          sub="所有作品合计"
        />
        <div
          className="ws-stat-card ws-stat-accent"
          onClick={() => setActiveView("plan")}
          style={{ cursor: "pointer" }}
        >
          <span className="ws-stat-label">
            <CreditCard size={14} /> 当前套餐
          </span>
          <strong className="ws-stat-value">{user.planName || "Free"}</strong>
          <span className="ws-stat-sub">{isFree ? "了解升级套餐 →" : "查看套餐详情 →"}</span>
        </div>
      </div>

      {/* ===== Publish section ===== */}
      <div className="ws-section">
        <h2 className="ws-section-title">发布新作品</h2>
        <p className="ws-section-desc">你的项目在哪里？选一种方式开始</p>
        <div className="ws-publish-options">
          <button className="ws-publish-card" type="button" onClick={() => setActiveView("agent")}>
            <div className="ws-publish-icon">
              <Sparkles size={24} />
            </div>
            <div className="ws-publish-body">
              <strong>我的项目在 AI 工具里</strong>
              <span>在 Cursor / Codex / Windsurf 里做好了，告诉 AI 一句话就发布</span>
            </div>
            <ArrowRight size={16} />
          </button>
          <button className="ws-publish-card" type="button" onClick={onCreate}>
            <div className="ws-publish-icon">
              <Upload size={24} />
            </div>
            <div className="ws-publish-body">
              <strong>我有项目文件包</strong>
              <span>把项目打包成 zip，上传到这里，自动生成链接</span>
            </div>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* ===== Projects ===== */}
      <div className="ws-section">
        <div className="ws-section-head">
          <div>
            <h2 className="ws-section-title">{hasProjects ? "最近作品" : "你的作品"}</h2>
            {hasProjects && <p className="ws-section-desc">点击项目查看详情，或直接复制链接</p>}
          </div>
          {hasProjects && (
            <Button onClick={() => setActiveView("projects")} variant="ghost">
              查看全部 <ArrowRight size={14} />
            </Button>
          )}
        </div>
        {!hasProjects ? (
          <div className="ws-empty">
            <div className="ws-empty-icon"><Sparkles size={32} /></div>
            <h3>还没有作品</h3>
            <p>上方选一种方式开始发布，你的第一个作品就会出现在这里</p>
          </div>
        ) : (
          <div className="ws-project-list">
            {demos.slice(0, 5).map((demo) => (
              <div className="ws-project-card" key={demo.id} onClick={() => onSelectDemo(demo.id)}>
                <div className="ws-project-avatar">
                  {(demo.name || demo.slug || "D").slice(0, 1).toUpperCase()}
                </div>
                <div className="ws-project-info">
                  <strong>{demo.name || demo.slug}</strong>
                  <span className="ws-project-url">{demo.publicUrl || "链接暂不可用"}</span>
                  <span className="ws-project-meta">
                    {demo.usage?.visits || 0} 次访问
                    {demo.updatedAt ? ` · ${new Date(demo.updatedAt).toLocaleDateString("zh-CN")} 更新` : ""}
                  </span>
                </div>
                <div className="ws-project-actions" onClick={(e) => e.stopPropagation()}>
                  {demo.publicUrl && (
                    <>
                      <Button onClick={() => onCopyLink(demo.publicUrl)}>复制链接</Button>
                      <Button onClick={() => onCopyShare(demo)}>转发文案</Button>
                    </>
                  )}
                  <Button variant="ghost" onClick={() => onSelectDemo(demo.id)}>详情</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
