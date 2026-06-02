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
        <div><dt>试用链接</dt><dd>{demo.publicUrl || "-"}</dd></div>
        <div><dt>访问量</dt><dd>{demo.usage?.visits || 0} 次</dd></div>
        <div><dt>版本</dt><dd>V{demo.version || 1}</dd></div>
        <div><dt>发布来源</dt><dd>{demo.deploySourceLabel || "未知"}</dd></div>
        <div><dt>托管方式</dt><dd>{demo.hostingModeLabel || demo.hosting?.modeLabel || "未知"}</dd></div>
        <div><dt>项目类型</dt><dd>{projectTypeText}</dd></div>
        <div><dt>运行状态</dt><dd>{demo.runtime?.statusLabel || demo.hosting?.runtime?.statusLabel || "未知"}</dd></div>
        <div><dt>文件数量</dt><dd>{demo.fileCount || 0} 个文件 / {formatBytes(demo.extractedBytes)}</dd></div>
        <div><dt>更新时间</dt><dd>{formatDate(demo.updatedAt || demo.createdAt)}</dd></div>
        <div><dt>过期时间</dt><dd>{formatDate(demo.expiresAt)}</dd></div>
      </dl>
      {inspection?.failureDiagnosis ? <FailureDiagnosisPanel diagnosis={inspection.failureDiagnosis} /> : null}
      <div className="row-actions">
        {demo.publicUrl ? <LinkButton href={demo.publicUrl} target="_blank" rel="noreferrer">打开试用</LinkButton> : null}
        {onClose ? <Button onClick={onClose}>关闭</Button> : null}
      </div>
    </div>
  );
}
