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
    description: "免费开始，适合第一次试用",
    linkBenefit: "自动分配链接，打开就能用"
  },
  {
    code: "lite",
    name: "Lite",
    onlineDemos: 3,
    monthlyDeploys: 20,
    retentionDays: 30,
    description: "适合持续演示和小范围分享",
    linkBenefit: "可以自定义链接后缀，更好记"
  },
  {
    code: "pro",
    name: "Pro",
    onlineDemos: 10,
    monthlyDeploys: 60,
    retentionDays: 30,
    description: "适合长期使用，同时管理多个作品",
    linkBenefit: "支持专属二级域名，更专业"
  }
];

export function planName(code?: string) {
  return plans.find((plan) => plan.code === code)?.name || "Free";
}

export function planRank(code?: string) {
  return code === "pro" ? 2 : code === "lite" ? 1 : 0;
}
