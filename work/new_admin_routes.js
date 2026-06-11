  app.get("/api/admin/plan-upgrade-requests", requireAdmin, async (req, res, next) => {
    try {
      const requests = await readJson(planRequestsFile, []);
      res.json({
        contact: { qq: "304598006", email: "hello@demogo.cn" },
        requests: requests.slice(0, 200).map(publicPlanRequest)
      });
    } catch (error) {
      next(error);
    }
  });
  app.post("/api/admin/plan-upgrade-requests/:id/status", requireAdmin, async (req, res, next) => {
    try {
      const nextStatus = normalizePlanRequestStatus(req.body?.status);
      if (!nextStatus) {
        res.status(400).json({ error: "请选择有效状态: approved 或 rejected" });
        return;
      }
      const requests = await readJson(planRequestsFile, []);
      const idx = requests.findIndex((item) => item.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: "未找到该升级申请" });
        return;
      }
      const request = requests[idx];
      if (request.status !== "open") {
        res.status(409).json({ error: "该申请已被处理" });
        return;
      }
      request.status = nextStatus;
      request.updatedAt = new Date().toISOString();
      requests[idx] = request;
      await writeJson(planRequestsFile, requests);
      await writeAuditLog({
        action: "admin_" + nextStatus + "_plan_upgrade",
        actorType: "admin",
        targetType: "plan_upgrade_request",
        targetId: request.id,
        metadata: { userEmail: request.userEmail, currentPlan: request.currentPlan, requestedPlan: request.requestedPlan }
      });
      let updatedUser = null;
      if (nextStatus === "approved") {
        const users = await readJson(usersFile, []);
        const userIdx = users.findIndex((u) => u.id === request.userId);
        if (userIdx !== -1) {
          users[userIdx].plan = request.requestedPlan;
          users[userIdx].updatedAt = new Date().toISOString();
          await writeJson(usersFile, users);
          updatedUser = users[userIdx];
        }
      }
      // Send email notification on approval
      if (nextStatus === "approved" && request.userEmail && isEmailConfigured({ smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom })) {
        try {
          const planLabel = plans[request.requestedPlan]?.name || request.requestedPlan;
          const subject = "[DemoGo] 你的套餐已升级为 " + planLabel;
          const text = "你的 DemoGo 套餐已升级为 " + planLabel + "。登录工作台使用：" + (publicBaseUrl || "https://demogo.cn") + "/dashboard\n\n如有问题请联系客服 QQ：304598006 或邮箱 hello@demogo.cn\n\n-- DemoGo 团队";
          await sendSmtpMail({ to: request.userEmail, subject, text });
        } catch (e) { logger.warn({ err: e }, "发送升级通知邮件失败"); }
      }
      res.json({ request: publicPlanRequest(request), user: updatedUser ? { id: updatedUser.id, email: updatedUser.email, plan: updatedUser.plan } : null });
    } catch (error) { next(error); }
  });
