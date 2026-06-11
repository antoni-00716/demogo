// DemoGo v0.9.30 - CDN abstraction layer
// Supports "local" (Nginx proxy cache) and "cloud" (future) backends.

import { publicBaseUrl, demoRoot } from "../config.js";
import fs from "node:fs/promises";
import path from "node:path";
import logger from "./logger.js";

const CDN_BACKEND = process.env.DEMOGO_CDN_BACKEND || "local";

// ====== Cache header strategies ======

export function getCacheHeaders(contentType = "text/html", options = {}) {
  const { isDemo = false, version = 1 } = options;

  if (!isDemo) {
    return {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
    };
  }

  if (/\.(png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)$/i.test(contentType) ||
      /-[a-f0-9]{8,}\.(js|css)$/i.test(contentType)) {
    return {
      "Cache-Control": "public, max-age=31536000, immutable",
      "ETag": `"${version}"`,
    };
  }

  return {
    "Cache-Control": "public, max-age=300, must-revalidate",
    "ETag": `"${version}"`,
    "Last-Modified": new Date().toUTCString(),
  };
}

export function getVersionedUrl(slug, version) {
  if (!slug) return "";
  const base = publicBaseUrl.replace(/\/$/, "");
  return `${base}/d/${slug}/?v=${version}`;
}

// ====== Cache invalidation ======

export async function purgeCache(slug) {
  if (CDN_BACKEND === "cloud") {
    logger.info({ slug }, "Cloud CDN purge requested (not implemented)");
    return;
  }

  // Local: touch all files under the demo directory to update timestamps
  // This changes Last-Modified / ETag, triggering browser revalidation
  try {
    const demoDir = path.join(demoRoot, slug);
    const files = await walkDir(demoDir);
    const now = new Date();
    for (const file of files) {
      await fs.utimes(file, now, now);
    }
    logger.info({ slug, fileCount: files.length }, "Cache purged (timestamps updated)");
  } catch (err) {
    logger.warn({ slug, error: err.message }, "Failed to purge cache");
  }
}

export async function purgeAllCache() {
  if (CDN_BACKEND === "cloud") {
    logger.info("Cloud CDN purge-all requested (not implemented)");
    return;
  }

  try {
    const entries = await fs.readdir(demoRoot, { withFileTypes: true });
    let count = 0;
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await purgeCache(entry.name);
        count++;
      }
    }
    logger.info({ demoCount: count }, "All caches purged");
  } catch (err) {
    logger.warn({ error: err.message }, "Failed to purge all caches");
  }
}

export function getCdnInfo() {
  return {
    backend: CDN_BACKEND,
    cacheHost: "127.0.0.1:80",
  };
}

async function walkDir(dir) {
  const result = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        result.push(...(await walkDir(full)));
      } else {
        result.push(full);
      }
    }
  } catch { /* directory doesn't exist */ }
  return result;
}
