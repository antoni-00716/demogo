// DemoGo v0.9.6 ? MCP core (thin wrapper around shared module)
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Re-export everything from shared
export {
  MAX_FILES,
  MAX_BYTES,
  unsafeProjectDirectoryNames,
  configureShared,
  assertDirectory,
  assertSafeProjectDirectory,
  collectFiles,
  projectTooLargeMessage,
  summarizeProject,
  createProjectArchive,
  deployArchive,
  checkApiHealth,
  checkAgentToken,
  updateArchive,
  normalizeApiBase,
  safeArchiveName,
  formatBytes,
} from "@demogo-cn/shared";

// Import configureShared to configure it
import { configureShared } from "@demogo-cn/shared";

// Read local version
function readVersion() {
  const candidates = [
    path.resolve(__dirname, "..", "package.json"),
    path.resolve(__dirname, "..", "..", "package.json"),
  ];
  for (const candidate of candidates) {
    try {
      const pkg = JSON.parse(readFileSync(candidate, "utf8"));
      if (pkg.version) return pkg.version;
    } catch { /* continue */ }
  }
  return "0.0.0";
}

export const VERSION = readVersion();

// Configure shared module for MCP identity
configureShared({ userAgentPrefix: "demogo-mcp", version: VERSION });
