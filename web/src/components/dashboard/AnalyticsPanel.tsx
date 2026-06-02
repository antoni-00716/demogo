// DemoGo v0.9.32 - Demo analytics panel with conversion funnel
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
  formSubmissions: number;
  feedbackCount: number;
  conversionRate: string;
}

export function AnalyticsPanel({ analytics }: { analytics: DemoAnalytics }) {
  if (!analytics.visits && !analytics.visitors) {
    return (
      <Card className="panel" id="analytics">
        <h2>访问与转化</h2>
        <p className="muted">还没有人打开过这个试用链接。把链接发给别人试试。</p>
      </Card>
    );
  }

  return (
    <Card className="panel" id="analytics">
      <h2>访问与转化</h2>
      <p className="muted">
        {analytics.lastVisitedAt
          ? "最近一次访问：" + formatDate(analytics.lastVisitedAt)
          : "暂无访问记录"}
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
      {(analytics.formSubmissions > 0 || analytics.feedbackCount > 0) && (
        <>
          <h3 style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>转化漏斗</h3>
          <div className="metric-row">
            <MetricCard
              label="填写表单"
              value={String(analytics.formSubmissions)}
            />
            <MetricCard
              label="提交反馈"
              value={String(analytics.feedbackCount)}
            />
            <MetricCard
              label="表单转化率"
              value={analytics.conversionRate}
            />
          </div>
        </>
      )}
    </Card>
  );
}