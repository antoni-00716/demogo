import type { AdminMetrics, Demo, User } from "../../types";

const CHART_BARS = [40, 55, 45, 70, 60, 80, 75, 90, 85, 65, 95, 100, 78, 88];

export function AdminAnalytics({
  metrics,
  demos,
  users,
}: {
  metrics: AdminMetrics;
  demos: Demo[];
  users: User[];
}) {
  const totalVisits = metrics.totalVisits || demos.reduce((sum, d) => sum + (d.usage?.visits || 0), 0);
  const userCount = metrics.users || users.length;
  const totalDemos = metrics.demos || demos.length;

  // Top 5 demos by visits
  const topDemos = [...demos]
    .sort((a, b) => (b.usage?.visits || 0) - (a.usage?.visits || 0))
    .slice(0, 5);

  // Weekly new users (approximate) — stable per render cycle for admin dashboard
  // eslint-disable-next-line react-hooks/purity
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyNew = users.filter((u) => u.createdAt && new Date(u.createdAt).getTime() > oneWeekAgo).length;
  const totalNewUsers = (metrics.users || users.length);
  const growthRate = totalNewUsers > 0 && weeklyNew > 0
    ? ((weeklyNew / Math.max(totalNewUsers - weeklyNew, 1)) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="analytics-grid">
      {/* Trend Chart - Full Width */}
      <div className="analytics-card full-width">
        <div className="analytics-card-title">总浏览量趋势</div>
        <div className="chart-placeholder">
          <div className="chart-bars">
            {CHART_BARS.map((h, i) => (
              <div key={i} className="chart-bar" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>

      {/* User Growth */}
      <div className="analytics-card">
        <div className="analytics-card-title">用户增长</div>
        <div className="growth-grid">
          <div className="growth-item">
            <div className="growth-value" style={{ color: "var(--accent)" }}>{userCount.toLocaleString()}</div>
            <div className="growth-label">总用户数</div>
          </div>
          <div className="growth-item">
            <div className="growth-value" style={{ color: "var(--accent)" }}>+{weeklyNew}</div>
            <div className="growth-label">本周新增</div>
          </div>
          <div className="growth-item">
            <div className="growth-value" style={{ color: "#F59E0B" }}>{growthRate}%</div>
            <div className="growth-label">增长率</div>
          </div>
        </div>
        <div className="chart-placeholder" style={{ height: 100, marginTop: 12 }}>
          <div className="chart-bars">
            {[30, 45, 40, 60, 55, 70, 100].map((h, i) => (
              <div key={i} className="chart-bar" style={{ height: `${h}%`, background: `linear-gradient(to top, var(--accent), rgba(34,197,94,.2))` }} />
            ))}
          </div>
        </div>
      </div>

      {/* Popular Demos */}
      <div className="analytics-card">
        <div className="analytics-card-title">热门 Demo</div>
        {topDemos.length === 0 ? (
          <p className="muted">暂无可展示的 Demo 数据</p>
        ) : (
          topDemos.map((demo, i) => (
            <div className="popular-demo-item" key={demo.id}>
              <div className="popular-demo-rank">{i + 1}</div>
              <div className="popular-demo-info">
                <div className="popular-demo-name">{demo.name || demo.slug}</div>
                <div className="popular-demo-meta">{demo.userEmail || "-"} · {(demo.usage?.visits || 0) > 0 ? `${((demo.usage?.visits || 0) / 1000).toFixed(1)}k 总浏览` : "暂无浏览"}</div>
              </div>
              <div className="popular-demo-views">{(demo.usage?.visits || 0).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>

      {/* DAU / MAU Metrics */}
      <div className="analytics-card">
        <div className="analytics-card-title">指标概览</div>
        <div className="metric-list">
          <div className="metric-item">
            <span className="metric-label">今日访问</span>
            <span>
              <span className="metric-value">{totalVisits}</span>
              <span className="metric-sub">总浏览</span>
            </span>
          </div>
          <div className="metric-item">
            <span className="metric-label">在线 Demo</span>
            <span>
              <span className="metric-value">{metrics.liveDemos || demos.filter((d) => d.status === "published").length}</span>
              <span className="metric-sub">/ {totalDemos} 总</span>
            </span>
          </div>
          <div className="metric-item">
            <span className="metric-label">待处理反馈</span>
            <span>
              <span className="metric-value">{metrics.openFeedback || 0}</span>
              <span className="metric-sub">条</span>
            </span>
          </div>
          <div className="metric-item">
            <span className="metric-label">待审核内容</span>
            <span>
              <span className="metric-value">{metrics.pendingContentReviews || metrics.blockedContentReviews || 0}</span>
              <span className="metric-sub">条</span>
            </span>
          </div>
          <div className="metric-item">
            <span className="metric-label">活跃表单</span>
            <span>
              <span className="metric-value">{metrics.activeForms || 0}</span>
              <span className="metric-sub">/ {metrics.forms || 0} 总</span>
            </span>
          </div>
          <div className="metric-item">
            <span className="metric-label">本月部署</span>
            <span>
              <span className="metric-value">{metrics.deploySuccesses || 0}</span>
              <span className="metric-sub">{metrics.deployFailures ? `失败 ${metrics.deployFailures}` : "次"}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
