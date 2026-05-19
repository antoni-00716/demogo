import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  adminDeleteDemo,
  getAdminContentReviews,
  adminOfflineDemo,
  getAdminFeedback,
  getAdminForms,
  getAdminOverview,
  getAdminPlanRequests,
  getAdminUsers,
  updateAdminContentReviewStatus,
  updateAdminFeedbackStatus,
  updateAdminPlanRequestStatus
} from "../api/admin";
import { Badge } from "../components/Badge";
import { BrandLogo } from "../components/BrandLogo";
import { Button, LinkButton } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { IcpLink } from "../components/IcpLink";
import { Toast } from "../components/Toast";
import { planName } from "../config/plans";
import { demoStatusLabel, feedbackStatusLabel, planRequestStatusLabel } from "../config/statuses";
import type { AdminMetrics, AdminUser, ContentReview, Demo, Feedback, FormSubmission, HostedForm, PlanRequest } from "../types";
import { formatBytes, formatDate } from "../utils/format";

type ToastTone = "info" | "success" | "warning" | "danger";

export function AdminDashboard() {
  const [activeView, setActiveView] = useState<AdminView>(() => resolveInitialAdminView());
  const [metrics, setMetrics] = useState<AdminMetrics>({});
  const [demos, setDemos] = useState<Demo[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [forms, setForms] = useState<HostedForm[]>([]);
  const [formSubmissions, setFormSubmissions] = useState<FormSubmission[]>([]);
  const [contentReviews, setContentReviews] = useState<ContentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<ToastTone>("info");

  useEffect(() => {
    let mounted = true;

    async function loadInitialData() {
      try {
        const [overview, usersPayload, requestsPayload, feedbackPayload, formsPayload, contentReviewsPayload] = await Promise.all([
          getAdminOverview(),
          getAdminUsers(),
          getAdminPlanRequests(),
          getAdminFeedback(),
          getAdminForms(),
          getAdminContentReviews()
        ]);
        if (!mounted) return;
        setMetrics(overview.metrics || {});
        setDemos(overview.demos || []);
        setUsers(usersPayload.users || overview.users || []);
        setRequests(requestsPayload.requests || []);
        setFeedback(feedbackPayload.feedback || overview.feedback || []);
        setForms(formsPayload.forms || overview.forms || []);
        setFormSubmissions(formsPayload.submissions || []);
        setContentReviews(contentReviewsPayload.reviews || overview.contentReviews || []);
      } catch (error) {
        if (mounted) show(error instanceof Error ? error.message : "运营后台数据加载失败。", "danger");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadInitialData();
    return () => {
      mounted = false;
    };
  }, []);

  function show(text: string, nextTone: ToastTone = "info") {
    setMessage(text);
    setTone(nextTone);
  }

  async function loadAll() {
    try {
      const [overview, usersPayload, requestsPayload, feedbackPayload, formsPayload, contentReviewsPayload] = await Promise.all([
        getAdminOverview(),
        getAdminUsers(),
        getAdminPlanRequests(),
        getAdminFeedback(),
        getAdminForms(),
        getAdminContentReviews()
      ]);
      setMetrics(overview.metrics || {});
      setDemos(overview.demos || []);
      setUsers(usersPayload.users || overview.users || []);
      setRequests(requestsPayload.requests || []);
      setFeedback(feedbackPayload.feedback || overview.feedback || []);
      setForms(formsPayload.forms || overview.forms || []);
      setFormSubmissions(formsPayload.submissions || []);
      setContentReviews(contentReviewsPayload.reviews || overview.contentReviews || []);
    } catch (error) {
      show(error instanceof Error ? error.message : "运营后台数据加载失败。", "danger");
    } finally {
      setLoading(false);
    }
  }

  async function refreshOverview() {
    const overview = await getAdminOverview();
    setMetrics(overview.metrics || {});
    setDemos(overview.demos || []);
  }

  if (loading) {
    return <div className="page-loading">正在加载 DemoGo 运营后台...</div>;
  }

  return (
    <div className="app-shell admin-shell">
      <AdminSidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="main">
        <div className="topbar">
          <div>
            <h1>{adminViewTitle(activeView)}</h1>
            <p>{adminViewSubtitle(activeView)}</p>
          </div>
          <div className="nav-actions">
            <Button onClick={loadAll}>刷新数据</Button>
            <Button variant="primary" onClick={() => window.location.href = "/"}>返回首页</Button>
          </div>
        </div>
        {message ? <Toast message={message} tone={tone} /> : null}
        {activeView === "overview" ? (
          <AdminOverviewView metrics={metrics} demos={demos} users={users} requests={requests} feedback={feedback} forms={forms} contentReviews={contentReviews} setActiveView={setActiveView} />
        ) : null}
        {activeView === "requests" ? (
            <PlanRequestsAdmin
              requests={requests}
              onChanged={async (text) => {
                show(text, "success");
                const payload = await getAdminPlanRequests();
                setRequests(payload.requests || []);
                const usersPayload = await getAdminUsers();
                setUsers(usersPayload.users || []);
                await refreshOverview();
              }}
              onError={(text) => show(text, "danger")}
            />
        ) : null}
        {activeView === "demos" ? (
            <AdminDemoList
              demos={demos}
              onChanged={async (text) => {
                show(text, "success");
                await refreshOverview();
              }}
              onError={(text) => show(text, "danger")}
            />
        ) : null}
        {activeView === "feedback" ? (
            <AdminFeedback
              feedback={feedback}
              onChanged={async (text) => {
                show(text, "success");
                const payload = await getAdminFeedback();
                setFeedback(payload.feedback || []);
                await refreshOverview();
              }}
              onError={(text) => show(text, "danger")}
            />
        ) : null}
        {activeView === "forms" ? <AdminForms forms={forms} submissions={formSubmissions} /> : null}
        {activeView === "reviews" ? <AdminContentReviews reviews={contentReviews} onHandled={loadAll} show={show} /> : null}
        {activeView === "users" ? <AdminUsers users={users} /> : null}
        {activeView === "settings" ? <AdminSettings /> : null}
        <footer className="app-footer">
          <span>DemoGo 运营后台</span>
          <IcpLink />
        </footer>
      </main>
    </div>
  );
}

type AdminView = "overview" | "requests" | "demos" | "reviews" | "forms" | "feedback" | "users" | "settings";

function resolveInitialAdminView(): AdminView {
  const hash = window.location.hash.replace("#", "").toLowerCase();
  if (hash === "requests" || hash === "plans") return "requests";
  if (hash === "demos" || hash === "projects") return "demos";
  if (hash === "reviews" || hash === "content") return "reviews";
  if (hash === "forms") return "forms";
  if (hash === "feedback") return "feedback";
  if (hash === "users") return "users";
  if (hash === "settings") return "settings";
  return "overview";
}

function AdminSidebar({
  activeView,
  setActiveView
}: {
  activeView: AdminView;
  setActiveView: (view: AdminView) => void;
}) {
  const items: Array<[AdminView, string]> = [
    ["overview", "今日待处理"],
    ["requests", "升级申请"],
    ["demos", "试用项目"],
    ["reviews", "内容检查"],
    ["forms", "报名/留言"],
    ["feedback", "用户问题"],
    ["users", "用户"],
    ["settings", "系统设置"]
  ];
  return (
    <aside className="sidebar admin-sidebar">
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

function adminViewTitle(view: AdminView) {
  const titles: Record<AdminView, string> = {
    overview: "今日待处理",
    requests: "升级申请",
    demos: "试用项目",
    reviews: "内容检查",
    forms: "报名/留言",
    feedback: "用户问题",
    users: "用户",
    settings: "系统设置"
  };
  return titles[view];
}

function adminViewSubtitle(view: AdminView) {
  const subtitles: Record<AdminView, string> = {
    overview: "先看今天要处理什么，再判断真实试用是否顺畅。",
    requests: "用户申请 Lite 或 Pro 后，在这里直接开通或拒绝。",
    demos: "查看试用项目状态、访问量和需要注意的问题，必要时下线或删除。",
    reviews: "查看发布前内容检查结果，重点处理已拦截和待人工确认的项目。",
    forms: "查看用户通过 DemoGo 收到的报名、预约和留言记录。",
    feedback: "跟进真实试用中的问题，标记处理状态。",
    users: "查看用户套餐、在线试用项目和注册时间。",
    settings: "确认当前试用阶段的套餐命名、升级流程和产品范围。"
  };
  return subtitles[view];
}

function AdminOverviewView({
  metrics,
  demos,
  users,
  requests,
  feedback,
  forms,
  contentReviews,
  setActiveView
}: {
  metrics: AdminMetrics;
  demos: Demo[];
  users: AdminUser[];
  requests: PlanRequest[];
  feedback: Feedback[];
  forms: HostedForm[];
  contentReviews: ContentReview[];
  setActiveView: (view: AdminView) => void;
}) {
  return (
    <div className="view-stack">
      <AdminOpsHero metrics={metrics} requests={requests} feedback={feedback} forms={forms} contentReviews={contentReviews} />
      <section className="admin-workbench-grid">
        <AdminTaskBoard demos={demos} requests={requests} feedback={feedback} forms={forms} contentReviews={contentReviews} setActiveView={setActiveView} />
        <AdminOpsSummary metrics={metrics} users={users} requests={requests} feedback={feedback} forms={forms} contentReviews={contentReviews} />
      </section>
      <section className="split-layout admin-secondary-board">
        <AdminDemoList demos={demos.slice(0, 5)} onChanged={async () => {}} onError={() => {}} compact />
        <AdminUsers users={users.slice(0, 8)} compact />
      </section>
    </div>
  );
}

function AdminOpsHero({
  metrics,
  requests,
  feedback,
  forms,
  contentReviews
}: {
  metrics: AdminMetrics;
  requests: PlanRequest[];
  feedback: Feedback[];
  forms: HostedForm[];
  contentReviews: ContentReview[];
}) {
  const openRequests = requests.filter((item) => item.status === "open").length;
  const openFeedback = feedback.filter((item) => item.status === "open").length;
  const riskReviews = contentReviews.filter((item) => item.resolutionStatus === "pending" || item.status === "blocked" || item.status === "review_required").length;
  const pendingItems = [
    ["升级申请", openRequests, "待处理"],
    ["用户问题", openFeedback, "待跟进"],
    ["内容检查", riskReviews, "待处理"],
    ["报名/留言", metrics.activeForms || forms.length || 0, "收集中"],
    ["在线试用项目", metrics.liveDemos || 0, "试用中"]
  ];
  return (
    <section className="admin-ops-hero">
      <div>
        <Badge tone="success">运营工作台</Badge>
        <h2>今天要处理什么，先在这里看清楚。</h2>
        <p>升级申请、用户问题、内容检查和异常项目集中到一个入口，运营人员不用在多个页面里找线索。</p>
      </div>
      <div className="admin-pending-list">
        {pendingItems.map(([label, value, note]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
            <small>{note}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdminTaskBoard({
  demos,
  requests,
  feedback,
  forms,
  contentReviews,
  setActiveView
}: {
  demos: Demo[];
  requests: PlanRequest[];
  feedback: Feedback[];
  forms: HostedForm[];
  contentReviews: ContentReview[];
  setActiveView: (view: AdminView) => void;
}) {
  const openRequests = requests.filter((request) => request.status === "open");
  const openFeedback = feedback.filter((item) => item.status === "open" || item.status === "in_progress");
  const riskDemos = demos.filter((demo) => demo.status === "failed" || demo.riskSummary?.length);
  const activeForms = forms.filter((form) => form.status === "active");
  const riskReviews = contentReviews.filter((item) => item.resolutionStatus === "pending" || item.status === "blocked" || item.status === "review_required");
  const tasks: Array<{
    title: string;
    count: number;
    description: string;
    sample: string;
    action: string;
    view: AdminView;
    tone: "success" | "warning" | "info";
  }> = [
    {
      title: "升级申请",
      count: openRequests.length,
      description: "用户申请 Lite 或 Pro 后，直接在这里开通或拒绝。",
      sample: openRequests[0] ? `${openRequests[0].userEmail || "-"} 申请 ${planName(openRequests[0].requestedPlan)}` : "暂无待处理申请",
      action: "处理申请",
      view: "requests",
      tone: openRequests.length ? "warning" : "success"
    },
    {
      title: "用户问题",
      count: openFeedback.length,
      description: "试用中遇到的问题要形成列表，避免只看到最近一条。",
      sample: openFeedback[0] ? `${openFeedback[0].typeLabel || openFeedback[0].type} · ${openFeedback[0].message}` : "暂无待跟进问题",
      action: "查看问题",
      view: "feedback",
      tone: openFeedback.length ? "warning" : "success"
    },
    {
      title: "内容检查",
      count: riskReviews.length,
      description: "发布前发现的高风险内容要优先处理，避免问题链接被公开传播。",
      sample: riskReviews[0] ? `${riskReviews[0].projectName || riskReviews[0].fileName || "-"} · ${riskReviews[0].resolutionStatusLabel || riskReviews[0].statusLabel || riskReviews[0].status}` : "暂无内容风险",
      action: "查看检查",
      view: "reviews",
      tone: riskReviews.length ? "warning" : "success"
    },
    {
      title: "报名/留言",
      count: activeForms.length,
      description: "用户是否真的收到报名和留言，是判断页面试用价值的重要信号。",
      sample: activeForms[0] ? `${activeForms[0].demoName || activeForms[0].demoSlug} · ${activeForms[0].submissionCount || 0} 条提交` : "暂无报名/留言",
      action: "查看记录",
      view: "forms",
      tone: activeForms.length ? "info" : "success"
    },
    {
      title: "需要关注的项目",
      count: riskDemos.length,
      description: "生成失败、访问异常或内容风险，需要运营能快速定位。",
      sample: riskDemos[0] ? `${riskDemos[0].name || riskDemos[0].slug} · ${riskDemos[0].riskSummary?.[0]?.label || demoStatusLabel(riskDemos[0].status)}` : "暂无明显问题",
      action: "查看项目",
      view: "demos",
      tone: riskDemos.length ? "info" : "success"
    }
  ];

  return (
    <Card className="panel admin-task-board">
      <div className="panel-head">
        <div>
          <h2>今日处理队列</h2>
          <p>先处理影响用户试用的事项，再看整体数据。</p>
        </div>
      </div>
      <div className="admin-task-list">
        {tasks.map((task) => (
          <div className="admin-task-row" key={task.title}>
            <Badge tone={task.tone}>{task.count ? `${task.count} 项` : "清空"}</Badge>
            <div>
              <strong>{task.title}</strong>
              <p>{task.description}</p>
              <small>{task.sample}</small>
            </div>
            <Button onClick={() => setActiveView(task.view)}>{task.action}</Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AdminOpsSummary({
  metrics,
  users,
  requests,
  feedback,
  forms,
  contentReviews
}: {
  metrics: AdminMetrics;
  users: AdminUser[];
  requests: PlanRequest[];
  feedback: Feedback[];
  forms: HostedForm[];
  contentReviews: ContentReview[];
}) {
  const stats = [
    ["注册用户", metrics.users || users.length || 0, "观察试用增长"],
    ["在线项目", metrics.liveDemos || 0, "正在被打开"],
    ["AI 发布", metrics.aiDeploys || 0, "AI 工具调用"],
    ["发布失败", metrics.deployFailures || 0, failureReasonNote(metrics.failureReasons)],
    ["报名/留言", metrics.formSubmissions || 0, `${forms.length} 个入口`],
    ["升级申请", requests.filter((item) => item.status === "open").length, "待处理"],
    ["内容待处理", metrics.pendingContentReviewResolutions || contentReviews.filter((item) => item.resolutionStatus === "pending").length || 0, "需复核"],
    ["用户问题", feedback.filter((item) => item.status === "open").length, "待跟进"]
  ];
  return (
    <Card className="panel admin-ops-summary">
      <h2>真实试用概览</h2>
      <div className="admin-summary-grid">
        {stats.map(([label, value, note]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
            <small>{note}</small>
          </div>
        ))}
      </div>
    </Card>
  );
}

function failureReasonNote(reasons?: Record<string, number>) {
  if (!reasons) return "暂无失败";
  const entries = [
    ["内容", reasons.content || 0],
    ["额度", reasons.quota || 0],
    ["暂不支持", reasons.unsupported || 0],
    ["构建", reasons.build || 0]
  ].filter(([, count]) => Number(count) > 0);
  if (!entries.length) return "暂无失败";
  return entries.slice(0, 2).map(([label, count]) => `${label}${count}`).join(" / ");
}

function PlanRequestsAdmin({
  requests,
  onChanged,
  onError
}: {
  requests: PlanRequest[];
  onChanged: (text: string) => Promise<void>;
  onError: (text: string) => void;
}) {
  const openRequests = useMemo(() => requests.filter((item) => item.status === "open"), [requests]);
  const handledRequests = useMemo(() => requests.filter((item) => item.status !== "open"), [requests]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const selectedRequest = requests.find((request) => request.id === selectedRequestId) || null;
  return (
    <>
      <Card className="panel" id="planRequests">
        <div className="panel-head">
          <div>
            <h2>升级申请</h2>
            <p>列表用于快速扫描，处理动作统一进入详情，不在页面里堆多个大卡片。</p>
          </div>
          <Badge tone={openRequests.length ? "warning" : "success"}>{openRequests.length} 个待处理</Badge>
        </div>
        {!requests.length ? (
          <EmptyState title="暂无升级申请" description="用户端提交申请后，会显示在这里。" />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>用户</th>
                  <th>申请</th>
                  <th>状态</th>
                  <th>提交时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {[...openRequests, ...handledRequests].slice(0, 80).map((request) => (
                  <tr key={request.id}>
                    <td>{request.userEmail}</td>
                    <td>{planName(request.currentPlan)} → {planName(request.requestedPlan)}</td>
                    <td>{planRequestStatusLabel(request.status)}</td>
                    <td>{formatDate(request.createdAt)}</td>
                    <td><Button onClick={() => setSelectedRequestId(request.id)}>{request.status === "open" ? "处理" : "查看详情"}</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {selectedRequest ? (
        <AdminDetailDrawer title="升级申请详情" subtitle={selectedRequest.userEmail || "-"} onClose={() => setSelectedRequestId("")}>
          <PlanRequestDetail request={selectedRequest} onChanged={onChanged} onError={onError} />
        </AdminDetailDrawer>
      ) : null}
    </>
  );
}

function PlanRequestDetail({
  request,
  onChanged,
  onError
}: {
  request: PlanRequest;
  onChanged: (text: string) => Promise<void>;
  onError: (text: string) => void;
}) {
  return (
    <div className="drawer-detail-stack">
      <div className="request-main">
        <div>
          <h3>{request.userEmail}</h3>
          <p>{planName(request.currentPlan)} → {planName(request.requestedPlan)} · {formatDate(request.createdAt)}</p>
        </div>
        <Badge tone={request.status === "open" ? "warning" : request.status === "approved" ? "success" : "neutral"}>
          {planRequestStatusLabel(request.status)}
        </Badge>
      </div>
      <dl className="detail-list">
        <div>
          <dt>当前套餐</dt>
          <dd>{planName(request.currentPlan)}</dd>
        </div>
        <div>
          <dt>申请套餐</dt>
          <dd>{planName(request.requestedPlan)}</dd>
        </div>
        <div>
          <dt>联系方式</dt>
          <dd>{request.contact || "-"}</dd>
        </div>
        <div>
          <dt>申请说明</dt>
          <dd>{request.message || "-"}</dd>
        </div>
        <div>
          <dt>处理说明</dt>
          <dd>{request.adminNote || "-"}</dd>
        </div>
      </dl>
      {request.status === "open" ? <PlanRequestCard request={request} onChanged={onChanged} onError={onError} compact /> : null}
    </div>
  );
}

function PlanRequestCard({
  request,
  onChanged,
  onError,
  compact = false
}: {
  request: PlanRequest;
  onChanged: (text: string) => Promise<void>;
  onError: (text: string) => void;
  compact?: boolean;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function update(status: "approved" | "rejected") {
    if (status === "rejected" && note.trim().length < 2) {
      onError("拒绝申请时，请填写明确原因，用户端会看到这段说明。");
      return;
    }
    setBusy(true);
    try {
      await updateAdminPlanRequestStatus(request.id, { status, adminNote: note });
      await onChanged(status === "approved" ? `已为 ${request.userEmail} 开通 ${planName(request.requestedPlan)}。` : "已拒绝该升级申请。");
    } catch (error) {
      onError(error instanceof Error ? error.message : "升级申请处理失败。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`request-card ${compact ? "request-card-compact" : ""}`}>
      {!compact ? (
        <>
          <div className="request-main">
            <div>
              <h3>{request.userEmail}</h3>
              <p>{planName(request.currentPlan)} → {planName(request.requestedPlan)} · {formatDate(request.createdAt)}</p>
            </div>
            <Badge tone="warning">待处理</Badge>
          </div>
          <dl className="detail-list">
            <div>
              <dt>当前套餐</dt>
              <dd>{planName(request.currentPlan)}</dd>
            </div>
            <div>
              <dt>申请套餐</dt>
              <dd>{planName(request.requestedPlan)}</dd>
            </div>
            <div>
              <dt>联系方式</dt>
              <dd>{request.contact || "-"}</dd>
            </div>
            <div>
              <dt>申请说明</dt>
              <dd>{request.message || "-"}</dd>
            </div>
          </dl>
        </>
      ) : null}
      <label className="form-field">
        管理员说明
        <textarea className="textarea" value={note} onChange={(event) => setNote(event.target.value)} placeholder="开通时可留空；拒绝时请写清楚原因，用户端会展示。" />
      </label>
      <div className="row-actions">
        <Button variant="primary" disabled={busy} onClick={() => update("approved")}>开通 {planName(request.requestedPlan)}</Button>
        <Button variant="danger" disabled={busy} onClick={() => update("rejected")}>拒绝申请</Button>
      </div>
    </div>
  );
}

function AdminDemoList({
  demos,
  onChanged,
  onError,
  compact = false
}: {
  demos: Demo[];
  onChanged: (text: string) => Promise<void>;
  onError: (text: string) => void;
  compact?: boolean;
}) {
  const [selectedDemoId, setSelectedDemoId] = useState("");
  const selectedDemo = demos.find((demo) => demo.id === selectedDemoId) || null;

  async function update(action: "offline" | "delete", demo: Demo) {
    const label = action === "offline" ? "下线" : "删除";
    if (!window.confirm(`确定${label}这个试用项目？`)) return;
    try {
      if (action === "offline") await adminOfflineDemo(demo.id);
      if (action === "delete") await adminDeleteDemo(demo.id);
      await onChanged(`试用项目已${label}。`);
      if (action === "delete") setSelectedDemoId("");
    } catch (error) {
      onError(error instanceof Error ? error.message : "试用项目操作失败。");
    }
  }

  return (
    <>
      <Card className={`panel ${compact ? "compact-panel" : ""}`} id="demos">
        <div className="panel-head">
          <div>
            <h2>试用项目</h2>
            <p>查看项目状态、访问量和需要注意的问题。具体干预动作放在详情里处理。</p>
          </div>
        </div>
        {!demos.length ? (
          <EmptyState title="暂无试用项目" description="用户生成试用链接后，会出现在这里。" />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>试用项目</th>
                  <th>用户</th>
                  <th>状态</th>
                  <th>访问</th>
                  <th>需要注意</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {demos.map((demo) => (
                  <tr key={demo.id}>
                    <td>
                      <strong>{demo.name || demo.slug}</strong>
                      <small>{demo.publicUrl || demo.slug}</small>
                    </td>
                    <td>{demo.userEmail || "-"}</td>
                    <td>{demoStatusLabel(demo.status)}</td>
                    <td>{demo.usage?.visits || 0}</td>
                    <td><RiskBadges demo={demo} /></td>
                    <td><Button onClick={() => setSelectedDemoId(demo.id)}>查看详情</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {selectedDemo ? (
        <AdminDetailDrawer title="试用项目详情" subtitle={selectedDemo.name || selectedDemo.slug} onClose={() => setSelectedDemoId("")}>
          <AdminDemoDetail demo={selectedDemo} onUpdate={update} />
        </AdminDetailDrawer>
      ) : null}
    </>
  );
}

function AdminContentReviews({
  reviews,
  onHandled,
  show
}: {
  reviews: ContentReview[];
  onHandled: () => Promise<void>;
  show: (text: string, tone?: ToastTone) => void;
}) {
  const [selectedReviewId, setSelectedReviewId] = useState("");
  const selectedReview = reviews.find((review) => review.id === selectedReviewId) || null;
  const riskReviews = reviews.filter((review) => review.resolutionStatus === "pending" || review.status === "blocked" || review.status === "review_required");
  return (
    <>
      <Card className="panel" id="contentReviews">
        <div className="panel-head">
          <div>
            <h2>内容检查</h2>
            <p>发布前发现的风险会记录在这里。已拦截和待人工确认的项目要优先查看。</p>
          </div>
          <Badge tone={riskReviews.length ? "warning" : "success"}>{riskReviews.length} 个待处理</Badge>
        </div>
        {!reviews.length ? (
          <EmptyState title="暂无内容检查记录" description="用户生成或更新试用链接后，会在这里显示发布前内容检查结果。" />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>项目</th>
                  <th>用户</th>
                  <th>结果</th>
                  <th>处理</th>
                  <th>摘要</th>
                  <th>时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {reviews.slice(0, 120).map((review) => (
                  <tr key={review.id}>
                    <td>
                      <strong>{review.projectName || review.fileName || "-"}</strong>
                      <small>{review.demoSlug || review.fileName || "-"}</small>
                    </td>
                    <td>{review.userEmail || "-"}</td>
                    <td><Badge tone={review.status === "passed" ? "success" : "warning"}>{review.statusLabel || review.status || "-"}</Badge></td>
                    <td><Badge tone={review.resolutionStatus === "pending" ? "warning" : "success"}>{review.resolutionStatusLabel || review.resolutionStatus || "-"}</Badge></td>
                    <td>{review.summary || "-"}</td>
                    <td>{formatDate(review.createdAt)}</td>
                    <td><Button onClick={() => setSelectedReviewId(review.id || "")}>查看详情</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {selectedReview ? (
        <AdminDetailDrawer title="内容检查详情" subtitle={selectedReview.projectName || selectedReview.fileName || "-"} onClose={() => setSelectedReviewId("")}>
          <ContentReviewDetail review={selectedReview} onHandled={onHandled} show={show} />
        </AdminDetailDrawer>
      ) : null}
    </>
  );
}

function ContentReviewDetail({
  review,
  onHandled,
  show
}: {
  review: ContentReview;
  onHandled: () => Promise<void>;
  show: (text: string, tone?: ToastTone) => void;
}) {
  const findings = review.findings || [];
  const [resolutionStatus, setResolutionStatus] = useState(review.resolutionStatus || "pending");
  const [adminNote, setAdminNote] = useState(review.adminNote || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!review.id) return;
    try {
      setSaving(true);
      await updateAdminContentReviewStatus(review.id, { resolutionStatus, adminNote });
      show("内容检查处理结果已保存。", "success");
      await onHandled();
    } catch (error) {
      show(error instanceof Error ? error.message : "保存失败，请稍后再试。", "danger");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="drawer-detail-stack">
      <div className="request-main">
        <div>
          <h3>{review.projectName || review.fileName || "-"}</h3>
          <p>{review.userEmail || "-"} · {formatDate(review.createdAt)}</p>
        </div>
        <Badge tone={review.status === "passed" ? "success" : "warning"}>{review.statusLabel || review.status || "-"}</Badge>
      </div>
      <dl className="detail-list">
        <div>
          <dt>检查摘要</dt>
          <dd>{review.summary || "-"}</dd>
        </div>
        <div>
          <dt>项目文件</dt>
          <dd>{review.fileName || "-"}</dd>
        </div>
        <div>
          <dt>检查方式</dt>
          <dd>{review.provider || "-"} / {review.engine || "-"}</dd>
        </div>
        <div>
          <dt>检查文件数</dt>
          <dd>{review.reviewedFileCount || 0}</dd>
        </div>
        <div>
          <dt>处理状态</dt>
          <dd>{review.resolutionStatusLabel || review.resolutionStatus || "-"}</dd>
        </div>
        <div>
          <dt>处理记录</dt>
          <dd>{review.handledAt ? `${review.handledBy || "admin"} · ${formatDate(review.handledAt)}` : "暂无"}</dd>
        </div>
      </dl>
      <div className="review-resolution-panel">
        <h3>处理结果</h3>
        <label className="form-field">
          处理状态
          <select className="input" value={resolutionStatus} onChange={(event) => setResolutionStatus(event.target.value)}>
            <option value="pending">待处理</option>
            <option value="confirmed_violation">确认违规</option>
            <option value="false_positive">误判</option>
            <option value="resolved">已处理</option>
          </select>
        </label>
        <label className="form-field">
          处理备注
          <textarea className="input" value={adminNote} onChange={(event) => setAdminNote(event.target.value)} placeholder="记录判断依据或处理说明" rows={4} />
        </label>
        <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? "保存中..." : "保存处理结果"}</Button>
      </div>
      <div className="risk-panel">
        <h3>命中内容</h3>
        {!findings.length ? (
          <p className="muted">未发现明显风险。</p>
        ) : (
          <div className="content-finding-list">
            {findings.map((finding) => (
              <div className="content-finding-row" key={finding.id || `${finding.category}-${finding.sourceFile}`}>
                <Badge tone={finding.severity === "block" ? "warning" : "info"}>{finding.severityLabel || finding.severity || "提示"}</Badge>
                <div>
                  <strong>{finding.category || "风险提示"}</strong>
                  <p>{finding.snippet || finding.sourceFile || "-"}</p>
                  <small>{finding.suggestion || ""}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminDemoDetail({
  demo,
  onUpdate
}: {
  demo: Demo;
  onUpdate: (action: "offline" | "delete", demo: Demo) => Promise<void>;
}) {
  return (
    <div className="drawer-detail-stack">
      <div className="request-main">
        <div>
          <h3>{demo.name || demo.slug}</h3>
          <p>{demo.userEmail || "-"} · {demo.publicUrl || demo.slug}</p>
        </div>
        <Badge tone={demo.status === "published" ? "success" : demo.status === "failed" ? "warning" : "neutral"}>{demoStatusLabel(demo.status)}</Badge>
      </div>
      <dl className="detail-list">
        <div>
          <dt>访问链接</dt>
          <dd>{demo.publicUrl || "-"}</dd>
        </div>
        <div>
          <dt>访问量</dt>
          <dd>{demo.usage?.visits || 0} 次</dd>
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
          <dt>更新时间</dt>
          <dd>{formatDate(demo.updatedAt || demo.createdAt)}</dd>
        </div>
        <div>
          <dt>有效期</dt>
          <dd>{formatDate(demo.expiresAt)}</dd>
        </div>
      </dl>
      <div className="risk-panel">
        <h3>需要注意</h3>
        <RiskBadges demo={demo} />
      </div>
      <div className="row-actions">
        {demo.publicUrl ? <LinkButton href={demo.publicUrl} target="_blank" rel="noreferrer">打开试用链接</LinkButton> : null}
        {demo.status === "published" ? <Button onClick={() => onUpdate("offline", demo)}>下线项目</Button> : null}
        {demo.status !== "published" && demo.status !== "deleted" ? <Button variant="danger" onClick={() => onUpdate("delete", demo)}>删除项目</Button> : null}
      </div>
    </div>
  );
}

function RiskBadges({ demo }: { demo: Demo & { riskSummary?: Array<{ type: string; label: string }> } }) {
  const contentRisk = demo.contentReview?.status && demo.contentReview.status !== "passed"
    ? [{ type: "content", label: demo.contentReview.statusLabel || "内容需关注" }]
    : [];
  const risks = [...contentRisk, ...(demo.riskSummary || [])];
  if (!risks.length) return <span className="muted">无明显问题</span>;
  return (
    <div className="badge-row">
      {risks.map((risk) => (
        <Badge key={`${risk.type}-${risk.label}`} tone={risk.type === "api" || risk.type === "blocked" ? "warning" : "info"}>{risk.label}</Badge>
      ))}
    </div>
  );
}

function AdminUsers({ users, compact = false }: { users: AdminUser[]; compact?: boolean }) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const selectedUser = users.find((user) => user.id === selectedUserId) || null;
  return (
    <>
      <Card className={`panel ${compact ? "compact-panel" : ""}`} id="users">
        <div className="panel-head">
          <div>
            <h2>用户列表</h2>
            <p>这里只看用户和套餐状态，开通套餐仍然从升级申请进入。</p>
          </div>
        </div>
        {!users.length ? (
          <EmptyState title="暂无用户" description="用户注册后，会显示在这里。" />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>用户</th>
                  <th>套餐</th>
                  <th>试用项目</th>
                  <th>注册时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.slice(0, 80).map((user) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{planName(user.plan)}</td>
                    <td>{user.onlineDemoCount || 0} 在线 / {user.demoCount || 0} 累计</td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td><Button onClick={() => setSelectedUserId(user.id)}>查看详情</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {selectedUser ? (
        <AdminDetailDrawer title="用户详情" subtitle={selectedUser.email} onClose={() => setSelectedUserId("")}>
          <AdminUserDetail user={selectedUser} />
        </AdminDetailDrawer>
      ) : null}
    </>
  );
}

function AdminUserDetail({ user }: { user: AdminUser }) {
  return (
    <div className="drawer-detail-stack">
      <div className="request-main">
        <div>
          <h3>{user.email}</h3>
          <p>{formatDate(user.createdAt)} 注册</p>
        </div>
        <Badge tone={user.plan === "pro" ? "success" : user.plan === "lite" ? "info" : "neutral"}>{planName(user.plan)}</Badge>
      </div>
      <dl className="detail-list">
        <div>
          <dt>当前套餐</dt>
          <dd>{planName(user.plan)}</dd>
        </div>
        <div>
          <dt>在线试用项目</dt>
          <dd>{user.onlineDemoCount || 0} 个</dd>
        </div>
        <div>
          <dt>累计试用项目</dt>
          <dd>{user.demoCount || 0} 个</dd>
        </div>
        <div>
          <dt>用户 ID</dt>
          <dd>{user.id}</dd>
        </div>
      </dl>
      <p className="muted">如需调整套餐，请让用户提交升级申请，再从“升级申请”页面处理，避免后台入口不一致。</p>
    </div>
  );
}

function AdminFeedback({
  feedback,
  onChanged,
  onError
}: {
  feedback: Feedback[];
  onChanged: (text: string) => Promise<void>;
  onError: (text: string) => void;
}) {
  const [selectedFeedbackId, setSelectedFeedbackId] = useState("");
  const selectedFeedback = feedback.find((item) => item.id === selectedFeedbackId) || null;

  async function update(id: string, status: Feedback["status"]) {
    try {
      await updateAdminFeedbackStatus(id, status);
      await onChanged("问题状态已更新。");
    } catch (error) {
      onError(error instanceof Error ? error.message : "问题状态更新失败。");
    }
  }

  return (
    <>
      <Card className="panel" id="feedback">
        <div className="panel-head">
          <div>
            <h2>用户问题</h2>
            <p>真实试用过程中的问题要完整保留，进入详情后再变更处理状态。</p>
          </div>
          <Badge tone={feedback.some((item) => item.status === "open") ? "warning" : "success"}>
            {feedback.filter((item) => item.status === "open").length} 条待处理
          </Badge>
        </div>
        {!feedback.length ? (
          <EmptyState title="暂无用户问题" description="用户端提交问题后，会显示在这里。" />
        ) : (
          <div className="feedback-list">
            {feedback.slice(0, 30).map((item) => (
              <div className="feedback-item" key={item.id}>
                <div className="request-main">
                  <div>
                    <h3>{item.typeLabel || item.type}</h3>
                    <p>{item.userEmail || "-"} · {item.demoSlug || "未关联试用项目"} · {formatDate(item.createdAt)}</p>
                  </div>
                  <Badge tone={item.status === "open" ? "warning" : item.status === "resolved" ? "success" : "neutral"}>{feedbackStatusLabel(item.status)}</Badge>
                </div>
                <p>{item.message}</p>
                <div className="row-actions compact">
                  <Button onClick={() => setSelectedFeedbackId(item.id)}>查看详情</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      {selectedFeedback ? (
        <AdminDetailDrawer title="用户问题详情" subtitle={selectedFeedback.userEmail || "-"} onClose={() => setSelectedFeedbackId("")}>
          <AdminFeedbackDetail feedback={selectedFeedback} onUpdate={update} />
        </AdminDetailDrawer>
      ) : null}
    </>
  );
}

function AdminFeedbackDetail({
  feedback,
  onUpdate
}: {
  feedback: Feedback;
  onUpdate: (id: string, status: Feedback["status"]) => Promise<void>;
}) {
  return (
    <div className="drawer-detail-stack">
      <div className="request-main">
        <div>
          <h3>{feedback.typeLabel || feedback.type}</h3>
          <p>{feedback.userEmail || "-"} · {formatDate(feedback.createdAt)}</p>
        </div>
        <Badge tone={feedback.status === "open" ? "warning" : feedback.status === "resolved" ? "success" : "neutral"}>{feedbackStatusLabel(feedback.status)}</Badge>
      </div>
      <dl className="detail-list">
        <div>
          <dt>关联试用项目</dt>
          <dd>{feedback.demoSlug || "-"}</dd>
        </div>
        <div>
          <dt>提交时间</dt>
          <dd>{formatDate(feedback.createdAt)}</dd>
        </div>
        <div>
          <dt>更新时间</dt>
          <dd>{formatDate(feedback.updatedAt)}</dd>
        </div>
      </dl>
      <div className="risk-panel">
        <h3>问题内容</h3>
        <p>{feedback.message}</p>
      </div>
      <div className="row-actions">
        <Button onClick={() => onUpdate(feedback.id, "in_progress")}>标记处理中</Button>
        <Button onClick={() => onUpdate(feedback.id, "resolved")}>标记已处理</Button>
        <Button onClick={() => onUpdate(feedback.id, "closed")}>关闭问题</Button>
      </div>
    </div>
  );
}

function AdminForms({ forms, submissions }: { forms: HostedForm[]; submissions: FormSubmission[] }) {
  const [selectedFormId, setSelectedFormId] = useState("");
  const selectedForm = forms.find((form) => form.id === selectedFormId) || null;
  const selectedSubmissions = selectedForm
    ? submissions.filter((item) => item.formId === selectedForm.id)
    : [];
  return (
    <>
      <Card className="panel" id="forms">
        <div className="panel-head">
          <div>
            <h2>报名/留言</h2>
            <p>查看哪些试用项目正在收集报名、预约或留言，提交详情进入抽屉查看。</p>
          </div>
          <Badge tone={forms.length ? "info" : "neutral"}>{forms.length} 个表单</Badge>
        </div>
        {!forms.length ? (
          <EmptyState title="暂无报名/留言" description="用户生成带表单的试用链接并自动开启收集后，会显示在这里。" />
        ) : (
          <div className="form-admin-stack">
            <div className="form-admin-grid">
              {forms.map((form) => (
                <div className="form-admin-card" key={form.id}>
                  <div className="request-main">
                    <div>
                      <h3>{form.name}</h3>
                      <p>{form.userEmail || "-"} · {form.demoName || form.demoSlug || "-"}</p>
                    </div>
                    <Badge tone={form.status === "active" ? "success" : "neutral"}>{form.status === "active" ? "收集中" : "已关闭"}</Badge>
                  </div>
                  <dl className="detail-list">
                    <div>
                      <dt>字段</dt>
                      <dd>{form.fields?.map((field) => field.label || field.name).join("、") || "-"}</dd>
                    </div>
                    <div>
                      <dt>提交</dt>
                      <dd>{form.submissionCount || 0} 条</dd>
                    </div>
                  </dl>
                  <Button onClick={() => setSelectedFormId(form.id)}>查看详情</Button>
                </div>
              ))}
            </div>
            <div className="submission-list">
              <div className="section-mini-head">
                <h3>最近提交</h3>
                <span>{submissions.length} 条</span>
              </div>
              {!submissions.length ? (
                <p className="muted">暂时还没有收到提交。</p>
              ) : (
                submissions.slice(0, 12).map((item) => (
                  <div className="submission-row" key={item.id}>
                    <strong>{item.demoSlug || item.formId} · {formatDate(item.createdAt)}</strong>
                    <p>{Object.entries(item.payload || {}).map(([key, value]) => `${key}: ${value}`).join(" · ")}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Card>
      {selectedForm ? (
        <AdminDetailDrawer title="报名/留言详情" subtitle={selectedForm.name} onClose={() => setSelectedFormId("")}>
          <AdminFormDetail form={selectedForm} submissions={selectedSubmissions} />
        </AdminDetailDrawer>
      ) : null}
    </>
  );
}

function AdminFormDetail({ form, submissions }: { form: HostedForm; submissions: FormSubmission[] }) {
  return (
    <div className="drawer-detail-stack">
      <div className="request-main">
        <div>
          <h3>{form.name}</h3>
          <p>{form.userEmail || "-"} · {form.demoName || form.demoSlug || "-"}</p>
        </div>
        <Badge tone={form.status === "active" ? "success" : "neutral"}>{form.status === "active" ? "收集中" : "已关闭"}</Badge>
      </div>
      <dl className="detail-list">
        <div>
          <dt>收集入口</dt>
          <dd>{form.submitUrl || "-"}</dd>
        </div>
        <div>
          <dt>字段</dt>
          <dd>{form.fields?.map((field) => field.label || field.name).join("、") || "-"}</dd>
        </div>
        <div>
          <dt>提交数量</dt>
          <dd>{form.submissionCount || submissions.length} 条</dd>
        </div>
        <div>
          <dt>创建时间</dt>
          <dd>{formatDate(form.createdAt)}</dd>
        </div>
      </dl>
      <div className="submission-list">
        <div className="section-mini-head">
          <h3>提交记录</h3>
          <span>{submissions.length} 条</span>
        </div>
        {!submissions.length ? (
          <p className="muted">暂时还没有收到提交。</p>
        ) : (
          submissions.slice(0, 30).map((item) => (
            <div className="submission-row" key={item.id}>
              <strong>{formatDate(item.createdAt)}</strong>
              <p>{Object.entries(item.payload || {}).map(([key, value]) => `${key}: ${value}`).join(" · ")}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AdminDetailDrawer({
  title,
  subtitle,
  children,
  onClose
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [onClose]);

  return (
    <div className="detail-drawer-layer" role="dialog" aria-modal="true" aria-label={title}>
      <button className="detail-drawer-backdrop" type="button" aria-label="关闭详情" onClick={onClose} />
      <aside className="detail-drawer">
        <div className="detail-drawer-header">
          <div>
            <span>{title}</span>
            <strong>{subtitle || "详情"}</strong>
          </div>
          <Button onClick={onClose}>关闭</Button>
        </div>
        <div className="detail-drawer-body">
          {children}
        </div>
      </aside>
    </div>
  );
}

function AdminSettings() {
  return (
    <Card className="panel" id="settings">
      <h2>系统设置</h2>
      <div className="settings-list">
        <div>
          <strong>套餐名称</strong>
          <span>固定为 Free、Lite、Pro，避免用户端和运营端口径不一致。</span>
        </div>
        <div>
          <strong>升级流程</strong>
          <span>用户提交申请后，管理员只在“升级申请”里人工开通或拒绝。</span>
        </div>
        <div>
          <strong>生成链接能力</strong>
          <span>当前支持可直接打开的网页和常见 AI 工具导出的页面，完整后台业务托管后续再规划。</span>
        </div>
      </div>
    </Card>
  );
}
