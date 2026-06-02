import type { AdminMetrics, AdminUser, ContentReview, Demo, Feedback, HostedForm, PlanRequest } from "../../types";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { planName } from "../../config/plans";
import { demoStatusLabel } from "../../config/statuses";
import { failureReasonNote } from "./adminOverviewHelpers";
import type { AdminView } from "./AdminSidebar";
import { AdminDemoList } from "./AdminDemosView";
import { AdminUsers } from "./AdminUsers";

export function AdminOverviewView({
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
      <AdminTrialFunnel metrics={metrics} />
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

export function AdminOpsHero({
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
    ["在线作品", metrics.liveDemos || 0, "试用中"]
  ];
  return (
    <section className="admin-ops-hero">
      <div>
        <Badge tone="success">运营工作台</Badge>
        <h2>今天要处理什么，先在这里看清楚。</h2>
        <p>升级申请、用户问题、内容检查和异常作品集中到一个入口，运营人员不用在多个页面里找线索。</p>
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

export function AdminTrialFunnel({ metrics }: { metrics: AdminMetrics }) {
  const funnel = metrics.trialFunnel || {};
  const sourceBreakdown = metrics.deploySourceBreakdown || {};
  const steps = [
    ["首页访问", funnel.homeVisits || 0, "看到产品价值"],
    ["注册意向", funnel.registerStarts || 0, "进入注册页"],
    ["注册成功", funnel.registerSuccesses || 0, "创建账号"],
    ["开始上传", funnel.uploadStarts || 0, "进入生成流程"],
    ["发布成功", funnel.deploySuccesses || metrics.deploySuccesses || 0, "拿到链接"],
    ["发布失败", funnel.deployFailures || metrics.deployFailures || 0, "需要处理"]
  ];
  const sources = [
    ["网页上传", sourceBreakdown.web || 0],
    ["DemoGo CLI", sourceBreakdown.cli || 0],
    ["MCP", sourceBreakdown.mcp || 0],
    ["Agent API", sourceBreakdown.agent_api || 0]
  ];
  return (
    <section className="trial-funnel-board">
      <Card className="panel">
        <div className="panel-head">
          <div>
            <h2>真实试用转化</h2>
            <p>用于观察用户从看到首页、注册、上传到生成链接的关键卡点。</p>
          </div>
          <Badge tone="info">轻量统计</Badge>
        </div>
        <div className="funnel-grid">
          {steps.map(([label, value, note]) => (
            <div className="funnel-step" key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
              <small>{note}</small>
            </div>
          ))}
        </div>
      </Card>
      <Card className="panel deploy-source-panel">
        <h2>发布来源</h2>
        <p className="muted">判断用户更习惯自己上传，还是让 AI 工具帮忙。</p>
        <div className="source-list">
          {sources.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

export function AdminTaskBoard({
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
  const openRequests = requests.filter((request) => request.status === "open").length;
  const openFeedback = feedback.filter((item) => item.status === "open").length;
  const riskReviews = contentReviews.filter((item) => item.resolutionStatus === "pending" || item.status === "blocked" || item.status === "review_required").length;
  const activeForms = forms.filter((form) => form.status === "active").length;
  const riskDemos = demos.filter((demo) => demo.status === "failed" || (demo.riskSummary?.length || 0) > 0);
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
      count: openRequests,
      description: "用户申请 Lite 或 Pro 后，直接在这里开通或拒绝。",
      sample: openRequests ? `${requests.find((r) => r.status === "open")?.userEmail || "-"} 申请 ${planName(requests.find((r) => r.status === "open")?.requestedPlan || "")}` : "暂无待处理申请",
      action: "处理申请",
      view: "requests",
      tone: openRequests ? "warning" : "success"
    },
    {
      title: "用户问题",
      count: openFeedback,
      description: "试用中遇到的问题要形成列表，避免只看到最近一条。",
      sample: openFeedback ? `${feedback.find((f) => f.status === "open")?.typeLabel || feedback.find((f) => f.status === "open")?.type} · ${feedback.find((f) => f.status === "open")?.message}` : "暂无待跟进问题",
      action: "查看问题",
      view: "feedback",
      tone: openFeedback ? "warning" : "success"
    },
    {
      title: "内容检查",
      count: riskReviews,
      description: "生成链接前发现的高风险内容要优先处理，避免问题链接被公开传播。",
      sample: riskReviews ? `${contentReviews.find((c) => c.resolutionStatus === "pending" || c.status === "blocked")?.projectName || contentReviews.find((c) => c.resolutionStatus === "pending" || c.status === "blocked")?.fileName || "-"} · ${contentReviews.find((c) => c.resolutionStatus === "pending" || c.status === "blocked")?.resolutionStatusLabel || contentReviews.find((c) => c.resolutionStatus === "pending" || c.status === "blocked")?.statusLabel || contentReviews.find((c) => c.resolutionStatus === "pending" || c.status === "blocked")?.status}` : "暂无内容风险",
      action: "查看检查",
      view: "reviews",
      tone: riskReviews ? "warning" : "success"
    },
    {
      title: "报名/留言",
      count: activeForms,
      description: "用户是否真的收到报名和留言，是判断页面试用价值的重要信号。",
      sample: activeForms ? `${forms.find((f) => f.status === "active")?.demoName || forms.find((f) => f.status === "active")?.demoSlug} · ${forms.find((f) => f.status === "active")?.submissionCount || 0} 条提交` : "暂无报名/留言",
      action: "查看记录",
      view: "forms",
      tone: activeForms ? "info" : "success"
    },
    {
      title: "需要关注的作品",
      count: riskDemos.length,
      description: "生成失败、访问异常或内容风险，需要运营能快速定位。",
      sample: riskDemos[0] ? `${riskDemos[0].name || riskDemos[0].slug} · ${riskDemos[0].riskSummary?.[0]?.label || demoStatusLabel(riskDemos[0].status)}` : "暂无明显问题",
      action: "查看作品",
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

export function AdminOpsSummary({
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
    ["在线作品", metrics.liveDemos || 0, "正在被打开"],
    ["AI 生成", metrics.aiDeploys || 0, "AI 工具调用"],
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




