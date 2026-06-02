import { plans } from "../config.js";
import { isExpired as defaultIsExpired } from "../lib/slug-utils.js";

export function calculateQuota(user, allDemos, _isExpired) {
  const isExpired = typeof _isExpired === "function" ? _isExpired : defaultIsExpired;
  const plan = plans[user.plan || "free"] || plans.free;
  const userDemos = allDemos.filter((demo) => demo.userId === user.id);
  const liveDemos = userDemos.filter((demo) => demo.status === "published" && !isExpired(demo));
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthlyDeploys = userDemos.reduce((count, demo) => {
    return count + getDeployEvents(demo).filter((event) => new Date(event.at) >= monthStart).length;
  }, 0);

  return {
    plan,
    onlineDemos: {
      used: liveDemos.length,
      limit: plan.maxOnlineDemos
    },
    monthlyDeploys: {
      used: monthlyDeploys,
      limit: plan.monthlyDeployLimit
    },
    retentionDays: plan.demoRetentionDays
  };
}

export function getDeployEvents(demo) {
  const events = demo.deployEvents || demo.deploymentEvents;
  if (Array.isArray(events) && events.length) {
    return events.filter((event) => event?.at || event?.createdAt);
  }

  return demo.createdAt ? [{ type: "create", at: demo.createdAt }] : [];
}

export function planName(planCode) {
  return plans[planCode || "free"]?.name || plans.free.name;
}
