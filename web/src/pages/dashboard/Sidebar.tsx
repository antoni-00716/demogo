import { BrandLogo } from "../../components/BrandLogo";

type DashboardView = "overview" | "projects" | "upload" | "agent" | "plan" | "history" | "feedback";

export function Sidebar({
  activeView,
  setActiveView
}: {
  activeView: DashboardView;
  setActiveView: (view: DashboardView) => void;
}) {
  const items: Array<[DashboardView, string]> = [
    ["overview", "工作台"],
    ["upload", "生成新链接"],
    ["projects", "我的作品"],
    ["agent", "让 AI 帮我"],
    ["plan", "套餐与额度"],
    ["history", "生成记录"],
    ["feedback", "反馈问题"]
  ];
  return (
    <aside className="sidebar">
      <a className="brand" href="/">
        <BrandLogo />
      </a>
      <nav className="side-nav">
        {items.map(([view, label]) => (
          <button className={activeView === view ? "active" : ""} key={view} type="button" onClick={() => setActiveView(view)}>
            {label}
          </button>
        ))}
        <a href="/">返回首页</a>
      </nav>
    </aside>
  );
}
