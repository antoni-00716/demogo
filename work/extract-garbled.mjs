import fs from "fs";
import path from "path";

const srcDir = "C:\\Users\\wei.gu\\Documents\\demogo\\server\\src";

// Target files from earlier scan
const targetFiles = [
  "middleware/error-handler.js",
  "server.js",
  "email/mailer.js",
  "lib/build-utils.js",
  "queue/deployment-processor.js",
  "routes/demos.js",
  "services/application-readiness-service.js",
  "services/build-service.js",
  "services/content-review-service.js",
  "services/content-review-wrapper.js",
  "services/failure-diagnosis-service.js",
  "services/feedback-service.js",
  "services/hosting-architecture-service.js",
  "services/project-classifier-service.js",
  "services/runtime-service.js",
  "services/trial-analytics-service.js",
];

for (const relPath of targetFiles) {
  const filePath = path.join(srcDir, relPath);
  if (!fs.existsSync(filePath)) { console.log("MISSING: " + relPath); continue; }
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  console.log("\n=== " + relPath + " ===");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Find lines with garbled CJK characters (sequences of chars in known garbled range)
    if (/[\u6200-\u9FFF]{4,}/.test(line) && !/\/\/|import |export |require|function |const |let |var |if \(|for \(|while /.test(line)) {
      // Also check if it has a mix of ASCII and CJK that looks like garbled text
      const trimmed = line.trim();
      if (trimmed.includes("ä¸") || trimmed.includes("å") || trimmed.includes("ä»") || 
          trimmed.includes("è¶") || trimmed.includes("é¡") || trimmed.includes("ç•") ||
          trimmed.includes("è¯") || trimmed.includes("è¿") || trimmed.includes("é«")) {
        console.log("  L" + (i+1) + ": " + trimmed.substring(0, 150));
      }
    }
  }
}
