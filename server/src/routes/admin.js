export function registerAdminRoutes(app, deps) {
  const {
    requireAdmin,
    readJson, writeJson,
    usersFile, demosFile, feedbackFile, planRequestsFile,
    formsFile, formSubmissionsFile, contentReviewsFile,
    auditLogsFile, deploymentEventsFile, trialEventsFile, subdomainRequestsFile,
    flushUsageStats,
    filterAdminUsers, filterAdminDemos, filterAdminForms, filterSubdomainRequests,
    adminUserSummary, adminDemoSummary,
    calculateQuota,
    publicUserDemo, publicDeploymentJob, publicForm, publicFeedback,
    publicAdminContentReview, publicRuntimeEnv, publicBaseUrl,
    summarizeFailureReasons, summarizeDeploySources,
    summarizeTrialFunnel, summarizeRuntimeOps,
    contentReviewResolutionStatus,
    countBy, demoSlug,
    removeDemoFiles, deleteDemoFiles,
    writeAuditLog, writeTrialEvent, getClientIp,
    readDeploymentEventsForDemo, findDeploymentJob,
  } = deps;

  // GET /api/admin/overview
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
      const filteredDemos = filterAdminDemos(demos, { search: search || demoSearch, status });
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
      const planCounts = users.reduce((acc, user) => { acc[user.plan] = (acc[user.plan] || 0) + 1; return acc; }, {});
      res.json({
        metrics: {
          users: users.length, demos: demos.length,
          liveDemos: liveDemos.length, offlineDemos: offlineDemos.length,
          expiredDemos: expiredDemos.length, deletedDemos: deletedDemos.length,
          failedDemos: failedDemos.length,
          totalVisits, totalEstimatedBytes, planCounts,
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
          failureReasons: failureReasonCounts, trialFunnel,
          deploySourceBreakdown: sourceBreakdown, runtime: runtimeSummary
        },
        users: filteredUsers.slice(0, 50).map((user) => adminUserSummary(user, demos, calculateQuota)),
        demos: latestDemos.map(adminDemoSummary),
        forms: forms.slice(0, 50).map((form) => publicForm(form, { publicBaseUrl })),
        feedback: latestFeedback.map(publicFeedback),
        contentReviews: contentReviews.slice(0, 50).map(publicAdminContentReview)
      });
    } catch (error) { next(error); }
  });

  // GET /api/admin/forms
  app.get("/api/admin/forms", requireAdmin, async (req, res, next) => {
    try {
      const [forms, submissions] = await Promise.all([
        readJson(formsFile, []), readJson(formSubmissionsFile, [])
      ]);
      res.json({ forms: filterAdminForms(forms, submissions) });
    } catch (error) { next(error); }
  });

  // GET /api/admin/users
  app.get("/api/admin/users", requireAdmin, async (req, res, next) => {
    try {
      const [users, demos] = await Promise.all([
        readJson(usersFile, []), readJson(demosFile, [])
      ]);
      const search = String(req.query?.search || "").trim().toLowerCase();
      const filtered = filterAdminUsers(users, { search });
      const demoCounts = countBy(demos, "userId");
      res.json({
        users: filtered.slice(0, 50).map((user) => ({
          ...adminUserSummary(user, demos, calculateQuota),
          demos: demoCounts[user.id] || 0
        }))
      });
    } catch (error) { next(error); }
  });

  // GET /api/admin/content-reviews
  app.get("/api/admin/content-reviews", requireAdmin, async (req, res, next) => {
    try {
      const reviews = await readJson(contentReviewsFile, []);
      res.json({ reviews: reviews.map(publicAdminContentReview) });
    } catch (error) { next(error); }
  });

  // POST /api/admin/content-reviews/:id/status
  app.post("/api/admin/content-reviews/:id/status", requireAdmin, async (req, res, next) => {
    try {
      const reviews = await readJson(contentReviewsFile, []);
      const review = reviews.find((r) => r.id === req.params.id);
      if (!review) { res.status(404).json({ error: "Content review not found" }); return; }
      const newStatus = String(req.body?.status || req.body?.resolutionStatus || "").trim();
      const validStatuses = ["passed", "blocked", "pending", "pending_review", "confirmed_violation", "approved", "rejected"];
      if (!validStatuses.includes(newStatus)) { res.status(400).json({ error: "Invalid status" }); return; }
      review.resolutionStatus = newStatus;
      review.resolvedAt = new Date().toISOString();
      review.resolvedBy = "admin";
      review.adminNote = req.body?.adminNote || "";
      await writeJson(contentReviewsFile, reviews);
      res.json({ review: publicAdminContentReview(review) });
    } catch (error) { next(error); }
  });

  // POST /api/admin/demos/:id/offline
  app.post("/api/admin/demos/:id/offline", requireAdmin, async (req, res, next) => {
    try {
      const demos = await readJson(demosFile, []);
      const demo = demos.find((d) => d.id === req.params.id);
      if (!demo) { res.status(404).json({ error: "Demo not found" }); return; }
      if (demo.status !== "published") { res.status(409).json({ error: "Demo is not online" }); return; }
      demo.status = "offline";
      demo.offlinedAt = new Date().toISOString();
      await writeJson(demosFile, demos);
      res.json({ demo: publicUserDemo(demo) });
    } catch (error) { next(error); }
  });

  // POST /api/admin/demos/:id/delete
  app.post("/api/admin/demos/:id/delete", requireAdmin, async (req, res, next) => {
    try {
      const demos = await readJson(demosFile, []);
      const demo = demos.find((d) => d.id === req.params.id);
      if (!demo) { res.status(404).json({ error: "Demo not found" }); return; }
      await deleteDemoFiles(demo);
      demo.status = "deleted";
      demo.deletedAt = new Date().toISOString();
      await writeJson(demosFile, demos);
      res.json({ demo: publicUserDemo(demo) });
    } catch (error) { next(error); }
  });

  // GET /api/admin/runtimes
  app.get("/api/admin/runtimes", requireAdmin, async (_req, res, next) => {
    try {
      const demos = await readJson(demosFile, []);
      const runtimes = demos
        .filter((d) => d.status === "published" && d.runtime)
        .map((d) => ({ demoId: d.id, slug: demoSlug(d.id), runtime: d.runtime }));
      res.json({ runtimes, summary: summarizeRuntimeOps(demos) });
    } catch (error) { next(error); }
  });

  // POST /api/admin/demos/:id/runtime/stop
  app.post("/api/admin/demos/:id/runtime/stop", requireAdmin, async (req, res, next) => {
    try {
      const demos = await readJson(demosFile, []);
      const demo = demos.find((d) => d.id === req.params.id);
      if (!demo) { res.status(404).json({ error: "Demo not found" }); return; }
      if (!demo.runtime) { res.status(409).json({ error: "No runtime environment" }); return; }
      await removeDemoFiles(demo);
      demo.runtime = null;
      await writeJson(demosFile, demos);
      res.json({ ok: true });
    } catch (error) { next(error); }
  });

  // GET /api/admin/plan-upgrade-requests
  app.get("/api/admin/plan-upgrade-requests", requireAdmin, async (req, res, next) => {
    try {
      const requests = await readJson(planRequestsFile, []);
      res.json({ requests });
    } catch (error) { next(error); }
  });

  // POST /api/admin/plan-upgrade-requests/:id/status
  app.post("/api/admin/plan-upgrade-requests/:id/status", requireAdmin, async (req, res, next) => {
    try {
      const requests = await readJson(planRequestsFile, []);
      const idx = requests.findIndex((r) => r.id === req.params.id);
      if (idx === -1) { res.status(404).json({ error: "Not found" }); return; }
      const status = String(req.body?.status || "").trim();
      if (!["approved", "rejected"].includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
      requests[idx].status = status;
      requests[idx].resolvedAt = new Date().toISOString();

      // Update user plan when approved
      if (status === "approved") {
        const users = await readJson(usersFile, []);
        const userIdx = users.findIndex((u) => u.id === requests[idx].userId);
        if (userIdx !== -1) {
          users[userIdx].plan = requests[idx].requestedPlan || requests[idx].plan || "lite";
          await writeJson(usersFile, users);
        }
      }

      await writeJson(planRequestsFile, requests);
      res.json({ request: requests[idx] });
    } catch (error) { next(error); }
  });

  // GET /api/admin/subdomain-requests
  app.get("/api/admin/subdomain-requests", requireAdmin, async (req, res, next) => {
    try {
      const requests = await readJson(subdomainRequestsFile, []);
      res.json({ requests: filterSubdomainRequests(requests) });
    } catch (error) { next(error); }
  });

  // POST /api/admin/subdomain-requests/:id/status
  app.post("/api/admin/subdomain-requests/:id/status", requireAdmin, async (req, res, next) => {
    try {
      const requests = await readJson(subdomainRequestsFile, []);
      const idx = requests.findIndex((r) => r.id === req.params.id);
      if (idx === -1) { res.status(404).json({ error: "Not found" }); return; }
      const status = String(req.body?.status || "").trim();
      if (!["approved", "rejected"].includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
      requests[idx].status = status;
      requests[idx].resolvedAt = new Date().toISOString();
      if (req.body?.adminNote) {
        requests[idx].adminNote = String(req.body.adminNote).trim().slice(0, 500);
      }
      await writeJson(subdomainRequestsFile, requests);
      res.json({ request: requests[idx] });
    } catch (error) { next(error); }
  });

  // GET /api/admin/feedback
  app.get("/api/admin/feedback", requireAdmin, async (req, res, next) => {
    try {
      const feedback = await readJson(feedbackFile, []);
      res.json({ feedback: feedback.map(publicFeedback) });
    } catch (error) { next(error); }
  });

  // POST /api/admin/feedback/:id/status
  app.post("/api/admin/feedback/:id/status", requireAdmin, async (req, res, next) => {
    try {
      const feedback = await readJson(feedbackFile, []);
      const item = feedback.find((f) => f.id === req.params.id);
      if (!item) { res.status(404).json({ error: "Not found" }); return; }
      const status = String(req.body?.status || "").trim();
      if (!["open", "resolved"].includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
      item.status = status;
      await writeJson(feedbackFile, feedback);
      res.json({ feedback: publicFeedback(item) });
    } catch (error) { next(error); }
  });
}