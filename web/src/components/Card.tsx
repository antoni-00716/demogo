import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  id
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return <section className={`card ${className}`.trim()} id={id}>{children}</section>;
}
