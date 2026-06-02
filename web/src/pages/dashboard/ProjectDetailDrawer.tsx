import { useEffect, useState } from "react";
import type { Demo, User, FormSubmission, HostedForm, SubdomainRequest, DeploymentStep } from "../../types";
import type { Inspection } from "../../api/demos";
import { getDemoAnalytics } from "../../api/demos";
import type { FormQuota } from "../../api/forms";
import { Button } from "../../components/Button";
import { ProjectDetail } from "./ProjectDetail";
import { AnalyticsPanel, type DemoAnalytics } from "../../components/dashboard/AnalyticsPanel";


export function ProjectDetailDrawer({
  demo,
  inspection,
  steps,
  form,
  submissions,
  formQuota,
  onClose,
  onCopyShare,
  onCopyLink,
  onUpdate,
  onAction,
  onRestartRuntime,
  onSaveRuntimeEnv,
  onResetDatabase,
  onCreateForm,
  onCopyText,
  user,
  onUpdateSlug,
  onCreateSubdomainRequest,
  subdomainRequests
}: {
  demo: Demo | null;
  inspection: Inspection | null;
  steps: DeploymentStep[];
  form: HostedForm | null;
  submissions: FormSubmission[];
  formQuota: FormQuota | null;
  onClose: () => void;
  onCopyShare: (demo: Demo) => void;
  onCopyLink: (url?: string) => void;
  onUpdate: (demo: Demo) => void;
  onAction: (action: "offline" | "restore" | "delete", demo: Demo) => void;
  onRestartRuntime: (demo: Demo) => void;
  onSaveRuntimeEnv: (demo: Demo, env: Record<string, string>) => void;
  onResetDatabase: (demo: Demo) => void;
  onCreateForm: (demo: Demo, fields?: HostedForm["fields"]) => void;
  onCopyText: (text: string, successMessage?: string) => void;
  user: User;
  onUpdateSlug: (demo: Demo, slug: string) => void;
  onCreateSubdomainRequest: (demo: Demo, subdomain: string) => void;
  subdomainRequests: SubdomainRequest[];
}) {
  const [analytics, setAnalytics] = useState<DemoAnalytics | null>(null);

  useEffect(() => {
    if (demo?.id) {
      getDemoAnalytics(demo.id).then(setAnalytics).catch(() => setAnalytics(null));
    }
  }, [demo?.id]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [onClose]);

  return (
    <div className="detail-drawer-layer" role="dialog" aria-modal="true" aria-label="试用项目详情">
      <button className="detail-drawer-backdrop" type="button" aria-label="关闭试用项目详情" onClick={onClose} />
      <aside className="detail-drawer">
        <div className="detail-drawer-header">
          <div>
            <span>试用项目详情</span>
            <strong>{demo?.name || demo?.slug || "正在加载"}</strong>
          </div>
          <Button onClick={onClose}>关闭</Button>
        </div>
        <div className="detail-drawer-body">
          <ProjectDetail
            demo={demo}
            inspection={inspection}
            steps={steps}
            form={form}
            submissions={submissions}
            formQuota={formQuota}
            onCopyShare={onCopyShare}
            onCopyLink={onCopyLink}
            onUpdate={onUpdate}
            onAction={onAction}
            onRestartRuntime={onRestartRuntime}
            onSaveRuntimeEnv={onSaveRuntimeEnv}
            onResetDatabase={onResetDatabase}
            onCreateForm={onCreateForm}
            onCopyText={onCopyText}
            user={user}
            onUpdateSlug={onUpdateSlug}
            onCreateSubdomainRequest={onCreateSubdomainRequest}
            subdomainRequests={subdomainRequests}
          />
          {analytics ? <AnalyticsPanel analytics={analytics} /> : null}
        </div>
      </aside>
    </div>
  );
}
