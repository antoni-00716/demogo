import type { Demo } from "../../types";
import { Badge } from "../../components/Badge";

export function HostingArchitecturePanel({
  hosting,
  architecture,
  runtime,
  compact = false
}: {
  hosting?: Demo["hosting"];
  architecture?: Demo["architecture"];
  runtime?: Demo["runtime"];
  compact?: boolean;
}) {
  if (!hosting) return null;
  const currentHosting = hosting || architecture?.hosting;
  const currentRuntime = runtime || currentHosting?.runtime;
  if (!currentHosting) return null;

  return (
    <div className="hosting-architecture">
      <div className="section-mini-head">
        <div>
          <h3>{currentHosting.modeLabel || "????"}</h3>
        </div>
        <Badge tone={currentHosting.mode === "static" ? "success" : "info"}>
          {currentHosting.modeLabel || currentHosting.mode || "??????"}
        </Badge>
      </div>
      {currentHosting.limitations?.length ? (
        <ul>{currentHosting.limitations.map((item: string) => <li key={item}>{item}</li>)}</ul>
      ) : null}
      {currentRuntime && !compact ? (
        <div className="hosting-route-grid">
          <span>?????{currentRuntime.statusLabel || "-"}</span>
          {currentRuntime.containerName ? <span>???{currentRuntime.containerName}</span> : null}
          {currentRuntime.driver ? <span>???{currentRuntime.driver}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
