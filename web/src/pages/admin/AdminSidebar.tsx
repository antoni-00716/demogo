import { BrandLogo } from "../../components/BrandLogo";

export type AdminView = "overview" | "requests" | "subdomains" | "demos" | "runtime" | "reviews" | "forms" | "feedback" | "users" | "settings";

export function AdminSidebar({
  activeView,
  setActiveView
}: {
  activeView: AdminView;
  setActiveView: (view: AdminView) => void;
}) {
  const items: Array<[AdminView, string]> = [
    ["overview", "今日待处理"],
    ["requests", "升级申请"],
    ["subdomains", "二级域名"],
    ["demos", "作品管理"],
    ["runtime", "运行状态"],
    ["reviews", "内容检查"],
    ["forms", "报名/留言"],
    ["feedback", "用户问题"],
    ["users", "用户"],
    ["settings", "系统设置"]
  ];
  return (
    <aside className="sidebar admin-sidebar">
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
