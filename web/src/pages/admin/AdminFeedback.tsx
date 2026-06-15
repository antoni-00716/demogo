import { useState } from "react";
import type { Feedback } from "../../types";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { feedbackStatusLabel } from "../../config/statuses";
import { formatDate } from "../../utils/format";
import { updateAdminFeedbackStatus } from "../../api/admin";
import { AdminDetailDrawer } from "./AdminDetailDrawer";

export function AdminFeedback({
  feedback,
  onChanged,
  onError
}: {
  feedback: Feedback[];
  onChanged: (text: string) => Promise<void>;
  onError: (text: string) => void;
}) {
  const [selectedFeedbackId, setSelectedFeedbackId] = useState("");
  const [filterType, setFilterType] = useState("all");
  const selectedFeedback = feedback.find((item) => item.id === selectedFeedbackId) || null;

  const totalCount = feedback.length;
  const unreadCount = feedback.filter((item) => item.status === "open").length;
  const bugCount = feedback.filter((item) => item.type === "bug" || item.type === "deploy_failed" || item.type === "page_error").length;
  const suggestionCount = feedback.filter((item) => item.type === "suggestion" || item.type === "form_data").length;

  const filtered = filterType === "all" ? feedback
    : filterType === "open" ? feedback.filter((item) => item.status === "open")
    : filterType === "bug" ? feedback.filter((item) => item.type === "bug" || item.type === "deploy_failed" || item.type === "page_error")
    : filterType === "suggestion" ? feedback.filter((item) => item.type === "suggestion" || item.type === "form_data")
    : feedback;

  async function update(id: string, status: Feedback["status"]) {
    try {
      await updateAdminFeedbackStatus(id, status);
      await onChanged("问题状态已更新。");
    } catch (error) {
      onError(error instanceof Error ? error.message : "问题状态更新失败。");
    }
  }

  return (
    <>
      <Card className="panel" id="feedback">
        <div className="panel-head">
          <div>
            <h2>用户问题</h2>
            <p>真实试用过程中的问题要完整保留，进入详情后再变更处理状态。</p>
          </div>
          <Badge tone={unreadCount > 0 ? "warning" : "success"}>{unreadCount} 条待处理</Badge>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-label">总反馈</div>
            <div className="stat-value">{totalCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">待处理</div>
            <div className="stat-value">{unreadCount}</div>
            {unreadCount > 0 && <div className="stat-change down">需处理</div>}
          </div>
          <div className="stat-card">
            <div className="stat-label">Bug 反馈</div>
            <div className="stat-value">{bugCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">功能建议</div>
            <div className="stat-value">{suggestionCount}</div>
          </div>
        </div>

        {/* Filter */}
        <div className="feedback-filters" style={{ marginBottom: 16 }}>
          <button className={`filter-btn${filterType === "all" ? " active" : ""}`} onClick={() => setFilterType("all")}>全部类型</button>
          <button className={`filter-btn${filterType === "open" ? " active" : ""}`} onClick={() => setFilterType("open")}>待处理</button>
          <button className={`filter-btn${filterType === "bug" ? " active" : ""}`} onClick={() => setFilterType("bug")}>Bug</button>
          <button className={`filter-btn${filterType === "suggestion" ? " active" : ""}`} onClick={() => setFilterType("suggestion")}>建议</button>
        </div>
        {!feedback.length ? (
          <EmptyState title="暂无用户问题" description="用户端提交问题后，会显示在这里。" />
        ) : (
          <div className="feedback-list">
            {filtered.slice(0, 30).map((item) => (
              <div className="feedback-item" key={item.id}>
                <div className="panel">
                  <div>
                    <h3>{item.typeLabel || item.type}</h3>
                    <p>{item.userEmail || "-"} · {item.demoSlug || "未关联试用项目"} · {formatDate(item.createdAt)}</p>
                  </div>
                  <Badge tone={item.status === "open" ? "warning" : item.status === "resolved" ? "success" : "neutral"}>{feedbackStatusLabel(item.status)}</Badge>
                </div>
                <p>{item.message}</p>
                <div className="row-actions compact">
                  <Button onClick={() => setSelectedFeedbackId(item.id)}>查看详情</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      {selectedFeedback ? (
        <AdminDetailDrawer title="用户问题详情" subtitle={selectedFeedback.userEmail || "-"} onClose={() => setSelectedFeedbackId("")}>
          <AdminFeedbackDetail feedback={selectedFeedback} onUpdate={update} />
        </AdminDetailDrawer>
      ) : null}
    </>
  );
}

export function AdminFeedbackDetail({
  feedback,
  onUpdate
}: {
  feedback: Feedback;
  onUpdate: (id: string, status: Feedback["status"]) => Promise<void>;
}) {
  return (
    <div className="drawer-detail-stack">
      <div className="panel">
        <div>
          <h3>{feedback.typeLabel || feedback.type}</h3>
          <p>{feedback.userEmail || "-"} · {formatDate(feedback.createdAt)}</p>
        </div>
        <Badge tone={feedback.status === "open" ? "warning" : feedback.status === "resolved" ? "success" : "neutral"}>{feedbackStatusLabel(feedback.status)}</Badge>
      </div>
      <dl className="detail-list">
        <div>
          <dt>关联试用项目</dt>
          <dd>{feedback.demoSlug || "-"}</dd>
        </div>
        <div>
          <dt>提交时间</dt>
          <dd>{formatDate(feedback.createdAt)}</dd>
        </div>
        <div>
          <dt>更新时间</dt>
          <dd>{formatDate(feedback.updatedAt)}</dd>
        </div>
      </dl>
      <div className="risk-panel">
        <h3>问题内容</h3>
        <p>{feedback.message}</p>
      </div>
      <div className="row-actions">
        <Button onClick={() => onUpdate(feedback.id, "in_progress")}>标记处理中</Button>
        <Button onClick={() => onUpdate(feedback.id, "resolved")}>标记已处理</Button>
        <Button onClick={() => onUpdate(feedback.id, "closed")}>关闭问题</Button>
      </div>
    </div>
  );
}
