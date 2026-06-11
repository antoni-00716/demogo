// DemoGo v0.9.3 - User-facing deploy event summaries
// Aggregates deployment events across user demos for display

import { plans } from "../config.js";
import { getDeployEvents, planName } from "./quota-service.js";

export function userDeployEvents(user, demos, options = {}) {
  const limit = Number(options.limit || 50);
  const monthStart = startOfCurrentMonth();
  const userDemos = demos.filter((demo) => demo.userId === user.id);
  const events = userDemos.flatMap((demo) => {
    return getDeployEvents(demo).map((event, index) => ({
      id: `${demo.id}-${event.type || event.eventType || "deploy"}-${event.at || index}`,
      demoId: demo.id,
      demoSlug: demo.slug,
      demoName: demo.name || demo.slug,
      demoStatus: demo.status,
      type: normalizeDeployEventType(event),
      typeLabel: deployEventLabel(event),
      at: event.at || demo.createdAt,
      version: Number(event.version || index + 1),
      publicUrl: demo.publicUrl || null
    }));
  })
    .filter((event) => event.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at));

  const monthlyEvents = events.filter((event) => new Date(event.at) >= monthStart);
  const plan = plans[user.plan || "free"] || plans.free;

  return {
    events: events.slice(0, limit),
    month: {
      startsAt: monthStart.toISOString(),
      used: monthlyEvents.length,
      limit: plan.monthlyDeployLimit,
      plan: user.plan || "free",
      planName: planName(user.plan || "free")
    }
  };
}

function startOfCurrentMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function normalizeDeployEventType(event) {
  // Support both old job-style (type field) and new step-style (detail.action)
  if (event && typeof event === "object") {
    if (event.type === "update" || event.detail?.action === "update") return "update";
    return "create";
  }
  return event === "update" ? "update" : "create";
}

function deployEventLabel(event) {
  // Support both old job-style (type field) and new step-style (detail.action)
  if (event && typeof event === "object") {
    if (event.type === "update" || event.detail?.action === "update") return "更新 Demo";
    return "发布 Demo";
  }
  return event === "update" ? "更新 Demo" : "发布 Demo";
}
