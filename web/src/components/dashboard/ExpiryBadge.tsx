import { Badge } from "../Badge";
import { getDemoExpiryStatus } from "./ExpiryUtils";

export function ExpiryBadge({ expiresAt }: { expiresAt?: string }) {
  const status = getDemoExpiryStatus(expiresAt);
  if (!status.label) return null;
  return <Badge tone={status.isExpiring ? "warning" : "info"}>{status.label}</Badge>;
}
