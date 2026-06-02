import { useState } from "react";
import type { FormSubmission, HostedForm } from "../../types";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { formatDate } from "../../utils/format";
import { AdminDetailDrawer } from "./AdminDetailDrawer";

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
        {!forms.length ? (
          <EmptyState title="暂无报名/留言" description="用户生成带表单的试用链接并自动开启收集后，会显示在这里。" />
        ) : (
          <div className="form-admin-stack">
            <div className="form-admin-grid">
              {forms.map((form) => (
                <div className="form-admin-card" key={form.id}>
                  <div className="request-main">
                    <div>
                      <h3>{form.name}</h3>
                      <p>{form.userEmail || "-"} · {form.demoName || form.demoSlug || "-"}</p>
                    </div>
                    <Badge tone={form.status === "active" ? "success" : "neutral"}>{form.status === "active" ? "收集中" : "已关闭"}</Badge>
                  </div>
                  <dl className="detail-list">
                    <div>
                      <dt>字段</dt>
                      <dd>{form.fields?.map((field) => field.label || field.name).join("、") || "-"}</dd>
                    </div>
                    <div>
                      <dt>提交</dt>
                      <dd>{form.submissionCount || 0} 条</dd>
                    </div>
                  </dl>
                  <Button onClick={() => setSelectedFormId(form.id)}>查看详情</Button>
                </div>
              ))}
            </div>
            <div className="submission-list">
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
      <div className="request-main">
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
