import { useMemo, useState } from "react";
import type { PlanRequest, SubdomainRequest } from "../../types";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { SubdomainRequestCard } from "../../components/dashboard/SubdomainRequestCard";
import { planName } from "../../config/plans";
import { planRequestStatusLabel } from "../../config/statuses";
import { formatDate } from "../../utils/format";
import { updateAdminPlanRequestStatus } from "../../api/admin";
import { AdminDetailDrawer } from "./AdminDetailDrawer";

export function PlanRequestsAdmin({
  requests,
  onChanged,
  onError
}: {
  requests: PlanRequest[];
  onChanged: (text: string) => Promise<void>;
  onError: (text: string) => void;
}) {
  const openRequests = useMemo(() => requests.filter((item) => item.status === "open"), [requests]);
  const handledRequests = useMemo(() => requests.filter((item) => item.status !== "open"), [requests]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const selectedRequest = requests.find((request) => request.id === selectedRequestId) || null;
  return (
    <>
      <Card className="panel" id="planRequests">
        <div className="panel-head">
          <div>
            <h2>升级申请</h2>
            <p>列表用于快速扫描，处理动作统一进入详情，不在页面里堆多个大卡片。</p>
          </div>
          <Badge tone={openRequests.length ? "warning" : "success"}>{openRequests.length} 个待处理</Badge>
        </div>
        {!requests.length ? (
          <EmptyState title="暂无升级申请" description="用户端提交申请后，会显示在这里。" />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>用户</th>
                  <th>申请</th>
                  <th>状态</th>
                  <th>提交时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {[...openRequests, ...handledRequests].slice(0, 80).map((request) => (
                  <tr key={request.id}>
                    <td>{request.userEmail}</td>
                    <td>{planName(request.currentPlan)} → {planName(request.requestedPlan)}</td>
                    <td>{planRequestStatusLabel(request.status)}</td>
                    <td>{formatDate(request.createdAt)}</td>
                    <td><Button onClick={() => setSelectedRequestId(request.id)}>{request.status === "open" ? "处理" : "查看详情"}</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {selectedRequest ? (
        <AdminDetailDrawer title="升级申请详情" subtitle={selectedRequest.userEmail || "-"} onClose={() => setSelectedRequestId("")}>
          <PlanRequestDetail request={selectedRequest} onChanged={onChanged} onError={onError} />
        </AdminDetailDrawer>
      ) : null}
    </>
  );
}

export function PlanRequestDetail({
  request,
  onChanged,
  onError
}: {
  request: PlanRequest;
  onChanged: (text: string) => Promise<void>;
  onError: (text: string) => void;
}) {
  return (
    <div className="drawer-detail-stack">
      <div className="request-main">
        <div>
          <h3>{request.userEmail}</h3>
          <p>{planName(request.currentPlan)} → {planName(request.requestedPlan)} · {formatDate(request.createdAt)}</p>
        </div>
        <Badge tone={request.status === "open" ? "warning" : request.status === "approved" ? "success" : "neutral"}>
          {planRequestStatusLabel(request.status)}
        </Badge>
      </div>
      <dl className="detail-list">
        <div>
          <dt>当前套餐</dt>
          <dd>{planName(request.currentPlan)}</dd>
        </div>
        <div>
          <dt>申请套餐</dt>
          <dd>{planName(request.requestedPlan)}</dd>
        </div>
        <div>
          <dt>联系方式</dt>
          <dd>{request.contact || "-"}</dd>
        </div>
        <div>
          <dt>申请说明</dt>
          <dd>{request.message || "-"}</dd>
        </div>
        <div>
          <dt>处理说明</dt>
          <dd>{request.adminNote || "-"}</dd>
        </div>
      </dl>
      {request.status === "open" ? <PlanRequestCard request={request} onChanged={onChanged} onError={onError} compact /> : null}
    </div>
  );
}

export function SubdomainRequestsAdmin({
  requests,
  onChanged,
  onError
}: {
  requests: SubdomainRequest[];
  onChanged: (text: string) => Promise<void>;
  onError: (text: string) => void;
}) {
  const openRequests = useMemo(() => requests.filter((item) => item.status === "open"), [requests]);
  const handledRequests = useMemo(() => requests.filter((item) => item.status !== "open"), [requests]);
  return (
    <section className="content-grid">
      <Card className="panel">
        <div className="panel-head">
          <div>
            <h2>二级域名申请</h2>
            <p>Pro 用户提交后，在这里确认是否允许使用对应的 xxx.demogo.cn。</p>
          </div>
          <Badge tone={openRequests.length ? "warning" : "success"}>{openRequests.length ? `${openRequests.length} 个待处理` : "暂无待处理"}</Badge>
        </div>
        {!requests.length ? (
          <EmptyState title="暂无二级域名申请" description="Pro 用户在项目详情里提交申请后，会显示在这里。" />
        ) : (
          <div className="request-card-grid">
            {[...openRequests, ...handledRequests].map((request) => (
              <SubdomainRequestCard key={request.id} request={request} onChanged={onChanged} onError={onError} />
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}

export function PlanRequestCard({
  request,
  onChanged,
  onError,
  compact = false
}: {
  request: PlanRequest;
  onChanged: (text: string) => Promise<void>;
  onError: (text: string) => void;
  compact?: boolean;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function update(status: "approved" | "rejected") {
    if (status === "rejected" && note.trim().length < 2) {
      onError("拒绝申请时，请填写明确原因，用户端会看到这段说明。");
      return;
    }
    setBusy(true);
    try {
      await updateAdminPlanRequestStatus(request.id, { status, adminNote: note });
      await onChanged(status === "approved" ? `已为 ${request.userEmail} 开通 ${planName(request.requestedPlan)}。` : "已拒绝该升级申请。");
    } catch (error) {
      onError(error instanceof Error ? error.message : "升级申请处理失败。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`request-card ${compact ? "request-card-compact" : ""}`}>
      {!compact ? (
        <>
          <div className="request-main">
            <div>
              <h3>{request.userEmail}</h3>
              <p>{planName(request.currentPlan)} → {planName(request.requestedPlan)} · {formatDate(request.createdAt)}</p>
            </div>
            <Badge tone="warning">待处理</Badge>
          </div>
          <dl className="detail-list">
            <div>
              <dt>当前套餐</dt>
              <dd>{planName(request.currentPlan)}</dd>
            </div>
            <div>
              <dt>申请套餐</dt>
              <dd>{planName(request.requestedPlan)}</dd>
            </div>
            <div>
              <dt>联系方式</dt>
              <dd>{request.contact || "-"}</dd>
            </div>
            <div>
              <dt>申请说明</dt>
              <dd>{request.message || "-"}</dd>
            </div>
          </dl>
        </>
      ) : null}
      <label className="form-field">
        管理员说明
        <textarea className="textarea" value={note} onChange={(event) => setNote(event.target.value)} placeholder="开通时可留空；拒绝时请写清楚原因，用户端会展示。" />
      </label>
      <div className="row-actions">
        <Button variant="primary" disabled={busy} onClick={() => update("approved")}>开通 {planName(request.requestedPlan)}</Button>
        <Button variant="danger" disabled={busy} onClick={() => update("rejected")}>拒绝申请</Button>
      </div>
    </div>
  );
}
