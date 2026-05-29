import { useCallback, useEffect, useReducer, useState, type DragEvent, type FormEvent } from "react";
import { useAppStore } from "../stores/appStore";
import { deployReducer, createInitialDeployState } from "./dashboard/deployReducer";
import { getAgentToken, getMe, logout, resetAgentToken } from "../api/auth";
import {
  createDeploymentJob,
  createSubdomainRequest,
  createUpdateDeploymentJob,
  deleteDemo,
  getDemoDetail,
  getDemos,
  getDeployEvents,
  getSubdomainRequests,
  inspectProject,
  offlineDemo,
  resetDemoDatabase,
  restartDemoRuntime,
  restoreDemo,
  saveDemoRuntimeEnv,
  updateDemoSlug,
  type DeploymentJob
} from "../api/demos";
import { createFeedback } from "../api/feedback";
import { createHostedForm, getForms, getHostedForm, type FormQuota } from "../api/forms";
import { createPlanRequest, getPlanRequests } from "../api/planRequests";
import { Badge } from "../components/Badge";
import { BrandLogo } from "../components/BrandLogo";
import { Button, LinkButton } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { IcpLink } from "../components/IcpLink";
import { MetricCard } from "../components/MetricCard";
import { Toast } from "../components/Toast";
import { planName, plans, planRank } from "../config/plans";
import { demoStatusLabel, planRequestStatusLabel } from "../config/statuses";
import type { AgentToken, Demo, DeployEvent, DeploymentStep, FailureDiagnosis, FormSubmission, HostedForm, PlanRequest, Quota, SubdomainRequest, User } from "../types";
import { formatBytes, formatDate } from "../utils/format";
import { createShareText, writeClipboardText } from "../utils/share";
import type { Inspection } from "../api/demos";
import { ApiError } from "../api/client";
import { trackTrialEvent } from "../api/trialEvents";
import { createAgentInstruction, createClientDeploymentSteps, createFailureInspection, createFormIntegrationInstruction, createGenericFixPrompt, deploymentStepLabel, getDemoGoApiBase, isSupportedArchive, markClientStepsFailed, stepStatusIcon, waitForDeploymentJob } from "./dashboard/utils";

export function UserDashboard() {
  const [activeView, setActiveView] = useState<DashboardView>(() => resolveInitialDashboardView());
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const demos = useAppStore((s) => s.demos);
  const setDemos = useAppStore((s) => s.setDemos);
  const quota = useAppStore((s) => s.quota);
  const setQuota = useAppStore((s) => s.setQuota);
  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [subdomainRequests, setSubdomainRequests] = useState<SubdomainRequest[]>([]);
  const [events, setEvents] = useState<DeployEvent[]>([]);
  const [forms, setForms] = useState<HostedForm[]>([]);
  const [formQuota, setFormQuota] = useState<FormQuota | null>(null);
  const [selectedForm, setSelectedForm] = useState<HostedForm | null>(null);
  const [selectedSubmissions, setSelectedSubmissions] = useState<FormSubmission[]>([]);
  const monthUsage = useAppStore((s) => s.monthUsage);
  const setMonthUsage = useAppStore((s) => s.setMonthUsage);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "success" | "warning" | "danger">("info");
  const [loading, setLoading] = useState(true);
  const [deployState, deployDispatch] = useReducer(deployReducer, createInitialDeployState());
  const setDemoName = (value: string) => deployDispatch({ type: "SET_NAME", name: value });
  const inspection = deployState.inspection;
  const [selectedDemoId, setSelectedDemoId] = useState<string>("");
  const [selectedDemo, setSelectedDemo] = useState<Demo | null>(null);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [selectedSteps, setSelectedSteps] = useState<DeploymentStep[]>([]);
  const [projectDetailOpen, setProjectDetailOpen] = useState(false);
  // deployState.steps, deployState.latestDemo, deployState.deploying now in deployState
  const agentToken = useAppStore((s) => s.agentToken);
  const setAgentToken = useAppStore((s) => s.setAgentToken);

  const loadFormForDemo = useCallback(async (demoId: string, sourceForms = forms) => {
    const form = sourceForms.find((item) => item.demoId === demoId && item.status !== "deleted");
    if (!form) {
      setSelectedForm(null);
      setSelectedSubmissions([]);
      return;
    }
    try {
      const detail = await getHostedForm(form.id);
      setSelectedForm(detail.form);
      setSelectedSubmissions(detail.submissions || []);
    } catch {
      setSelectedForm(form);
      setSelectedSubmissions([]);
    }
  }, [forms]);

  useEffect(() => {
    let mounted = true;

    async function loadInitialData() {
      try {
        const [mePayload, requestsPayload, subdomainPayload, deployPayload] = await Promise.all([
          getMe(),
          getPlanRequests(),
          getSubdomainRequests().catch(() => ({ requests: [] })),
          getDeployEvents()
        ]);
        const formsPayload = await getForms().catch(() => ({ forms: [], quota: null }));
        const agentPayload = await getAgentToken().catch(() => ({ token: null }));
        if (!mounted) return;

        const initialDemos = mePayload.demos || [];
        const initialDemoId = initialDemos[0]?.id || "";
        setUser(mePayload.user);
        setDemos(initialDemos);
        setQuota(mePayload.quota || null);
        setRequests(requestsPayload.requests || []);
        setSubdomainRequests(subdomainPayload.requests || []);
        setEvents(deployPayload.events || []);
        setForms(formsPayload.forms || []);
        setFormQuota(formsPayload.quota || null);
        setAgentToken(agentPayload.token || null);
        setMonthUsage({ used: deployPayload.month?.used || 0, limit: deployPayload.month?.limit || 0 });
        setSelectedDemoId(initialDemoId);

        if (initialDemoId) {
          const detailPayload = await getDemoDetail(initialDemoId);
          if (!mounted) return;
          setSelectedDemo(detailPayload.demo);
          setSelectedInspection(detailPayload.inspection);
          setSelectedSteps(detailPayload.events || []);
          const initialForm = (formsPayload.forms || []).find((item) => item.demoId === initialDemoId && item.status !== "deleted");
          if (initialForm) {
            const formDetail = await getHostedForm(initialForm.id);
            if (!mounted) return;
            setSelectedForm(formDetail.form);
            setSelectedSubmissions(formDetail.submissions || []);
          }
        }
      } catch {
        window.location.assign(`login.html?next=${encodeURIComponent("app.html")}`);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadInitialData();
    return () => {
      mounted = false;
    };
  }, []);

  async function refreshDemos(preferredDemoId = selectedDemoId) {
    const payload = await getDemos();
    const formsPayload = await getForms();
    const nextDemos = payload.demos || [];
    const nextSelectedId = nextDemos.some((demo) => demo.id === preferredDemoId)
      ? preferredDemoId
      : nextDemos[0]?.id || "";
    setDemos(nextDemos);
    setQuota(payload.quota || null);
    setForms(formsPayload.forms || []);
    setFormQuota(formsPayload.quota || null);
    await loadDeployHistory();
    setSelectedDemoId(nextSelectedId);
    if (nextSelectedId) {
      const detailPayload = await getDemoDetail(nextSelectedId);
      setSelectedDemo(detailPayload.demo);
      setSelectedInspection(detailPayload.inspection);
      setSelectedSteps(detailPayload.events || []);
      await loadFormForDemo(nextSelectedId, formsPayload.forms || []);
    } else {
      setSelectedDemo(null);
      setSelectedInspection(null);
      setSelectedSteps([]);
      setSelectedForm(null);
      setSelectedSubmissions([]);
    }
  }

  async function loadDemoDetail(id: string) {
    try {
      const payload = await getDemoDetail(id);
      setSelectedDemo(payload.demo);
      setSelectedInspection(payload.inspection);
      setSelectedSteps(payload.events || []);
      await loadFormForDemo(id);
    } catch (error) {
      show(error instanceof Error ? error.message : "项目详情加载失败。", "warning");
    }
  }

  async function loadPlanRequests() {
    const payload = await getPlanRequests();
    setRequests(payload.requests || []);
  }

  async function loadSubdomainRequests() {
    const payload = await getSubdomainRequests();
    setSubdomainRequests(payload.requests || []);
  }

  async function loadDeployHistory() {
    const payload = await getDeployEvents();
    setEvents(payload.events || []);
    setMonthUsage({ used: payload.month?.used || 0, limit: payload.month?.limit || 0 });
  }

  async function refreshForms(preferredDemoId = selectedDemoId) {
    const payload = await getForms();
    setForms(payload.forms || []);
    setFormQuota(payload.quota || null);
    if (preferredDemoId) {
      const form = (payload.forms || []).find((item) => item.demoId === preferredDemoId && item.status !== "deleted");
      if (form) {
        const detail = await getHostedForm(form.id);
        setSelectedForm(detail.form);
        setSelectedSubmissions(detail.submissions || []);
      } else {
        setSelectedForm(null);
        setSelectedSubmissions([]);
      }
    }
  }

  function show(text: string, tone: "info" | "success" | "warning" | "danger" = "info") {
    setMessage(text);
    setMessageTone(tone);
  }

  async function handleLogout() {
    await logout();
    window.location.assign("login.html");
  }

  function resetUploadState(options: { keepUpdateTarget?: boolean } = {}) {
    deployDispatch({ type: "SET_FILE", file: null });
    deployDispatch({ type: "SET_NAME", name: "" });
    deployDispatch({ type: "SET_INSPECTION", inspection: null });
    deployDispatch({ type: "SET_STEPS", steps: markClientStepsFailed([]) });
    deployDispatch({ type: "SET_LATEST_DEMO", demo: null });
    if (!options.keepUpdateTarget) deployDispatch({ type: "RESET" });
  }

  function startCreateProject() {
    resetUploadState();
    setProjectDetailOpen(false);
    setActiveView("upload");
  }

  function startUpdateProject(demo: Demo) {
    resetUploadState({ keepUpdateTarget: true });
    deployDispatch({ type: "START_UPDATE", demo });
    setProjectDetailOpen(false);
    setActiveView("upload");
    show(`正在更新 ${demo.name || demo.slug}，请选择新版本项目包。`);
  }

  function handleUploadFileChange(file: File | null) {
    deployDispatch({ type: "SET_FILE", file: file });
    deployDispatch({ type: "SET_INSPECTION", inspection: null });
    deployDispatch({ type: "SET_STEPS", steps: [] });
    deployDispatch({ type: "SET_LATEST_DEMO", demo: null });
  }

  function navigateDashboard(view: DashboardView) {
    if (view === "upload") {
      void trackTrialEvent("upload_view", { from: activeView });
      startCreateProject();
      return;
    }
    if (view === "agent") {
      void trackTrialEvent("ai_publish_view", { from: activeView });
    }
    setActiveView(view);
  }

  async function handleInspect() {
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
  }

  async function handleDeploy(event: FormEvent) {
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
  }

  async function handleDemoAction(action: "offline" | "restore" | "delete", demo: Demo) {
    const labels = { offline: "下线", restore: "恢复上线", delete: "删除" };
    if (!window.confirm(`确定${labels[action]}这个试用项目？`)) return;
    try {
      if (action === "offline") await offlineDemo(demo.id);
      if (action === "restore") await restoreDemo(demo.id);
      if (action === "delete") await deleteDemo(demo.id);
      show(`试用项目已${labels[action]}。`, "success");
      if (action === "delete" && demo.id === selectedDemoId) {
        setProjectDetailOpen(false);
      }
      await refreshDemos(selectedDemoId);
    } catch (error) {
      show(error instanceof Error ? error.message : "操作失败。", "danger");
    }
  }

  async function handleRestartRuntime(demo: Demo) {
    if (!window.confirm("确定重新启动这个 Node.js 试用环境？")) return;
    try {
      const payload = await restartDemoRuntime(demo.id);
      setSelectedDemo(payload.demo);
      setDemos(useAppStore.getState().demos.map((item) => item.id === demo.id ? payload.demo : item));
      show("运行环境已重新启动。", "success");
    } catch (error) {
      show(error instanceof Error ? error.message : "运行环境重启失败。", "danger");
    }
  }

  async function handleSaveRuntimeEnv(demo: Demo, env: Record<string, string>) {
    try {
      const payload = await saveDemoRuntimeEnv(demo.id, env);
      setSelectedDemo(payload.demo);
      setDemos(useAppStore.getState().demos.map((item) => item.id === demo.id ? payload.demo : item));
      show("运行配置已保存。需要启动或重启时，DemoGo 会注入这些配置。", "success");
    } catch (error) {
      show(error instanceof Error ? error.message : "运行配置保存失败。", "danger");
    }
  }

  async function handleResetDemoDatabase(demo: Demo) {
    if (!window.confirm("确定重置这个 MySQL 试用数据库？当前试用数据会被清空。")) return;
    try {
      const payload = await resetDemoDatabase(demo.id);
      setSelectedDemo(payload.demo);
      setDemos(useAppStore.getState().demos.map((item) => item.id === demo.id ? payload.demo : item));
      show("试用数据库已重置。", "success");
    } catch (error) {
      show(error instanceof Error ? error.message : "试用数据库重置失败。", "danger");
    }
  }

  async function handleCopyShare(demo: Demo) {
    const text = createShareText(demo.name || demo.slug, demo.publicUrl || "");
    if (await writeClipboardText(text)) {
      show("转发文案已复制，可以直接粘贴发送。", "success");
    } else {
      show("当前浏览器限制了一键复制，请手动复制链接。", "warning");
    }
  }

  async function handleCopyLink(url?: string) {
    if (!url) {
      show("当前项目没有可复制的访问链接。", "warning");
      return;
    }
    if (await writeClipboardText(url)) {
      show("链接已复制。", "success");
    } else {
      show("当前浏览器限制了一键复制，请手动复制链接。", "warning");
    }
  }

  async function handleCopyText(text: string, successMessage = "内容已复制。") {
    if (!text) {
      show("当前没有可复制的内容。", "warning");
      return;
    }
    if (await writeClipboardText(text)) {
      show(successMessage, "success");
    } else {
      show("当前浏览器限制了一键复制，请手动复制。", "warning");
    }
  }

  async function handleResetAgentToken() {
    try {
      const payload = await resetAgentToken();
      setAgentToken(payload.token);
      show("AI 发布口令已生成。请立即复制保存，页面刷新后不会再显示完整口令。", "success");
    } catch (error) {
      show(error instanceof Error ? error.message : "AI 发布口令生成失败。", "danger");
    }
  }

  async function handleCopyAgentInstruction() {
    const instruction = createAgentInstruction(agentToken);
    if (!instruction) {
      show("请先生成一次 AI 发布口令。生成后可长期复用，不需要每次重置。", "warning");
      return;
    }
    if (await writeClipboardText(instruction)) {
      show("给 AI 工具的生成链接指令已复制。", "success");
    } else {
      show("当前浏览器限制了一键复制，请手动复制给 AI 工具的指令。", "warning");
    }
  }

  async function handleCreateForm(demo: Demo, fields: HostedForm["fields"] = []) {
    try {
      const payload = await createHostedForm({
        demoId: demo.id,
        name: `${demo.name || demo.slug} 表单`,
        fields
      });
      setSelectedForm(payload.form);
      setSelectedSubmissions([]);
      show("表单收集已开启。后续用户提交的信息会显示在项目详情里。", "success");
      await refreshForms(demo.id);
    } catch (error) {
      show(error instanceof Error ? error.message : "报名/留言收集开启失败。", "danger");
    }
  }

  async function handleUpdateDemoSlug(demo: Demo, slug: string) {
    try {
      const payload = await updateDemoSlug(demo.id, slug);
      setSelectedDemo(payload.demo);
      setDemos(useAppStore.getState().demos.map((item) => item.id === demo.id ? payload.demo : item));
      setQuota(payload.quota || quota);
      show("链接后缀已更新，旧链接会自动跳转到新链接。", "success");
    } catch (error) {
      show(error instanceof Error ? error.message : "链接后缀更新失败。", "danger");
    }
  }

  async function handleCreateSubdomainRequest(demo: Demo, subdomain: string) {
    try {
      await createSubdomainRequest(demo.id, subdomain);
      await loadSubdomainRequests();
      show("二级域名申请已提交，管理员处理后会更新状态。", "success");
    } catch (error) {
      show(error instanceof Error ? error.message : "二级域名申请提交失败。", "danger");
    }
  }

  if (loading) {
    return <div className="page-loading">正在加载 DemoGo 工作台...</div>;
  }

  if (!user) return null;

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} setActiveView={navigateDashboard} />
      <main className="main">
        <div className="topbar">
          <div>
            <h1>{dashboardViewTitle(activeView)}</h1>
            <p>{dashboardViewSubtitle(activeView, user)}</p>
          </div>
          <div className="nav-actions">
            <Button variant="primary" onClick={startCreateProject}>生成新链接</Button>
            <Button onClick={handleLogout}>退出</Button>
          </div>
        </div>
        {message ? <Toast message={message} tone={messageTone} /> : null}
        {activeView === "overview" ? (
          <OverviewView
            user={user}
            demos={demos}
            quota={quota}
            requests={requests}
            events={events}
            monthUsage={monthUsage}
            setActiveView={setActiveView}
            onCreate={startCreateProject}
            onCopyLink={handleCopyLink}
            onCopyShare={handleCopyShare}
          />
        ) : null}
        {activeView === "projects" ? (
          <ProjectsView
            demos={demos}
            selectedDemoId={selectedDemoId}
            selectedDemo={selectedDemo}
            selectedInspection={selectedInspection}
            selectedSteps={selectedSteps}
            selectedForm={selectedForm}
            selectedSubmissions={selectedSubmissions}
            formQuota={formQuota}
            detailOpen={projectDetailOpen}
            onSelect={async (id) => {
              setSelectedDemoId(id);
              await loadDemoDetail(id);
              setProjectDetailOpen(true);
            }}
            onCloseDetail={() => setProjectDetailOpen(false)}
            onCopyShare={handleCopyShare}
            onCopyLink={handleCopyLink}
            onUpdate={startUpdateProject}
            onAction={handleDemoAction}
            onRestartRuntime={handleRestartRuntime}
            onSaveRuntimeEnv={handleSaveRuntimeEnv}
            onResetDatabase={handleResetDemoDatabase}
            onCreate={startCreateProject}
            onCreateForm={handleCreateForm}
            onCopyText={handleCopyText}
            user={user}
            onUpdateSlug={handleUpdateDemoSlug}
            onCreateSubdomainRequest={handleCreateSubdomainRequest}
            subdomainRequests={subdomainRequests}
          />
        ) : null}
        {activeView === "upload" ? (
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
            onFileRejected={(name) => show(`${name} 格式不支持，请上传 .zip、.tar.gz 或 .tgz 项目包。`, "warning")}
            onCopyLink={handleCopyLink}
          />
        ) : null}
        {activeView === "agent" ? (
          <AgentPublishPanel
            token={agentToken}
            onResetToken={handleResetAgentToken}
            onCopyInstruction={handleCopyAgentInstruction}
            onCopyText={handleCopyText}
          />
        ) : null}
        {activeView === "plan" ? (
          <PlanView user={user} quota={quota} requests={requests} reloadRequests={loadPlanRequests} show={show} />
        ) : null}
        {activeView === "history" ? (
          <DeployHistory events={events} monthUsage={monthUsage} />
        ) : null}
        {activeView === "feedback" ? (
          <FeedbackPanel demos={demos} show={show} />
        ) : null}
        <footer className="app-footer">
          <span>DemoGo</span>
          <IcpLink />
        </footer>
      </main>
    </div>
  );
}

type DashboardView = "overview" | "projects" | "upload" | "agent" | "plan" | "history" | "feedback";

function resolveInitialDashboardView(): DashboardView {
  const hash = window.location.hash.replace("#", "").toLowerCase();
  if (hash === "upload") return "upload";
  if (hash === "agent" || hash === "ai") return "agent";
  if (hash === "projects" || hash === "demos") return "projects";
  if (hash === "plan") return "plan";
  if (hash === "history" || hash === "deployhistory") return "history";
  if (hash === "feedback") return "feedback";
  return "overview";
}

function Sidebar({
  activeView,
  setActiveView
}: {
  activeView: DashboardView;
  setActiveView: (view: DashboardView) => void;
}) {
  const items: Array<[DashboardView, string]> = [
    ["overview", "工作台"],
    ["upload", "生成新链接"],
    ["projects", "我的项目"],
    ["agent", "AI 帮我发布"],
    ["plan", "套餐与额度"],
    ["history", "生成记录"],
    ["feedback", "反馈问题"]
  ];
  return (
    <aside className="sidebar">
      <a className="brand" href="/">
        <BrandLogo />
      </a>
      <nav className="side-nav">
        {items.map(([view, label]) => (
          <button className={activeView === view ? "active" : ""} key={view} type="button" onClick={() => setActiveView(view)}>
            {label}
          </button>
        ))}
        <a href="/">返回首页</a>
      </nav>
    </aside>
  );
}

function dashboardViewTitle(view: DashboardView) {
  if (view === "agent") return "AI 帮我发布";
  const titles: Record<Exclude<DashboardView, "agent">, string> = {
    overview: "工作台",
    upload: "生成新链接",
    projects: "我的项目",
    plan: "套餐与额度",
    history: "生成记录",
    feedback: "反馈问题"
  };
  return titles[view];
}

function dashboardViewSubtitle(view: DashboardView, user: User) {
  if (view === "agent") return "复制一句话给 Codex、Cursor 或其他 AI 工具，让它们帮你生成试用链接。";
  if (view === "overview") return `${user.email} · 当前套餐 ${user.planName || planName(user.plan)}`;
  if (view === "projects") return "查看链接、访问、报名/留言、发布记录和项目操作。";
  if (view === "upload") return "上传项目包，DemoGo 先检查，再生成可分享的试用链接。";
  if (view === "plan") return "查看额度使用情况，申请 Lite 或 Pro。";
  if (view === "history") return "查看本月生成和更新记录，理解额度使用情况。";
  return "提交真实试用中遇到的问题，方便后续优化。";
}

function UpgradeBanner({
  user,
  requests,
  quota,
  setActiveView
}: {
  user: User;
  requests: PlanRequest[];
  quota: Quota | null;
  setActiveView: (view: DashboardView) => void;
}) {
  const openRequest = requests.find((item) => item.status === "open");
  const plan = quota?.plan;
  if (user.plan === "pro") {
    return (
      <section className="upgrade-banner">
        <div>
          <strong>Pro 套餐使用中，当前不支持有效期内降级</strong>
          <span>可同时保留 {plan?.maxOnlineDemos || 10} 个在线试用项目，每月 {plan?.monthlyDeployLimit || 60} 次生成/更新链接。套餐到期后可重新申请其他版本。</span>
        </div>
        <Badge tone="success">最高套餐</Badge>
      </section>
    );
  }
  if (openRequest) {
    return (
      <section className="upgrade-banner">
        <div>
          <strong>升级申请待处理</strong>
          <span>你已申请 {openRequest.requestedPlanName || planName(openRequest.requestedPlan)}，管理员处理后会在套餐页展示结果和说明。</span>
        </div>
        <Button onClick={() => setActiveView("plan")}>查看申请记录</Button>
      </section>
    );
  }
  return (
      <section className="upgrade-banner">
        <div>
        <strong>需要更多试用链接时，再申请升级套餐</strong>
        <span>Free 用来跑通第一条链路；Lite 适合用户演示；Pro 适合持续验证多个 AI 产品原型。</span>
        </div>
      <Button variant="primary" onClick={() => setActiveView("plan")}>查看套餐详情</Button>
      </section>
  );
}

function OverviewView({
  user,
  demos,
  quota,
  requests,
  events,
  monthUsage,
  setActiveView,
  onCreate,
  onCopyLink,
  onCopyShare
}: {
  user: User;
  demos: Demo[];
  quota: Quota | null;
  requests: PlanRequest[];
  events: DeployEvent[];
  monthUsage: { used: number; limit: number } | null;
  setActiveView: (view: DashboardView) => void;
  onCreate: () => void;
  onCopyLink: (url?: string) => void;
  onCopyShare: (demo: Demo) => void;
}) {
  const activeProjects = demos.filter((demo) => demo.status === "published").length;
  const latestDemo = demos.find((demo) => demo.status === "published") || demos[0];
  return (
    <div className="view-stack">
      <UpgradeBanner user={user} requests={requests} quota={quota} setActiveView={setActiveView} />
      <WorkspaceHero
        user={user}
        demos={demos}
        quota={quota}
        monthUsage={monthUsage}
        setActiveView={setActiveView}
        onCreate={onCreate}
      />
      <div className="dashboard-focus-row">
        <div className="focus-item strong">
          <span>当前重点</span>
          <strong>{activeProjects ? `${activeProjects} 个链接正在试用` : "先生成第一个可分享链接"}</strong>
        </div>
        <div className="focus-item">
          <span>最近项目</span>
          <strong>{latestDemo ? latestDemo.name || latestDemo.slug : "暂无项目"}</strong>
        </div>
        <div className="focus-item">
          <span>下一步建议</span>
          <strong>{demos.length ? "复制链接发给试用对象" : "上传项目包或让 AI 发布"}</strong>
        </div>
      </div>
      <div className="dashboard-project-workspace">
        <Card className="panel">
          <div className="panel-head">
            <div>
              <h2>最近试用项目</h2>
              <p>直接复制链接或转发文案，减少从工作台跳来跳去。</p>
            </div>
            <Button onClick={() => setActiveView("projects")}>查看全部</Button>
          </div>
          <CompactDemoList demos={demos.slice(0, 5)} onCopyLink={onCopyLink} onCopyShare={onCopyShare} />
        </Card>
        <div className="dashboard-side-stack">
          <QuickCreatePanel onCreate={onCreate} />
          <DeployHistory events={events.slice(0, 5)} monthUsage={monthUsage} compact />
        </div>
      </div>
    </div>
  );
}

function QuickCreatePanel({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="panel quick-create-panel">
      <div>
        <h2>下一步做什么</h2>
        <p>如果项目已经在 AI 工具里做好，优先让 AI 直接发布；如果已经有项目包，就从这里上传。</p>
      </div>
      <Button variant="primary" onClick={onCreate}>开始上传</Button>
    </Card>
  );
}

function AgentPublishPanel({
  token,
  onResetToken,
  onCopyInstruction,
  onCopyText
}: {
  token: AgentToken | null;
  onResetToken: () => void;
  onCopyInstruction: () => void;
  onCopyText: (text: string, successMessage?: string) => void;
}) {
  const universalInstruction = createAgentInstruction(token);
  return (
    <section className="agent-publish-layout">
      <Card className="panel agent-publish-panel">
        <div className="panel-head">
          <div>
            <h2>复制一句话，让 AI 帮你发布到 DemoGo</h2>
            <p>适合你已经在 Codex、Cursor、Claude Code 等工具里做完项目，希望 AI 直接帮你生成试用链接。</p>
          </div>
          <Badge tone={token?.enabled ? "success" : "warning"}>{token?.enabled ? "口令已启用" : "未生成口令"}</Badge>
        </div>
        <div className="agent-user-guide">
          <strong>最简单的说法</strong>
          <p>“请把当前项目发布到 DemoGo，生成一个可以发给别人试用的链接。如果失败，请根据 DemoGo 的提示帮我修改后再试。”</p>
        </div>
        <div className="agent-user-guide agent-status-guide">
          <strong>你不用选择工具</strong>
          <p>把同一段提示词交给 Codex、Claude Code、Cursor 或其他 AI 工具即可。具体用哪种发布方式，由 AI 和 DemoGo 自动处理。</p>
        </div>
        <div className="agent-user-guide">
          <strong>工具接入状态</strong>
          <p>Codex 和 Claude Code 已进入插件化接入；Cursor、Windsurf、OpenHands 等工具优先通过 MCP 或 CLI 使用同一套发布规则。</p>
        </div>
        <div className="agent-user-guide">
          <strong>发布成功后怎么看</strong>
          <p>AI 会返回一个随机试用链接。你也可以回到“我的项目”查看项目名称、复制转发文案，Lite / Pro 用户还能在项目详情里修改链接后缀。</p>
        </div>
        <div className="agent-user-guide">
          <strong>更新已有链接</strong>
          <p>同一个项目目录再次发布时，CLI 会优先更新原链接；如果换了目录或电脑，请把原 DemoGo 链接发给 AI，并明确说“保持链接不变”。</p>
        </div>
        <div className="agent-user-guide">
          <strong>如果发布失败</strong>
          <p>先看 DemoGo 返回的原因：目录不对、文件太大、项目依赖后台功能、内容检查未通过或口令无效。让 AI 按提示修改后再重新发布，不要绕过检查。</p>
        </div>
        <div className="agent-steps">
          <div>
            <strong>1. 生成一次口令</strong>
            <span>只在首次配置、忘记或泄露时重置，不需要每次发布都生成。</span>
          </div>
          <div>
            <strong>2. 复制给 AI</strong>
            <span>把下方提示词交给 Codex、Cursor 或其他 AI 工具，AI 只需要把当前项目发出去。</span>
          </div>
          <div>
            <strong>3. 等待链接</strong>
            <span>首次发布会生成新链接；更新版本会保持原链接不变，只替换项目内容。</span>
          </div>
        </div>
        <div className="token-box">
          <span>当前口令</span>
          <strong>{token?.value || (token?.prefix ? `${token.prefix}...（完整口令已隐藏）` : "尚未生成")}</strong>
          {token?.createdAt ? <small>生成时间：{formatDate(token.createdAt)}；已配置的口令可长期复用。</small> : <small>首次生成后请立即保存，页面刷新后不再显示完整口令。</small>}
        </div>
        <div className="agent-command-box">
          <div className="copyable-head">
            <span>AI 发布提示词</span>
            <Button onClick={() => onCopyText(universalInstruction, "AI 发布提示词已复制。")} disabled={!universalInstruction}>复制</Button>
          </div>
          <pre>{universalInstruction || "请先生成一次 AI 发布口令。生成后复制这里的发布提示词。"}</pre>
        </div>
        <div className="row-actions">
          {!token?.enabled ? <Button variant="primary" onClick={onResetToken}>生成 AI 发布口令</Button> : null}
          <Button onClick={onCopyInstruction} disabled={!universalInstruction}>复制 AI 发布提示词</Button>
          {token?.enabled ? <Button variant="danger" onClick={onResetToken}>重置口令</Button> : null}
        </div>
      </Card>
      <Card className="panel agent-scope-panel">
        <h2>什么时候用这个入口</h2>
        <div className="support-scope-list">
          <div>
            <strong>网页上传</strong>
            <span>适合你自己上传压缩包，DemoGo 检查通过后生成链接。</span>
          </div>
          <div>
            <strong>AI 直接发布</strong>
            <span>适合让 Codex、Cursor、Claude Code 在项目目录里直接生成试用链接。</span>
          </div>
          <div>
            <strong>插件化发布</strong>
            <span>Codex 和 Claude Code 使用插件包；其他 AI 工具优先使用 MCP 或 CLI，仍然是同一条发布规则。</span>
          </div>
          <div>
            <strong>当前适合发布</strong>
            <span>普通网页、活动页、报名页、作品集、H5 页面、已经生成好的 dist/build/out 页面，以及能生成静态网页的前端源码项目。</span>
          </div>
          <div>
            <strong>暂不支持</strong>
            <span>多服务应用、Redis、MongoDB、PostgreSQL、真实支付、订单、用户登录系统、WebSocket、服务端渲染项目。</span>
          </div>
        </div>
      </Card>
    </section>
  );
}

function ProjectsView({
  demos,
  selectedDemoId,
  selectedDemo,
  selectedInspection,
  selectedSteps,
  selectedForm,
  selectedSubmissions,
  formQuota,
  detailOpen,
  onSelect,
  onCloseDetail,
  onCopyShare,
  onCopyLink,
  onUpdate,
  onAction,
  onRestartRuntime,
  onSaveRuntimeEnv,
  onResetDatabase,
  onCreate,
  onCreateForm,
  onCopyText,
  user,
  onUpdateSlug,
  onCreateSubdomainRequest,
  subdomainRequests
}: {
  demos: Demo[];
  selectedDemoId: string;
  selectedDemo: Demo | null;
  selectedInspection: Inspection | null;
  selectedSteps: DeploymentStep[];
  selectedForm: HostedForm | null;
  selectedSubmissions: FormSubmission[];
  formQuota: FormQuota | null;
  detailOpen: boolean;
  onSelect: (id: string) => void;
  onCloseDetail: () => void;
  onCopyShare: (demo: Demo) => void;
  onCopyLink: (url?: string) => void;
  onUpdate: (demo: Demo) => void;
  onAction: (action: "offline" | "restore" | "delete", demo: Demo) => void;
  onRestartRuntime: (demo: Demo) => void;
  onSaveRuntimeEnv: (demo: Demo, env: Record<string, string>) => void;
  onResetDatabase: (demo: Demo) => void;
  onCreate: () => void;
  onCreateForm: (demo: Demo, fields?: HostedForm["fields"]) => void;
  onCopyText: (text: string, successMessage?: string) => void;
  user: User;
  onUpdateSlug: (demo: Demo, slug: string) => void;
  onCreateSubdomainRequest: (demo: Demo, subdomain: string) => void;
  subdomainRequests: SubdomainRequest[];
}) {
  return (
    <section className="projects-workflow">
      <DemoList
        demos={demos}
        selectedDemoId={selectedDemoId}
        onSelect={onSelect}
        onCopyLink={onCopyLink}
        onUpdate={onUpdate}
        onCreate={onCreate}
      />
      {detailOpen ? (
        <ProjectDetailDrawer
          demo={selectedDemo}
          inspection={selectedInspection}
          steps={selectedSteps}
          form={selectedForm}
          submissions={selectedSubmissions}
          formQuota={formQuota}
          onClose={onCloseDetail}
          onCopyShare={onCopyShare}
          onCopyLink={onCopyLink}
          onUpdate={onUpdate}
          onAction={onAction}
          onRestartRuntime={onRestartRuntime}
          onSaveRuntimeEnv={onSaveRuntimeEnv}
          onResetDatabase={onResetDatabase}
          onCreateForm={onCreateForm}
          onCopyText={onCopyText}
          user={user}
          onUpdateSlug={onUpdateSlug}
          onCreateSubdomainRequest={onCreateSubdomainRequest}
          subdomainRequests={subdomainRequests}
        />
      ) : null}
    </section>
  );
}

function PlanView({
  user,
  quota,
  requests,
  reloadRequests,
  show
}: {
  user: User;
  quota: Quota | null;
  requests: PlanRequest[];
  reloadRequests: () => Promise<void>;
  show: (text: string, tone?: "info" | "success" | "warning" | "danger") => void;
}) {
  return (
    <section className="content-grid plan-layout">
      <div className="view-stack">
        <Overview quota={quota} demos={[]} requests={requests} monthUsage={quota?.monthlyDeploys || null} compact />
        <PlanPanel user={user} requests={requests} reloadRequests={reloadRequests} show={show} />
      </div>
      <PlanRequestsTable requests={requests} />
    </section>
  );
}

function WorkspaceHero({
  user,
  demos,
  quota,
  monthUsage,
  setActiveView,
  onCreate
}: {
  user: User;
  demos: Demo[];
  quota: Quota | null;
  monthUsage: { used: number; limit: number } | null;
  setActiveView: (view: DashboardView) => void;
  onCreate: () => void;
}) {
  const online = quota?.onlineDemos;
  const deploys = quota?.monthlyDeploys || monthUsage;
  return (
    <section className="workspace-hero">
      <div className="workspace-hero-copy">
        <Badge tone="success">工作台</Badge>
        <h2>先生成一个能发出去的链接，再看真实反馈。</h2>
        <p>
          上传 AI 做好的页面，DemoGo 会先检查能不能打开、表单能不能收、内容是否适合公开分享，再生成访问链接和转发文案。
        </p>
        <div className="hero-proof dashboard-proof">
          <span>免服务器</span>
          <span>免域名配置</span>
          <span>发布前检查</span>
          <span>复制转发文案</span>
        </div>
        <div className="workspace-hero-primary-actions">
          <Button variant="primary" onClick={onCreate}>生成新链接</Button>
          <Button onClick={() => setActiveView("agent")}>让 AI 帮我发布</Button>
          <Button onClick={() => setActiveView("projects")}>查看试用项目</Button>
        </div>
      </div>
      <div className="workspace-hero-status">
        <strong>{user.planName || quota?.plan?.name || planName(user.plan)}</strong>
        <span>当前套餐</span>
        <small>{online?.used || 0}/{online?.limit || 1} 在线试用项目 · {deploys?.used || 0}/{deploys?.limit || 0} 本月生成/更新</small>
      </div>
      <div className="workspace-hero-stats" aria-label="当前使用情况">
        <div>
          <strong>{online?.used || 0}/{online?.limit || 1}</strong>
          <span>在线试用项目</span>
        </div>
        <div>
          <strong>{deploys?.used || 0}/{deploys?.limit || 0}</strong>
          <span>本月生成/更新</span>
        </div>
        <div>
          <strong>{demos.length}</strong>
          <span>累计项目</span>
        </div>
      </div>
    </section>
  );
}

function Overview({
  quota,
  demos,
  requests,
  monthUsage,
  compact = false
}: {
  quota: Quota | null;
  demos: Demo[];
  requests: PlanRequest[];
  monthUsage: { used: number; limit: number } | null;
  compact?: boolean;
}) {
  const online = quota?.onlineDemos;
  const deploys = quota?.monthlyDeploys || monthUsage;
  const openRequest = requests.find((item) => item.status === "open");
  return (
    <section className={`overview-grid ${compact ? "compact-overview" : ""}`} id="overview">
      <MetricCard label="当前套餐" value={quota?.plan?.name || "Free"} note="Free / Lite / Pro" />
      <MetricCard label="在线试用项目" value={`${online?.used || 0} / ${online?.limit || 1}`} note={`累计 ${demos.length} 个项目`} />
      <MetricCard label="本月生成/更新" value={`${deploys?.used || 0} / ${deploys?.limit || 0}`} note="生成和更新都会计入" />
      <MetricCard label="升级申请" value={openRequest ? "待处理" : "无待处理"} note={openRequest ? `申请 ${openRequest.requestedPlanName || planName(openRequest.requestedPlan)}` : "可随时申请升级"} />
    </section>
  );
}

function CompactDemoList({
  demos,
  onCopyLink,
  onCopyShare
}: {
  demos: Demo[];
  onCopyLink: (url?: string) => void;
  onCopyShare: (demo: Demo) => void;
}) {
  if (!demos.length) {
    return (
      <div className="first-run-guide compact">
        <EmptyState title="还没有试用链接" description="可以上传项目包，也可以让 AI 工具直接发布。" />
        <div className="first-run-actions">
          <span>推荐先试一个最简单的 HTML 页面或已经打包好的 zip。</span>
        </div>
      </div>
    );
  }
  return (
    <div className="compact-list">
      {demos.map((demo) => (
        <div className="compact-list-row" key={demo.id}>
          <div>
            <strong>{demo.name || demo.slug}</strong>
            <small>{demo.publicUrl || "链接当前不可访问"}</small>
          </div>
          <Badge tone={demo.status === "published" ? "success" : "neutral"}>{demoStatusLabel(demo.status)}</Badge>
          <div className="row-actions compact">
            <Button onClick={() => onCopyLink(demo.publicUrl)}>链接</Button>
            <Button onClick={() => onCopyShare(demo)}>文案</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function DemoList({
  demos,
  selectedDemoId,
  onSelect,
  onCopyLink,
  onUpdate,
  onCreate
}: {
  demos: Demo[];
  selectedDemoId: string;
  onSelect: (id: string) => void;
  onCopyLink: (url?: string) => void;
  onUpdate: (demo: Demo) => void;
  onCreate: () => void;
}) {
  return (
    <Card className="panel project-list-panel" id="demos">
      <div className="panel-head">
        <div>
          <h2>我的项目</h2>
          <p>每个项目都有一个试用链接。查看详情后可以复制、更新、下线、恢复、删除，也能看报名/留言和生成记录。</p>
        </div>
        <Button onClick={onCreate}>生成新链接</Button>
      </div>
      {!demos.length ? (
        <div className="project-empty-grid">
          <div className="first-run-guide">
            <EmptyState title="还没有试用项目" description="先生成一个链接，再发给用户、同事或朋友试用。" />
            <ol>
              <li>如果你手里有项目包，点击“生成新链接”上传。</li>
              <li>如果项目还在 Codex、Cursor、Claude Code 里，让 AI 直接执行 DemoGo 发布命令。</li>
              <li>如果失败，DemoGo 会告诉你原因和下一步怎么改。</li>
            </ol>
          </div>
          <button className="new-project-card" type="button" onClick={onCreate}>
            <span>+</span>
            <strong>生成新链接</strong>
            <small>上传压缩包，生成试用链接</small>
          </button>
        </div>
      ) : (
        <div className="project-list-stack">
          {demos.map((demo) => (
            <article className={`project-row ${selectedDemoId === demo.id ? "is-selected" : ""}`} key={demo.id}>
              <div className="project-main">
                <span className="project-avatar">{(demo.name || demo.slug || "D").slice(0, 1).toUpperCase()}</span>
                <span>
                  <strong>{demo.name || demo.slug}</strong>
                  <small>{demo.status === "published" ? demo.publicUrl : "链接当前不可访问"} · V{demo.version || 1}</small>
                </span>
              </div>
              <div className="project-row-meta">
                <div>
                  <span>状态</span>
                  <Badge tone={demo.status === "published" ? "success" : demo.status === "expired" ? "warning" : "neutral"}>{demoStatusLabel(demo.status)}</Badge>
                </div>
                <div>
                  <span>访问</span>
                  <strong>{demo.usage?.visits || 0} 次</strong>
                </div>
                <div>
                  <span>最近更新</span>
                  <strong>{formatDate(demo.updatedAt || demo.createdAt)}</strong>
                </div>
              </div>
              <div className="row-actions compact">
                {demo.status === "published" ? (
                  <>
                    <Button onClick={() => onCopyLink(demo.publicUrl)}>链接</Button>
                    <Button onClick={() => onUpdate(demo)}>更新</Button>
                    <Button onClick={() => onSelect(demo.id)}>查看详情</Button>
                  </>
                ) : (
                  <Button onClick={() => onSelect(demo.id)}>查看详情</Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}

function UploadPanel(props: {
  file: File | null;
  setFile: (file: File | null) => void;
  name: string;
  setDemoName: (value: string) => void;
  updateTarget: Demo | null;
  onCancelUpdate: () => void;
  inspection: Inspection | null;
  steps: DeploymentStep[];
  latestDemo: Demo | null;
  deploying: boolean;
  onInspect: () => void;
  onSubmit: (event: FormEvent) => void;
  onCopyShare: (demo: Demo) => void;
  onCopyLink: (url?: string) => void;
  onFileRejected: (name: string) => void;
}) {
  function handleFile(file: File | null) {
    if (!file) {
      props.setFile(null);
      return;
    }
    if (!isSupportedArchive(file.name)) {
      props.setFile(null);
      props.onFileRejected(file.name);
      return;
    }
    props.setFile(file);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    handleFile(event.dataTransfer.files?.[0] || null);
  }

  return (
    <Card className="panel" id="upload">
      <div className="panel-head">
        <div>
          <h2>{props.updateTarget ? `更新 ${props.updateTarget.name || props.updateTarget.slug}` : "生成试用链接"}</h2>
          <p>上传后先检查，再生成链接。首次链接由系统随机分配；Lite 和 Pro 用户可以在项目详情里修改链接。</p>
        </div>
        {props.updateTarget ? <Button onClick={props.onCancelUpdate}>取消更新</Button> : null}
      </div>
      <form className="upload-form" onSubmit={props.onSubmit}>
        {!props.updateTarget ? (
          <label className="form-field">
            项目名称
            <input className="input" value={props.name} onChange={(event) => props.setDemoName(event.target.value)} placeholder="可留空，DemoGo 会自动识别页面标题" />
          </label>
        ) : null}
        <label className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
          <input type="file" accept=".zip,.tar.gz,.tgz,application/zip,application/gzip" onChange={(event) => handleFile(event.target.files?.[0] || null)} />
          <strong>{props.file ? props.file.name : "拖拽 ZIP / TAR.GZ 项目包到这里上传"}</strong>
          <span>或点击选择文件 · 支持 .zip、.tar.gz、.tgz · 最大 50MB</span>
        </label>
        <div className="upload-helper-grid">
          <div>
            <strong>静态网页</strong>
            <span>HTML、H5、活动页、报名页、作品集，以及已经生成好的 dist/build/out 目录。</span>
          </div>
          <div>
            <strong>前端源码</strong>
            <span>React、Vue、Vite 等能生成网页产物的项目，会先构建再生成试用链接。</span>
          </div>
          <div>
            <strong>Node 单服务</strong>
            <span>支持 Express、Koa、Fastify 等单服务试用；MySQL 项目可分配空试用库，暂不支持多服务、Redis、WebSocket 和 SSR。</span>
          </div>
        </div>
        <div className="row-actions">
          <Button onClick={props.onInspect} disabled={!props.file || props.deploying}>检查项目</Button>
          <Button variant="primary" type="submit" disabled={!props.file || props.deploying}>{props.updateTarget ? "开始更新" : "生成试用链接"}</Button>
        </div>
      </form>
      {props.steps.length ? <DeploymentSteps steps={props.steps} /> : null}
      {props.latestDemo ? <PublishSuccess demo={props.latestDemo} onCopyShare={props.onCopyShare} onCopyLink={props.onCopyLink} /> : null}
      {props.inspection ? <InspectionPanel inspection={props.inspection} /> : null}
    </Card>
  );
}

function DeploymentSteps({ steps }: { steps: DeploymentStep[] }) {
  return (
    <div className="deployment-steps">
      <div className="section-mini-head">
        <h3>生成过程</h3>
        <span>{steps.filter((step) => step.status === "success").length} / {steps.length}</span>
      </div>
      <div className="step-list">
        {steps.map((step) => (
          <div className={`step-line step-${step.status}`} key={step.id || `${step.eventType}-${step.message}`}>
            <span>{stepStatusIcon(step.status)}</span>
            <div>
              <strong>{deploymentStepLabel(step.eventType)}</strong>
              <p>{step.message || step.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PublishSuccess({
  demo,
  onCopyShare,
  onCopyLink
}: {
  demo: Demo;
  onCopyShare: (demo: Demo) => void;
  onCopyLink: (url?: string) => void;
}) {
  return (
    <div className="publish-success">
      <div>
        <Badge tone="success">链接已生成</Badge>
        <h3>{demo.name || demo.slug}</h3>
        <p>{demo.publicUrl}</p>
      </div>
      <div className="row-actions">
        <Button onClick={() => onCopyLink(demo.publicUrl)}>复制链接</Button>
        <Button onClick={() => onCopyShare(demo)}>复制转发文案</Button>
        <LinkButton href={demo.publicUrl || "#"} target="_blank" rel="noreferrer" variant="primary">打开试用链接</LinkButton>
      </div>
    </div>
  );
}

function InspectionPanel({ inspection }: { inspection: Inspection }) {
  const fields = inspection.formFields || [];
  const apis = inspection.apiCalls || [];
  const supportNotes = inspection.supportNotes || [];
  const unsupportedNotes = inspection.unsupportedNotes || [];
  const contentReview = inspection.contentReview;
  const fixPrompt = inspection.fixPrompt || inspection.ruleReport?.fixPrompt || inspection.ruleReport?.aiPrompt || "";
  return (
    <div className={`inspection-box ${inspection.canPublish ? "can-publish" : "blocked"}`}>
      <div className="inspection-title-row">
        <h3>{inspection.userLabel || inspection.label || (inspection.canPublish ? "可以生成试用链接" : "暂时无法生成试用链接")}</h3>
        <Badge tone={inspection.canPublish ? "success" : "warning"}>{inspection.userStatusLabel || (inspection.canPublish ? "支持" : "暂不支持")}</Badge>
      </div>
      <p>{inspection.userSummary || inspection.summary || "项目检测完成。"}</p>
      {inspection.projectProfile ? <ProjectProfilePanel profile={inspection.projectProfile} /> : null}
      {inspection.projectAssessment ? <ProjectAssessmentPanel assessment={inspection.projectAssessment} /> : null}
      {inspection.failureDiagnosis ? <FailureDiagnosisPanel diagnosis={inspection.failureDiagnosis} /> : null}
      <HostingArchitecturePanel hosting={inspection.hosting} architecture={inspection.projectArchitecture} runtime={inspection.runtime} compact />
      {contentReview ? (
        <div className={`content-review-note review-${contentReview.status || "unknown"}`}>
          <strong>发布前内容检查：{contentReview.statusLabel || "已检查"}</strong>
          <span>{contentReview.summary || "DemoGo 会在生成链接前检查页面内容。正常报名、预约、咨询和获客留资可以发布；违法违规、诈骗、赌博、色情和高敏信息收集会被拦截。"}</span>
          {contentReview.nextStep ? <span>{contentReview.nextStep}</span> : null}
          {contentReview.findings?.length ? (
            <ul>
              {contentReview.findings.slice(0, 3).map((finding) => (
                <li key={finding.id || `${finding.category}-${finding.sourceFile}`}>
                  {finding.category}{finding.sourceFile ? ` · ${finding.sourceFile}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {(supportNotes.length || unsupportedNotes.length) ? (
        <div className="inspection-note-grid">
          {supportNotes.length ? (
            <div>
              <strong>当前支持</strong>
              <ul>{supportNotes.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          ) : null}
          {unsupportedNotes.length ? (
            <div>
              <strong>暂不支持</strong>
              <ul>{unsupportedNotes.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="inspection-grid">
        <span>页面入口：{inspection.entryFile || "待生成"}</span>
        <span>项目类型：{inspection.projectProfile?.summary || inspection.projectCategory || inspection.userLabel || inspection.label || "-"}</span>
        <span>表单：{fields.length ? `发现 ${fields.length} 个字段` : "未发现"}</span>
        <span>数据提交：{apis.filter((item) => item.isLocal).length ? "需要后续接入" : "未发现额外接口"}</span>
      </div>
      {inspection.ruleReport?.risks?.length ? (
        <ul>
          {inspection.ruleReport.risks.map((risk) => <li key={risk}>{risk}</li>)}
        </ul>
      ) : null}
      {fixPrompt ? (
        <div className="fix-prompt-box">
          <strong>给 AI 编程工具的修改说明</strong>
          <p>{fixPrompt}</p>
        </div>
      ) : !inspection.canPublish ? (
        <div className="fix-prompt-box">
          <strong>建议复制给 AI 的说明</strong>
          <p>{createGenericFixPrompt(inspection)}</p>
        </div>
      ) : null}
    </div>
  );
}

function ProjectDetail({
  demo,
  inspection,
  steps,
  form,
  submissions,
  formQuota,
  onCopyShare,
  onCopyLink,
  onUpdate,
  onAction,
  onRestartRuntime,
  onSaveRuntimeEnv,
  onResetDatabase,
  onCreateForm,
  onCopyText,
  user,
  onUpdateSlug,
  onCreateSubdomainRequest,
  subdomainRequests
}: {
  demo: Demo | null;
  inspection: Inspection | null;
  steps: DeploymentStep[];
  form: HostedForm | null;
  submissions: FormSubmission[];
  formQuota: FormQuota | null;
  onCopyShare: (demo: Demo) => void;
  onCopyLink: (url?: string) => void;
  onUpdate: (demo: Demo) => void;
  onAction: (action: "offline" | "restore" | "delete", demo: Demo) => void;
  onRestartRuntime: (demo: Demo) => void;
  onSaveRuntimeEnv: (demo: Demo, env: Record<string, string>) => void;
  onResetDatabase: (demo: Demo) => void;
  onCreateForm: (demo: Demo, fields?: HostedForm["fields"]) => void;
  onCopyText: (text: string, successMessage?: string) => void;
  user: User;
  onUpdateSlug: (demo: Demo, slug: string) => void;
  onCreateSubdomainRequest: (demo: Demo, subdomain: string) => void;
  subdomainRequests: SubdomainRequest[];
}) {
  if (!demo) {
    return (
      <Card className="panel project-detail-panel">
        <EmptyState title="选择一个试用项目" description="选择项目后，可以查看链接、报名/留言、生成记录和检查结果。" />
      </Card>
    );
  }

  const localApis = inspection?.apiCalls?.filter((item) => item.isLocal) || [];
  const fields = inspection?.formFields || [];

  return (
    <Card className="panel project-detail-panel" id="projectDetail">
      <div className="project-detail-hero">
        <div>
          <span>试用项目详情</span>
          <h2>{demo.name || demo.slug}</h2>
          <p>{demo.publicUrl || "当前没有可访问链接"}</p>
        </div>
        <Badge tone={demo.status === "published" ? "success" : "neutral"}>{demoStatusLabel(demo.status)}</Badge>
      </div>
      <div className="row-actions compact project-actions">
        {demo.publicUrl ? <Button onClick={() => onCopyLink(demo.publicUrl)}>复制链接</Button> : null}
        {demo.publicUrl ? <Button onClick={() => onCopyShare(demo)}>复制转发文案</Button> : null}
        {demo.publicUrl ? <LinkButton href={demo.publicUrl} target="_blank" rel="noreferrer">访问项目</LinkButton> : null}
        {demo.status === "published" ? <Button onClick={() => onUpdate(demo)}>更新</Button> : null}
        {demo.status === "published" && demo.hostingMode === "node_runtime" ? <Button onClick={() => onRestartRuntime(demo)}>重启运行环境</Button> : null}
        {demo.status === "published" ? <Button variant="danger" onClick={() => onAction("offline", demo)}>下线</Button> : null}
        {demo.status === "offline" ? <Button onClick={() => onAction("restore", demo)}>上线</Button> : null}
        {demo.status !== "published" && demo.status !== "deleted" ? <Button variant="danger" onClick={() => onAction("delete", demo)}>删除</Button> : null}
      </div>
      <dl className="detail-list">
        <div>
          <dt>访问链接</dt>
          <dd>{demo.publicUrl || "当前不可访问"}</dd>
        </div>
        <div>
          <dt>链接类型</dt>
          <dd>{demo.linkMode === "random" ? "系统自动分配试用链接" : "清晰项目访问地址"}</dd>
        </div>
        <div>
          <dt>二级域名</dt>
          <dd>{demo.customDomainEligible ? "可申请 xxx.demogo.cn" : "当前套餐暂不支持"}</dd>
        </div>
        <div>
          <dt>有效期</dt>
          <dd>{formatDate(demo.expiresAt)}</dd>
        </div>
        <div>
          <dt>版本</dt>
          <dd>V{demo.version || 1}</dd>
        </div>
        <div>
          <dt>发布方式</dt>
          <dd>{demo.deploySourceLabel || "网页上传"}</dd>
        </div>
        <div>
          <dt>文件规模</dt>
          <dd>{demo.fileCount || 0} 个文件 / {formatBytes(demo.extractedBytes)}</dd>
        </div>
        <div>
          <dt>访问情况</dt>
          <dd>{demo.usage?.visits || 0} 次 / {formatBytes(demo.usage?.estimatedBytes)}</dd>
        </div>
        {demo.database?.enabled ? (
          <div>
            <dt>试用数据库</dt>
            <dd>{demo.database.statusLabel || "已启用"} · {demo.database.engine?.toUpperCase() || "MySQL"}</dd>
          </div>
        ) : null}
        <div>
          <dt>最近更新</dt>
          <dd>{formatDate(demo.updatedAt || demo.createdAt)}</dd>
        </div>
      </dl>
      <LinkEntitlementPanel
        key={demo.slug}
        demo={demo}
        user={user}
        onUpdateSlug={onUpdateSlug}
        onCreateSubdomainRequest={onCreateSubdomainRequest}
        subdomainRequests={subdomainRequests}
      />
      <FormHostingPanel demo={demo} inspection={inspection} form={form} submissions={submissions} formQuota={formQuota} onCreateForm={onCreateForm} onCopyLink={onCopyLink} onCopyText={onCopyText} />
      <ApplicationReadinessPanel demo={demo} inspection={inspection} onCopyText={onCopyText} />
      <ExternalBackendPanel demo={demo} onSave={onSaveRuntimeEnv} onCopyText={onCopyText} />
      <RuntimeConfigPanel demo={demo} onSave={onSaveRuntimeEnv} onCopyText={onCopyText} />
      <DatabasePanel database={demo.database} onReset={demo.status === "published" ? () => onResetDatabase(demo) : undefined} />
      <DemoFailureDiagnosisPanel demo={demo} inspection={inspection} onCopyText={onCopyText} />
      <HostingArchitecturePanel hosting={demo.hosting || inspection?.hosting} architecture={demo.architecture || inspection?.projectArchitecture} runtime={demo.runtime || inspection?.runtime} />
      <div className="risk-panel">
        <h3>需要注意</h3>
        {!inspection ? (
          <p className="muted">暂无体检记录。</p>
        ) : (
          <>
            <div className="badge-row">
              <Badge tone={inspection.canPublish ? "success" : "warning"}>{inspection.userStatusLabel || (inspection.canPublish ? "支持" : "暂不支持")}</Badge>
              {fields.length ? <Badge tone="info">发现 {fields.length} 个填写项</Badge> : null}
              {localApis.length ? <Badge tone="warning">依赖后台功能</Badge> : null}
            </div>
            <p>{inspection.userSummary || inspection.summary}</p>
            {inspection.ruleReport?.risks?.length ? (
              <ul>
                {inspection.ruleReport.risks.slice(0, 3).map((risk) => <li key={risk}>{risk}</li>)}
              </ul>
            ) : null}
          </>
        )}
      </div>
      {steps.length ? <DeploymentSteps steps={steps.slice(-8)} /> : null}
    </Card>
  );
}

function LinkEntitlementPanel({
  demo,
  user,
  onUpdateSlug,
  onCreateSubdomainRequest,
  subdomainRequests
}: {
  demo: Demo;
  user: User;
  onUpdateSlug: (demo: Demo, slug: string) => void;
  onCreateSubdomainRequest: (demo: Demo, subdomain: string) => void;
  subdomainRequests: SubdomainRequest[];
}) {
  const [slug, setSlug] = useState(demo.slug || "");
  const [subdomain, setSubdomain] = useState((demo.slug || "").replace(/^try-[a-f0-9]+$/, ""));
  const canEditSlug = planRank(user.plan) >= planRank("lite");
  const canRequestSubdomain = user.plan === "pro";
  const demoRequests = subdomainRequests
    .filter((request) => request.demoId === demo.id)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const latestRequest = demoRequests[0] || null;

  return (
    <div className="link-entitlement-panel">
      <div className="section-mini-head">
        <div>
          <h3>链接权益</h3>
          <p>首次生成统一使用随机链接；Lite 和 Pro 可以在这里把链接改得更适合分享。</p>
        </div>
      </div>
      <div className="link-control-grid">
        <div>
          <strong>自定义链接后缀</strong>
          <p>{canEditSlug ? "保存后，新链接立即生效，旧链接会自动跳转。" : "Free 暂不支持修改链接后缀，升级 Lite 后可使用。"}</p>
          <div className="inline-input-action">
            <span>{getDemoGoApiBase()}/d/</span>
            <input className="input" value={slug} onChange={(event) => setSlug(event.target.value)} disabled={!canEditSlug} placeholder="my-demo" />
            <Button onClick={() => onUpdateSlug(demo, slug)} disabled={!canEditSlug || !slug || slug === demo.slug}>保存</Button>
          </div>
        </div>
        <div>
          <strong>专属二级域名</strong>
          <p>{canRequestSubdomain ? "提交后由管理员审核，DNS 和证书配置完成后可访问。" : "Pro 权益，可申请 xxx.demogo.cn。"}</p>
          <div className="inline-input-action">
            <input className="input" value={subdomain} onChange={(event) => setSubdomain(event.target.value)} disabled={!canRequestSubdomain} placeholder="my-demo" />
            <span>.demogo.cn</span>
            <Button onClick={() => onCreateSubdomainRequest(demo, subdomain)} disabled={!canRequestSubdomain || !subdomain}>申请</Button>
          </div>
          {latestRequest ? <SubdomainRequestStatus request={latestRequest} /> : null}
        </div>
      </div>
    </div>
  );
}

function SubdomainRequestStatus({ request }: { request: SubdomainRequest }) {
  const tone = request.status === "approved" ? "success" : request.status === "rejected" ? "warning" : "info";
  return (
    <div className="subdomain-request-status">
      <div>
        <Badge tone={tone}>{request.statusLabel || subdomainRequestStatusLabel(request.status)}</Badge>
        <strong>{request.fullDomain || `${request.subdomain}.demogo.cn`}</strong>
      </div>
      <p>{subdomainRequestNextStep(request)}</p>
      {request.adminNote ? <small>管理员说明：{request.adminNote}</small> : null}
    </div>
  );
}

function ApplicationReadinessPanel({
  demo,
  inspection,
  onCopyText
}: {
  demo: Demo;
  inspection: Inspection | null;
  onCopyText: (text: string, successMessage?: string) => void;
}) {
  const readiness = demo.applicationReadiness || inspection?.applicationReadiness || null;
  if (!readiness) return null;
  const tone = readiness.status === "ready" ? "success" : readiness.status === "blocked" ? "warning" : "info";
  const checks = readiness.checklist || [];
  const visibleChecks = checks.filter((item) => item.status !== "not_required").slice(0, 8);
  const report = readiness.deliveryReport;
  return (
    <div className="hosting-architecture application-readiness-panel">
      <div className="section-mini-head">
        <div>
          <h3>{readiness.label || "完整应用试用闭环"}</h3>
          <p>{readiness.summary || "DemoGo 正在判断这个项目是否已经具备可试用、可更新、可反馈的完整链路。"}</p>
        </div>
        <Badge tone={tone}>{readiness.statusLabel || "待检查"} · {readiness.score || 0}%</Badge>
      </div>
      {report ? (
        <div className={`trial-delivery-report delivery-${report.verdict || "unknown"}`}>
          <div>
            <span>{report.verdictLabel || "试用交付报告"}</span>
            <strong>{report.headline || "试用交付报告"}</strong>
            <p>{report.userMessage || readiness.summary}</p>
          </div>
          <div className="delivery-score">
            <strong>{report.score || readiness.score || 0}%</strong>
            <span>{report.feedbackReady ? "可开始收集反馈" : report.shareable ? "可先小范围分享" : "暂不建议分享"}</span>
          </div>
          {report.primaryAction ? <p className="delivery-primary-action">{report.primaryAction}</p> : null}
          {report.nextSteps?.length ? (
            <div className="delivery-grid">
              <div>
                <strong>下一步</strong>
                <ul>{report.nextSteps.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              {report.proofPoints?.length ? (
                <div>
                  <strong>已具备</strong>
                  <ul>{report.proofPoints.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {visibleChecks.length ? (
        <div className="readiness-check-grid">
          {visibleChecks.map((item) => (
            <div key={item.code || item.label} className={`readiness-check readiness-${item.status || "unknown"}`}>
              <strong>{item.label}</strong>
              <span>{item.statusLabel || readinessCheckLabel(item.status)}</span>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      ) : null}
      {readiness.missingActions?.length ? (
        <div className="runtime-help-box">
          <strong>下一步</strong>
          <ul>{readiness.missingActions.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      ) : null}
      {readiness.aiPrompt ? (
        <div className="row-actions compact">
          <Button onClick={() => onCopyText(readiness.aiPrompt || "", "完整应用验收说明已复制。")}>复制给 AI 怎么改</Button>
        </div>
      ) : null}
    </div>
  );
}

function RuntimeConfigPanel({
  demo,
  onSave,
  onCopyText
}: {
  demo: Demo;
  onSave: (demo: Demo, env: Record<string, string>) => void;
  onCopyText: (text: string, successMessage?: string) => void;
}) {
  const config = demo.runtimeConfig || demo.runtime?.config;
  const required = config?.required || [];
  const configured = demo.runtimeEnv || {};
  const [values, setValues] = useState<Record<string, string>>({});
  if (demo.hostingMode !== "node_runtime" && !required.length) return null;
  const missing = config?.missing || [];
  const configuredKeys = Object.keys(configured);
  const editableKeys = Array.from(new Set([...required, ...missing])).filter((key) => !["PORT", "NODE_ENV"].includes(key));
  const aiPrompt = createRuntimeFixPrompt(demo);
  return (
    <div className="hosting-architecture runtime-config-panel">
      <div className="section-mini-head">
        <div>
          <h3>运行配置</h3>
          <p>{config?.nextAction || "这里保存项目运行时需要的第三方服务地址和密钥，不会展示明文。"}</p>
        </div>
        <Badge tone={missing.length ? "warning" : "success"}>{config?.statusLabel || "运行配置"}</Badge>
      </div>
      {editableKeys.length ? (
        <div className="runtime-env-grid">
          {editableKeys.map((key) => (
            <label key={key}>
              <span>{key}</span>
              <input
                className="input"
                value={values[key] || ""}
                onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}
                placeholder={configured[key]?.maskedValue || "输入后保存"}
              />
            </label>
          ))}
        </div>
      ) : (
        <p className="muted">当前识别结果没有发现必须由用户填写的运行配置。</p>
      )}
      {configuredKeys.length ? (
        <div className="hosting-route-grid">
          {configuredKeys.map((key) => <span key={key}>{key}：{configured[key]?.maskedValue || "已配置"}</span>)}
        </div>
      ) : null}
      <div className="row-actions compact">
        {editableKeys.length ? <Button onClick={() => onSave(demo, values)}>保存运行配置</Button> : null}
        {aiPrompt ? <Button onClick={() => onCopyText(aiPrompt, "给 AI 的运行修复说明已复制。")}>复制给 AI 怎么改</Button> : null}
      </div>
    </div>
  );
}

function ExternalBackendPanel({
  demo,
  onSave,
  onCopyText
}: {
  demo: Demo;
  onSave: (demo: Demo, env: Record<string, string>) => void;
  onCopyText: (text: string, successMessage?: string) => void;
}) {
  const backend = demo.externalBackend;
  const required = backend?.requiredEnv || [];
  const configured = demo.runtimeEnv || {};
  const [values, setValues] = useState<Record<string, string>>({});
  if (backend?.provider !== "supabase") return null;

  const editableKeys = Array.from(new Set(required.length ? required : ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]));
  const missing = backend.missingEnv || [];
  const tone = backend.status === "ready" ? "success" : backend.status === "failed" ? "warning" : "info";
  const aiPrompt = createSupabaseFixPrompt(demo);

  return (
    <div className="hosting-architecture external-backend-panel">
      <div className="section-mini-head">
        <div>
          <h3>Supabase 连接</h3>
          <p>{backend.nextAction || "这个项目使用你自己的 Supabase。DemoGo 只保存 anon key，并在构建或运行时注入配置。"}</p>
        </div>
        <Badge tone={tone}>{backend.statusLabel || "Supabase"}</Badge>
      </div>
      <div className="runtime-env-grid">
        {editableKeys.map((key) => (
          <label key={key}>
            <span>{key}</span>
            <input
              className="input"
              value={values[key] || ""}
              onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}
              placeholder={configured[key]?.maskedValue || "输入后保存"}
            />
          </label>
        ))}
      </div>
      <div className="hosting-route-grid">
        <span>配置状态：{missing.length ? `缺少 ${missing.join("、")}` : "已保存必要配置"}</span>
        <span>连接检测：{backend.connection?.statusLabel || "保存后自动检测"}</span>
        {backend.connection?.checkedAt ? <span>检测时间：{formatDate(backend.connection.checkedAt)}</span> : null}
      </div>
      {backend.connection?.message || backend.warnings?.length ? (
        <div className="runtime-help-box">
          {backend.connection?.message ? <p>{backend.connection.message}</p> : null}
          {backend.warnings?.length ? <ul>{backend.warnings.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul> : null}
        </div>
      ) : null}
      <div className="runtime-help-box">
        <strong>安全边界</strong>
        <ul>
          <li>填写 Supabase URL 和 anon key，不要填写 service_role。</li>
          <li>DemoGo 不创建 Supabase 项目，也不自动执行外部数据库迁移。</li>
          <li>如果项目构建时读取这些变量，请先保存配置，再用“更新版本”重新发布。</li>
        </ul>
      </div>
      <div className="row-actions compact">
        <Button onClick={() => onSave(demo, values)}>保存并检测连接</Button>
        {aiPrompt ? <Button onClick={() => onCopyText(aiPrompt, "Supabase 接入说明已复制。")}>复制给 AI 怎么改</Button> : null}
      </div>
    </div>
  );
}

function DatabasePanel({ database, onReset }: { database?: Demo["database"] | null; onReset?: () => void }) {
  if (!database?.enabled) return null;
  return (
    <div className="hosting-architecture database-panel">
      <div className="section-mini-head">
        <div>
          <h3>试用数据库</h3>
          <p>这个项目已分配独立的 MySQL 试用库，只用于当前试用环境。</p>
        </div>
        <Badge tone={database.status === "ready" ? "success" : "neutral"}>{database.statusLabel || "已启用"}</Badge>
      </div>
      <div className="hosting-route-grid">
        <span>数据库：{database.databaseName || "-"}</span>
        <span>账号：{database.userName || "-"}</span>
        <span>类型：{database.engine?.toUpperCase() || "MySQL"}</span>
        <span>初始化：{database.schema?.statusLabel || "未检测到初始化脚本"}</span>
        <span>创建时间：{formatDate(database.createdAt || "")}</span>
        {database.resetAt ? <span>最近重置：{formatDate(database.resetAt)}</span> : null}
      </div>
      {database.schema?.error ? (
        <div className="runtime-log-panel">
          <strong>数据库初始化错误</strong>
          <pre>{database.schema.error}</pre>
        </div>
      ) : null}
      <div className="runtime-help-box">
        <strong>使用说明</strong>
        <ul>
          <li>DemoGo 已把数据库连接信息注入到运行环境，项目代码通过 MYSQL_HOST、MYSQL_DATABASE、MYSQL_USER、MYSQL_PASSWORD 或 DATABASE_URL 读取。</li>
          <li>如果项目包根目录包含 schema.sql，DemoGo 会在创建或重置数据库时尝试执行。</li>
          <li>Prisma、Sequelize、TypeORM 等迁移暂不自动执行，请先用 schema.sql 或应用启动逻辑完成初始化。</li>
        </ul>
      </div>
      {onReset ? <div className="row-actions compact"><Button variant="danger" onClick={onReset}>重置试用数据库</Button></div> : null}
    </div>
  );
}

function DemoFailureDiagnosisPanel({
  demo,
  inspection,
  onCopyText
}: {
  demo: Demo;
  inspection: Inspection | null;
  onCopyText: (text: string, successMessage?: string) => void;
}) {
  const diagnosis = demo.failureDiagnosis || demo.runtime?.failureDiagnosis || inspection?.failureDiagnosis || null;
  if (!diagnosis) return null;
  return (
    <div className="hosting-architecture failure-diagnosis-panel">
      <FailureDiagnosisPanel diagnosis={diagnosis} />
      {diagnosis.aiPrompt ? (
        <div className="row-actions compact">
          <Button onClick={() => onCopyText(diagnosis.aiPrompt || "", "失败修复说明已复制。")}>复制给 AI 怎么改</Button>
        </div>
      ) : null}
    </div>
  );
}

function FailureDiagnosisPanel({ diagnosis }: { diagnosis: FailureDiagnosis }) {
  const tone = diagnosis.severity === "blocked" ? "warning" : "info";
  return (
    <div className="failure-diagnosis">
      <div className="section-mini-head">
        <div>
          <h3>{diagnosis.title || "失败诊断"}</h3>
          <p>{diagnosis.summary || "这次没有完成发布，请根据诊断处理后重试。"}</p>
        </div>
        <Badge tone={tone}>{failureCategoryLabel(diagnosis.category)}</Badge>
      </div>
      {diagnosis.evidence?.length ? (
        <div className="diagnosis-grid">
          <div>
            <strong>判断依据</strong>
            <ul>{diagnosis.evidence.slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          {diagnosis.userActions?.length ? (
            <div>
              <strong>下一步</strong>
              <ul>{diagnosis.userActions.slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function failureCategoryLabel(category?: string) {
  const labels: Record<string, string> = {
    quota: "额度",
    content: "内容",
    package: "项目包",
    unsupported: "暂不支持",
    runtime_env: "运行配置",
    dependency_install: "依赖",
    build: "构建",
    runtime_start: "启动",
    database_init: "数据库"
  };
  return labels[category || ""] || "诊断";
}

function HostingArchitecturePanel({
  hosting,
  architecture,
  runtime,
  compact = false
}: {
  hosting?: Demo["hosting"] | null;
  architecture?: Demo["architecture"] | null;
  runtime?: Demo["runtime"] | null;
  compact?: boolean;
}) {
  const currentHosting = hosting || architecture?.hosting || null;
  const currentRuntime = runtime || currentHosting?.runtime || null;
  if (!currentHosting && !architecture) return null;
  const layers = architecture?.layers || [];
  return (
    <div className={`hosting-architecture ${compact ? "compact" : ""}`}>
      <div className="section-mini-head">
        <div>
          <h3>{compact ? "托管方式" : "应用托管架构"}</h3>
          <p>{currentHosting?.routeStrategy?.description || "DemoGo 会按项目类型选择网页托管或应用运行环境。"}</p>
        </div>
        <Badge tone={currentRuntime?.status === "ready" || currentRuntime?.status === "not_required" ? "success" : "info"}>
          {currentHosting?.modeLabel || architecture?.projectKindLabel || "托管架构"}
        </Badge>
      </div>
      <div className="hosting-route-grid">
        <span>访问入口：{currentHosting?.routeStrategy?.publicPath || "/d/{slug}/"}</span>
        <span>接口路径：{currentHosting?.routeStrategy?.apiPath || "无需接口转发"}</span>
        <span>运行状态：{currentRuntime?.statusLabel || "无需运行环境"}</span>
        <span>生命周期：{currentRuntime?.lifecycle?.stageLabel || "按试用链接有效期管理"}</span>
        {currentRuntime?.frameworkLabel ? <span>服务框架：{currentRuntime.frameworkLabel}</span> : null}
        {currentRuntime?.selectedStartCommand ? <span>启动命令：{currentRuntime.selectedStartCommand}</span> : null}
      </div>
      {!compact && layers.length ? (
        <div className="architecture-layer-list">
          {layers.map((layer) => (
            <span key={layer.code || layer.label} className={`layer-${layer.status || "planned"}`}>
              {layer.label || layer.code}
            </span>
          ))}
        </div>
      ) : null}
      {!compact && currentRuntime?.limits ? (
        <p className="muted">
          运行边界：{currentRuntime.limits.memory || "512m"} 内存，{currentRuntime.limits.cpus || "1"} CPU，默认保留 {currentRuntime.limits.ttlMinutes || 120} 分钟。
        </p>
      ) : null}
      {!compact && currentHosting?.mode === "node_runtime" ? (
        <div className="runtime-help-box">
          <strong>Node.js 项目要求</strong>
          <ul>
            <li>项目必须有 start 命令，并监听 process.env.PORT。</li>
            <li>当前支持单服务试用，不支持多服务编排、Redis、MongoDB、PostgreSQL、WebSocket 和 SSR 运行态。</li>
            <li>首次启动会安装依赖，耗时比静态网页更长；启动失败时可以把日志摘要复制给 AI 修改。</li>
          </ul>
        </div>
      ) : null}
      {!compact && currentRuntime?.logSummary ? (
        <div className="runtime-log-panel">
          <strong>运行日志摘要</strong>
          <pre>{currentRuntime.logSummary}</pre>
        </div>
      ) : null}
      {!compact && currentRuntime?.failureDiagnosis ? <FailureDiagnosisPanel diagnosis={currentRuntime.failureDiagnosis} /> : null}
      {!compact && currentHosting?.limitations?.length ? (
        <ul>
          {currentHosting.limitations.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

function ProjectProfilePanel({ profile }: { profile: NonNullable<Demo["projectProfile"]> }) {
  const notes = profile.supportStatus === "unsupported" ? profile.unsupportedReasons || [] : profile.notes || [];
  return (
    <div className="project-profile-panel">
      <div>
        <strong>{profile.label || "项目类型"}</strong>
        <span>{profile.summary || "DemoGo 已完成项目识别。"}</span>
      </div>
      <Badge tone={profile.supportStatus === "unsupported" ? "warning" : "success"}>{profile.supportLabel || (profile.supported ? "当前支持" : "暂不支持")}</Badge>
      {notes.length ? (
        <ul>
          {notes.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

function ProjectAssessmentPanel({ assessment }: { assessment: NonNullable<NonNullable<Demo["projectProfile"]>["assessment"]> }) {
  const frontend = assessment.frameworks?.frontend || [];
  const backend = assessment.frameworks?.backend || [];
  const database = assessment.frameworks?.database || [];
  const envVars = assessment.environmentVariables?.required || [];
  const missing = assessment.support?.missingRequirements || [];
  const canPublish = Boolean(assessment.support?.canPublishNow);
  const details = [
    frontend.length ? `页面框架：${frontend.map((item) => item.label || item.code).join("、")}` : "",
    backend.length ? `后端能力：${backend.map((item) => item.label || item.code).join("、")}` : "",
    database.length ? `数据能力：${database.map((item) => item.label || item.code).join("、")}` : "",
    envVars.length ? `运行配置：需要 ${envVars.slice(0, 4).join("、")}${envVars.length > 4 ? " 等" : ""}` : ""
  ].filter(Boolean);

  return (
    <div className="project-profile-panel project-assessment-panel">
      <div>
        <strong>{assessment.projectKindLabel || "项目识别结果"}</strong>
        <span>{assessment.support?.nextAction || "DemoGo 已完成项目结构识别。"}</span>
      </div>
      <Badge tone={canPublish ? "success" : "warning"}>
        {canPublish ? "可以发布" : "先处理后发布"}
      </Badge>
      {details.length ? (
        <ul>
          {details.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}
      {missing.length ? (
        <ul>
          {missing.slice(0, 4).map((item) => <li key={item}>{missingRequirementLabel(item)}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

function missingRequirementLabel(value: string) {
  const labels: Record<string, string> = {
    missing_build_script: "缺少网页生成命令",
    missing_start_script: "缺少应用启动命令",
    ssr_runtime_planned: "需要完整应用运行能力",
    external_backend_config: "需要连接外部后端",
    unsupported_database: "数据库连接能力还不完整",
    environment_variables: "需要补充运行配置",
    unsupported_runtime: "运行环境暂不支持"
  };
  return labels[value] || value;
}

function readinessCheckLabel(value?: string) {
  const labels: Record<string, string> = {
    ready: "已具备",
    not_required: "无需",
    missing: "待补齐",
    warning: "需关注",
    blocked: "有阻塞"
  };
  return labels[value || ""] || "待检查";
}

function createRuntimeFixPrompt(demo: Demo) {
  const missing = demo.runtimeConfig?.missing || demo.runtime?.config?.missing || [];
  const logs = demo.runtime?.logSummary || demo.runtime?.logs || "";
  const databaseError = demo.database?.schema?.error || "";
  if (!missing.length && !logs && !databaseError) return "";
  return [
    "请帮我把这个项目改成可以在 DemoGo 试用环境运行。",
    "要求：项目必须有 start 命令，服务必须监听 process.env.PORT；如果需要数据库，请通过 MYSQL_HOST、MYSQL_PORT、MYSQL_DATABASE、MYSQL_USER、MYSQL_PASSWORD 或 DATABASE_URL 读取连接。",
    missing.length ? `当前缺少运行配置：${missing.join("、")}。请补充 .env.example，并说明这些变量如何填写。` : "",
    databaseError ? `数据库初始化错误：${databaseError}` : "",
    logs ? `运行日志摘要：\n${logs}` : "",
    "当前不要依赖 Redis、MongoDB、PostgreSQL、WebSocket、多服务编排或真实支付系统。"
  ].filter(Boolean).join("\n\n");
}

function createSupabaseFixPrompt(demo: Demo) {
  const backend = demo.externalBackend;
  if (backend?.provider !== "supabase") return "";
  const required = backend.requiredEnv?.length ? backend.requiredEnv : ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];
  return [
    "请帮我检查这个项目的 Supabase 接入，让它可以通过 DemoGo 生成试用链接。",
    `DemoGo 会注入这些变量：${required.join("、")}。请让项目从环境变量读取 Supabase URL 和 anon key，不要写死在源码里。`,
    "如果是 Vite/React/Vue 前端，请使用 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。",
    "如果是 Next.js 前端公开变量，请使用 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。",
    "不要在前端使用 SUPABASE_SERVICE_ROLE_KEY 或 service_role。",
    backend.connection?.message ? `当前连接检测结果：${backend.connection.message}` : "",
    backend.missingEnv?.length ? `当前缺少：${backend.missingEnv.join("、")}。` : "",
    "DemoGo 不会自动创建 Supabase 项目，也不会自动执行外部数据库迁移；如需表结构，请在 Supabase 控制台处理。"
  ].filter(Boolean).join("\n\n");
}

function subdomainRequestStatusLabel(status?: string) {
  if (status === "approved") return "已通过";
  if (status === "rejected") return "已拒绝";
  if (status === "canceled") return "已取消";
  return "待处理";
}

function subdomainRequestNextStep(request: SubdomainRequest) {
  if (request.status === "approved") return "申请已通过，等待平台完成解析和证书配置后即可使用。";
  if (request.status === "rejected") return "申请未通过，请根据管理员说明调整后重新提交。";
  return "申请已提交，管理员会确认是否可以使用这个二级域名。";
}

function ProjectDetailDrawer({
  demo,
  inspection,
  steps,
  form,
  submissions,
  formQuota,
  onClose,
  onCopyShare,
  onCopyLink,
  onUpdate,
  onAction,
  onRestartRuntime,
  onSaveRuntimeEnv,
  onResetDatabase,
  onCreateForm,
  onCopyText,
  user,
  onUpdateSlug,
  onCreateSubdomainRequest,
  subdomainRequests
}: {
  demo: Demo | null;
  inspection: Inspection | null;
  steps: DeploymentStep[];
  form: HostedForm | null;
  submissions: FormSubmission[];
  formQuota: FormQuota | null;
  onClose: () => void;
  onCopyShare: (demo: Demo) => void;
  onCopyLink: (url?: string) => void;
  onUpdate: (demo: Demo) => void;
  onAction: (action: "offline" | "restore" | "delete", demo: Demo) => void;
  onRestartRuntime: (demo: Demo) => void;
  onSaveRuntimeEnv: (demo: Demo, env: Record<string, string>) => void;
  onResetDatabase: (demo: Demo) => void;
  onCreateForm: (demo: Demo, fields?: HostedForm["fields"]) => void;
  onCopyText: (text: string, successMessage?: string) => void;
  user: User;
  onUpdateSlug: (demo: Demo, slug: string) => void;
  onCreateSubdomainRequest: (demo: Demo, subdomain: string) => void;
  subdomainRequests: SubdomainRequest[];
}) {
  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [onClose]);

  return (
    <div className="detail-drawer-layer" role="dialog" aria-modal="true" aria-label="试用项目详情">
      <button className="detail-drawer-backdrop" type="button" aria-label="关闭试用项目详情" onClick={onClose} />
      <aside className="detail-drawer">
        <div className="detail-drawer-header">
          <div>
            <span>试用项目详情</span>
            <strong>{demo?.name || demo?.slug || "正在加载"}</strong>
          </div>
          <Button onClick={onClose}>关闭</Button>
        </div>
        <div className="detail-drawer-body">
          <ProjectDetail
            demo={demo}
            inspection={inspection}
            steps={steps}
            form={form}
            submissions={submissions}
            formQuota={formQuota}
            onCopyShare={onCopyShare}
            onCopyLink={onCopyLink}
            onUpdate={onUpdate}
            onAction={onAction}
            onRestartRuntime={onRestartRuntime}
            onSaveRuntimeEnv={onSaveRuntimeEnv}
            onResetDatabase={onResetDatabase}
            onCreateForm={onCreateForm}
            onCopyText={onCopyText}
            user={user}
            onUpdateSlug={onUpdateSlug}
            onCreateSubdomainRequest={onCreateSubdomainRequest}
            subdomainRequests={subdomainRequests}
          />
        </div>
      </aside>
    </div>
  );
}

function FormHostingPanel({
  demo,
  inspection,
  form,
  submissions,
  formQuota,
  onCreateForm,
  onCopyLink,
  onCopyText
}: {
  demo: Demo;
  inspection: Inspection | null;
  form: HostedForm | null;
  submissions: FormSubmission[];
  formQuota: FormQuota | null;
  onCreateForm: (demo: Demo, fields?: HostedForm["fields"]) => void;
  onCopyLink: (url?: string) => void;
  onCopyText: (text: string, successMessage?: string) => void;
}) {
  const detectedFields = (inspection?.formFields || []).map((field) => ({
    name: field.name || field.label || "",
    label: field.label || field.name || "",
    type: field.type || "text",
    required: false
  })).filter((field) => field.name || field.label);
  const fallbackFields = [
    { name: "name", label: "姓名", type: "text", required: true },
    { name: "phone", label: "手机号", type: "phone", required: true },
    { name: "message", label: "留言", type: "textarea", required: false }
  ];
  const formFields = detectedFields.length ? detectedFields : fallbackFields;
  const formInstruction = form ? createFormIntegrationInstruction(form) : "";

  return (
    <div className="form-hosting-panel">
      <div className="section-mini-head">
        <div>
          <h3>报名/留言记录</h3>
          <p>用于收集报名、预约、留言等记录。DemoGo 只保存基础提交，不运行完整后台业务。</p>
        </div>
        <Badge tone={form ? "success" : detectedFields.length ? "warning" : "neutral"}>
          {form ? "自动收集中" : detectedFields.length ? "可自动收集" : "未发现表单"}
        </Badge>
      </div>
      {!form ? (
        <div className="form-hosting-empty">
          <p>
            {detectedFields.length
              ? `检测到 ${detectedFields.length} 个疑似表单字段。正常情况下，生成链接时会自动开启收集；如果这里还未开启，可以手动补开。`
              : "这个试用项目暂未发现可自动收集的表单。如果页面确实有表单，可以补开一个基础收集入口。"}
          </p>
          <small>当前套餐表单：{formQuota?.forms?.used || 0}/{formQuota?.forms?.limit || 0} · 本月提交：{formQuota?.monthlySubmissions?.used || 0}/{formQuota?.monthlySubmissions?.limit || 0}</small>
          <Button variant="primary" disabled={demo.status !== "published"} onClick={() => onCreateForm(demo, formFields)}>
            补开表单收集
          </Button>
        </div>
      ) : (
        <div className="form-hosting-active">
          <div className="auto-form-status">
            <Badge tone="success">已自动接管</Badge>
            <p>用户在这个页面提交报名、预约或留言后，记录会自动显示在这里。</p>
          </div>
          <div className="form-submit-url">
            <span>收集入口</span>
            <strong>{form.submitUrl || "-"}</strong>
            <Button onClick={() => onCopyLink(form.submitUrl)}>复制收集入口</Button>
          </div>
          <details className="form-ai-instruction">
            <summary>如果自动收集没有生效，再使用备用接入指令</summary>
            <div>
              <p>把这段指令交给 Codex、Cursor、Claude Code 或其他 AI 工具，让它把页面里的表单提交到上面的地址。</p>
              <Button onClick={() => onCopyText(formInstruction, "表单接入指令已复制。")}>复制备用指令</Button>
            </div>
          </details>
          <div className="form-field-chips">
            {form.fields.map((field) => (
              <span key={field.name}>{field.label || field.name}</span>
            ))}
          </div>
          <div className="submission-list">
            <div className="section-mini-head">
              <h4>提交记录</h4>
              <span>{form.submissionCount || submissions.length} 条</span>
            </div>
            {!submissions.length ? (
              <p className="muted">还没有收到提交。打开试用链接填一次表单，记录会显示在这里。</p>
            ) : (
              submissions.slice(0, 5).map((item) => (
                <div className="submission-row" key={item.id}>
                  <strong>{formatDate(item.createdAt)}</strong>
                  <p>{Object.entries(item.payload || {}).map(([key, value]) => `${key}: ${value}`).join(" · ")}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PlanPanel({
  user,
  requests,
  reloadRequests,
  show
}: {
  user: User;
  requests: PlanRequest[];
  reloadRequests: () => Promise<void>;
  show: (text: string, tone?: "info" | "success" | "warning" | "danger") => void;
}) {
  const [targetPlan, setTargetPlan] = useState<"lite" | "pro">("lite");
  const [contact, setContact] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const openRequest = requests.find((item) => item.status === "open");
  const availablePlans = plans.filter((plan) => plan.code !== "free" && planRank(plan.code) > planRank(user.plan));
  const defaultTargetPlan = availablePlans[0]?.code;
  const effectiveTargetPlan = availablePlans.some((plan) => plan.code === targetPlan)
    ? targetPlan
    : defaultTargetPlan === "lite" || defaultTargetPlan === "pro"
      ? defaultTargetPlan
      : "lite";

  async function submit() {
    if (openRequest) {
      show(`你已有一个待处理的 ${openRequest.requestedPlanName || planName(openRequest.requestedPlan)} 申请，请等待管理员处理。`, "warning");
      return;
    }
    try {
      await createPlanRequest({ plan: effectiveTargetPlan, contact, message: requestMessage });
      setRequestMessage("");
      show(`已提交 ${effectiveTargetPlan === "pro" ? "Pro" : "Lite"} 升级申请。`, "success");
      await reloadRequests();
    } catch (error) {
      show(error instanceof Error ? error.message : "升级申请提交失败。", "danger");
    }
  }

  return (
    <Card className="panel" id="plan">
      <div className="panel-head">
        <div>
          <h2>套餐与额度</h2>
          <p>当前套餐：{user.planName || planName(user.plan)}。套餐名称统一为 Free、Lite、Pro。</p>
        </div>
        <Badge tone="info">人工审核开通</Badge>
      </div>
      <div className="plan-options">
        {plans.map((plan) => (
          <button
            className={`plan-option ${plan.code === user.plan ? "is-current" : ""} ${plan.code === effectiveTargetPlan ? "is-selected" : ""}`}
            key={plan.code}
            type="button"
            disabled={plan.code === "free" || planRank(plan.code) <= planRank(user.plan)}
            onClick={() => {
              if (plan.code === "lite" || plan.code === "pro") setTargetPlan(plan.code);
            }}
          >
            <span className="plan-option-title">
              <strong>{plan.name}</strong>
              {plan.code === user.plan ? <Badge tone="success">当前套餐</Badge> : null}
            </span>
            <span>{plan.description}</span>
            <small>{plan.onlineDemos} 个在线试用项目 · {plan.monthlyDeploys} 次生成/更新/月 · 保留 {plan.retentionDays} 天</small>
            <small className="plan-link-benefit">{plan.linkBenefit}</small>
          </button>
        ))}
      </div>
      {availablePlans.length ? (
        <div className="upgrade-form">
          <label className="form-field">
            联系方式
            <input className="input" value={contact} onChange={(event) => setContact(event.target.value)} placeholder="手机号、微信或邮箱" />
          </label>
          <label className="form-field">
            申请说明
            <textarea className="textarea" value={requestMessage} onChange={(event) => setRequestMessage(event.target.value)} placeholder="例如：准备给用户试用，希望开通 Pro。" />
          </label>
          <Button variant="primary" disabled={Boolean(openRequest)} onClick={submit}>
            {openRequest ? "已有待处理申请" : `申请 ${effectiveTargetPlan === "pro" ? "Pro" : "Lite"}`}
          </Button>
        </div>
      ) : (
        <p className="muted">当前已是最高套餐，暂不支持降级。</p>
      )}
    </Card>
  );
}

function PlanRequestsTable({ requests }: { requests: PlanRequest[] }) {
  return (
    <Card className="panel" id="requests">
      <div className="panel-head">
        <div>
          <h2>我的升级申请</h2>
          <p>待处理、已开通、已拒绝都会保留，方便查看管理员说明。</p>
        </div>
      </div>
      {!requests.length ? (
        <EmptyState title="暂无升级申请" description="需要更多在线项目或生成次数时，可以在套餐区提交申请。" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>申请套餐</th>
                <th>状态</th>
                <th>提交时间</th>
                <th>处理时间</th>
                <th>管理员说明</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.requestedPlanName || planName(request.requestedPlan)}</td>
                  <td>{planRequestStatusLabel(request.status)}</td>
                  <td>{formatDate(request.createdAt)}</td>
                  <td>{formatDate(request.handledAt)}</td>
                  <td>{request.adminNote || (request.status === "approved" ? "已开通" : "-")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function DeployHistory({
  events,
  monthUsage,
  compact = false
}: {
  events: DeployEvent[];
  monthUsage: { used: number; limit: number } | null;
  compact?: boolean;
}) {
  return (
    <Card className={`panel ${compact ? "compact-panel" : ""}`} id="deployHistory">
      <h2>本月生成记录</h2>
      <p className="muted">本月已使用 {monthUsage?.used || 0} / {monthUsage?.limit || 0} 次生成/更新额度。</p>
      {!events.length ? (
        <EmptyState title="暂无生成记录" description="成功生成或更新试用链接后会显示在这里。" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>试用项目</th>
                <th>操作</th>
                <th>版本</th>
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 8).map((event) => (
                <tr key={event.id}>
                  <td>{formatDate(event.at)}</td>
                  <td>{(event as any).name || event.demoSlug}</td>
                  <td>{event.typeLabel}</td>
                  <td>V{event.version || 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function FeedbackPanel({ demos, show }: { demos: Demo[]; show: (text: string, tone?: "info" | "success" | "warning" | "danger") => void }) {
  const [type, setType] = useState("suggestion");
  const [demoId, setDemoId] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  async function submit() {
    if (feedbackMessage.trim().length < 5) {
      show("请至少填写 5 个字的问题描述。", "warning");
      return;
    }
    try {
      await createFeedback({ type, demoId, message: feedbackMessage });
      setFeedbackMessage("");
      show("已收到反馈，我们会优先查看真实试用中遇到的问题。", "success");
    } catch (error) {
      show(error instanceof Error ? error.message : "反馈提交失败。", "danger");
    }
  }

  return (
    <Card className="panel" id="feedback">
      <h2>反馈问题</h2>
      <div className="feedback-form">
        <label className="form-field">
          问题类型
          <select className="select" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="deploy_failed">生成链接失败</option>
            <option value="form_data">表单数据</option>
            <option value="page_error">页面打不开</option>
            <option value="suggestion">功能建议</option>
            <option value="other">其他问题</option>
          </select>
        </label>
        <label className="form-field">
          关联试用项目
          <select className="select" value={demoId} onChange={(event) => setDemoId(event.target.value)}>
            <option value="">不关联试用项目</option>
            {demos.map((demo) => <option key={demo.id} value={demo.id}>{demo.slug}</option>)}
          </select>
        </label>
        <label className="form-field">
          问题描述
          <textarea className="textarea" value={feedbackMessage} onChange={(event) => setFeedbackMessage(event.target.value)} placeholder="请简单说明你遇到的问题。" />
        </label>
        <Button onClick={submit}>提交反馈</Button>
      </div>
    </Card>
  );
}

