// DemoGo v0.9.7 - Dashboard 面板组件（从 UserDashboard 提取）
import type { DeploymentStep, PlanRequest, Quota, SubdomainRequest, User } from "../../types";
type DashboardView = "overview" | "projects" | "upload" | "agent" | "plan" | "history" | "feedback";
import { Badge } from "../Badge";
import { Button } from "../Button";
import { Card } from "../Card";
import { planName } from "../../config/plans";
import { deploymentStepLabel, stepStatusIcon } from "../../pages/dashboard/utils";

// ============================================================
// QuickCreatePanel
// ============================================================

export function QuickCreatePanel({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="panel quick-create-panel">
      <div>
        <h2>下一步做什么</h2>
        <p>如果作品已经在 AI 工具里做好了，优先让 AI 直接发布；如果已经有文件包，就从这里上传。</p>
      </div>
      <Button variant="primary" onClick={onCreate}>开始上传</Button>
    </Card>
  );
}

// ============================================================
// DeploymentSteps
// ============================================================

export function DeploymentSteps({ steps }: { steps: DeploymentStep[] }) {
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

// ============================================================
// UpgradeBanner
// ============================================================

export function UpgradeBanner({
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

// ============================================================
// SubdomainRequestStatus
// ============================================================

function subdomainRequestStatusLabel(status?: string) {
  if (status === "approved") return "已开通";
  if (status === "rejected") return "未通过";
  return "申请中";
}

function subdomainRequestNextStep(request: SubdomainRequest) {
  if (request.status === "approved") return "二级域名已生效，可通过 xxx.demogo.cn 直接访问你的试用项目。无需任何额外配置。";
  if (request.status === "rejected") return request.adminNote ? `未通过原因：${request.adminNote}` : "申请未通过，如有疑问请联系管理员。";
  return "二级域名申请正在处理中，管理员审核通过后即可使用。开通后会自动将原试用链接重定向到新域名，无需修改任何配置。";
}

export function SubdomainRequestStatus({ request }: { request: SubdomainRequest }) {
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