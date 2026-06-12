import { useEffect, type ReactNode } from "react";
import { Button } from "../../components/Button";

export function AdminDetailDrawer({
  title,
  subtitle,
  children,
  onClose
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [onClose]);

  return (
    <div className="detail-drawer" role="dialog" aria-modal="true" aria-label={title}>
      <button className="detail-drawer-backdrop" type="button" aria-label="关闭详情" onClick={onClose} />
      <aside className="detail-drawer">
        <div className="detail-drawer-header">
          <div>
            <span>{title}</span>
            <strong>{subtitle || "详情"}</strong>
          </div>
          <Button onClick={onClose}>关闭</Button>
        </div>
        <div className="detail-drawer-body">
          {children}
        </div>
      </aside>
    </div>
  );
}
