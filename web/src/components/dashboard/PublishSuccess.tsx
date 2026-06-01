import { Badge } from "../Badge";
import { Button, LinkButton } from "../Button";
import type { Demo } from "../../types";

interface PublishSuccessProps {
  demo: Demo;
  onCopyShare: (demo: Demo) => void;
  onCopyLink: (url?: string) => void;
}

export function PublishSuccess({ demo, onCopyShare, onCopyLink }: PublishSuccessProps) {
  return (
    <div className="publish-success">
      <div>
        <Badge tone="success">链接已生成</Badge>
        <h3>{demo.name || demo.slug}</h3>
        <p>{demo.publicUrl}</p>
      </div>
      <div className="row-actions">
        <Button onClick={() => onCopyLink(demo.publicUrl)}>复制链接</Button>
        <Button onClick={() => onCopyShare(demo)}>复制转发文案</Button>
        <LinkButton href={demo.publicUrl || "#"} target="_blank" rel="noreferrer" variant="primary">打开试用链接</LinkButton>
      </div>
    </div>
  );
}
