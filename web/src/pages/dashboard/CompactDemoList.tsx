import type { Demo } from "../../types";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { ExpiryBadge } from "../../components/dashboard/ExpiryBadge";
import { demoStatusLabel } from "../../config/statuses";

export function CompactDemoList({
  demos,
  onCopyLink,
  onCopyShare
}: {
  demos: Demo[];
  onCopyLink: (url?: string) => void;
  onCopyShare: (demo: Demo) => void;
}) {
  if (!demos.length) {
    return (
      <div className="first-run-guide compact">
        <EmptyState title="还没有试用链接" description="可以上传项目包，也可以让 AI 工具直接发布。" />
        <div className="first-run-actions">
          <span>推荐先试一个最简单的 HTML 页面或已经打包好的 zip。</span>
        </div>
      </div>
    );
  }
  return (
    <div className="compact-list">
      {demos.map((demo) => (
        <div className="compact-list-row" key={demo.id}>
          <div>
            <strong>{demo.name || demo.slug}</strong>
            <small>{demo.publicUrl || "链接当前不可访问"}</small>
          </div>
          <Badge tone={demo.status === "published" ? "success" : "neutral"}>{demoStatusLabel(demo.status)} {demo.expiresAt ? <ExpiryBadge expiresAt={demo.expiresAt} /> : null}</Badge>
          <div className="row-actions compact">
            <Button onClick={() => onCopyLink(demo.publicUrl)}>链接</Button>
            <Button onClick={() => onCopyShare(demo)}>文案</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
