import type { Demo } from "../../types";
import { Badge } from "../Badge";
import { Button } from "../Button";
import { Card } from "../Card";
import { EmptyState } from "../EmptyState";
import { demoStatusLabel } from "../../config/statuses";
import { formatDate } from "../../utils/format";
import { ExpiryBadge } from "./ExpiryBadge";

interface DemoListProps {
  demos: Demo[];
  selectedDemoId: string;
  onSelect: (id: string) => void;
  onCopyLink: (url?: string) => void;
  onUpdate: (demo: Demo) => void;
  onCreate: () => void;
}

export function DemoList({
  demos,
  selectedDemoId,
  onSelect,
  onCopyLink,
  onUpdate,
  onCreate
}: DemoListProps) {
  return (
    <Card className="panel project-list-panel" id="demos">
      <div className="panel-head">
        <div>
          <h2>我的作品</h2>
          <p>每个项目都有一个试用链接。查看详情后可以复制、更新、下线、恢复、删除，也能看报名/留言和生成记录。</p>
        </div>
        <Button onClick={onCreate}>生成新链接</Button>
      </div>
      {!demos.length ? (
        <div className="project-empty-grid">
          <div className="first-run-guide">
            <EmptyState title="还没有试用项目" description="先生成一个链接，再发给用户、同事或朋友试用。" />
            <ol>
              <li>如果你手里有项目包，点击“生成新链接”上传。</li>
              <li>如果项目还在 Codex、Cursor、Claude Code 里，让 AI 直接执行 DemoGo 发布命令。</li>
              <li>如果失败，DemoGo 会告诉你原因和下一步怎么改。</li>
            </ol>
          </div>
          <button className="new-project-card" type="button" onClick={onCreate}>
            <span>+</span>
            <strong>生成新链接</strong>
            <small>上传压缩包，生成试用链接</small>
          </button>
        </div>
      ) : (
        <div className="project-list-stack">
          {demos.map((demo) => (
            <article className={`project-row ${selectedDemoId === demo.id ? "is-selected" : ""}`} key={demo.id}>
              <div className="project-main">
                <span className="project-avatar">{(demo.name || demo.slug || "D").slice(0, 1).toUpperCase()}</span>
                <span>
                  <strong>{demo.name || demo.slug}</strong>
                  <small>{demo.status === "published" ? demo.publicUrl : "链接当前不可访问"} · V{demo.version || 1}</small>
                </span>
              </div>
              <div className="project-row-meta">
                <div>
                  <span>状态</span>
                  <Badge tone={demo.status === "published" ? "success" : demo.status === "expired" ? "warning" : "neutral"}>{demoStatusLabel(demo.status)} {demo.expiresAt ? <ExpiryBadge expiresAt={demo.expiresAt} /> : null}</Badge>
                </div>
                <div>
                  <span>访问</span>
                  <strong>{demo.usage?.visits || 0} 次</strong>
                </div>
                <div>
                  <span>最近更新</span>
                  <strong>{formatDate(demo.updatedAt || demo.createdAt)}</strong>
                </div>
              </div>
              <div className="row-actions compact">
                {demo.status === "published" ? (
                  <>
                    <Button onClick={() => onCopyLink(demo.publicUrl)}>链接</Button>
                    <Button onClick={() => onUpdate(demo)}>更新</Button>
                    <Button onClick={() => onSelect(demo.id)}>查看详情</Button>
                  </>
                ) : (
                  <Button onClick={() => onSelect(demo.id)}>查看详情</Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}
