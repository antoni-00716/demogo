export interface ExpiryStatus {
  isExpiring: boolean;
  hoursLeft: number;
  label: string;
}

export function getDemoExpiryStatus(expiresAt?: string): ExpiryStatus {
  if (!expiresAt) return { isExpiring: false, hoursLeft: 0, label: "" };
  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  const timeLeft = expiry - now;
  if (timeLeft <= 0) return { isExpiring: true, hoursLeft: 0, label: "已过期" };
  const hoursLeft = Math.round(timeLeft / (60 * 60 * 1000));
  const daysLeft = Math.floor(hoursLeft / 24);
  if (daysLeft <= 0) return { isExpiring: true, hoursLeft, label: hoursLeft + " 小时后到期" };
  if (daysLeft <= 1) return { isExpiring: true, hoursLeft, label: "1 天后到期" };
  if (daysLeft <= 3) return { isExpiring: false, hoursLeft, label: "剩余 " + daysLeft + " 天" };
  return { isExpiring: false, hoursLeft, label: "" };
}
