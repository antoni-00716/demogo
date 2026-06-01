import type { Demo } from "../../types";
import type { Inspection } from "../../api/demos";
import { Badge } from "../../components/Badge";
import { Button, LinkButton } from "../../components/Button";
import { formatBytes, formatDate } from "../../utils/format";
import { demoStatusLabel } from "../../config/statuses";
import { FailureDiagnosisPanel } from "../../components/dashboard/FailureDiagnosisPanel";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ProjectDetail(props: any) {
  const demo = (props.demo || null) as Demo | null;
  const inspection = (props.inspection || null) as Inspection | null;
  const onClose = props.onClose as (() => void) | undefined;

  if (!demo) return null;
  const assessment = demo.projectProfile?.assessment || null;
  const projectTypeText = assessment?.projectKindLabel || demo.projectProfile?.summary || demo.projectCategory || demo.detectedType || "-";

  return (
    <div className="drawer-detail-stack">
      <div className="request-main">
        <div>
          <h3>{demo.name || demo.slug}</h3>
          <p>{demo.publicUrl || demo.slug}</p>
        </div>
        <Badge tone={demo.status === "published" ? "success" : demo.status === "failed" ? "warning" : "neutral"}>
          {demoStatusLabel(demo.status)}
        </Badge>
      </div>
      <dl className="detail-list">
        <div><dt>????</dt><dd>{demo.publicUrl || "-"}</dd></div>
        <div><dt>???</dt><dd>{demo.usage?.visits || 0} ?</dd></div>
        <div><dt>??</dt><dd>V{demo.version || 1}</dd></div>
        <div><dt>????</dt><dd>{demo.deploySourceLabel || "????"}</dd></div>
        <div><dt>????</dt><dd>{demo.hostingModeLabel || demo.hosting?.modeLabel || "??????"}</dd></div>
        <div><dt>????</dt><dd>{projectTypeText}</dd></div>
        <div><dt>????</dt><dd>{demo.runtime?.statusLabel || demo.hosting?.runtime?.statusLabel || "??????"}</dd></div>
        <div><dt>????</dt><dd>{demo.fileCount || 0} ??? / {formatBytes(demo.extractedBytes)}</dd></div>
        <div><dt>????</dt><dd>{formatDate(demo.updatedAt || demo.createdAt)}</dd></div>
        <div><dt>???</dt><dd>{formatDate(demo.expiresAt)}</dd></div>
      </dl>
      {inspection?.failureDiagnosis ? <FailureDiagnosisPanel diagnosis={inspection.failureDiagnosis} /> : null}
      <div className="row-actions">
        {demo.publicUrl ? <LinkButton href={demo.publicUrl} target="_blank" rel="noreferrer">??????</LinkButton> : null}
        {onClose ? <Button onClick={onClose}>??</Button> : null}
      </div>
    </div>
  );
}
