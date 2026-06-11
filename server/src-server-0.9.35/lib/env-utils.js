// DemoGo v0.9.6 - Environment variable utilities (consolidated)

/**
 * Normalize an environment variable key: trim + uppercase + validate.
 */
export function normalizeEnvKey(value) {
  const key = String(value || "").trim().toUpperCase();
  return /^[A-Z_][A-Z0-9_]*$/.test(key) ? key : "";
}

/**
 * Check if a key belongs to the platform / runtime and should not be
 * exposed to user-configurable runtime env.
 */
export function isPlatformEnvKey(key) {
  const k = String(key || "").toUpperCase();
  return [
    "PATH", "HOME", "USER", "SHELL", "PWD", "LANG", "TZ",
    "NODE_ENV", "PORT", "HOST", "HOSTNAME",
    "DEMOGO_", "NPM_", "npm_",
  ].some((prefix) => k === prefix || k.startsWith(prefix));
}

/**
 * Mask a secret value for safe display: show first 3 and last 3 chars.
 */
export function maskSecretValue(value) {
  const text = String(value || "");
  if (!text) return "";
  if (text.length <= 6) return "***";
  return `${text.slice(0, 3)}***${text.slice(-3)}`;
}