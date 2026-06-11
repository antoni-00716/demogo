import { BrandLogo } from "../../components/BrandLogo";
import {
  LayoutDashboard,
  FolderOpen,
  CreditCard,
  MessageSquare,
  Home,
} from "lucide-react";

type DashboardView = "overview" | "projects" | "upload" | "agent" | "plan" | "history" | "feedback";

const items: Array<{ view: DashboardView; label: string; icon: typeof LayoutDashboard }> = [
  { view: "overview", label: "工作台", icon: LayoutDashboard },
  { view: "projects", label: "我的作品", icon: FolderOpen },
  { view: "plan", label: "套餐与额度", icon: CreditCard },
  { view: "feedback", label: "反馈", icon: MessageSquare },
];

export function Sidebar({
  activeView,
  setActiveView,
}: {
  activeView: DashboardView;
  setActiveView: (view: DashboardView) => void;
}) {
  return (
    <aside className="sidebar">
      <a className="brand" href="/">
        <BrandLogo />
      </a>
      <nav className="side-nav">
        {items.map(({ view, label, icon: Icon }) => (
          <button
            className={activeView === view ? "active" : ""}
            key={view}
            type="button"
            onClick={() => setActiveView(view)}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
        <a href="/">
          <Home size={18} />
          <span>返回首页</span>
        </a>
      </nav>
    </aside>
  );
}
