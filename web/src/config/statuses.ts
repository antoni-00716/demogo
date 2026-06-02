export function demoStatusLabel(status?: string) {
  const map: Record<string, string> = {
    published: "试用中",
    offline: "已下线",
    expired: "已过期",
    deleted: "已删除",
    failed: "失败"
  };
  return map[status || ""] || "未知";
}

export function planRequestStatusLabel(status?: string) {
  const map: Record<string, string> = {
    open: "待处理",
    approved: "已开通",
    rejected: "已拒绝",
    canceled: "已取消"
  };
  return map[status || "open"] || "待处理";
}

export function feedbackStatusLabel(status?: string) {
  const map: Record<string, string> = {
    open: "待处理",
    in_progress: "处理中",
    resolved: "已处理",
    closed: "已关闭"
  };
  return map[status || "open"] || "待处理";
}
