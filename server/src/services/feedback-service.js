export const feedbackStatuses = new Set(["open", "in_progress", "resolved", "closed"]);

export function publicFeedback(item) {
  return {
    id: item.id,
    userId: item.userId,
    userEmail: item.userEmail,
    demoId: item.demoId,
    demoSlug: item.demoSlug,
    type: item.type,
    typeLabel: feedbackTypeLabel(item.type),
    message: item.message,
    status: item.status || "open",
    statusLabel: feedbackStatusLabel(item.status),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

export function normalizeFeedbackType(value) {
  const type = String(value || "").trim();
  return ["deploy_failed", "form_data", "page_error", "suggestion", "other"].includes(type) ? type : "other";
}

export function feedbackTypeLabel(type) {
  const map = {
    deploy_failed: "发布失败",
    form_data: "表单数据",
    page_error: "页面打不开",
    suggestion: "功能建议",
    other: "其他问题"
  };
  return map[type] || map.other;
}

export function normalizeFeedbackStatus(value) {
  const status = String(value || "").trim();
  return feedbackStatuses.has(status) ? status : "";
}

export function feedbackStatusLabel(status) {
  const map = {
    open: "待处理",
    in_progress: "处理中",
    resolved: "已处理",
    closed: "已关闭"
  };
  return map[status] || map.open;
}

export function filterFeedback(items, filters = {}) {
  const search = String(filters.search || "").trim().toLowerCase();
  const type = String(filters.type || "").trim();
  const status = String(filters.status || "").trim();

  return items.filter((item) => {
    if (type && item.type !== type) return false;
    if (status && (item.status || "open") !== status) return false;
    if (!search) return true;
    return [
      item.userEmail,
      item.demoSlug,
      item.message,
      item.contact
    ].some((value) => String(value || "").toLowerCase().includes(search));
  });
}
