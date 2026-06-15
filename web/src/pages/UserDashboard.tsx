import { useCallback, useEffect, useReducer, useState } from "react";
import { useAppStore } from "../stores/appStore";
import { deployReducer, createInitialDeployState } from "./dashboard/deployReducer";
import { getAgentToken, getMe, resetAgentToken } from "../api/auth";
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
import { Card } from "../components/Card";
import { IcpLink } from "../components/IcpLink";
import { Toast } from "../components/Toast";
import { planName, plans } from "../config/plans";
import type { Demo, DeployEvent, DeploymentStep, FormSubmission, HostedForm, PlanRequest, Quota, SubdomainRequest, User } from "../types";
import { trackTrialEvent } from "../api/trialEvents";
import { createShareText, writeClipboardText } from "../utils/share";
import type { Inspection } from "../api/demos";
import { ApiError } from "../api/client";
import { createClientDeploymentSteps, createFailureInspection, markClientStepsFailed, waitForDeploymentJob } from "./dashboard/utils";
import { FeedbackCollection } from "../components/dashboard/FeedbackCollection";
import { Sidebar } from "./dashboard/Sidebar";
import { OverviewView } from "./dashboard/OverviewView";
import { AgentPublishPanel } from "./dashboard/AgentPublishPanel";
import { UploadPanel } from "./dashboard/UploadPanel";
import { ProjectsView } from "./dashboard/ProjectsView";

import { PlanRequestsTable } from "../components/dashboard/PlanRequestsTable";
import { DeployHistory } from "../components/dashboard/DeployHistory";
import { PlanPanel } from "./dashboard/PlanPanel";

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
      const [payload, mePayload] = await Promise.all([
        getPlanRequests(),
        getMe()
      ]);
      setRequests(payload.requests || []);
      if (mePayload.user) {
        setUser(mePayload.user);
        setQuota(mePayload.quota || null);
      }
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

  function resetUploadState(options: { keepUpdateTarget?: boolean } = {}) {
    deployDispatch({ type: "SET_FILE", file: null });
    deployDispatch({ type: "SET_NAME", name: "" });
    deployDispatch({ type: "SET_INSPECTION", inspection: null });
    deployDispatch({ type: "SET_STEPS", steps: markClientStepsFailed([]) });
    deployDispatch({ type: "SET_LATEST_DEMO", demo: null });
    if (!options.keepUpdateTarget) deployDispatch({ type: "RESET" });
  }

  async function handleSelectDemoFromOverview(id: string) {
    setSelectedDemoId(id);
    await loadDemoDetail(id);
    setProjectDetailOpen(true);
    setActiveView("projects");
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

  /** Merged inspect + deploy — single button flow */
  async function handlePublish() {
    if (!deployState.file) {
      show("请先选择 .zip、.tar.gz 或 .tgz 项目包。", "warning");
      return;
    }
    try {
      /* Phase 1: Inspect */
      deployDispatch({ type: "SET_DEPLOYING", deploying: true });
      deployDispatch({ type: "SET_STEPS", steps: [] });
      deployDispatch({ type: "SET_LATEST_DEMO", demo: null });
      show("正在检查项目...");

      const inspectionPayload = await inspectProject(deployState.file);
      deployDispatch({ type: "SET_INSPECTION", inspection: inspectionPayload.inspection });

      if (!inspectionPayload.inspection?.canPublish) {
        deployDispatch({ type: "SET_DEPLOYING", deploying: false });
        deployDispatch({ type: "SET_STEPS", steps: [] });
        show(inspectionPayload.inspection?.userSummary || inspectionPayload.inspection?.summary || "项目检查不通过，请按提示调整后重试。", "warning");
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
    <div className="dash">
      <Sidebar activeView={activeView} setActiveView={navigateDashboard} userName={user.email} userRole={user.planName || `免费版 · 剩余 ${quota?.monthlyDeploys ? (quota.monthlyDeploys.limit - quota.monthlyDeploys.used) : 0} 次`} />
      <main className="main">
        <div className="main-header">
          <div>
            <h1>{dashboardViewTitle(activeView)}</h1>
            <p className="sub">{dashboardViewSubtitle(activeView, user)}</p>
          </div>
          {activeView !== "upload" && activeView !== "agent" && activeView !== "plan" && activeView !== "history" && activeView !== "feedback" ? (
            <a className="btn-pill" onClick={startCreateProject} style={{cursor: "pointer"}}>+ 新建发布</a>
          ) : null}
        </div>
        {message ? <Toast message={message} tone={messageTone} /> : null}
        {activeView === "overview" ? (
          <OverviewView
            user={user}
            demos={demos}
            quota={quota}
            monthUsage={monthUsage}
            setActiveView={setActiveView}
            onCreate={startCreateProject}
            onCopyLink={handleCopyLink}
            onCopyShare={handleCopyShare}
            onSelectDemo={handleSelectDemoFromOverview}
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
            setActiveView={setActiveView}
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
            onPublish={handlePublish}
            onCopyShare={handleCopyShare}
            onFileRejected={(name) => show(`${name} 格式不支持，请上传 .zip、.tar.gz 或 .tgz 项目包。`, "warning")}
            onCopyLink={handleCopyLink}
          />
        ) : null}
        {activeView === "agent" ? (
          <AgentPublishPanel
            token={agentToken}
            onResetToken={handleResetAgentToken}
          />
        ) : null}
        {activeView === "plan" ? (
          <PlanView user={user} quota={quota} requests={requests} reloadRequests={loadPlanRequests} show={show} />
        ) : null}
        {activeView === "history" ? (
          <DeployHistory events={events} monthUsage={monthUsage} />
        ) : null}
        {activeView === "feedback" ? (
          <FeedbackCollection />
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
  if (view === "agent") return "AI 发布";
  const titles: Record<Exclude<DashboardView, "agent">, string> = {
    overview: "工作台",
    upload: "生成新链接",
    projects: "我的作品",
    plan: "套餐与额度",
    history: "生成记录",
    feedback: "反馈收集"
  };
  return titles[view];
}

function dashboardViewSubtitle(view: DashboardView, user: User) {
  if (view === "agent") return "选择发布方式，生成指令，复制给 AI 工具即可发布";
  if (view === "overview") return `${user.email} · 当前套餐 ${user.planName || planName(user.plan)}`;
  if (view === "projects") return "查看链接、访问、报名/留言、发布记录和项目操作。";
  if (view === "upload") return "上传项目包，DemoGo 先检查，再生成可分享的试用链接。";
  if (view === "plan") return "查看额度使用情况，申请升级套餐。客服QQ：304598006 · 邮箱：hello@demogo.cn";
  if (view === "history") return "查看本月生成和更新记录，理解额度使用情况。";
  if (view === "feedback") return "查看用户对你作品的反馈和建议。";
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
    <div>
      {/* Plan Cards Grid (iOS style) */}
      <div className="plan-grid">
        <div className={`plan-card${user.plan === "free" ? " plan-card--current" : ""}`}>
          <div className="plan-name">免费版</div>
          <div className="plan-price">¥0 <sub>/月</sub></div>
          <div className="plan-desc">个人项目试用，快速验证想法</div>
          {user.plan === "free" && <div className="plan-badge plan-badge--current">当前套餐</div>}
          <div className="plan-actions">
            <button className="btn-pill btn-pill--outline" style={{ width: "100%" }}>当前套餐</button>
          </div>
        </div>
        <div className={`plan-card${user.plan !== "free" ? " plan-card--current" : ""}`}>
          <div className="plan-name">专业版</div>
          <div className="plan-price">¥49 <sub>/月</sub></div>
          <div className="plan-desc">团队协作，更多额度和高级功能</div>
          {user.plan !== "free" && <div className="plan-badge plan-badge--current">当前套餐</div>}
          <div className="plan-actions">
            <button className="btn-pill" style={{ width: "100%" }} disabled={user.plan !== "free"}>升级</button>
          </div>
        </div>
      </div>

      {/* Usage Bars */}
      {quota && (
        <div className="usage-section">
          <h2>额度使用</h2>
          <div className="usage-bar-group">
            <div>
              <div className="usage-bar-label">
                <span>在线项目</span>
                <span>{quota.onlineDemos?.used || 0} / {quota.onlineDemos?.limit || 1}</span>
              </div>
              <div className="usage-bar">
                <div className="usage-bar-fill" style={{ width: `${Math.min(100, ((quota.onlineDemos?.used || 0) / (quota.onlineDemos?.limit || 1)) * 100)}%` }} />
              </div>
            </div>
            <div>
              <div className="usage-bar-label">
                <span>月度发布额度</span>
                <span>{quota.monthlyDeploys?.used || 0} / {quota.monthlyDeploys?.limit || 0}</span>
              </div>
              <div className="usage-bar">
                <div className={`usage-bar-fill${(quota.monthlyDeploys?.used || 0) >= (quota.monthlyDeploys?.limit || 1) ? " usage-bar-fill--full" : (((quota.monthlyDeploys?.used || 0) / (quota.monthlyDeploys?.limit || 1)) > 0.8 ? " usage-bar-fill--warn" : "")}`}
                  style={{ width: `${Math.min(100, ((quota.monthlyDeploys?.used || 0) / (quota.monthlyDeploys?.limit || 1)) * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Panel with Upgrade Form */}
      <PlanPanel user={user} requests={requests} reloadRequests={reloadRequests} show={show} />
      <PlanRequestsTable requests={requests} />
    </div>
  );
}








