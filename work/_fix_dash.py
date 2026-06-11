path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\UserDashboard.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add UploadPanel import after AgentPublishPanel import
old_import = 'import { AgentPublishPanel } from "./dashboard/AgentPublishPanel";'
new_import = 'import { AgentPublishPanel } from "./dashboard/AgentPublishPanel";\nimport { UploadPanel } from "./dashboard/UploadPanel";'
if old_import in content:
    content = content.replace(old_import, new_import)
    print("Import added")
else:
    print("Import not found")

# 2. Replace old UploadPanel usage
old_usage = '''        {activeView === "upload" ? (
          <UploadPanel
            file={deployState.file}
            setFile={handleUploadFileChange}
            name={deployState.name}
            setDemoName={setDemoName}
            updateTarget={deployState.updateTarget}
            onCancelUpdate={startCreateProject}
            inspection={inspection}
            steps={deployState.steps}
            latestDemo={deployState.latestDemo}
            deploying={deployState.deploying}
            onInspect={handleInspect}
            onSubmit={handleDeploy}
            onCopyShare={handleCopyShare}
            onCopyLink={handleCopyLink}
            onFileRejected={handleFileRejected}
          />
        ) : null}'''

new_usage = '''        {activeView === "upload" ? (
          <UploadPanel
            file={deployState.file}
            setFile={handleUploadFileChange}
            name={deployState.name}
            setDemoName={setDemoName}
            updateTarget={deployState.updateTarget}
            onCancelUpdate={startCreateProject}
            inspection={inspection}
            steps={deployState.steps}
            latestDemo={deployState.latestDemo}
            deploying={deployState.deploying}
            onPublish={handlePublish}
            onCopyShare={handleCopyShare}
            onCopyLink={handleCopyLink}
            onFileRejected={handleFileRejected}
          />
        ) : null}'''

if old_usage in content:
    content = content.replace(old_usage, new_usage)
    print("UploadPanel usage updated")
else:
    print("UploadPanel usage not found")

# 3. Add handlePublish function before handleInspect
old_func = '\n  async function handleInspect() {'
new_func = '''
  /** Merged inspect + deploy — single button flow */
  async function handlePublish() {
    if (!deployState.file) {
      show("请先选择 .zip、.tar.gz 或 .tgz 项目包。", "warning");
      return;
    }
    try {
      /* Phase 1: Inspect */
      deployDispatch({ type: "SET_DEPLOYING", deploying: true });
      deployDispatch({ type: "SET_STEPS", steps: createClientDeploymentSteps("inspecting") });
      deployDispatch({ type: "SET_LATEST_DEMO", demo: null });
      show("正在检查项目...");

      const inspectionPayload = await inspectProject(deployState.file);
      deployDispatch({ type: "SET_INSPECTION", inspection: inspectionPayload.inspection });

      if (!inspectionPayload.inspection?.canPublish) {
        deployDispatch({ type: "SET_DEPLOYING", deploying: false });
        deployDispatch({ type: "SET_STEPS", steps: [] });
        show(inspectionPayload.inspection?.message || "项目检查不通过，请按提示调整后重试。", "warning");
        return;
      }

      /* Phase 2: Deploy */
      show("检查通过，正在部署...");
      deployDispatch({ type: "SET_STEPS", steps: createClientDeploymentSteps() });

      const started = deployState.updateTarget
        ? await createUpdateDeploymentJob(deployState.updateTarget.id, deployState.file)
        : await createDeploymentJob(deployState.file, { name: deployState.name });

      deployDispatch({ type: "SET_STEPS", steps: started.job.steps || createClientDeploymentSteps() });

      const completedJob = await waitForDeploymentJob(started.job.id, (job) => {
        if (job.steps?.length) deployDispatch({ type: "SET_STEPS", steps: job.steps });
        if (job.inspection) deployDispatch({ type: "SET_INSPECTION", inspection: job.inspection });
      });

      if (completedJob.status === "failed") {
        const message = completedJob.error?.message || completedJob.message || "发布失败，请根据提示调整后重试。";
        deployDispatch({ type: "SET_INSPECTION", inspection: completedJob.inspection || createFailureInspection(message, completedJob.error?.statusCode, completedJob.diagnosis || completedJob.error?.diagnosis || null) });
        throw new Error(message);
      }

      const payload = completedJob.result;
      if (!payload) throw new Error("发布完成但没有返回链接，请刷新后查看项目列表。");
      if (payload.inspection) deployDispatch({ type: "SET_INSPECTION", inspection: payload.inspection });
      deployDispatch({ type: "SET_STEPS", steps: completedJob.steps || payload.deploymentEvents || createClientDeploymentSteps("success") });
      deployDispatch({ type: "SET_LATEST_DEMO", demo: payload });
      show(deployState.updateTarget ? "项目已更新。" : "发布成功！", "success");
      deployDispatch({ type: "SET_FILE", file: null });
      deployDispatch({ type: "SET_NAME", name: "" });
      deployDispatch({ type: "RESET" });
      await refreshDemos(payload.id);
    } catch (error) {
      const pl = error instanceof ApiError ? error.payload as { inspection?: Inspection; deploymentEvents?: DeploymentStep[] } | null : null;
      if (pl?.inspection) deployDispatch({ type: "SET_INSPECTION", inspection: pl.inspection });
      if (pl?.deploymentEvents?.length) deployDispatch({ type: "SET_STEPS", steps: pl.deploymentEvents });
      const job = (error as Error & { job?: DeploymentJob })?.job;
      if (job?.inspection) deployDispatch({ type: "SET_INSPECTION", inspection: job.inspection });
      if (job?.steps?.length) deployDispatch({ type: "SET_STEPS", steps: job.steps });
      else deployDispatch({ type: "SET_STEPS", steps: [] });
      show(error instanceof Error ? error.message : "发布失败，请根据提示调整后重试。", "danger");
    } finally {
      deployDispatch({ type: "SET_DEPLOYING", deploying: false });
    }
  }

  async function handleInspect() {'''

if old_func in content:
    content = content.replace(old_func, new_func)
    print("handlePublish added")
else:
    print("handleInspect anchor not found")

# 4. Remove the old inline UploadPanel function
old_def = "function UploadPanel(props: {"
idx = content.find(old_def)
if idx > 0:
    # Find end of function (next "function" at top level)
    next_func = content.find("\nfunction ", idx + 10)
    if next_func < 0:
        next_func = content.find("\n}\n", idx + 10)
    content = content[:idx] + content[next_func:]
    print("Old UploadPanel removed")
else:
    print("Old UploadPanel not found")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("UserDashboard.tsx updated")
