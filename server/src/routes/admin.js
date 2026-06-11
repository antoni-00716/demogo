// DemoGo v0.9.8 - admin routes (refactored: direct imports + deps for middleware only)

import crypto from "node:crypto";

import { join as pathJoin } from "node:path";

import { dataDir, plans, adminUser, publicBaseUrl } from "../config.js";

import logger from "../lib/logger.js";

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

        metrics: {

          users: users.length,

          demos: demos.length,

          liveDemos: liveDemos.length,

          offlineDemos: offlineDemos.length,

          expiredDemos: expiredDemos.length,

          deletedDemos: deletedDemos.length,

          failedDemos: failedDemos.length,

          totalVisits,

          totalEstimatedBytes,

          planCounts,

          feedback: feedback.length,

          openFeedback: feedback.filter((item) => item.status === "open").length,

          forms: forms.filter((item) => item.status !== "deleted").length,

          activeForms: forms.filter((item) => (item.status || "active") === "active").length,

          formSubmissions: formSubmissions.length,

          planUpgradeRequests: planRequests.length,

          openPlanUpgradeRequests: planRequests.filter((item) => item.status === "open").length,

          contentReviews: contentReviews.length,

          blockedContentReviews: contentReviews.filter((item) => item.status === "blocked").length,

          pendingContentReviews: contentReviews.filter((item) => item.status === "review_required").length,

          pendingContentReviewResolutions: contentReviews.filter((item) => contentReviewResolutionStatus(item) === "pending_review").length,

          aiDeploys: aiDeployAuditLogs.length,

          deploySuccesses: deploymentEvents.filter((item) => item.eventType === "success" && item.status === "success").length,

          deployFailures: failedDeploymentEvents.length,

          failureReasons: failureReasonCounts,

          trialFunnel,

          deploySourceBreakdown: sourceBreakdown,

          runtime: runtimeSummary

        },

        users: filteredUsers.slice(0, 50).map((user) => adminUserSummary(user, demos, calculateQuota)),

        demos: latestDemos.map(adminDemoSummary),

        forms: forms.slice(0, 50).map((form) => publicForm(form, { publicBaseUrl })),

        feedback: latestFeedback.map(publicFeedback),

        contentReviews: contentReviews.slice(0, 50).map(publicAdminContentReview)

      });

    } catch (error) {

      next(error);



  // POST /api/admin/cache/purge - Purge CDN cache for a demo

  app.post("/api/admin/cache/purge", requireAdmin, async (req, res, next) => {

    try {

      const slug = (req.body?.slug || "").trim();

      if (!slug) {

        res.status(400).json({ error: "请提供 demo slug" });

        return;

      }

      const { purgeCache } = await import("../lib/cdn.js");

      await purgeCache(slug);

      res.json({ ok: true, message: `已清除 ${slug} 的缓存` });

    } catch (error) {

      next(error);

    }

  });



  // POST /api/admin/cache/purge-all - Purge all CDN caches

  app.post("/api/admin/cache/purge-all", requireAdmin, async (req, res, next) => {

    try {

      const { purgeAllCache } = await import("../lib/cdn.js");

      await purgeAllCache();

      res.json({ ok: true, message: "已清除全部缓存" });

    } catch (error) {

      next(error);

    }

  });

    }

  });

  app.get("/api/admin/forms", requireAdmin, async (req, res, next) => {

    try {

      const [forms, submissions] = await Promise.all([

        readJson(formsFile, []),

        readJson(formSubmissionsFile, [])

      ]);

      const filtered = filterAdminForms(forms, {

        search: req.query?.search,

        status: req.query?.status

      });

      res.json({

        forms: filtered.slice(0, 200).map((form) => publicForm(form, { publicBaseUrl })),

        submissions: submissions.slice(0, 100).map(publicFormSubmission)

      });

    } catch (error) {

      next(error);

    }

  });

  app.get("/api/admin/users", requireAdmin, async (req, res, next) => {

    try {

      const [users, demos] = await Promise.all([

        readJson(usersFile, []),

        readJson(demosFile, [])

      ]);

      const filteredUsers = filterAdminUsers(users, {

        search: req.query?.search,

        plan: req.query?.plan

      });

      res.json({

        users: filteredUsers.slice(0, 200).map((user) => adminUserSummary(user, demos, calculateQuota)),

        plans: Object.values(plans)

      });

    } catch (error) {

      next(error);

    }

  });

  app.get("/api/admin/plan-upgrade-requests", requireAdmin, async (req, res, next) => {

    try {

      const requests = await readJson(planRequestsFile, []);

      const filtered = filterPlanRequests(requests, {

        search: req.query?.search,

        status: req.query?.status,

        plan: req.query?.plan

      });

      res.json({

        requests: filtered.slice(0, 200).map(publicPlanRequest)

      });

    } catch (error) {

      next(error);

    }

  });

  app.get("/api/admin/subdomain-requests", requireAdmin, async (req, res, next) => {

    try {

      const requests = await readJson(subdomainRequestsFile, []);

      res.json({ requests: filterSubdomainRequests(requests, { status: req.query?.status }) });

    } catch (error) {

      next(error);

    }

  });

  app.post("/api/admin/subdomain-requests/:id/status", requireAdmin, async (req, res, next) => {

  try {

    const nextStatus = normalizeSubdomainRequestStatus(req.body?.status);

    const adminNote = String(req.body?.adminNote || "").trim().slice(0, 500);

    if (!["approved", "rejected"].includes(nextStatus)) {

      res.status(400).json({ error: "请选择通过或拒绝。" });

      return;

    }

    const requests = await readJson(subdomainRequestsFile, []);

    const index = requests.findIndex((item) => item.id === req.params.id);

    if (index === -1) {

      res.status(404).json({ error: "未找到该二级域名申请。" });

      return;

    }

    const now = new Date().toISOString();

    requests[index] = {

      ...requests[index],

      status: nextStatus,

      statusLabel: subdomainRequestStatusLabel(nextStatus),

      adminNote,

      handledBy: adminUser,

      handledAt: now,

      updatedAt: now

    };

    await writeJson(subdomainRequestsFile, requests);

    await writeAuditLog({

      action: nextStatus === "approved" ? "admin_approve_subdomain_request" : "admin_reject_subdomain_request",

      actorType: "admin",

      targetType: "subdomain_request",

      targetId: requests[index].id,

      metadata: { subdomain: requests[index].subdomain, demoId: requests[index].demoId }

    });

    res.json({ request: requests[index] });

  } catch (error) {

    next(error);

  }

});

  app.post("/api/admin/plan-upgrade-requests/:id/status", requireAdmin, async (req, res, next) => {

  try {

    const nextStatus = normalizePlanRequestStatus(req.body?.status);

    const adminNote = String(req.body?.adminNote || "").trim().slice(0, 500);



    if (!["approved", "rejected"].includes(nextStatus)) {

      res.status(400).json({ error: "请选择开通或拒绝" });

      return;

    }



    const [requests, users, demos] = await Promise.all([

      readJson(planRequestsFile, []),

      readJson(usersFile, []),

      readJson(demosFile, [])

    ]);

    const requestIndex = requests.findIndex((item) => item.id === req.params.id);

    if (requestIndex === -1) {

      res.status(404).json({ error: "未找到升级申请" });

      return;

    }



    const request = requests[requestIndex];

    if ((request.status || "open") !== "open") {

      res.status(409).json({ error: "该申请已经处理过" });

      return;

    }



    const now = new Date().toISOString();

    let updatedUser = null;

    if (nextStatus === "approved") {

      const userIndex = users.findIndex((user) => user.id === request.userId);

      if (userIndex === -1) {

        res.status(404).json({ error: "申请用户不存在，无法开通套餐" });

        return;

      }

      const previousPlan = users[userIndex].plan || "free";

      users[userIndex] = {

        ...users[userIndex],

        plan: request.requestedPlan,

        updatedAt: now,

        planUpdatedAt: now

      };

      updatedUser = users[userIndex];

      await writeJson(usersFile, users);

      await writeAuditLog({

        action: "admin_approve_plan_upgrade",

        actorType: "admin",

        targetType: "user",

        targetId: updatedUser.id,

        ip: getClientIp(req),

        metadata: {

          requestId: request.id,

          email: updatedUser.email,

          previousPlan,

          nextPlan: request.requestedPlan

        }

      });

    }



    requests[requestIndex] = {

      ...request,

      status: nextStatus,

      adminNote,

      handledBy: adminUser || "admin",

      handledAt: now,

      updatedAt: now

    };

    await writeJson(planRequestsFile, requests);

    await writeAuditLog({

      action: nextStatus === "approved" ? "admin_update_plan_request_approved" : "admin_update_plan_request_rejected",

      actorType: "admin",

      targetType: "plan_upgrade_request",

      targetId: request.id,

      ip: getClientIp(req),

      metadata: {

        userId: request.userId,

        userEmail: request.userEmail,

        requestedPlan: request.requestedPlan,

        adminNote

      }

    });



    res.json({

      request: publicPlanRequest(requests[requestIndex]),

      user: updatedUser ? adminUserSummary(updatedUser, demos, calculateQuota) : null

    });

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

