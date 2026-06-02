import { Badge } from "../Badge";
import { Button } from "../Button";
import { formatDate } from "../../utils/format";
import type { SubdomainRequest } from "../../types";

interface SubdomainRequestCardProps {
  request: SubdomainRequest;
  onChanged: (text: string) => Promise<void>;
  onError: (text: string) => void;
}

export function SubdomainRequestCard({ request, onChanged, onError }: SubdomainRequestCardProps) {
  return (
    <div className="subdomain-request-card" key={request.id}>
      <div>
        <strong>{request.subdomain}.demogo.dev</strong>
        <span>{request.userEmail} · {formatDate(request.createdAt)}</span>
      </div>
      <Badge tone={request.status === "approved" ? "success" : request.status === "rejected" ? "warning" : "info"}>
        {request.status === "approved" ? "已批准" : request.status === "rejected" ? "已拒绝" : "待处理"}
      </Badge>
      {request.status === "pending" ? (
        <div className="row-actions">
          <Button onClick={() => onChanged(request.id)}>批准</Button>
          <Button onClick={() => onError(request.id)}>拒绝</Button>
        </div>
      ) : null}
    </div>
  );
}
