export function Toast({
  message,
  tone = "info"
}: {
  message: string;
  tone?: "info" | "success" | "warning" | "danger";
}) {
  if (!message) return null;
  return <div className={`toast toast-${tone}`}>{message}</div>;
}
