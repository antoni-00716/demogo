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
  const selectedFeedback = feedback.find((item) => item.id === selectedFeedbackId) || null;

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
          <Badge tone={feedback.some((item) => item.status === "open") ? "warning" : "success"}>
            {feedback.filter((item) => item.status === "open").length} 条待处理
          </Badge>
        </div>
        {!feedback.length ? (
          <EmptyState title="暂无用户问题" description="用户端提交问题后，会显示在这里。" />
        ) : (
          <div className="feedback-list">
            {feedback.slice(0, 30).map((item) => (
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
