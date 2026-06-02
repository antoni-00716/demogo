import { useEffect, useState } from "react";

type ToastTone = "info" | "success" | "warning" | "danger";

const toneIcons: Record<ToastTone, string> = {
  info: "ℹ️",
  success: "✅",
  warning: "⚠️",
  danger: "❌",
};

export function Toast({
  message,
  tone = "info",
  durationMs = 4500,
  onDone,
}: {
  message: string;
  tone?: ToastTone;
  durationMs?: number;
  onDone?: () => void;
}) {
  const [phase, setPhase] = useState<"enter" | "visible" | "exit">("enter");

  useEffect(() => {
    if (!message) return;
    const enterTimer = setTimeout(() => setPhase("visible"), 50);
    const exitTimer = setTimeout(() => setPhase("exit"), durationMs);
    const doneTimer = setTimeout(() => onDone?.(), durationMs + 350);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [message, durationMs, onDone]);

  if (!message) return null;

  return (
    <div className={`toast toast-${tone} toast-${phase}`} role="alert">
      <span className="toast-icon">{toneIcons[tone]}</span>
      <span className="toast-text">{message}</span>
    </div>
  );
}
