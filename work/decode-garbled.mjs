import fs from "fs";
import path from "path";

const srcDir = "C:\\Users\\wei.gu\\Documents\\demogo\\server\\src";

// Decode double-encoded Chinese: utf8 bytes -> interpreted as latin1 -> re-encoded as utf8
// Reverse: utf8 decode -> latin1 encode -> utf8 decode
function decodeGarbled(str) {
  try {
    const buf = Buffer.from(str, "utf8");
    const latin1 = buf.toString("latin1");
    // Check if the result looks like valid UTF-8 Chinese
    if (/[\u4e00-\u9fff]/.test(latin1) && latin1.length < str.length) {
      return latin1;
    }
    return null;
  } catch {
    return null;
  }
}

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
const allMappings = new Map();

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  // Find strings containing garbled Chinese (sequences of 3+ CJK chars)
  const strRegex = /(['\x60"])([^'"\x60]*?[\u5000-\u9fff]{4,}[^'"\x60]*?)\1/g;
  let match;
  while ((match = strRegex.exec(content)) !== null) {
    const original = match[2];
    const decoded = decodeGarbled(original);
    if (decoded && decoded !== original) {
      // Verify it looks like proper Chinese
      if (/^[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\w\s\.\,\;\:\!\?\-\+\/\(\)\[\]\{\}\@\#\$\%\^\&\*\=\~\x60\<\>\|\\\d]+$/.test(decoded)) {
        allMappings.set(original, decoded);
      }
    }
  }
}

// Output all mappings
let out = "=== DECODED MAPPINGS ===\n";
for (const [garbled, correct] of allMappings) {
  out += "\nGARBLED: " + garbled + "\nCORRECT: " + correct + "\n---\n";
}
fs.writeFileSync("C:\\Users\\wei.gu\\Documents\\demogo\\work\\decode-mappings.txt", out, "utf8");
console.log("Found " + allMappings.size + " unique garbled strings");
