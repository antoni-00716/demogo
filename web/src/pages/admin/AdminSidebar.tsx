export type AdminView = "overview" | "requests" | "subdomains" | "demos" | "runtime" | "reviews" | "forms" | "feedback" | "users" | "settings" | "analytics";

// Map: internal view name → display config
const itemConfig: Record<string, { label: string; emoji: string; badge?: string }> = {
  overview:   { label: "总览", emoji: "📊" },
  users:      { label: "用户管理", emoji: "👥", badge: "12" },
  requests:   { label: "升级申请", emoji: "👥" },
  subdomains: { label: "二级域名", emoji: "📁" },
  demos:      { label: "Demo 管理", emoji: "📁" },
  runtime:    { label: "运行状态", emoji: "📁" },
  reviews:    { label: "内容审核", emoji: "🔍" },
  feedback:   { label: "反馈管理", emoji: "📬" },
  forms:      { label: "表单管理", emoji: "📋" },
  analytics:  { label: "数据分析", emoji: "📈" },
  settings:   { label: "系统设置", emoji: "⚙️" },
};

// Display order (first 8 shown in sidebar)
const displayOrder: AdminView[] = [
  "overview", "users", "demos", "reviews",
  "feedback", "forms", "analytics", "settings",
];

export function AdminSidebar({
  activeView,
  setActiveView
}: {
  activeView: AdminView;
  setActiveView: (view: AdminView) => void;
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo"><span className="mark">◆</span>DemoGo<span className="tag">管理</span></div>
      <nav className="sidebar-nav">
        {displayOrder.map((view) => {
          const cfg = itemConfig[view];
          return (
            <button
              className={`nav-item${activeView === view ? " active" : ""}`}
              key={view}
              type="button"
              onClick={() => setActiveView(view)}
            >
              <span aria-hidden="true">{cfg.emoji}</span>
              {cfg.label}
              {cfg.badge ? <span className="badge">{cfg.badge}</span> : null}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-user">
        <div className="sidebar-avatar">A</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">admin@demogo.app</div>
          <div className="sidebar-user-role">管理员</div>
        </div>
      </div>
    </aside>
  );
}
