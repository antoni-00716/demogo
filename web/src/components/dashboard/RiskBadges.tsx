import { Badge } from "../Badge";
import type { Demo } from "../../types";

interface RiskBadgesProps {
  demo: Demo & { riskSummary?: Array<{ type: string; label: string }> };
}

export function RiskBadges({ demo }: RiskBadgesProps) {
  const contentRisk = demo.contentReview?.status && demo.contentReview.status !== "passed"
    ? [{ type: "content", label: demo.contentReview.statusLabel || "内容需关注" }]
    : [];
  const risks = [...contentRisk, ...(demo.riskSummary || [])];
  if (!risks.length) return <span className="muted">无明显问题</span>;
  return (
    <div className="badge-row">
      {risks.map((risk) => (
        <Badge key={`${risk.type}-${risk.label}`} tone={["api", "blocked", "external_backend_warning"].includes(risk.type) ? "warning" : "info"}>{risk.label}</Badge>
      ))}
    </div>
  );
}
