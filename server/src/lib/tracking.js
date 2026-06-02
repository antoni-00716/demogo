// DemoGo v0.9.6 - Demo tracking utilities (extracted from server.js)
import fs from "node:fs/promises";
import path from "node:path";
import { readJson, writeJson } from "./data-access.js";

export async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

/**
 * Inject the DemoGo tracking script into index.html.
 */
export async function injectTrackingScript(targetDir, demosFile) {
  const indexPath = path.join(targetDir, "index.html");
  if (!await exists(indexPath)) return;

  const script = [
    "<script>",
    "(function(){",
    "var p=location.pathname.match(/\\/d\\/([^\\/]+)/);",
    "if(!p)return;",
    "var b=0;",
    "try{b=performance.getEntriesByType('resource').reduce(function(s,r){return s+(r.transferSize||0);},0);}catch(e){}",
    "var s=document.createElement('script');",
    "s.src='/api/demo-track/'+encodeURIComponent(p[1])+'?bytes='+Math.max(0,Math.round(b));",
    "s.async=true;",
    "document.head.appendChild(s);",
    "})();",
    "</script>"
  ].join("");
  
  const html = await fs.readFile(indexPath, "utf8");
  if (html.includes("/api/demo-track/")) return;
  const updated = html.includes("</body>")
    ? html.replace("</body>", `${script}\n</body>`)
    : `${html}\n${script}`;
  await fs.writeFile(indexPath, updated, "utf8");
}

/**
 * Record a demo visit in the in-memory pending usage buffer.
 */
const pendingUsage = new Map();

export function recordDemoVisit(slug, estimatedBytes, ip) {
  const now = new Date().toISOString();
  const current = pendingUsage.get(slug) || {
    visits: 0,
    estimatedBytes: 0,
    uniqueIps: new Set(),
    lastVisitedAt: now
  };
  current.visits += 1;
  current.estimatedBytes += Math.max(0, Math.min(Number(estimatedBytes) || 0, 50 * 1024 * 1024));
  if (ip) current.uniqueIps.add(ip);
  current.lastVisitedAt = now;
  pendingUsage.set(slug, current);
}

/**
 * Flush pending usage stats to the demos JSON file.
 */
export async function flushUsageStats(demosFile) {
  if (!pendingUsage.size) return;
  const updates = Array.from(pendingUsage.entries());
  pendingUsage.clear();

  const demos = await readJson(demosFile, []);
  let changed = false;
  for (const [slug, usage] of updates) {
    const demo = demos.find((item) => item.slug === slug);
    if (!demo) continue;
    const current = demo.usage || {};
    demo.usage = {
      visits: Number(current.visits || 0) + usage.visits,
      estimatedBytes: Number(current.estimatedBytes || 0) + usage.estimatedBytes,
      uniqueVisitorsEstimate: Number(current.uniqueVisitorsEstimate || 0) + usage.uniqueIps.size,
      lastVisitedAt: usage.lastVisitedAt
    };
    changed = true;
  }
  if (changed) await writeJson(demosFile, demos);
}

/**
 * Format bytes into human-readable string.
 */
export function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value >= 1024 * 1024 * 1024) return `${(value / 1024 / 1024 / 1024).toFixed(1)}GB`;
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)}MB`;
  if (value >= 1024) return `${Math.round(value / 1024)}KB`;
  return `${value}B`;
}

/**
 * Strip BOM from string content.
 */
export function stripBom(content) {
  return String(content || "").replace(/^\uFEFF/, "");
}