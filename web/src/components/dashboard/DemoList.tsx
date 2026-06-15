import type { Demo } from "../../types";

interface DemoListProps {
  demos: Demo[];
  selectedDemoId: string;
  onSelect: (id: string) => void;
  onCopyLink: (url?: string) => void;
}

export function DemoList({ demos, selectedDemoId, onSelect, onCopyLink }: DemoListProps) {
  return (
    <div className="project-grid">
      {demos.map((demo) => {
        const name = demo.name || demo.slug || "D";
        const isOnline = demo.status === "published";
        return (
          <div
            className={`project-card${selectedDemoId === demo.id ? "" : ""}`}
            key={demo.id}
            onClick={() => onSelect(demo.id)}
            style={{ cursor: "pointer" }}
          >
            <div className="project-card-top">
              <span className={`project-dot ${isOnline ? "online" : "offline"}`} />
              <span className="project-name">{name}</span>
            </div>
            <div className="project-stats">
              <span>👁️ {demo.usage?.visits || 0} 次访问</span>
              <span>📅 {demo.createdAt ? new Date(demo.createdAt).toLocaleDateString("zh-CN") : "-"}</span>
            </div>
            <div className="project-actions" onClick={(e) => e.stopPropagation()}>
              {demo.publicUrl && (
                <button className="project-btn" type="button" onClick={() => onCopyLink(demo.publicUrl)}>复制链接</button>
              )}
              <button className="project-btn" type="button" onClick={() => onSelect(demo.id)}>详情</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
