// DemoGo v0.9.3 - 安全规则常量（从 server.js 提取）

export const blockedExactNames = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  ".env.test",
  "id_rsa",
  "id_dsa"
]);

export const ignoredPathParts = new Set([
  ".git",
  ".hg",
  ".svn",
  ".cache",
  ".microcompact",
  ".parcel-cache",
  ".turbo",
  ".next",
  ".nuxt",
  ".vite",
  ".vscode",
  "coverage",
  "node_modules"
]);

export const ignoredExactNames = new Set([
  ".DS_Store",
  "Thumbs.db",
  "npm-debug.log",
  "yarn-error.log",
  "pnpm-debug.log"
]);

export const ignoredExtensions = new Set([
  ".log",
  ".tmp"
]);

export const archiveIgnoredPathParts = new Set([
  "node_modules"
]);

export const blockedExtensions = new Set([
  ".key",
  ".pem",
  ".p12",
  ".pfx",
  ".exe",
  ".dll",
  ".sh",
  ".bat",
  ".cmd",
  ".ps1",
  ".py",
  ".jar",
  ".rb",
  ".php",
  ".vbs",
  ".jsp",
  ".war"
]);
