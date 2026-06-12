import type { Demo } from "../../types";

function statusLabel(status: string): string {
  const map: Record<string, string> = { published: "在线", expired: "已过期", offline: "已下线" };
  return map[status] || status;
}

interface DemoListProps {
  demos: Demo[];
  selectedDemoId: string;
  onSelect: (id: string) => void;
  onCopyLink: (url?: string) => void;
}

export function DemoList({ demos, selectedDemoId, onSelect, onCopyLink }: DemoListProps) {
  return (
    <div className="demo-list">
      {demos.map((demo) => {
        const name = demo.name || demo.slug || "D";
        return (
          <div
            className={`demo-row${selectedDemoId === demo.id ? " is-active" : ""}`}
            key={demo.id}
            onClick={() => onSelect(demo.id)}
          >
            <span className={`demo-dot ${demo.status === "published" ? "online" : "offline"}`} />
            <div className="demo-info">
              <strong className="demo-name">{name}</strong>
              <span className="demo-meta">
                <span className={`demo-status status-${demo.status}`} />
                {statusLabel(demo.status)}
                {" · "}
                {demo.usage?.visits || 0} 次访问
              </span>
            </div>
            <div className="demo-actions" onClick={(e) => e.stopPropagation()}>
              {demo.publicUrl && (
                <button className="demo-btn" type="button" onClick={() => onCopyLink(demo.publicUrl)}>复制链接</button>
              )}
              <button className="demo-btn" type="button" onClick={() => onSelect(demo.id)}>详情</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
