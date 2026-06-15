import type { AdminView } from "./AdminSidebar";

export function adminViewTitle(view: AdminView) {
  const titles: Record<AdminView, string> = {
    overview: "今日待处理",
    requests: "升级申请",
    subdomains: "二级域名",
    demos: "作品管理",
    runtime: "运行状态",
    reviews: "内容检查",
    forms: "报名/留言",
    feedback: "用户问题",
    users: "用户",
    settings: "系统设置",
    analytics: "数据分析"
  };
  return titles[view];
}

export function adminViewSubtitle(view: AdminView) {
  const subtitles: Record<AdminView, string> = {
    overview: "先看今天要处理什么，再判断真实试用是否顺畅。",
    requests: "用户申请 Lite 或 Pro 后，在这里直接开通或拒绝。",
    subdomains: "处理 Pro 用户提交的二级域名申请。",
    demos: "查看作品状态、访问量和需要注意的问题，必要时下线或删除。",
    runtime: "查看运行环境和试用数据库状态，必要时停止运行实例。",
    reviews: "查看发布前内容检查结果，重点处理已拦截和待人工确认的内容。",
    forms: "查看用户通过 DemoGo 收到的报名、预约和留言记录。",
    feedback: "跟进真实试用中的问题，标记处理状态。",
    users: "查看用户套餐、在线试用项目和注册时间。",
    settings: "确认当前试用阶段的套餐命名、升级流程和产品范围。",
    analytics: "查看平台核心指标、热门 Demo 和用户增长趋势。"
  };
  return subtitles[view];
}

export function resolveInitialAdminView(): AdminView {
  const hash = window.location.hash.replace("#", "").toLowerCase();
  if (hash === "requests" || hash === "plans") return "requests";
  if (hash === "subdomains") return "subdomains";
  if (hash === "demos" || hash === "projects") return "demos";
  if (hash === "runtime" || hash === "runtimes") return "runtime";
  if (hash === "reviews" || hash === "content") return "reviews";
  if (hash === "forms") return "forms";
  if (hash === "feedback") return "feedback";
  if (hash === "users") return "users";
  if (hash === "settings") return "settings";
  return "overview";
}
