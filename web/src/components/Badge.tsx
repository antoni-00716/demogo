import type { ReactNode } from "react";

type Tone = "success" | "warning" | "neutral" | "danger" | "info";

export function Badge({
  children,
  tone = "neutral"
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
