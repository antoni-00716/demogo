// DemoGo v0.9.19 - Version sync
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const version = fs.readFileSync(path.join(root, "VERSION"), "utf8").trim();

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("Invalid VERSION: " + version);
  process.exit(1);
}

let updated = 0;
for (const pkg of ["server", "cli", "mcp", "web"]) {
  const pkgPath = path.join(root, pkg, "package.json");
  const data = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  if (data.version !== version) {
    data.version = version;
    fs.writeFileSync(pkgPath, JSON.stringify(data, null, 2) + "\n", "utf8");
    console.log("OK " + pkg + " -> " + version);
    updated++;
  }
}
console.log(updated > 0 ? "Synced " + updated + " package(s)" : "All at v" + version);