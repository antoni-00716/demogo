import { normalizePlanCode, plans } from "../config.js";

export const planRequestStatuses = new Set(["open", "approved", "rejected", "canceled"]);

export function normalizeRequestedPlan(value) {
  const plan = normalizePlanCode(value);
  return plan && plan !== "free" ? plan : "";
}

export function normalizePlanRequestStatus(value) {
  const status = String(value || "").trim();
  return planRequestStatuses.has(status) ? status : "";
}

export function publicPlanRequest(item) {
  return {
    id: item.id,
    userId: item.userId,
    userEmail: item.userEmail,
    currentPlan: item.currentPlan || "free",
    currentPlanName: plans[item.currentPlan || "free"]?.name || plans.free.name,
    requestedPlan: item.requestedPlan,
    requestedPlanName: plans[item.requestedPlan]?.name || item.requestedPlan,
    status: item.status || "open",
    statusLabel: planRequestStatusLabel(item.status),
    contact: item.contact || "",
    message: item.message || "",
    adminNote: item.adminNote || "",
    handledAt: item.handledAt || null,
    handledBy: item.handledBy || "",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

export function filterPlanRequests(items, filters = {}) {
  const search = String(filters.search || "").trim().toLowerCase();
  const status = normalizePlanRequestStatus(filters.status);
  const requestedPlan = normalizeRequestedPlan(filters.plan);

  return items.filter((item) => {
    if (status && (item.status || "open") !== status) return false;
    if (requestedPlan && item.requestedPlan !== requestedPlan) return false;
    if (!search) return true;
    return [
      item.userEmail,
      item.contact,
      item.message,
      item.currentPlan,
      item.requestedPlan
    ].some((value) => String(value || "").toLowerCase().includes(search));
  });
}

export function planRequestStatusLabel(status) {
  const map = {
    open: "待处理",
    approved: "已开通",
    rejected: "已拒绝",
    canceled: "已取消"
  };
  return map[status || "open"] || map.open;
}
