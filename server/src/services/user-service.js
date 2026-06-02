import { normalizePlanCode, plans } from "../config.js";

export function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    plan: user.plan || "free",
    planName: plans[user.plan || "free"]?.name || plans.free.name,
    createdAt: user.createdAt
  };
}

export function filterAdminUsers(users, filters = {}) {
  const search = String(filters.search || "").trim().toLowerCase();
  const plan = normalizePlanCode(filters.plan);
  return users.filter((user) => {
    if (plan && (user.plan || "free") !== plan) return false;
    if (!search) return true;
    return String(user.email || "").toLowerCase().includes(search);
  });
}

export function adminUserSummary(user, demos = [], calculateQuota) {
  const userDemos = demos.filter((demo) => demo.userId === user.id);
  const onlineDemos = userDemos.filter((demo) => demo.status === "published").length;
  return {
    ...publicUser(user),
    demoCount: userDemos.length,
    onlineDemoCount: onlineDemos,
    quota: calculateQuota ? calculateQuota(user, demos) : undefined
  };
}
