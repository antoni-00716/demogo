import { useCallback, useEffect, useState, type DragEvent, type FormEvent } from "react";
import { getAgentToken, getMe, logout, resetAgentToken } from "../api/auth";
import {
  createDeploymentJob,
  createUpdateDeploymentJob,
  deleteDemo,
  getDemoDetail,
  getDemos,
  getDeployEvents,
  getDeploymentJob,
  inspectProject,
  offlineDemo,
  restoreDemo,
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
import type { AgentToken, Demo, DeployEvent, DeploymentStep, FormSubmission, HostedForm, PlanRequest, Quota, User } from "../types";
import { formatBytes, formatDate } from "../utils/format";
import { createShareText, writeClipboardText } from "../utils/share";
import type { Inspection } from "../api/demos";
import { ApiError } from "../api/client";

export function UserDashboard() {
  const [activeView, setActiveView] = useState<DashboardView>(() => resolveInitialDashboardView());
  const [user, setUser] = useState<User | null>(null);
  const [demos, setDemos] = useState<Demo[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [events, setEvents] = useState<DeployEvent[]>([]);
  const [forms, setForms] = useState<HostedForm[]>([]);
  const [formQuota, setFormQuota] = useState<FormQuota | null>(null);
  const [selectedForm, setSelectedForm] = useState<HostedForm | null>(null);
  const [selectedSubmissions, setSelectedSubmissions] = useState<FormSubmission[]>([]);
  const [monthUsage, setMonthUsage] = useState<{ used: number; limit: number } | null>(null);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "success" | "warning" | "danger">("info");
  const [loading, setLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [demoName, setDemoName] = useState("");
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [updateTarget, setUpdateTarget] = useState<Demo | null>(null);
  const [selectedDemoId, setSelectedDemoId] = useState<string>("");
  const [selectedDemo, setSelectedDemo] = useState<Demo | null>(null);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [selectedSteps, setSelectedSteps] = useState<DeploymentStep[]>([]);
  const [projectDetailOpen, setProjectDetailOpen] = useState(false);
  const [deploymentSteps, setDeploymentSteps] = useState<DeploymentStep[]>([]);
  const [latestDeploy, setLatestDeploy] = useState<Demo | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [agentToken, setAgentToken] = useState<AgentToken | null>(null);

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
        const [mePayload, requestsPayload, deployPayload] = await Promise.all([
          getMe(),
          getPlanRequests(),
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
    setUploadFile(null);
    setDemoName("");
    setInspection(null);
    setDeploymentSteps([]);
    setLatestDeploy(null);
    if (!options.keepUpdateTarget) setUpdateTarget(null);
  }

  function startCreateProject() {
    resetUploadState();
    setProjectDetailOpen(false);
    setActiveView("upload");
  }

  function startUpdateProject(demo: Demo) {
    resetUploadState({ keepUpdateTarget: true });
    setUpdateTarget(demo);
    setProjectDetailOpen(false);
    setActiveView("upload");
    show(`正在更新 ${demo.name || demo.slug}，请选择新版本项目包。`);
  }

  function handleUploadFileChange(file: File | null) {
    setUploadFile(file);
    setInspection(null);
    setDeploymentSteps([]);
    setLatestDeploy(null);
  }

  function navigateDashboard(view: DashboardView) {
    if (view === "upload") {
      startCreateProject();
      return;
    }
    setActiveView(view);
  }

  async function handleInspect() {
    if (!uploadFile) {
      show("请先选择 .zip、.tar.gz 或 .tgz 项目包。", "warning");
      return;
    }
    try {
      show("正在检测项目结构，请稍等。");
      const payload = await inspectProject(uploadFile);
      setInspection(payload.inspection);
      show(
        payload.inspection?.canPublish ? "项目检测和内容检查完成，当前版本可以生成试用链接。" : "这个项目当前暂不能生成试用链接，请按提示调整。",
        payload.inspection?.canPublish ? "success" : "warning"
      );
    } catch (error) {
      const payload = error instanceof ApiError ? error.payload as { inspection?: Inspection } | null : null;
      if (payload?.inspection) setInspection(payload.inspection);
      show(error instanceof Error ? error.message : "项目检测失败。", "danger");
    }
  }

  async function handleDeploy(event: FormEvent) {
    event.preventDefault();
    if (!uploadFile) {
      show("请先选择 .zip、.tar.gz 或 .tgz 项目包。", "warning");
      return;
    }
    try {
      setDeploying(true);
      setDeploymentSteps(createClientDeploymentSteps());
      setLatestDeploy(null);
      show(updateTarget ? "已开始更新，DemoGo 会持续显示处理进度。" : "已开始生成链接，DemoGo 会持续显示处理进度。");
      const started = updateTarget
        ? await createUpdateDeploymentJob(updateTarget.id, uploadFile)
        : await createDeploymentJob(uploadFile, { name: demoName });
      setDeploymentSteps(started.job.steps || createClientDeploymentSteps());
      const completedJob = await waitForDeploymentJob(started.job.id, (job) => {
        if (job.steps?.length) setDeploymentSteps(job.steps);
        if (job.inspection) setInspection(job.inspection);
      });
      if (completedJob.status === "failed") {
        const message = completedJob.error?.message || completedJob.message || "生成失败，请根据提示调整后重试。";
        const failure = new Error(message);
        (failure as Error & { job?: DeploymentJob }).job = completedJob;
        throw failure;
      }
      const payload = completedJob.result;
      if (!payload) throw new Error("生成任务已完成，但没有返回试用链接，请刷新后查看项目列表。");
      if (payload.inspection) setInspection(payload.inspection);
      setDeploymentSteps(completedJob.steps || payload.deploymentEvents || createClientDeploymentSteps("success"));
      setLatestDeploy(payload);
      show(updateTarget ? "试用项目已更新。" : "试用链接已生成。", "success");
      setUploadFile(null);
      setDemoName("");
      setUpdateTarget(null);
      await refreshDemos(payload.id);
    } catch (error) {
      const payload = error instanceof ApiError ? error.payload as { inspection?: Inspection; deploymentEvents?: DeploymentStep[] } | null : null;
      if (payload?.inspection) setInspection(payload.inspection);
      if (payload?.deploymentEvents?.length) setDeploymentSteps(payload.deploymentEvents);
      const job = (error as Error & { job?: DeploymentJob })?.job;
      if (job?.inspection) setInspection(job.inspection);
      if (job?.steps?.length) setDeploymentSteps(job.steps);
      else setDeploymentSteps((current) => markClientStepsFailed(current));
      show(error instanceof Error ? error.message : "生成失败，请根据提示调整后重试。", "danger");
    } finally {
      setDeploying(false);
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
    const instruction = createAgentInstruction(agentToken, "general");
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
            onCreate={startCreateProject}
            onCreateForm={handleCreateForm}
            onCopyText={handleCopyText}
          />
        ) : null}
        {activeView === "upload" ? (
          <UploadPanel
            file={uploadFile}
            setFile={handleUploadFileChange}
            demoName={demoName}
            setDemoName={setDemoName}
            updateTarget={updateTarget}
            onCancelUpdate={startCreateProject}
            inspection={inspection}
            deploymentSteps={deploymentSteps}
            latestDeploy={latestDeploy}
            deploying={deploying}
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
        <BrandLogo variant="light" />
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
        <span>Free 用来跑通第一条链路；Lite 适合客户演示；Pro 适合持续验证多个 AI 产品原型。</span>
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
  const latestEvent = events[0];
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
          <strong>{activeProjects ? `${activeProjects} 个试用项目在线` : "先生成第一个试用链接"}</strong>
        </div>
        <div className="focus-item">
          <span>最近动作</span>
          <strong>{latestEvent ? `${latestEvent.demoName || latestEvent.demoSlug} · ${latestEvent.typeLabel}` : "暂无生成记录"}</strong>
        </div>
        <div className="focus-item">
          <span>下一步建议</span>
          <strong>{demos.length ? "复制文案发给试用对象" : "上传 .zip 或 .tar.gz 项目包"}</strong>
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
        <h2>生成新链接</h2>
        <p>上传 .zip、.tar.gz 或 .tgz，先检查项目和页面内容，通过后再生成试用链接。</p>
      </div>
      <Button variant="primary" onClick={onCreate}>开始上传</Button>
    </Card>
  );
}

function AgentPublishPanel({
  token,
  onResetToken,
  onCopyInstruction
}: {
  token: AgentToken | null;
  onResetToken: () => void;
  onCopyInstruction: () => void;
}) {
  const codexInstruction = createAgentInstruction(token, "codex");
  const agentInstruction = createAgentInstruction(token, "agent");
  const generalInstruction = createAgentInstruction(token, "general");
  const commandToken = token?.value ? "上面的AI发布口令" : "已保存的AI发布口令";
  return (
    <section className="agent-publish-layout">
      <Card className="panel agent-publish-panel">
        <div className="panel-head">
          <div>
            <h2>复制一句话，让 AI 帮你发布到 DemoGo</h2>
            <p>适合你已经在 Codex、Cursor、Claude Code 里做完页面，希望 AI 直接帮你生成试用链接。</p>
          </div>
          <Badge tone={token?.enabled ? "success" : "warning"}>{token?.enabled ? "口令已启用" : "未生成口令"}</Badge>
        </div>
        <div className="agent-user-guide">
          <strong>最简单的说法</strong>
          <p>“请把当前项目发布到 DemoGo，生成一个可以发给别人试用的链接。如果失败，请根据 DemoGo 的提示帮我修改后再试。”</p>
        </div>
        <div className="agent-user-guide agent-status-guide">
          <strong>现在的真实状态</strong>
          <p>如果当前电脑或 AI 工具里已经安装了 DemoGo CLI，可以直接用命令发布；如果没有安装，AI 会说明原因，再改用 DemoGo 的备用发布通道。备用通道生成的链接同样有效，但不能说成 CLI 发布成功。</p>
        </div>
        <div className="agent-steps">
          <div>
            <strong>1. 生成一次口令</strong>
            <span>只在首次配置、忘记或泄露时重置，不需要每次发布都生成。</span>
          </div>
          <div>
            <strong>2. 复制给 AI</strong>
            <span>把下方指令交给 Codex、Cursor 或其他 AI 工具。</span>
          </div>
          <div>
            <strong>3. 等待链接</strong>
            <span>AI 会打包、上传，并把 DemoGo 返回的试用链接告诉你。</span>
          </div>
        </div>
        <div className="token-box">
          <span>当前口令</span>
          <strong>{token?.value || (token?.prefix ? `${token.prefix}...（完整口令已隐藏）` : "尚未生成")}</strong>
          {token?.createdAt ? <small>生成时间：{formatDate(token.createdAt)}；已配置的口令可长期复用。</small> : <small>首次生成后请立即保存，页面刷新后不再显示完整口令。</small>}
        </div>
        <div className="agent-command-box">
          <span>给 Codex 的指令</span>
          <pre>{codexInstruction || "请先生成一次 AI 发布口令。生成后复制这里的发布指令。"}</pre>
        </div>
        <div className="agent-command-box">
          <span>给 Cursor / Claude Code 的指令</span>
          <pre>{agentInstruction || "请先生成一次 AI 发布口令。生成后复制这里的发布指令。"}</pre>
        </div>
        <div className="agent-command-box">
          <span>给其他 AI Agent 的通用指令</span>
          <pre>{generalInstruction || "请先生成一次 AI 发布口令。生成后复制这里的发布指令。"}</pre>
        </div>
        <div className="agent-cli-box">
          <span>AI 会优先执行的命令</span>
          <code>demogo config set --api {getDemoGoApiBase()} --token {commandToken} && demogo deploy</code>
          <small>当前默认使用已安装的 demogo 命令；未安装时可以使用 npx @demogo-cn/cli。CLI 不可用时，AI 需要说明原因，再改用 DemoGo MCP 或 Agent API。</small>
        </div>
        <div className="row-actions">
          {!token?.enabled ? <Button variant="primary" onClick={onResetToken}>生成 AI 发布口令</Button> : null}
          <Button onClick={onCopyInstruction} disabled={!generalInstruction}>复制通用指令</Button>
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
            <strong>AI + CLI 发布</strong>
            <span>适合让 Codex、Cursor、Claude Code 在项目目录里执行发布，最接近“一句话发布”。</span>
          </div>
          <div>
            <strong>MCP / Skill 发布</strong>
            <span>适合更深度的 AI 工具集成，仍然复用同一条 DemoGo 发布规则。</span>
          </div>
          <div>
            <strong>当前适合发布</strong>
            <span>普通网页、活动页、报名页、作品集、H5 页面、已经生成好的 dist/build/out 页面，以及能生成静态网页的前端源码项目。</span>
          </div>
          <div>
            <strong>暂不支持</strong>
            <span>长期运行的后端服务、数据库、真实支付、订单、用户登录系统、WebSocket、服务端运行模式。</span>
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
  onCreate,
  onCreateForm,
  onCopyText
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
  onCreate: () => void;
  onCreateForm: (demo: Demo, fields?: HostedForm["fields"]) => void;
  onCopyText: (text: string, successMessage?: string) => void;
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
          onCreateForm={onCreateForm}
          onCopyText={onCopyText}
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
    return <EmptyState title="暂无项目" description="创建第一个项目后，会在这里显示最近项目。" />;
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
          <EmptyState title="还没有试用项目" description="上传第一个项目包后，会在这里显示访问链接和生成记录。" />
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
  demoName: string;
  setDemoName: (value: string) => void;
  updateTarget: Demo | null;
  onCancelUpdate: () => void;
  inspection: Inspection | null;
  deploymentSteps: DeploymentStep[];
  latestDeploy: Demo | null;
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
          <h2>{props.updateTarget ? `更新 ${props.updateTarget.slug}` : "生成新链接"}</h2>
          <p>上传项目包后，DemoGo 会先检查页面能不能打开、报名/留言能不能收集，以及内容是否适合公开分享，再生成可访问的试用链接。</p>
        </div>
        {props.updateTarget ? <Button onClick={props.onCancelUpdate}>取消更新</Button> : null}
      </div>
      <form className="upload-form" onSubmit={props.onSubmit}>
        {!props.updateTarget ? (
          <label className="form-field">
            项目名称
            <input className="input" value={props.demoName} onChange={(event) => props.setDemoName(event.target.value)} placeholder="可留空，默认使用文件名" />
          </label>
        ) : null}
        <label className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
          <input type="file" accept=".zip,.tar.gz,.tgz,application/zip,application/gzip" onChange={(event) => handleFile(event.target.files?.[0] || null)} />
          <strong>{props.file ? props.file.name : "拖拽 ZIP / TAR.GZ 项目包到这里上传"}</strong>
          <span>或点击选择文件 · 支持 .zip、.tar.gz、.tgz · 最大 50MB</span>
        </label>
        <div className="upload-helper-grid">
          <div>
            <strong>1. 上传项目包</strong>
            <span>支持 .zip、.tar.gz、.tgz，适合 AI 工具导出的网页项目。</span>
          </div>
          <div>
            <strong>2. 先检查</strong>
            <span>检查首页入口、表单字段、后台依赖、生成配置和页面内容。</span>
          </div>
          <div>
            <strong>3. 发出去试</strong>
            <span>成功后复制链接或分享文案，直接发给别人试用。</span>
          </div>
        </div>
        <div className="row-actions">
          <Button onClick={props.onInspect} disabled={!props.file || props.deploying}>检查项目</Button>
          <Button variant="primary" type="submit" disabled={!props.file || props.deploying}>{props.updateTarget ? "开始更新" : "生成试用链接"}</Button>
        </div>
      </form>
      {props.deploymentSteps.length ? <DeploymentSteps steps={props.deploymentSteps} /> : null}
      {props.latestDeploy ? <PublishSuccess demo={props.latestDeploy} onCopyShare={props.onCopyShare} onCopyLink={props.onCopyLink} /> : null}
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
      {contentReview ? (
        <div className={`content-review-note review-${contentReview.status || "unknown"}`}>
          <strong>发布前内容检查：{contentReview.statusLabel || "已检查"}</strong>
          <span>{contentReview.summary || "DemoGo 会在生成链接前检查页面内容，避免违法违规、诈骗引导或高风险收集信息。"}</span>
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
        <span>页面判断：{inspection.userLabel || inspection.label || "-"}</span>
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
  onCreateForm,
  onCopyText
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
  onCreateForm: (demo: Demo, fields?: HostedForm["fields"]) => void;
  onCopyText: (text: string, successMessage?: string) => void;
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
        <div>
          <dt>最近更新</dt>
          <dd>{formatDate(demo.updatedAt || demo.createdAt)}</dd>
        </div>
      </dl>
      <FormHostingPanel demo={demo} inspection={inspection} form={form} submissions={submissions} formQuota={formQuota} onCreateForm={onCreateForm} onCopyLink={onCopyLink} onCopyText={onCopyText} />
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
  onCreateForm,
  onCopyText
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
  onCreateForm: (demo: Demo, fields?: HostedForm["fields"]) => void;
  onCopyText: (text: string, successMessage?: string) => void;
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
            onCreateForm={onCreateForm}
            onCopyText={onCopyText}
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
            <textarea className="textarea" value={requestMessage} onChange={(event) => setRequestMessage(event.target.value)} placeholder="例如：准备给客户试用，希望开通 Pro。" />
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
                  <td>{event.demoName || event.demoSlug}</td>
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

function isSupportedArchive(fileName: string) {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".zip") || lower.endsWith(".tar.gz") || lower.endsWith(".tgz");
}

function createClientDeploymentSteps(status: "running" | "success" = "running"): DeploymentStep[] {
  const labels = [
    ["receive", "接收文件"],
    ["extract", "解压项目"],
    ["security_check", "安全检查"],
    ["inspect", "生成前检查"],
    ["build", "构建检查"],
    ["content_review", "内容检查"],
    ["publish", "生成链接"],
    ["success", "生成链接"]
  ];
  return labels.map(([eventType, label], index) => ({
    id: `client-${eventType}`,
    eventType,
    status: status === "success" || index === 0 ? "success" : "pending",
    message: status === "success" ? `${label}完成` : (index === 0 ? "文件已提交，等待服务器处理" : "等待处理"),
    createdAt: new Date().toISOString()
  }));
}

function markClientStepsFailed(steps: DeploymentStep[]) {
  const current = steps.length ? steps : createClientDeploymentSteps();
  return current.map((step, index) => (
    index === current.length - 1
      ? { ...step, status: "failed", message: "生成失败，请根据提示调整后重试" }
      : step
  ));
}

async function waitForDeploymentJob(jobId: string, onProgress: (job: DeploymentJob) => void) {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    const payload = await getDeploymentJob(jobId);
    onProgress(payload.job);
    if (payload.job.status === "success" || payload.job.status === "failed") {
      return payload.job;
    }
    await sleep(attempt < 10 ? 800 : 1500);
  }
  throw new Error("生成时间较长，请稍后在项目列表或发布记录中查看结果。");
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function createAgentInstruction(token: AgentToken | null, target: "codex" | "agent" | "general" = "general") {
  if (!token?.enabled) return "";
  const value = token?.value || "";
  const apiBase = getDemoGoApiBase();
  const opener = target === "codex"
    ? "Codex，请把当前项目发布到 DemoGo，并把最终试用链接告诉我。"
    : target === "agent"
      ? "请在当前项目目录里把这个项目发布到 DemoGo，生成一个可以发给别人试用的链接。"
      : "请把当前项目生成 DemoGo 试用链接，并把最终可试用链接告诉我。";
  return [
    opener,
    "",
    `DemoGo 平台地址：${apiBase}`,
    value ? `DemoGo AI 发布口令：${value}` : "DemoGo AI 发布口令：使用你已经保存好的 DEMOGO_AGENT_TOKEN，不要要求用户重新生成口令。",
    "",
    "请优先使用 DemoGo CLI：",
    value
      ? `   demogo config set --api ${apiBase} --token 上面的AI发布口令`
      : `   demogo config set --api ${apiBase} --token 已保存的AI发布口令`,
    "   demogo doctor",
    "   demogo deploy",
    "",
    "如果当前环境不能直接运行 demogo 命令，请使用 npx @demogo-cn/cli；如果 npx 也不可用，请先说明 CLI 不可用的原因，不要把 API 兜底说成 CLI 发布成功。CLI 不可用时，再使用 DemoGo MCP 或直接调用 POST /api/agent/deploy。",
    "直接调用 Agent API 时，请使用 multipart/form-data；项目包字段优先使用 project，DemoGo 也兼容 file 和 package；请求头使用 Authorization: Bearer <DemoGo AI 发布口令>。",
    "",
    "操作要求：",
    "1. 先检查当前项目是否已经有 index.html、单个 HTML 文件、dist/index.html、build/index.html 或 out/index.html。",
    "2. 如果是 React/Vue/Vite 源码项目，请先运行构建命令，确保生成可打开的网页文件。",
    "3. 如果只有 landing-page.html、home.html 这类单个 HTML 页面，可以直接发布，不要强制用户手动改名。",
    "4. 发布名称不要使用 project、demo、demogo 这类泛化名称，优先使用页面 title、主标题或文件名。",
    "5. 请把项目打包成 .zip、.tar.gz 或 .tgz，不要包含 .env、密钥文件、node_modules、.git。",
    "6. 如果页面里有报名、预约、留资或留言表单，DemoGo 会在生成链接时自动识别并开启基础收集；价格计算器、配置开关等控件不应当当成报名表。",
    "7. 生成成功后返回访问链接；失败时请根据 DemoGo 返回的原因修改项目后再试，不要绕过内容检查。"
  ].join("\n");
}

function getDemoGoApiBase() {
  if (typeof window === "undefined") return "<DemoGo平台地址>";
  return window.location.origin;
}

function createFormIntegrationInstruction(form: HostedForm) {
  const fields = (form.fields || []).map((field) => `${field.name}${field.required ? "（必填）" : ""}`).join("、");
  return [
    "请把当前页面里的报名、预约、留资或留言表单接入 DemoGo 报名/留言收集。",
    "",
    `收集入口：${form.submitUrl}`,
    `字段：${fields || "name、phone、message"}`,
    "",
    "实现要求：",
    "1. 用户点击提交时，不要跳转到新页面。",
    "2. 用 POST 请求把表单内容提交到上面的收集入口。",
    "3. 请求格式使用 JSON，字段名必须和上面字段保持一致。",
    "4. 提交成功后，在页面上提示“提交成功，我们会尽快联系你”。",
    "5. 提交失败时，提示用户稍后重试，不要让页面空白。",
    "6. 不要加入支付、登录、数据库或自定义后端逻辑。"
  ].join("\n");
}

function deploymentStepLabel(type: string) {
  const labels: Record<string, string> = {
    receive: "接收文件",
    extract: "解压项目",
    security_check: "安全检查",
    inspect: "生成前检查",
    build: "构建检查",
    content_review: "内容检查",
    publish: "生成链接",
    success: "生成链接",
    failed: "生成失败"
  };
  return labels[type] || type;
}

function stepStatusIcon(status: string) {
  if (status === "success") return "✓";
  if (status === "failed") return "!";
  if (status === "skipped") return "·";
  return "…";
}
