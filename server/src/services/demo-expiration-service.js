// DemoGo v0.9.7 - Demo 到期提醒服务
// Free 套餐 Demo 7 天到期前 24 小时发送邮件提醒

import { plans } from "../config.js";

/**
 * 检查即将到期的 Demo 并发送提醒邮件
 */
export async function checkAndRemindExpiringDemos({
  readJson,
  writeJson,
  demosFile,
  usersFile,
  isEmailConfigured,
  sendExpirationEmail,
  isExpired,
}) {
  const result = { reminded: 0, errors: 0 };

  if (!isEmailConfigured || !isEmailConfigured()) {
    return { ...result, skipped: true, reason: "邮件服务未配置" };
  }

  let demos, users;
  try {
    demos = await readJson(demosFile, []);
    users = await readJson(usersFile, []);
  } catch (err) {
    return { ...result, errors: 1, reason: "读取数据失败: " + (err.message || err) };
  }

  const now = Date.now();
  const reminderWindowMs = 24 * 60 * 60 * 1000; // 24 小时
  let demosModified = false;

  for (const demo of demos) {
    if (demo.status !== "online" && demo.status !== "published") continue;
    if (!demo.expiresAt) continue;

    const expiresAt = new Date(demo.expiresAt).getTime();
    const timeUntilExpiry = expiresAt - now;

    if (timeUntilExpiry <= 0 || timeUntilExpiry > reminderWindowMs) continue;

    // 检查是否已发送过提醒
    if (demo.expiryRemindedAt) {
      const lastReminded = new Date(demo.expiryRemindedAt).getTime();
      if (now - lastReminded < 12 * 60 * 60 * 1000) continue;
    }

    const user = users.find((u) => u.id === demo.userId);
    if (!user || !user.email) continue;

    const plan = plans[user.plan || "free"] || plans.free;
    if (plan.code !== "free") continue;

    const hoursLeft = Math.max(1, Math.round(timeUntilExpiry / (60 * 60 * 1000)));

    try {
      await sendExpirationEmail(user.email, {
        demoName: demo.name || demo.projectTitle || "未命名项目",
        demoSlug: demo.slug || demo.id,
        hoursLeft,
        expiresAt: demo.expiresAt,
      });

      demo.expiryRemindedAt = new Date().toISOString();
      demosModified = true;
      result.reminded++;
    } catch (err) {
      console.error("[到期提醒] 发送失败:", demo.id, err.message);
      result.errors++;
    }
  }

  if (demosModified) {
    try {
      await writeJson(demosFile, demos);
    } catch (err) {
      console.error("[到期提醒] 保存提醒标记失败:", err.message);
      result.errors++;
    }
  }

  return result;
}

/**
 * 获取 Demo 到期状态信息
 */
export function getDemoExpiryStatus(demo) {
  if (!demo.expiresAt) return { isExpiring: false, hoursLeft: 0, label: "" };

  const now = Date.now();
  const expiresAt = new Date(demo.expiresAt).getTime();
  const timeLeft = expiresAt - now;

  if (timeLeft <= 0) {
    return { isExpiring: true, hoursLeft: 0, label: "已过期" };
  }

  const hoursLeft = Math.round(timeLeft / (60 * 60 * 1000));
  const daysLeft = Math.floor(hoursLeft / 24);

  if (daysLeft <= 0) {
    return { isExpiring: true, hoursLeft, label: "将在 " + hoursLeft + " 小时后到期" };
  }
  if (daysLeft <= 1) {
    return { isExpiring: true, hoursLeft, label: "将在 1 天后到期" };
  }
  if (daysLeft <= 3) {
    return { isExpiring: false, hoursLeft, label: "剩余 " + daysLeft + " 天" };
  }
  return { isExpiring: false, hoursLeft, label: "" };
}