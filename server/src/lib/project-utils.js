// DemoGo v0.9.3 - Project naming/text utility functions

export function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
}

export function cleanProjectName(value) {
  return decodeHtmlEntities(String(value || ""))
    .replace(/\s+/g, " ")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .trim();
}

export function isGenericProjectName(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u4e00-\u9fa5-]+/g, "");
  return [
    "demogo",
    "demo",
    "project",
    "test",
    "app",
    "site",
    "website",
    "dist",
    "build",
    "out",
    "public",
    "my-app",
    "react-app",
    "vite-project"
  ].includes(normalized);
}

export function slugify(input) {
  return String(input)
    .toLowerCase()
    .replace(/\.zip$/i, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function stripHtml(value) {
  return decodeHtmlEntities(String(value || "").replace(/<[^>]+>/g, " "));
}
