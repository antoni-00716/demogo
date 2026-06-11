path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\UserDashboard.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove handleInspect
old = """\n  async function handleInspect() {
    if (!deployState.file) {
      show("请先选择 .zip、.tar.gz 或 .tgz 项目包。", "warning");
      return;
    }
    try {
      show("正在检测项目结构，请稍等。");
      const payload = await inspectProject(deployState.file);
      deployDispatch({ type: "SET_INSPECTION", inspection: payload.inspection });
      show(
        payload.inspection?.canPublish ? "项目检测和内容检查完成，当前版本可以生成试用链接。" : "这个项目当前暂不能生成试用链接，请按提示调整。",
        payload.inspection?.canPublish ? "success" : "warning"
      );
    } catch (error) {
      const payload = error instanceof ApiError ? error.payload as { inspection?: Inspection } | null : null;
      if (payload?.inspection) deployDispatch({ type: "SET_INSPECTION", inspection: payload.inspection });
      show(error instanceof Error ? error.message : "项目检测失败。", "danger");
    }
  }"""

if old in content:
    content = content.replace(old, "")
    print("handleInspect removed")
else:
    print("handleInspect not found for removal")

# Remove handleDeploy
old2 = """\n  async function handleDeploy(event: FormEvent) {
    event.preventDefault();
    if (!deployState.file) {
      show("请先选择 .zip、.tar.gz 或 .tgz 项目包。", "warning");
      return;
    }
    try {
      deployDispatch({ type: "SET_DEPLOYING", deploying: true });
      deployDispatch({ type: "SET_STEPS", steps: createClientDeploymentSteps() });
      deployDispatch({ type: "SET_LATEST_DEMO", demo: null });
      show(deployState.updateTarget ? "已开始更新，DemoGo 会持续显示处理进度。" : "已开始生成链接，DemoGo 会持续显示处理进度。");
      const started = deployState.updateTarget
        ? await createUpdateDeploymentJob(deployState.updateTarget.id, deployState.file)
        : await createDeploymentJob(deployState.file, { name: deployState.name });
      deployDispatch({ type: "SET_STEPS", steps: started.job.steps || createClientDeploymentSteps() });
      const completedJob = await waitForDeploymentJob(started.job.id, (job) => {
        if (job.steps?.length) deployDispatch({ type: "SET_STEPS", steps: job.steps });
        if (job.inspection) deployDispatch({ type: "SET_INSPECTION", inspection: job.inspection });
      });
      if (completedJob.status === "failed") {
        const message = completedJob.error?.message || completedJob.message || "生成失败，请根据提示调整后重试。";
        const diagnosis = completedJob.diagnosis || completedJob.error?.diagnosis || null;
        deployDispatch({ type: "SET_INSPECTION", inspection: completedJob.inspection || createFailureInspection(message, completedJob.error?.statusCode, diagnosis) });
        const failure = new Error(message);
        (failure as Error & { job?: DeploymentJob }).job = completedJob;
        throw failure;
      }
      const payload = completedJob.result;
      if (!payload) throw new Error("生成任务已完成，但没有返回试用链接，请刷新后查看项目列表。");
      if (payload.inspection) deployDispatch({ type: "SET_INSPECTION", inspection: payload.inspection });
      deployDispatch({ type: "SET_STEPS", steps: completedJob.steps || payload.deploymentEvents || createClientDeploymentSteps("success") });
      deployDispatch({ type: "SET_LATEST_DEMO", demo: payload });
      show(deployState.updateTarget ? "试用项目已更新。" : "试用链接已生成。", "success");
      deployDispatch({ type: "SET_FILE", file: null });
      deployDispatch({ type: "SET_NAME", name: "" });
      deployDispatch({ type: "RESET" });
      await refreshDemos(payload.id);
    } catch (error) {
      const payload = error instanceof ApiError ? error.payload as { inspection?: Inspection; deploymentEvents?: DeploymentStep[] } | null : null;
      if (payload?.inspection) deployDispatch({ type: "SET_INSPECTION", inspection: payload.inspection });
      if (payload?.deploymentEvents?.length) deployDispatch({ type: "SET_STEPS", steps: payload.deploymentEvents });
      const job = (error as Error & { job?: DeploymentJob })?.job;
      if (job?.inspection) deployDispatch({ type: "SET_INSPECTION", inspection: job.inspection });
      else if (job?.error?.message) deployDispatch({ type: "SET_INSPECTION", inspection: createFailureInspection(job.error.message, job.error.statusCode, job.diagnosis || job.error.diagnosis || null) });
      if (job?.steps?.length) deployDispatch({ type: "SET_STEPS", steps: job.steps });
      else deployDispatch({ type: "SET_STEPS", steps: [] });
      show(error instanceof Error ? error.message : "生成失败，请根据提示调整后重试。", "danger");
    } finally {
      deployDispatch({ type: "SET_DEPLOYING", deploying: false });
    }
  }"""

idx = content.find("  async function handleDeploy(event: FormEvent)")
if idx > 0:
    # find end
    end_idx = content.find("\n  async function ", idx + 10)
    if end_idx < 0:
        end_idx = content.find("\n  function ", idx + 10)
    if end_idx > 0:
        removed = content[idx:end_idx]
        content = content[:idx] + content[end_idx:]
        print(f"handleDeploy removed ({len(removed)} chars)")
    else:
        print("Could not find end of handleDeploy")
else:
    print("handleDeploy not found")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
