export type PlanCode = "free" | "lite" | "pro";

export type Plan = {
  code: PlanCode;
  name: string;
  onlineDemos: number;
  monthlyDeploys: number;
  retentionDays: number;
  description: string;
  linkBenefit: string;
};

export const plans: Plan[] = [
  {
    code: "free",
    name: "Free",
    onlineDemos: 1,
    monthlyDeploys: 3,
    retentionDays: 7,
    description: "先试一次，验证能不能跑通",
    linkBenefit: "系统自动分配试用链接"
  },
  {
    code: "lite",
    name: "Lite",
    onlineDemos: 3,
    monthlyDeploys: 20,
    retentionDays: 30,
    description: "适合用户演示和小范围试用",
    linkBenefit: "可使用更清晰的项目访问地址"
  },
  {
    code: "pro",
    name: "Pro",
    onlineDemos: 10,
    monthlyDeploys: 60,
    retentionDays: 30,
    description: "适合持续验证多个 AI 产品原型",
    linkBenefit: "可申请专属二级域名"
  }
];

export function planName(code?: string) {
  return plans.find((plan) => plan.code === code)?.name || "Free";
}

export function planRank(code?: string) {
  return code === "pro" ? 2 : code === "lite" ? 1 : 0;
}
