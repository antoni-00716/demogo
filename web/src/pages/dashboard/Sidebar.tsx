type DashboardView = "overview" | "projects" | "upload" | "agent" | "plan" | "history" | "feedback";

const items: Array<{ view: DashboardView; label: string; emoji: string }> = [
  { view: "overview", label: "总览", emoji: "📊" },
  { view: "projects", label: "我的作品", emoji: "📁" },
  { view: "upload", label: "上传发布", emoji: "⬆️" },
  { view: "agent", label: "AI 发布", emoji: "🤖" },
  { view: "history", label: "发布记录", emoji: "📋" },
  { view: "feedback", label: "反馈收集", emoji: "💬" },
  { view: "plan", label: "套餐额度", emoji: "📦" },
];

export function Sidebar({
  activeView,
  setActiveView,
  userName,
  userRole,
}: {
  activeView: DashboardView;
  setActiveView: (view: DashboardView) => void;
  userName: string;
  userRole: string;
}) {
  const avatarLetter = userName.charAt(0).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo"><span className="mark">◆</span>DemoGo</div>
      <nav className="sidebar-nav">
        {items.map(({ view, label, emoji }) => (
          <button
            className={`nav-item${activeView === view ? " active" : ""}`}
            key={view}
            type="button"
            onClick={() => setActiveView(view)}
          >
            <span aria-hidden="true">{emoji}</span>
            {label}
          </button>
        ))}
      </nav>
      <div className="sidebar-user">
        <div className="sidebar-avatar">{avatarLetter}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{userName}</div>
          <div className="sidebar-user-role">{userRole}</div>
        </div>
      </div>
    </aside>
  );
}
