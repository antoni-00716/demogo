import { useState } from "react";
import type { ContentReview } from "../../types";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { formatDate } from "../../utils/format";
import { updateAdminContentReviewStatus } from "../../api/admin";
import { AdminDetailDrawer } from "./AdminDetailDrawer";

type ToastTone = "info" | "success" | "warning" | "danger";

const FILTER_OPTIONS = [
  { key: "all", label: "全部状态" },
  { key: "pending", label: "待审核" },
  { key: "approved", label: "已通过" },
  { key: "rejected", label: "已拒绝" },
];

export function AdminContentReviews({
  reviews,
  onHandled,
  show
}: {
  reviews: ContentReview[];
  onHandled: () => Promise<void>;
  show: (text: string, tone?: ToastTone) => void;
}) {
  const [selectedReviewId, setSelectedReviewId] = useState("");
  const [filterKey, setFilterKey] = useState("all");
  const selectedReview = reviews.find((review) => review.id === selectedReviewId) || null;
  const riskReviews = reviews.filter((review) => review.resolutionStatus === "pending" || review.status === "blocked" || review.status === "review_required");

  const filtered = filterKey === "all"
    ? reviews
    : reviews.filter((r) => {
        const s = r.resolutionStatus || "pending";
        if (filterKey === "pending") return s === "pending" || r.status === "blocked" || r.status === "review_required";
        if (filterKey === "approved") return s === "resolved" || s === "false_positive" || r.status === "passed";
        if (filterKey === "rejected") return s === "confirmed_violation";
        return true;
      });

  return (
    <>
      <Card className="panel" id="contentReviews">
        <div className="panel-head">
          <div>
            <h2>内容检查</h2>
            <p>发布前发现的风险会记录在这里。已拦截和待人工确认的项目要优先查看。</p>
          </div>
          <Badge tone={riskReviews.length ? "warning" : "success"}>{riskReviews.length} 个待处理</Badge>
        </div>

        {/* Filter */}
        <div className="feedback-filters" style={{ marginBottom: 16 }}>
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.key}
              className={`filter-btn${filterKey === f.key ? " active" : ""}`}
              onClick={() => setFilterKey(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {!reviews.length ? (
          <EmptyState title="暂无内容检查记录" description="用户生成或更新试用链接后，会在这里显示发布前内容检查结果。" />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>项目</th>
                  <th>用户</th>
                  <th>结果</th>
                  <th>处理</th>
                  <th>摘要</th>
                  <th>时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 120).map((review) => (
                  <tr key={review.id}>
                    <td>
                      <strong>{review.projectName || review.fileName || "-"}</strong>
                      <small>{review.demoSlug || review.fileName || "-"}</small>
                    </td>
                    <td>{review.userEmail || "-"}</td>
                    <td><Badge tone={review.status === "passed" ? "success" : "warning"}>{review.statusLabel || review.status || "-"}</Badge></td>
                    <td>
                      {review.resolutionStatus === "pending" || review.status === "blocked" || review.status === "review_required" ? (
                        <span className="risk-tag medium">待处理</span>
                      ) : review.resolutionStatus === "resolved" ? (
                        <span className="risk-tag low">已处理</span>
                      ) : review.resolutionStatus === "confirmed_violation" ? (
                        <span className="risk-tag high">违规</span>
                      ) : (
                        <span>{review.resolutionStatusLabel || review.resolutionStatus || "-"}</span>
                      )}
                    </td>
                    <td>{review.summary || "-"}</td>
                    <td>{formatDate(review.createdAt)}</td>
                    <td><Button onClick={() => setSelectedReviewId(review.id || "")}>查看详情</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {selectedReview ? (
        <AdminDetailDrawer title="内容检查详情" subtitle={selectedReview.projectName || selectedReview.fileName || "-"} onClose={() => setSelectedReviewId("")}>
          <ContentReviewDetail review={selectedReview} onHandled={onHandled} show={show} />
        </AdminDetailDrawer>
      ) : null}
    </>
  );
}

export function ContentReviewDetail({
  review,
  onHandled,
  show
}: {
  review: ContentReview;
  onHandled: () => Promise<void>;
  show: (text: string, tone?: ToastTone) => void;
}) {
  const findings = review.findings || [];
  const [resolutionStatus, setResolutionStatus] = useState(review.resolutionStatus || "pending");
  const [adminNote, setAdminNote] = useState(review.adminNote || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!review.id) return;
    try {
      setSaving(true);
      await updateAdminContentReviewStatus(review.id, { resolutionStatus, adminNote });
      show("内容检查处理结果已保存。", "success");
      await onHandled();
    } catch (error) {
      show(error instanceof Error ? error.message : "保存失败，请稍后再试。", "danger");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="drawer-detail-stack">
      <div className="panel">
        <div>
          <h3>{review.projectName || review.fileName || "-"}</h3>
          <p>{review.userEmail || "-"} · {formatDate(review.createdAt)}</p>
        </div>
        <Badge tone={review.status === "passed" ? "success" : "warning"}>{review.statusLabel || review.status || "-"}</Badge>
      </div>
      <dl className="detail-list">
        <div>
          <dt>检查摘要</dt>
          <dd>{review.summary || "-"}</dd>
        </div>
        <div>
          <dt>项目文件</dt>
          <dd>{review.fileName || "-"}</dd>
        </div>
        <div>
          <dt>检查方式</dt>
          <dd>{review.provider || "-"} / {review.engine || "-"}</dd>
        </div>
        <div>
          <dt>检查文件数</dt>
          <dd>{review.reviewedFileCount || 0}</dd>
        </div>
        <div>
          <dt>处理状态</dt>
          <dd>{review.resolutionStatusLabel || review.resolutionStatus || "-"}</dd>
        </div>
        <div>
          <dt>处理记录</dt>
          <dd>{review.handledAt ? `${review.handledBy || "admin"} · ${formatDate(review.handledAt)}` : "暂无"}</dd>
        </div>
      </dl>
      <div className="review-resolution-panel">
        <h3>处理结果</h3>
        <label className="form-field">
          处理状态
          <select className="input" value={resolutionStatus} onChange={(event) => setResolutionStatus(event.target.value)}>
            <option value="pending">待处理</option>
            <option value="confirmed_violation">确认违规</option>
            <option value="false_positive">误判</option>
            <option value="resolved">已处理</option>
          </select>
        </label>
        <label className="form-field">
          处理备注
          <textarea className="input" value={adminNote} onChange={(event) => setAdminNote(event.target.value)} placeholder="记录判断依据或处理说明" rows={4} />
        </label>
        <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? "保存中..." : "保存处理结果"}</Button>
      </div>
      <div className="risk-panel">
        <h3>命中内容</h3>
        {!findings.length ? (
          <p className="muted">未发现明显风险。</p>
        ) : (
          <div className="content-finding-list">
            {findings.map((finding) => (
              <div className="content-finding-row" key={finding.id || `${finding.category}-${finding.sourceFile}`}>
                <Badge tone={finding.severity === "block" ? "warning" : "info"}>{finding.severityLabel || finding.severity || "提示"}</Badge>
                <div>
                  <strong>{finding.category || "风险提示"}</strong>
                  <p>{finding.snippet || finding.sourceFile || "-"}</p>
                  <small>{finding.suggestion || ""}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
