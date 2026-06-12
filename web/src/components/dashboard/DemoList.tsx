import type { Demo } from "../../types";

const avatarColors = [
  "linear-gradient(135deg, #10b981, #059669)",
  "linear-gradient(135deg, #8b5cf6, #6d28d9)",
  "linear-gradient(135deg, #f59e0b, #d97706)",
  "linear-gradient(135deg, #22c55e, #16a34a)",
  "linear-gradient(135deg, #ef4444, #dc2626)",
  "linear-gradient(135deg, #3b82f6, #2563eb)",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

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
    <div className="projects-list-panel">
      {demos.map((demo) => {
        const name = demo.name || demo.slug || "D";
        const color = getAvatarColor(name);
        return (
          <div
            className={`project-item-card${selectedDemoId === demo.id ? " is-active" : ""}`}
            key={demo.id}
            onClick={() => onSelect(demo.id)}
          >
            <div className="project-item-avatar" style={{ background: color }}>
              {name.slice(0, 1).toUpperCase()}
            </div>
            <div className="project-item-body">
              <strong>{name}</strong>
              <span className="project-item-meta">
                <span className={`project-status-dot status-${demo.status}`} />
                {statusLabel(demo.status)}
                {" · "}
                {demo.usage?.visits || 0} 次访问
              </span>
            </div>
            <div className="project-item-actions" onClick={(e) => e.stopPropagation()}>
              {demo.publicUrl && (
                <button className="project-item-btn" type="button" onClick={() => onCopyLink(demo.publicUrl)}>复制链接</button>
              )}
              <button className="project-item-btn" type="button" onClick={() => onSelect(demo.id)}>详情</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
