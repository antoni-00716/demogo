import type { Demo } from "../../types";
import type { Inspection } from "../../api/demos";
import type { HostedForm } from "../../types";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { formatDate } from "../../utils/format";

export function FormHostingPanel({
  inspection,
  forms,
  onCreateForm,
  onCopyText
}: {
  demo: Demo;
  inspection?: Inspection | null;
  forms: HostedForm[];
  onCreateForm: () => void;
  onCopyText: (text: string, successMessage?: string) => void;
}) {
  const detectedFields = (inspection?.formFields || []).map((field: { name?: string; label?: string; type?: string }) => ({
    name: field.name || field.label || "",
    label: field.label || field.name || "",
    type: field.type || "text"
  }));
  const activeForms = forms.filter((form) => form.status === "active");
  const hasActiveForms = activeForms.length > 0;

  if (!detectedFields.length && !hasActiveForms) return null;

  return (
    <Card className="panel">
      <div className="panel-head">
        <div>
          <h2>????/??</h2>
          <p>DemoGo ??????????????????????????</p>
        </div>
        <Badge tone={hasActiveForms ? "success" : "info"}>{hasActiveForms ? "???" : "???"}</Badge>
      </div>
      {detectedFields.length ? (
        <div className="form-field-chips">
          {detectedFields.map((field) => (
            <span key={field.name}>{field.label || field.name}</span>
          ))}
        </div>
      ) : null}
      {activeForms.map((form) => (
        <div key={form.id} className="hosted-form-card">
          <div className="section-mini-head">
            <div>
              <h3>{form.name}</h3>
              <p>??? {form.submissionCount || 0} ??? ? ??? {formatDate(form.createdAt)}</p>
            </div>
            <Badge tone="success">??</Badge>
          </div>
          <div className="row-actions compact">
            <Button onClick={() => onCopyText(form.submitUrl || "", "???????")}>????</Button>
          </div>
        </div>
      ))}
      <div className="row-actions">
        <Button variant="primary" onClick={onCreateForm}>{hasActiveForms ? "??????" : "????"}</Button>
      </div>
    </Card>
  );
}
