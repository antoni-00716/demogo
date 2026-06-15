import { useState } from "react";
import type { FormSubmission, HostedForm } from "../../types";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { formatDate } from "../../utils/format";
import { AdminDetailDrawer } from "./AdminDetailDrawer";

function formStatusLabel(status?: string): { label: string; tone: string } {
  if (status === "active") return { label: "收集中", tone: "success" };
  if (status === "closed") return { label: "已关闭", tone: "neutral" };
  return { label: "草稿", tone: "info" };
}

export function AdminForms({ forms, submissions }: { forms: HostedForm[]; submissions: FormSubmission[] }) {
  const [selectedFormId, setSelectedFormId] = useState("");
  const selectedForm = forms.find((form) => form.id === selectedFormId) || null;
  const selectedSubmissions = selectedForm
    ? submissions.filter((item) => item.formId === selectedForm.id)
    : [];
  return (
    <>
      <Card className="panel" id="forms">
        <div className="panel-head">
          <div>
            <h2>报名/留言</h2>
            <p>查看哪些试用项目正在收集报名、预约或留言，提交详情进入抽屉查看。</p>
          </div>
          <Badge tone={forms.length ? "info" : "neutral"}>{forms.length} 个表单</Badge>
        </div>

        {/* Search + New button row */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
          <div className="search-box" style={{ flex: 1, maxWidth: 320 }}>
            <span aria-hidden="true">🔍</span>
            <input placeholder="搜索表单..." />
          </div>
        </div>

        {!forms.length ? (
          <EmptyState title="暂无报名/留言" description="用户生成带表单的试用链接并自动开启收集后，会显示在这里。" />
        ) : (
          <div className="form-admin-stack">
            <div className="forms-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {forms.map((form) => {
                const st = formStatusLabel(form.status);
                return (
                  <div className="form-card" key={form.id} style={{
                    background: "var(--bg)", borderRadius: "var(--radius-md)", padding: 24,
                    boxShadow: "var(--shadow-sm)", border: "1px solid var(--border-light)",
                    transition: "all .35s cubic-bezier(.25,0,.15,1)",
                    cursor: "pointer"
                  }}
                    onClick={() => setSelectedFormId(form.id)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <strong style={{ fontSize: 15, flex: 1 }}>{form.name}</strong>
                      <Badge tone={st.tone as any}>{st.label}</Badge>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
                      {form.userEmail || "-"} · {form.demoName || form.demoSlug || "-"}
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 13, color: "var(--text-tertiary)", marginBottom: 16 }}>
                      <span>📝 {form.fields?.length || 0} 字段</span>
                      <span>📬 {form.submissionCount || 0} 提交</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button onClick={(e) => { e.stopPropagation(); setSelectedFormId(form.id); }}>查看详情</Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="submission-list" style={{ marginTop: 32 }}>
              <div className="section-mini-head">
                <h3>最近提交</h3>
                <span>{submissions.length} 条</span>
              </div>
              {!submissions.length ? (
                <p className="muted">暂时还没有收到提交。</p>
              ) : (
                submissions.slice(0, 12).map((item) => (
                  <div className="submission-row" key={item.id}>
                    <strong>{item.demoSlug || item.formId} · {formatDate(item.createdAt)}</strong>
                    <p>{Object.entries(item.payload || {}).map(([key, value]) => `${key}: ${value}`).join(" · ")}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Card>
      {selectedForm ? (
        <AdminDetailDrawer title="报名/留言详情" subtitle={selectedForm.name} onClose={() => setSelectedFormId("")}>
          <AdminFormDetail form={selectedForm} submissions={selectedSubmissions} />
        </AdminDetailDrawer>
      ) : null}
    </>
  );
}

export function AdminFormDetail({ form, submissions }: { form: HostedForm; submissions: FormSubmission[] }) {
  return (
    <div className="drawer-detail-stack">
      <div className="panel">
        <div>
          <h3>{form.name}</h3>
          <p>{form.userEmail || "-"} · {form.demoName || form.demoSlug || "-"}</p>
        </div>
        <Badge tone={form.status === "active" ? "success" : "neutral"}>{form.status === "active" ? "收集中" : "已关闭"}</Badge>
      </div>
      <dl className="detail-list">
        <div>
          <dt>收集入口</dt>
          <dd>{form.submitUrl || "-"}</dd>
        </div>
        <div>
          <dt>字段</dt>
          <dd>{form.fields?.map((field) => field.label || field.name).join("、") || "-"}</dd>
        </div>
        <div>
          <dt>提交数量</dt>
          <dd>{form.submissionCount || submissions.length} 条</dd>
        </div>
        <div>
          <dt>创建时间</dt>
          <dd>{formatDate(form.createdAt)}</dd>
        </div>
      </dl>
      <div className="submission-list">
        <div className="section-mini-head">
          <h3>提交记录</h3>
          <span>{submissions.length} 条</span>
        </div>
        {!submissions.length ? (
          <p className="muted">暂时还没有收到提交。</p>
        ) : (
          submissions.slice(0, 30).map((item) => (
            <div className="submission-row" key={item.id}>
              <strong>{formatDate(item.createdAt)}</strong>
              <p>{Object.entries(item.payload || {}).map(([key, value]) => `${key}: ${value}`).join(" · ")}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
