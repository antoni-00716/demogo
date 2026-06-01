// DemoGo v0.9.14 - Deploy history table (extracted from UserDashboard)
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
      <h2>??????</h2>
      <p className="muted">????? {monthUsage?.used || 0} / {monthUsage?.limit || 0} ???/?????</p>
      {!events.length ? (
        <EmptyState title="??????" description="???????????????????" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>??</th>
                <th>????</th>
                <th>??</th>
                <th>??</th>
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 8).map((event) => (
                <tr key={event.id}>
                  <td>{formatDate(event.at)}</td>
                  <td>{event.demoName || event.demoSlug}</td>
                  <td>{event.typeLabel}</td>
                  <td>V{event.version || 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
