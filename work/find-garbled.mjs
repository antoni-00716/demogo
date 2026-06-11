import fs from "fs";
import path from "path";

const srcDir = "C:\\Users\\wei.gu\\Documents\\demogo\\server\\src";
const garbledFile = "C:\\Users\\wei.gu\\Documents\\demogo\\work\\garbled-strings.txt";
const results = [];

function findFiles(dir) {
  const r = [];
  for (const item of fs.readdirSync(dir)) {
    const fp = path.join(dir, item);
    if (fs.statSync(fp).isDirectory()) {
      if (!["node_modules","data","uploads","tests"].includes(item)) r.push(...findFiles(fp));
    } else if (item.endsWith(".js")) {
      r.push(fp);
    }
  }
  return r;
}

const files = findFiles(srcDir);
for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");
  const fileResults = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Garbled strings often contain these specific byte sequences
    if (/[\u9350-\u9FFF]{3,}/.test(line)) {
      const m = line.match(/["'\x60][^"'\x60]*[\u9350-\u9FFF][^"'\x60]*["'\x60]/g);
      if (m) {
        for (const s of m) {
          const inner = s.slice(1, -1);
          if (/[\u9350-\u9FFF]/.test(inner) && inner.length > 2) {
            fileResults.push({ line: i+1, text: inner });
          }
        }
      }
    }
  }
  if (fileResults.length) {
    results.push({ file: file.replace(srcDir, "server/src"), items: fileResults });
  }
}

let out = "";
for (const r of results) {
  out += "\n=== " + r.file + " ===\n";
  for (const item of r.items) {
    out += "  L" + item.line + ": " + item.text + "\n";
  }
}
fs.writeFileSync(garbledFile, out, "utf8");
console.log("Done. " + results.length + " files found.");
