// DemoGo v0.9.15 - Demo analytics panel
import { Card } from "../Card";
import { MetricCard } from "../MetricCard";
import { formatDate } from "../../utils/format";

export interface DemoAnalytics {
  demoId: string;
  slug: string;
  visits: number;
  visitors: number;
  estimatedBytes: number;
  estimatedBytesLabel: string;
  lastVisitedAt: string | null;
}

export function AnalyticsPanel({ analytics }: { analytics: DemoAnalytics }) {
  if (!analytics.visits && !analytics.visitors) {
    return (
      <Card className="panel" id="analytics">
        <h2>访问分析</h2>
        <p className="muted">还没有人打开过这个试用链接。把链接发给别人试试。</p>
      </Card>
    );
  }

  return (
    <Card className="panel" id="analytics">
      <h2>访问分析</h2>
      <p className="muted">
        {analytics.lastVisitedAt
          ? "最近一次访问：" + formatDate(analytics.lastVisitedAt)
          : "暂无访问记录" }
      </p>
      <div className="metric-row">
        <MetricCard
          label="被看了多少次"
          value={String(analytics.visits)}
        />
        <MetricCard
          label="多少人看过"
          value={String(analytics.visitors)}
        />
        <MetricCard
          label="流量消耗"
          value={analytics.estimatedBytesLabel}
        />
      </div>
    </Card>
  );
}