// DemoGo v0.9.3 - Archive reading utilities (extracted from inspection-builder.js)
import fs from "node:fs/promises";

export function readZipEntryText(entry) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    entry.stream()
      .on("data", (chunk) => {
        total += chunk.length;
        if (total <= 256 * 1024) chunks.push(chunk);
      })
      .on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
      .on("error", reject);
  });
}

export async function readArchiveEntryText(item) {
  if (item?.archiveType === "tar.gz") {
    const bytes = await fs.readFile(item.tempPath);
    return bytes.subarray(0, 256 * 1024).toString("utf8");
  }
  return readZipEntryText(item?.entry || item);
}
