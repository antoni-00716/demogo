// DemoGo v0.9.6 - Environment variable utilities (extracted from server.js)

export function normalizeEnvKey(rawKey) {
  const key = String(rawKey || "").trim();
  if (!key || key.length > 128) return "";
  return key;
}

export function isPlatformEnvKey(key) {
  const k = String(key || "").toUpperCase();
  return [
    "PATH", "HOME", "USER", "SHELL", "PWD", "LANG", "TZ",
    "NODE_ENV", "PORT", "HOST", "HOSTNAME",
    "DEMOGO_", "NPM_", "npm_"
  ].some((prefix) => k === prefix || k.startsWith(prefix));
}

export function maskSecretValue(value) {
  const s = String(value || "");
  if (s.length <= 6) return "***";
  return s.slice(0, 2) + "***" + s.slice(-2);
}