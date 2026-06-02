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
import { createHostedForm, getForms, getHostedForm, type FormQuota } from "../api/forms";
import { createPlanRequest, getPlanRequests } from "../api/planRequests";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { MetricCard } from "../components/MetricCard";
import { Card } from "../components/Card";
import { IcpLink } from "../components/IcpLink";
import { Toast } from "../components/Toast";
import { planName, plans, planRank } from "../config/plans";
import type { Demo, DeployEvent, DeploymentStep, FormSubmission, HostedForm, PlanRequest, Quota, SubdomainRequest, User } from "../types";
import { trackTrialEvent } from "../api/trialEvents";
import { createShareText, writeClipboardText } from "../utils/share";
import type { Inspection } from "../api/demos";
import { ApiError } from "../api/client";
import { createAgentInstruction, createClientDeploymentSteps, createFailureInspection, createGenericFixPrompt, isSupportedArchive, markClientStepsFailed, waitForDeploymentJob } from "./dashboard/utils";
import { DeploymentSteps } from "../components/dashboard/DashPanels";
import { FeedbackPanel } from "../components/dashboard/FeedbackPanel";
import { Sidebar } from "./dashboard/Sidebar";
import { OverviewView } from "./dashboard/OverviewView";
import { AgentPublishPanel } from "./dashboard/AgentPublishPanel";
import { ProjectsView } from "./dashboard/ProjectsView";
import { HostingArchitecturePanel } from "./dashboard/HostingArchitecturePanel";

import { FailureDiagnosisPanel } from "../components/dashboard/FailureDiagnosisPanel";
import { PlanRequestsTable } from "../components/dashboard/PlanRequestsTable";
import { DeployHistory } from "../components/dashboard/DeployHistory";

import { PublishSuccess } from "../components/dashboard/PublishSuccess";
import { ProjectProfilePanel } from "../components/dashboard/ProjectProfilePanel";
import { ProjectAssessmentPanel } from "../components/dashboard/ProjectAssessmentPanel";
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- zustand setters have stable references
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

function dashboardViewTitle(view: DashboardView) {
  if (view === "agent") return "让 AI 帮我";
  const titles: Record<Exclude<DashboardView, "agent">, string> = {
    overview: "工作台",
    upload: "生成新链接",
    projects: "我的作品",
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
  const [targetPlan, setTargetPlan] = useState<"lite" | "pro">("pro");
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

