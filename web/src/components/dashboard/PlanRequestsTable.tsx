// DemoGo v0.9.14 - Plan requests table (extracted from UserDashboard)
import { Card } from "../Card";
import { EmptyState } from "../EmptyState";
import { planName } from "../../config/plans";
import { planRequestStatusLabel } from "../../config/statuses";
import { formatDate } from "../../utils/format";
import type { PlanRequest } from "../../types";

export function PlanRequestsTable({ requests }: { requests: PlanRequest[] }) {
  return (
    <Card className="panel" id="requests">
      <div className="panel-head">
        <div>
          <h2>??????</h2>
          <p>??????????????????????????</p>
        </div>
      </div>
      {!requests.length ? (
        <EmptyState title="??????" description="??????????????????????????" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>????</th>
                <th>??</th>
                <th>????</th>
                <th>????</th>
                <th>?????</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.requestedPlanName || planName(request.requestedPlan)}</td>
                  <td>{planRequestStatusLabel(request.status)}</td>
                  <td>{formatDate(request.createdAt)}</td>
                  <td>{formatDate(request.handledAt)}</td>
                  <td>{request.adminNote || (request.status === "approved" ? "???" : "-")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
