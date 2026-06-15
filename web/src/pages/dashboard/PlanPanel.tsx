import { useState } from "react";
import type { User, PlanRequest } from "../../types";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { plans, planName, planRank } from "../../config/plans";
import { createPlanRequest } from "../../api/plans";

export function PlanPanel({
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
          <p>当前套餐：{user.planName || planName(user.plan)}。如需升级，提交申请后等待管理员开通。</p>
        </div>
        <Badge tone="info">人工审核开通</Badge>
      </div>
      <div className="plan-pricing-note">
          <strong>?? Lite / Pro 套餐正在内测中</strong>
          <span>升级费用请咨询客服：QQ <strong>304598006</strong> · 邮箱 <strong>hello@demogo.cn</strong>，客服会协助你完成开通和付费。</span>
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
