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
          <h2>升级申请记录</h2>
          <p>这现显示你提交的所有升级申请和处理结果。</p>
        </div>
      </div>
      {!requests.length ? (
        <EmptyState title="暂无记录" description="还没有提交过升级申请。" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>申请时间</th>
                <th>当前套餐</th>
                <th>申请套餐</th>
                <th>状态</th>
                <th>处理系明</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.requestedPlanName || planName(request.requestedPlan)}</td>
                  <td>{planRequestStatusLabel(request.status)}</td>
                  <td>{formatDate(request.createdAt)}</td>
                  <td>{formatDate(request.handledAt)}</td>
                  <td>{request.adminNote || (request.status === "approved" ? "已开通" : "-")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
