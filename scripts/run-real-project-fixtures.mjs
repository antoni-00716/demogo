import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { gzipSync } from "node:zlib";

const root = process.cwd();
const fixturesRoot = path.join(root, ".tmp", "real-project-fixtures");

await fs.rm(fixturesRoot, { recursive: true, force: true });
await fs.mkdir(fixturesRoot, { recursive: true });

const cases = [
  {
    name: "static-index",
    expected: "support",
    files: {
      "index.html": html("静态首页", "<h1>静态首页</h1>")
    }
  },
  {
    name: "single-landing-html",
    expected: "support",
    files: {
      "landing-page.html": html("活动落地页", "<h1>活动落地页</h1>")
    }
  },
  {
    name: "dist-output",
    expected: "support",
    files: {
      "dist/index.html": html("Dist 页面", "<h1>Dist 页面</h1>")
    }
  },
  {
    name: "build-output",
    expected: "support",
    files: {
      "build/index.html": html("Build 页面", "<h1>Build 页面</h1>")
    }
  },
  {
    name: "signup-form",
    expected: "support-auto-form",
    files: {
      "index.html": html("报名页", '<h1>报名页</h1><form><input name="name"><input name="phone"><textarea name="message"></textarea><button>提交</button></form>')
    }
  },
  {
    name: "price-calculator",
    expected: "support-no-auto-form",
    files: {
      "index.html": html("价格计算器", '<h1>价格计算器</h1><form><input name="priceGPTInput"><input name="feeToggle" type="checkbox"><button>计算</button></form>')
    }
  },
  {
    name: "react-vite-source",
    expected: "support-build",
    files: {
      "package.json": JSON.stringify({ scripts: { build: "node build.js" }, dependencies: { vite: "latest", react: "latest" } }, null, 2),
      "src/main.jsx": "console.log('react vite fixture');",
      "build.js": "import fs from 'node:fs/promises'; await fs.mkdir('dist',{recursive:true}); await fs.writeFile('dist/index.html','<!doctype html><html><body><h1>React Vite Fixture</h1></body></html>');"
    }
  },
  {
    name: "vue-vite-source",
    expected: "support-build",
    files: {
      "package.json": JSON.stringify({ scripts: { build: "node build.js" }, dependencies: { vite: "latest", vue: "latest" } }, null, 2),
      "src/main.vue": "<template><div>Vue fixture</div></template>",
      "vite.config.js": "export default {};",
      "build.js": "import fs from 'node:fs/promises'; await fs.mkdir('dist',{recursive:true}); await fs.writeFile('dist/index.html','<!doctype html><html><body><h1>Vue Vite Fixture</h1></body></html>');"
    }
  },
  {
    name: "source-no-build",
    expected: "unsupported",
    files: {
      "package.json": JSON.stringify({ scripts: { dev: "vite" }, dependencies: { vite: "latest" } }, null, 2),
      "src/main.jsx": "console.log('missing build');"
    }
  },
  {
    name: "backend-node",
    expected: "unsupported",
    files: {
      "package.json": JSON.stringify({ scripts: { start: "node server.js" } }, null, 2),
      "server.js": "console.log('server');"
    }
  },
  {
    name: "ssr-next",
    expected: "unsupported",
    files: {
      "package.json": JSON.stringify({ scripts: { build: "next build" }, dependencies: { next: "latest" } }, null, 2),
      "next.config.js": "export default {};",
      "pages/index.jsx": "export default function Page(){return 'SSR';}"
    }
  },
  {
    name: "blocked-env",
    expected: "blocked",
    files: {
      "index.html": html("含敏感文件", "<h1>含敏感文件</h1>"),
      ".env": "SECRET=1"
    }
  },
  {
    name: "risky-content",
    expected: "blocked-content",
    files: {
      "index.html": html("高额回报", "<h1>稳赚不赔</h1><p>导师带单，先垫付后返利。</p>")
    }
  }
];

const rows = [];
for (const item of cases) {
  const dir = path.join(fixturesRoot, item.name);
  await writeFiles(dir, item.files);
  const archive = path.join(fixturesRoot, `${item.name}.tar.gz`);
  await createTarGz(dir, archive);
  rows.push({
    name: item.name,
    expected: item.expected,
    files: Object.keys(item.files).length,
    archive: path.relative(root, archive)
  });
}

const report = [
  "# DemoGo Real Project Fixtures",
  "",
  "| Case | Expected | Files | Archive |",
  "| --- | --- | ---: | --- |",
  ...rows.map((row) => `| ${row.name} | ${row.expected} | ${row.files} | ${row.archive.replace(/\\/g, "/")} |`),
  "",
  "Use these fixtures for manual or automated publish checks. Backend smoke tests cover the end-to-end API path."
].join("\n");

await fs.writeFile(path.join(fixturesRoot, "README.md"), report, "utf8");
console.log(report);

function html(title, body) {
  return `<!doctype html><html><head><title>${title}</title></head><body>${body}</body></html>`;
}

async function writeFiles(dir, files) {
  await fs.mkdir(dir, { recursive: true });
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(dir, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, "utf8");
  }
}

async function createTarGz(sourceDir, archivePath) {
  if (process.platform === "win32") {
    const tar = spawn("tar", ["-czf", archivePath, "-C", sourceDir, "."]);
    await waitProcess(tar);
    return;
  }

  const tar = spawn("tar", ["-czf", archivePath, "-C", sourceDir, "."]);
  await waitProcess(tar);
}

function waitProcess(proc) {
  return new Promise((resolve, reject) => {
    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`process exited with code ${code}`));
    });
    proc.on("error", reject);
  });
}
