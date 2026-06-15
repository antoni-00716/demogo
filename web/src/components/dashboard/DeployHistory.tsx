import { Card } from "../Card";
import { EmptyState } from "../EmptyState";
import { formatDate } from "../../utils/format";
import type { DeployEvent } from "../../types";

export function DeployHistory({
  events,
  monthUsage,
  compact = false
}: {
  events: DeployEvent[];
  monthUsage: { used: number; limit: number } | null;
  compact?: boolean;
}) {
  return (
    <Card className={`panel ${compact ? "compact-panel" : ""}`} id="deployHistory">
      <h2>生成记录</h2>
      <p className="muted">本月已用 {monthUsage?.used || 0} / {monthUsage?.limit || 0} 次生成/更新</p>
      {!events.length ? (
        <EmptyState title="暂无记录" description="上传作品生成链接后，这里会显示生成记录。" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>作品名称</th>
                <th>操作</th>
                <th>版本</th>
                <th>状态</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 8).map((event) => (
                <tr key={event.id}>
                  <td><strong>{event.demoName || event.demoSlug}</strong></td>
                  <td>{event.typeLabel}</td>
                  <td>V{event.version || 1}</td>
                  <td><span className={`status-badge ${event.demoStatus === "published" || !event.demoStatus ? "status-badge--online" : "status-badge--expired"}`}>{(event.demoStatus === "published" || !event.demoStatus) ? "在线" : "已过期"}</span></td>
                  <td style={{ color: "var(--text-tertiary)", fontSize: 13 }}>{formatDate(event.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
