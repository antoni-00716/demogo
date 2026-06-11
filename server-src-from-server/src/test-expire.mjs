import { readJson, writeJson } from './lib/data-access.js';
import { writeAuditLog } from './lib/audit-log.js';
import path from 'node:path';
import fs from 'node:fs/promises';

// From config.js
const dataDir = process.env.DEMOGO_DATA_DIR || '/tmp/test-demogo-data';
const demoRoot = process.env.DEMOGO_DEMO_ROOT || '/tmp/test-demogo-demos';

await fs.mkdir(dataDir, { recursive: true });
const demosFile = path.join(dataDir, "demos.json");

async function expireDemoFiles(demo) {
  console.log('expireDemoFiles called for', demo.slug);
}

async function writeAuditLog(entry) {
  console.log('audit:', entry.action);
}

async function expireDemos() {
  const demos = await readJson(demosFile, []);
  let changed = false;
  for (const demo of demos) {
    if ((demo.status === "published" || demo.status === "offline") && isExpired(demo)) {
      await expireDemoFiles(demo);
      demo.status = "expired";
      demo.expiredAt = new Date().toISOString();
      changed = true;
      await writeAuditLog({ action: "expire_demo", actorType: "system", targetType: "demo", targetId: demo.id, metadata: { slug: demo.slug } });
    }
  }
  if (changed) {
    await writeJson(demosFile, demos);
  }
}

function isExpired(demo) {
  return demo.expiresAt && new Date(demo.expiresAt) <= new Date();
}

console.log('Calling expireDemos...');
await expireDemos();
console.log('Done!');
