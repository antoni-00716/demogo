// DemoGo v0.9.8 - admin routes (refactored: direct imports + deps for middleware only)
import crypto from "node:crypto";
import { join as pathJoin } from "node:path";
import { dataDir, plans, adminUser, publicBaseUrl, smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom } from "../config.js";
import logger from "../lib/logger.js";
import { isEmailConfigured } from "../email/mailer.js";
import { readJson, writeJson } from "../lib/data-access.js";
import { calculateQuota } from "../services/quota-service.js";
import { writeAuditLog } from "../lib/audit-log.js";
import { getClientIp } from "../lib/request-utils.js";
// writeTrialEvent - passed via deps (server-local wrapper)
import { filterAdminDemos, adminDemoSummary, publicUserDemo, mergeRuntimeEnv, summarizeRuntimeOps, adminRuntimeDemoSummary } from "../lib/admin-helpers.js";
import { adminUserSummary, filterAdminUsers, publicUser } from "../services/user-service.js";
import { contentReviewStatusLabel, contentReviewResolutionStatus, normalizeContentReviewResolutionStatus, publicAdminContentReview } from "../services/content-review-service.js";
import { filterPlanRequests, normalizePlanRequestStatus, publicPlanRequest } from "../services/plan-request-service.js";
import { filterFeedback, normalizeFeedbackStatus, publicFeedback } from "../services/feedback-service.js";
import { filterAdminForms, publicForm, publicFormSubmission } from "../services/form-service.js";
import { filterSubdomainRequests, summarizeFailureReasons, summarizeTrialFunnel, summarizeDeploySources, normalizeSubdomainRequestStatus, subdomainRequestStatusLabel } from "../services/trial-analytics-service.js";
import { getDeployEvents } from "../services/quota-service.js";
import { listRuntimeRecords, stopRuntime } from "../services/runtime-service.js";
import { createApplicationReadiness } from "../services/application-readiness-service.js";

const demosFile = pathJoin(dataDir, "demos.json");
const usersFile = pathJoin(dataDir, "users.json");
const feedbackFile = pathJoin(dataDir, "feedback.json");
const planRequestsFile = pathJoin(dataDir, "plan-upgrade-requests.json");
const subdomainRequestsFile = pathJoin(dataDir, "subdomain-requests.json");
const formsFile = pathJoin(dataDir, "forms.json");
const formSubmissionsFile = pathJoin(dataDir, "form-submissions.json");
const contentReviewsFile = pathJoin(dataDir, "content-reviews.json");
const auditLogsFile = pathJoin(dataDir, "audit-logs.json");
const deploymentEventsFile = pathJoin(dataDir, "deployment-events.json");
const trialEventsFile = pathJoin(dataDir, "trial-events.json");

export function registerAdminRoutes(app, {
    requireAdmin,
    flushUsageStats,
    svcReadDeploymentEventsForDemo,
    removeDemoFiles,
    deleteDemoFiles,
    hostingConfig,
    writeTrialEvent,
sendSmtpMail,
      }) {
app.get("/api/admin/overview", requireAdmin, async (req, res, next) => {
    try {
      await flushUsageStats();
      const [users, demos, feedback, planRequests, forms, formSubmissions, contentReviews, auditLogs, deploymentEvents, trialEvents] = await Promise.all([
        readJson(usersFile, []),
        readJson(demosFile, []),
        readJson(feedbackFile, []),
        readJson(planRequestsFile, []),
        readJson(formsFile, []),
        readJson(formSubmissionsFile, []),
        readJson(contentReviewsFile, []),
        readJson(auditLogsFile, []),
        readJson(deploymentEventsFile, []),
        readJson(trialEventsFile, [])
      ]);
      const search = String(req.query?.search || "").trim().toLowerCase();
      const status = String(req.query?.status || "").trim();
      const userSearch = String(req.query?.user || "").trim().toLowerCase();
      const demoSearch = String(req.query?.demo || "").trim().toLowerCase();
      const liveDemos = demos.filter((demo) => demo.status === "published");
      const offlineDemos = demos.filter((demo) => demo.status === "offline");
      const expiredDemos = demos.filter((demo) => demo.status === "expired");
      const deletedDemos = demos.filter((demo) => demo.status === "deleted");
      const failedDemos = demos.filter((demo) => demo.status === "failed");
      const filteredUsers = filterAdminUsers(users, { search: search || userSearch });
      const filteredDemos = filterAdminDemos(demos, {
        search: search || demoSearch,
        status
      });
      const latestDemos = filteredDemos.slice(0, 50);
      const latestFeedback = feedback.slice(0, 20);
      const totalVisits = demos.reduce((sum, demo) => sum + Number(demo.usage?.visits || 0), 0);
      const totalEstimatedBytes = demos.reduce((sum, demo) => sum + Number(demo.usage?.estimatedBytes || 0), 0);
      const aiDeployAuditLogs = auditLogs.filter((item) => item.action === "agent_deploy_demo");
      const failedDeploymentEvents = deploymentEvents.filter((item) => item.status === "failed");
      const failureReasonCounts = summarizeFailureReasons(failedDeploymentEvents, contentReviews);
      const trialFunnel = summarizeTrialFunnel(trialEvents, deploymentEvents, auditLogs, users);
      const sourceBreakdown = summarizeDeploySources(auditLogs, demos);
      const runtimeSummary = summarizeRuntimeOps(demos);
      const planCounts = users.reduce((acc, user) => {
        acc[user.plan] = (acc[user.plan] || 0) + 1;
        return acc;
      }, {});
  
      res.json({
        request: publicPlanRequest(requests[requestIndex]),
        user: updatedUser ? adminUserSummary(updatedUser, demos, calculateQuota) : null
      });

      // Send email notification on approval
      if (nextStatus === "approved" && request.userEmail && isEmailConfigured({ smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom })) {
        try {
          const planLabel = plans[request.requestedPlan]?.name || request.requestedPlan;
          const subject = `[DemoGo] 你的套餐已升级为 ${planLabel}`;
          const text = [
            `你的 DemoGo 套餐已从 ${plans[request.currentPlan || "free"]?.name || "Free"} 升级为 ${planLabel}。`,
            "",
            "现在你可以：",
            `- 最多 ${plans[request.requestedPlan]?.maxOnlineDemos || "更多"} 个在线试用项目`,
            `- 每月 ${plans[request.requestedPlan]?.monthlyDeployLimit || "更多"} 次生成/更新`,
            `- 项目保留 ${plans[request.requestedPlan]?.demoRetentionDays || "更多"} 天`,
            "",
            "登录工作台开始使用：",
            `${publicBaseUrl || "https://demogo.cn"}/dashboard`,
            "",
            "如有问题，请联系客服微信：demogocn",
            "",
            "-- DemoGo 团队"
          ].join("\n");
          const html = `<div style="max-width:560px;margin:0 auto;font-family:-apple-system,sans-serif;">
            <h2 style="color:#1a1a2e;">恭喜，你的套餐已升级！</h2>
            <p>你的 DemoGo 套餐已从 <strong>${plans[request.currentPlan || "free"]?.name || "Free"}</strong> 升级为 <strong style="color:#06b6d4;">${planLabel}</strong>。</p>
            <div style="background:#f0fdfa;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #99f6e4;">
              <p style="margin:4px 0;"><strong>升级后你可以：</strong></p>
              <ul>
                <li>最多 ${plans[request.requestedPlan]?.maxOnlineDemos || "更多"} 个在线试用项目</li>
                <li>每月 ${plans[request.requestedPlan]?.monthlyDeployLimit || "更多"} 次生成/更新</li>
                <li>项目保留 ${plans[request.requestedPlan]?.demoRetentionDays || "更多"} 天</li>
              </ul>
            </div>
            <p><a href="${publicBaseUrl || "https://demogo.cn"}/dashboard" style="display:inline-block;background:#06b6d4;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;">登录工作台</a></p>
            <p style="color:#888;font-size:12px;margin-top:24px;">如有问题，请联系客服微信：demogocn | -- DemoGo 团队</p>
          </div>`;
          await sendSmtpMail({ to: request.userEmail, subject, text, html });
        } catch (emailError) {
          logger.warn({ err: emailError }, "发送套餐升级通知邮件失败");
        }
      }
  } catch (error) {
    next(error);
  }
});
  app.get("/api/admin/feedback", requireAdmin, async (req, res, next) => {
    try {
      const feedback = await readJson(feedbackFile, []);
      const filtered = filterFeedback(feedback, {
        search: req.query?.search,
        type: req.query?.type,
        status: req.query?.status
      });
      res.json({
        feedback: filtered.slice(0, 200).map(publicFeedback)
      });
    } catch (error) {
      next(error);
    }
  });
  app.post("/api/admin/feedback/:id/status", requireAdmin, async (req, res, next) => {
  try {
    const nextStatus = normalizeFeedbackStatus(req.body?.status);
    if (!nextStatus) {
      res.status(400).json({ error: "请选择有效反馈状态" });
      return;
    }

    const feedback = await readJson(feedbackFile, []);
    const feedbackIndex = feedback.findIndex((item) => item.id === req.params.id);
    if (feedbackIndex === -1) {
      res.status(404).json({ error: "未找到反馈" });
      return;
    }

    const previousStatus = feedback[feedbackIndex].status || "open";
    feedback[feedbackIndex] = {
      ...feedback[feedbackIndex],
      status: nextStatus,
      updatedAt: new Date().toISOString()
    };
    await writeJson(feedbackFile, feedback);
    await writeAuditLog({
      action: "admin_update_feedback_status",
      actorType: "admin",
      targetType: "feedback",
      targetId: feedback[feedbackIndex].id,
      ip: getClientIp(req),
      metadata: {
        previousStatus,
        nextStatus,
        userEmail: feedback[feedbackIndex].userEmail,
        demoSlug: feedback[feedbackIndex].demoSlug
      }
    });

    res.json({ feedback: publicFeedback(feedback[feedbackIndex]) });
  } catch (error) {
    next(error);
  }
});
  app.get("/api/admin/content-reviews", requireAdmin, async (req, res, next) => {
    try {
      const reviews = await readJson(contentReviewsFile, []);
      const status = String(req.query?.status || "").trim();
      const resolutionStatus = String(req.query?.resolutionStatus || "").trim();
      const search = String(req.query?.search || "").trim().toLowerCase();
      const filtered = reviews.filter((review) => {
        if (status && review.status !== status) return false;
        if (resolutionStatus && contentReviewResolutionStatus(review) !== resolutionStatus) return false;
        if (!search) return true;
        return [
          review.projectName,
          review.fileName,
          review.userEmail,
          review.demoSlug,
          review.summary
        ].some((value) => String(value || "").toLowerCase().includes(search));
      });
      res.json({
        reviews: filtered.slice(0, 200).map(publicAdminContentReview)
      });
    } catch (error) {
      next(error);
    }
  });
  app.post("/api/admin/content-reviews/:id/status", requireAdmin, async (req, res, next) => {
  try {
    const reviews = await readJson(contentReviewsFile, []);
    const index = reviews.findIndex((review) => review.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: "未找到内容检查记录" });
      return;
    }

    const resolutionStatus = normalizeContentReviewResolutionStatus(req.body?.resolutionStatus);
    if (!resolutionStatus) {
      res.status(400).json({ error: "请选择有效的处理结果" });
      return;
    }

    const now = new Date().toISOString();
    const updated = {
      ...reviews[index],
      resolutionStatus,
      adminNote: String(req.body?.adminNote || "").trim().slice(0, 1000),
      handledBy: adminUser || "admin",
      handledAt: now
    };
    reviews[index] = updated;
    await writeJson(contentReviewsFile, reviews);
    await writeAuditLog({
      action: "admin_handle_content_review",
      actorType: "admin",
      targetType: "content_review",
      targetId: updated.id,
      metadata: {
        resolutionStatus,
        reviewStatus: updated.status,
        projectName: updated.projectName,
        demoSlug: updated.demoSlug
      }
    });
    res.json({ review: publicAdminContentReview(updated) });
  } catch (error) {
    next(error);
  }
});
  app.post("/api/admin/demos/:id/offline", requireAdmin, async (req, res, next) => {
  try {
    const demos = await readJson(demosFile, []);
    const demoIndex = demos.findIndex((demo) => demo.id === req.params.id);

    if (demoIndex === -1) {
      res.status(404).json({ error: "未找到该 Demo" });
      return;
    }

    const demo = demos[demoIndex];
    if (demo.status !== "published") {
      res.json({ demo: adminDemoSummary(demo) });
      return;
    }

    await stopRuntime(demo.slug);
    await removeDemoFiles(demo.slug);
    demos[demoIndex] = {
      ...demo,
      status: "offline",
      offlineAt: new Date().toISOString(),
      offlineBy: "admin"
    };
    await writeJson(demosFile, demos);
    await writeAuditLog({
      action: "admin_offline_demo",
      actorType: "admin",
      targetType: "demo",
      targetId: demo.id,
      metadata: { slug: demo.slug, userEmail: demo.userEmail }
    });
    res.json({ demo: adminDemoSummary(demos[demoIndex]) });
  } catch (error) {
    next(error);
  }
});
  app.post("/api/admin/demos/:id/delete", requireAdmin, async (req, res, next) => {
  try {
    const demos = await readJson(demosFile, []);
    const demoIndex = demos.findIndex((demo) => demo.id === req.params.id);

    if (demoIndex === -1) {
      res.status(404).json({ error: "未找到该 Demo" });
      return;
    }

    const demo = demos[demoIndex];
    if (demo.status === "published") {
      res.status(409).json({ error: "已发布 Demo 不能直接删除，请先下线" });
      return;
    }

    if (demo.status === "deleted") {
      res.json({ demo: adminDemoSummary(demo) });
      return;
    }

    await stopRuntime(demo.slug);
    await deleteDemoFiles(demo);
    demos[demoIndex] = {
      ...demo,
      status: "deleted",
      deletedAt: new Date().toISOString(),
      deletedBy: "admin"
    };
    await writeJson(demosFile, demos);
    await writeAuditLog({
      action: "admin_delete_demo",
      actorType: "admin",
      targetType: "demo",
      targetId: demo.id,
      metadata: { slug: demo.slug, userEmail: demo.userEmail, previousStatus: demo.status }
    });
    res.json({ demo: adminDemoSummary(demos[demoIndex]) });
  } catch (error) {
    next(error);
  }
});
  app.get("/api/admin/runtimes", requireAdmin, async (_req, res, next) => {
    try {
      const demos = await readJson(demosFile, []);
      const runtimeRecords = await listRuntimeRecords(hostingConfig());
      const runtimeBySlug = new Map(runtimeRecords.map((runtime) => [runtime.slug, runtime]));
      const runtimeDemos = demos
        .filter((demo) => demo.hostingMode === "node_runtime" || demo.runtime || demo.database?.enabled)
        .map((demo) => {
          const liveRuntime = runtimeBySlug.get(demo.slug);
          return adminRuntimeDemoSummary({
            ...demo,
            runtime: liveRuntime || demo.runtime || demo.hosting?.runtime || null
          });
        });
      res.json({
        summary: summarizeRuntimeOps(demos, runtimeRecords),
        runtimes: runtimeRecords,
        demos: runtimeDemos
      });
    } catch (error) {
      next(error);
    }
  });
  app.post("/api/admin/demos/:id/runtime/stop", requireAdmin, async (req, res, next) => {
  try {
    const demos = await readJson(demosFile, []);
    const demoIndex = demos.findIndex((demo) => demo.id === req.params.id);
    if (demoIndex === -1) {
      res.status(404).json({ error: "未找到该试用项目" });
      return;
    }
    const demo = demos[demoIndex];
    if (demo.hostingMode !== "node_runtime") {
      res.status(409).json({ error: "只有 Node.js 试用项目才有运行环境。" });
      return;
    }
    const stopped = await stopRuntime(demo.slug);
    const nextRuntime = {
      ...(demo.runtime || {}),
      status: "stopped",
      statusLabel: "已停止",
      lifecycle: {
        ...(demo.runtime?.lifecycle || {}),
        stage: "stopped",
        stageLabel: "已停止",
        stoppedAt: new Date().toISOString()
      }
    };
    demos[demoIndex] = {
      ...demo,
      runtime: nextRuntime,
      hosting: {
        ...(demo.hosting || {}),
        runtime: {
          ...(demo.hosting?.runtime || {}),
          ...nextRuntime
        }
      },
      inspection: {
        ...(demo.inspection || {}),
        runtime: {
          ...(demo.inspection?.runtime || {}),
          ...nextRuntime
        },
        hosting: {
          ...(demo.inspection?.hosting || demo.hosting || {}),
          runtime: {
            ...(demo.inspection?.hosting?.runtime || demo.hosting?.runtime || {}),
            ...nextRuntime
          }
        }
      },
      updatedAt: new Date().toISOString()
    };
    demos[demoIndex].applicationReadiness = createApplicationReadiness({ demo: demos[demoIndex], inspection: demos[demoIndex].inspection || {} });
    demos[demoIndex].inspection = {
      ...(demos[demoIndex].inspection || {}),
      applicationReadiness: demos[demoIndex].applicationReadiness
    };
    await writeJson(demosFile, demos);
    await writeAuditLog({
      action: "admin_stop_demo_runtime",
      actorType: "admin",
      targetType: "demo",
      targetId: demo.id,
      metadata: {
        slug: demo.slug,
        userEmail: demo.userEmail,
        stoppedRuntimeId: stopped?.id || stopped?.containerName || ""
      }
    });
    res.json({ demo: adminDemoSummary(demos[demoIndex]), runtime: nextRuntime });
  } catch (error) {
    next(error);
  }
});
}







