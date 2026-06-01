import type { Demo, User, FormSubmission, HostedForm, SubdomainRequest, DeploymentStep } from "../../types";
import type { Inspection } from "../../api/demos";
import type { FormQuota } from "../../api/forms";
import { DemoList } from "../../components/dashboard/DemoList";
import { ProjectDetailDrawer } from "./ProjectDetailDrawer";

export function ProjectsView({
  demos,
  selectedDemoId,
  selectedDemo,
  selectedInspection,
  selectedSteps,
  selectedForm,
  selectedSubmissions,
  formQuota,
  detailOpen,
  onSelect,
  onCloseDetail,
  onCopyShare,
  onCopyLink,
  onUpdate,
  onAction,
  onRestartRuntime,
  onSaveRuntimeEnv,
  onResetDatabase,
  onCreate,
  onCreateForm,
  onCopyText,
  user,
  onUpdateSlug,
  onCreateSubdomainRequest,
  subdomainRequests
}: {
  demos: Demo[];
  selectedDemoId: string;
  selectedDemo: Demo | null;
  selectedInspection: Inspection | null;
  selectedSteps: DeploymentStep[];
  selectedForm: HostedForm | null;
  selectedSubmissions: FormSubmission[];
  formQuota: FormQuota | null;
  detailOpen: boolean;
  onSelect: (id: string) => void;
  onCloseDetail: () => void;
  onCopyShare: (demo: Demo) => void;
  onCopyLink: (url?: string) => void;
  onUpdate: (demo: Demo) => void;
  onAction: (action: "offline" | "restore" | "delete", demo: Demo) => void;
  onRestartRuntime: (demo: Demo) => void;
  onSaveRuntimeEnv: (demo: Demo, env: Record<string, string>) => void;
  onResetDatabase: (demo: Demo) => void;
  onCreate: () => void;
  onCreateForm: (demo: Demo, fields?: HostedForm["fields"]) => void;
  onCopyText: (text: string, successMessage?: string) => void;
  user: User;
  onUpdateSlug: (demo: Demo, slug: string) => void;
  onCreateSubdomainRequest: (demo: Demo, subdomain: string) => void;
  subdomainRequests: SubdomainRequest[];
}) {
  return (
    <section className="projects-workflow">
      <DemoList
        demos={demos}
        selectedDemoId={selectedDemoId}
        onSelect={onSelect}
        onCopyLink={onCopyLink}
        onUpdate={onUpdate}
        onCreate={onCreate}
      />
      {detailOpen ? (
        <ProjectDetailDrawer
          demo={selectedDemo}
          inspection={selectedInspection}
          steps={selectedSteps}
          form={selectedForm}
          submissions={selectedSubmissions}
          formQuota={formQuota}
          onClose={onCloseDetail}
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
      ) : null}
    </section>
  );
}
