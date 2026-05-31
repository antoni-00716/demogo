export function registerAgentRoutes(app, deps) {
  const {
    requireAgentToken,
    readJson, writeJson, demosFile,
    readDeploymentEventsForDemo, publicUserDemo,
    uploadProjectArchive,
    handleCreateDeployment,
    handleUpdateDeployment,
    getClientIp,
  } = deps;

  // --- /api/agent/project/:id ---
  app.get("/api/agent/project/:id", requireAgentToken, async (req, res, next) => {
    try {
      const demos = await readJson(demosFile, []);
      const demo = demos.find((item) => item.id === req.params.id && item.userId === req.user.id);
      if (!demo) {
        res.status(404).json({ error: "未找到该项目" });
        return;
      }
      const events = await readDeploymentEventsForDemo(demo.id);
      res.json({
        demo: publicUserDemo(demo),
        events,
        inspection: demo.inspection || null
      });
    } catch (error) {
      next(error);
    }
  });

  // --- /api/agent/deploy ---
  app.post("/api/agent/deploy", requireAgentToken, uploadProjectArchive, async (req, res, next) => {
    return handleCreateDeployment(req, res, next, { actor: "agent" });
  });

  // --- /api/agent/demos/:id/update ---
  app.post("/api/agent/demos/:id/update", requireAgentToken, uploadProjectArchive, async (req, res, next) => {
    return handleUpdateDeployment(req, res, next, { actor: "agent", demoRef: req.params.id });
  });

  // --- /api/agent/update ---
  app.post("/api/agent/update", requireAgentToken, uploadProjectArchive, async (req, res, next) => {
    const demoRef = req.body?.demoId || req.body?.id || "";
    if (!demoRef) { res.status(400).json({ error: "请提供要更新的项目ID或链接" }); return; }
    return handleUpdateDeployment(req, res, next, { actor: "agent", demoRef });
  });
}
