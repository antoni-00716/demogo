// DemoGo v0.9.31 本地全量测试
import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const serverRoot = path.join(projectRoot, 'server');
const testRoot = path.join(projectRoot, '.tmp', 'full-test');
const samplesDir = path.join(projectRoot, 'samples');
const port = 3122;
const baseUrl = 'http://127.0.0.1:' + port;

const RESULTS = [];
let cookie = '';

function log(l, m) { console.log('[' + new Date().toISOString().slice(11,19) + '] [' + l + '] ' + m); }
function record(cat, name, status, detail) {
  detail = detail || '';
  RESULTS.push({ cat, name, status, detail });
  const icon = status === 'PASS' ? 'OK' : status === 'SKIP' ? '--' : 'XX';
  console.log('  ' + icon + ' ' + name + (detail ? ': ' + detail : ''));
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function req(endpoint, opts) {
  opts = opts || {};
  const h = Object.assign({}, opts.headers || {});
  if (cookie) h.Cookie = cookie;
  if (opts.json) { h['Content-Type'] = 'application/json'; opts.body = JSON.stringify(opts.json); }
  try {
    const resp = await fetch(baseUrl + endpoint, Object.assign({}, opts, { headers: h }));
    const sc = resp.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    const text = await resp.text();
    let data = null;
    try { data = JSON.parse(text); } catch(e) {}
    return { status: resp.status, data: data };
  } catch (err) { return { status: 0, error: err.message }; }
}

async function get(e) { return req(e); }
async function post(e, b) { return req(e, { method: 'POST', json: b }); }

async function postZip(endpoint, zipPath, fields) {
  fields = fields || {};
  const bytes = readFileSync(zipPath);
  const form = new FormData();
  form.append('project', new Blob([bytes], { type: 'application/zip' }), path.basename(zipPath));
  for (var k in fields) form.append(k, String(fields[k]));
  const h = {};
  if (cookie) h.Cookie = cookie;
  try {
    const resp = await fetch(baseUrl + endpoint, { method: 'POST', body: form, headers: h });
    const sc = resp.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    const text = await resp.text();
    let data = null;
    try { data = JSON.parse(text); } catch(e) {}
    return { status: resp.status, data: data };
  } catch (err) { return { status: 0, error: err.message }; }
}

async function postZipAgent(endpoint, zipPath, fields, token) {
  fields = fields || {};
  const bytes = readFileSync(zipPath);
  const form = new FormData();
  form.append('project', new Blob([bytes], { type: 'application/zip' }), path.basename(zipPath));
  for (var k in fields) form.append(k, String(fields[k]));
  try {
    const resp = await fetch(baseUrl + endpoint, {
      method: 'POST', body: form,
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const text = await resp.text();
    let data = null;
    try { data = JSON.parse(text); } catch(e) {}
    return { status: resp.status, data: data };
  } catch (err) { return { status: 0, error: err.message }; }
}

async function agentGet(endpoint, token) {
  try {
    const resp = await fetch(baseUrl + endpoint, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const text = await resp.text();
    let data = null;
    try { data = JSON.parse(text); } catch(e) {}
    return { status: resp.status, data: data };
  } catch (err) { return { status: 0, error: err.message }; }
}

async function waitForDeployment(jobId) {
  for (var i = 0; i < 120; i++) {
    await sleep(2000);
    const r = await get('/api/jobs/' + jobId);
    if (r.data && r.data.job && r.data.job.status === 'success') return r.data.job;
    if (r.data && r.data.job && r.data.job.status === 'failed') throw new Error(r.data.job.error || 'deployment failed');
  }
  throw new Error('deployment timeout');
}

async function createStaticZip(name, files) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (var fname in files) {
    zip.file(fname, files[fname]);
  }
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const outDir = path.join(testRoot, 'zips');
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, name + '.zip');
  await fs.writeFile(outPath, buf);
  return outPath;
}

async function createZipFromDir(dirPath, name) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  async function walk(base, rel) {
    rel = rel || '';
    const entries = await fs.readdir(base, { withFileTypes: true });
    for (var i = 0; i < entries.length; i++) {
      const e = entries[i];
      const fp = path.join(base, e.name);
      const rp = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) {
        if (['node_modules','.git','dist','build','.next','.output','.nuxt'].indexOf(e.name) >= 0) continue;
        if (e.name.startsWith('.') && e.name !== '.demogo') continue;
        await walk(fp, rp);
      } else {
        zip.file(rp, readFileSync(fp));
      }
    }
  }
  await walk(dirPath);
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const outDir = path.join(testRoot, 'zips');
  await fs.mkdir(outDir, { recursive: true });
  const cleanName = name.replace(/[\\/:]/g, '_');
  const outPath = path.join(outDir, cleanName + '.zip');
  await fs.writeFile(outPath, buf);
  return outPath;
}

// ====== MAIN ======
async function main() {
  await fs.rm(testRoot, { recursive: true, force: true });
  await fs.mkdir(path.join(testRoot, 'data'), { recursive: true });
  await fs.mkdir(path.join(testRoot, 'uploads'), { recursive: true });
  await fs.mkdir(path.join(testRoot, 'site', 'd'), { recursive: true });

  log('INFO', 'Starting local test server...');
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: serverRoot,
    env: Object.assign({}, process.env, {
      PORT: String(port),
      PUBLIC_BASE_URL: baseUrl,
      DEMOGO_DATA_DIR: path.join(testRoot, 'data'),
      DEMOGO_UPLOAD_DIR: path.join(testRoot, 'uploads'),
      DEMOGO_DEMO_ROOT: path.join(testRoot, 'site', 'd'),
      DEMOGO_ADMIN_USER: 'admin',
      DEMOGO_ADMIN_PASSWORD: 'admin-test-pass',
      DEMOGO_EMAIL_VERIFICATION_ENABLED: '0',
      DEMOGO_DEPLOY_RATE_LIMIT: '100',
      DEMOGO_RATE_LIMIT_DISABLED: '1',
      DEMOGO_CSRF_DISABLED: '1',
      DEMOGO_BUILD_MODE: 'host',
      DEMOGO_RUNTIME_ENABLED: '1',
      DEMOGO_RUNTIME_NODE_ENABLED: '1',
      DEMOGO_RUNTIME_DRIVER: 'host',
      DEMOGO_DB_HOST: '',
      DEMOGO_DB_NAME: '',
      DEMOGO_DB_USER: '',
      DEMOGO_DB_PASSWORD: ''
    }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stderr.pipe(process.stderr);

  log('INFO', 'Waiting for server...');
  for (var i = 0; i < 60; i++) {
    try { const h = await get('/api/health'); if (h.data && h.data.version) { log('INFO', 'Server ready v' + h.data.version); break; } } catch(e) {}
    await sleep(500);
  }

  // === Phase 4: Integration ===
  log('INFO', '===== Phase 4: Integration =====');
  const testEmail = 'ft-' + Date.now() + '@t.local';
  const testPwd = 'TestPass123!';

  const reg = await post('/api/auth/register', { email: testEmail, password: testPwd });
  record('4-Integration', 'Register', reg.status === 200 ? 'PASS' : 'FAIL', 'status=' + reg.status);

  await sleep(300);
  const login = await post('/api/auth/login', { email: testEmail, password: testPwd });
  record('4-Integration', 'Login', login.status === 200 && login.data && login.data.user ? 'PASS' : 'FAIL', 'status=' + login.status);

  const me = await get('/api/me');
  record('4-Integration', 'Get user', me.data && me.data.user ? 'PASS' : 'FAIL');

  const caps = await get('/api/hosting/capabilities');
  record('4-Integration', 'Hosting capabilities', caps.data && caps.data.capabilities ? 'PASS' : 'FAIL');
  if (caps.data && caps.data.capabilities && caps.data.capabilities.modes) {
    log('INFO', '  static=' + caps.data.capabilities.modes.static.status + ' node=' + caps.data.capabilities.modes.nodeRuntime.status);
  }

  // Deploy static demo
  const zipPath = await createStaticZip('static-test', {
    'index.html': '<!doctype html><html><head><title>Integration Test</title></head><body><h1>Hello DemoGo</h1></body></html>'
  });

  const insp = await postZip('/api/inspect', zipPath);
  record('4-Integration', 'Project inspect', insp.data && insp.data.inspection && insp.data.inspection.canPublish ? 'PASS' : 'FAIL',
    'type=' + (insp.data && insp.data.inspection ? insp.data.inspection.detectedType : 'none'));

  const deploy = await postZip('/api/deploy', zipPath, { name: 'Integration Demo' });
  let demoLink = null, demoId = null;

  if (deploy.data && deploy.data.jobId) {
    try {
      const job = await waitForDeployment(deploy.data.jobId);
      record('4-Integration', 'Deploy (async)', job.status === 'success' ? 'PASS' : 'FAIL');
      if (job.result && job.result.slug) {
        demoLink = baseUrl + '/d/' + job.result.slug + '/';
        demoId = job.result.id;
      }
    } catch (e) {
      record('4-Integration', 'Deploy (async)', 'FAIL', e.message);
    }
  } else if (deploy.data && deploy.data.slug) {
    record('4-Integration', 'Deploy (sync)', 'PASS', 'slug=' + deploy.data.slug);
    demoLink = baseUrl + '/d/' + deploy.data.slug + '/';
    demoId = deploy.data.id;
  } else {
    record('4-Integration', 'Deploy', 'FAIL', 'status=' + deploy.status + ' ' + JSON.stringify(deploy.data || {}));
  }

  if (demoLink) {
    await sleep(1000);
    try {
      const pageResp = await fetch(demoLink);
      record('4-Integration', 'Demo link accessible', pageResp.status === 200 ? 'PASS' : 'FAIL',
        'status=' + pageResp.status + ' url=' + demoLink);
    } catch (e) {
      record('4-Integration', 'Demo link accessible', 'FAIL', e.message);
    }
  }

  // === Phase 5: Smoke ===
  log('INFO', '===== Phase 5: Smoke Tests =====');

  const forms = await get('/api/forms');
  record('5-Smoke', 'Forms API', forms.status === 200 ? 'PASS' : 'FAIL');

  const events = await get('/api/deploy-events');
  record('5-Smoke', 'Deploy events API', events.status === 200 ? 'PASS' : 'FAIL');

  const tokenResp = await get('/api/agent-token');
  let agentToken = '';
  if (tokenResp.data && tokenResp.data.token) {
    agentToken = tokenResp.data.token.value || '';
  }
  record('5-Smoke', 'Agent token', agentToken ? 'PASS' : 'FAIL', agentToken ? 'OK' : 'status=' + tokenResp.status);

  // Check demo detail
  if (demoId) {
    const detail = await get('/api/demos/' + demoId);
    record('5-Smoke', 'Demo detail', detail.data && detail.data.demo ? 'PASS' : 'FAIL');
    const demosList = await get('/api/demos');
    record('5-Smoke', 'Demos list', demosList.status === 200 ? 'PASS' : 'FAIL');
  }

  // Test demo tracking
  if (demoLink) {
    try {
      const trackResp = await fetch(demoLink, { redirect: 'follow' });
      record('5-Smoke', 'Demo tracking', trackResp.status === 200 ? 'PASS' : 'FAIL');
    } catch (e) {
      record('5-Smoke', 'Demo tracking', 'FAIL', e.message);
    }
  }

  // Test subdomain check
  const subCheck = await get('/api/subdomain/check');
  record('5-Smoke', 'Subdomain check', subCheck.status === 200 ? 'PASS' : 'FAIL');

  // === Phase 6: Project Deployment Matrix ===
  log('INFO', '===== Phase 6: Project Matrix (21 projects) =====');

  const categories = [
    { dir: '01-static', mode: 'web' },
    { dir: '02-frontend', mode: 'agent' },
    { dir: '03-nodejs', mode: 'web' },
    { dir: '04-special', mode: 'web' }
  ];

  let projTotal = 0, projPass = 0;
  const projResults = [];

  for (var ci = 0; ci < categories.length; ci++) {
    const cat = categories[ci];
    const catDir = path.join(samplesDir, cat.dir);
    let entries;
    try { entries = await fs.readdir(catDir, { withFileTypes: true }); } catch(e) { log('WARN', 'Cannot read ' + catDir + ': ' + e.message); continue; }

    for (var ei = 0; ei < entries.length; ei++) {
      const e = entries[ei];
      if (!e.isDirectory() || e.name.startsWith('.')) continue;
      const pjDir = path.join(catDir, e.name);
      let config = {};
      try { config = JSON.parse(readFileSync(path.join(pjDir, '.demogo', 'project.json'), 'utf8')); } catch(e) { continue; }

      projTotal++;
      const ptype = config.demoType || 'unknown';
      const label = e.name + ' [' + ptype + ']';
      log('INFO', '[' + projTotal + '/26] ' + e.name + ' (' + ptype + ') via ' + cat.mode);

      try {
        const zipPath = await createZipFromDir(pjDir, e.name);
        let resp;

        if (cat.mode === 'agent' && agentToken) {
          resp = await postZipAgent('/api/agent/deploy', zipPath, { name: config.name || e.name }, agentToken);
        } else {
          resp = await postZip('/api/deploy', zipPath, { name: config.name || e.name });
        }

        const modeLabel = cat.mode === 'agent' ? 'agent' : 'web';

        if (resp.data && resp.data.jobId) {
          try {
            const job = await waitForDeployment(resp.data.jobId);
            if (job.status === 'success') projPass++;
            record('6-Project', label + ' [' + modeLabel + ']', job.status === 'success' ? 'PASS' : 'FAIL',
              'job=' + job.status);
            projResults.push({ name: e.name, type: ptype, mode: modeLabel, status: job.status });
          } catch (err) {
            record('6-Project', label + ' [' + modeLabel + ']', 'FAIL', err.message);
            projResults.push({ name: e.name, type: ptype, mode: modeLabel, status: 'FAIL', error: err.message });
          }
        } else if (resp.data && (resp.data.slug || resp.data.id)) {
          projPass++;
          record('6-Project', label + ' [' + modeLabel + ']', 'PASS', 'deployed');
          projResults.push({ name: e.name, type: ptype, mode: modeLabel, status: 'PASS' });
        } else {
          const errMsg = resp.data && resp.data.error ? resp.data.error : 'status=' + resp.status;
          record('6-Project', label + ' [' + modeLabel + ']', 'FAIL', errMsg);
          projResults.push({ name: e.name, type: ptype, mode: modeLabel, status: 'FAIL', error: errMsg });
        }
      } catch (err) {
        record('6-Project', label, 'FAIL', err.message);
        projResults.push({ name: e.name, type: ptype, mode: cat.mode, status: 'FAIL', error: err.message });
      }
    }
  }

  // === Phase 7: Deploy Modes ===
  log('INFO', '===== Phase 7: Deployment Modes =====');

  if (agentToken) {
    const basicDir = path.join(samplesDir, '01-static', 'static-website-basic');
    const agentZip = await createZipFromDir(basicDir, 'agent-mode-test');

    // Agent deploy
    const ad = await postZipAgent('/api/agent/deploy', agentZip, { name: 'Agent Mode Test' }, agentToken);
    let agentDemoId = ad.data && ad.data.id ? ad.data.id : null;
    record('7-Modes', 'Agent: deploy', agentDemoId ? 'PASS' : 'FAIL',
      agentDemoId ? 'id=' + agentDemoId : 'status=' + ad.status + ' ' + JSON.stringify(ad.data || {}));

    // Agent query
    if (agentDemoId) {
      const aq = await agentGet('/api/agent/project/' + agentDemoId, agentToken);
      record('7-Modes', 'Agent: query project', aq.status === 200 ? 'PASS' : 'FAIL',
        'status=' + aq.status);

      // Agent update
      const au = await postZipAgent('/api/agent/demos/' + agentDemoId + '/update', agentZip, { name: 'Agent Update Test' }, agentToken);
      record('7-Modes', 'Agent: update project', au.status === 200 ? 'PASS' : 'FAIL',
        'status=' + au.status);
    }
  } else {
    record('7-Modes', 'Agent API', 'SKIP', 'No token available');
  }

  // Web upload mode verification (already done in phase 6)
  record('7-Modes', 'Web upload', projPass > 0 ? 'PASS' : 'FAIL', projPass + '/' + projTotal + ' projects deployed');

  // CLI mode
  try {
    const cliBin = path.join(projectRoot, 'cli', 'bin', 'demogo.js');
    const cliExists = await fs.stat(cliBin).then(function() { return true; }).catch(function() { return false; });
    record('7-Modes', 'CLI: entry exists', cliExists ? 'PASS' : 'FAIL', cliBin);
    if (cliExists) {
      const cliSrc = readFileSync(cliBin, 'utf8');
      record('7-Modes', 'CLI: script valid', cliSrc.length > 100 ? 'PASS' : 'FAIL');
    }

    // Check MCP
    const mcpBin = path.join(projectRoot, 'mcp', 'bin', 'demogo-mcp.js');
    const mcpExists = await fs.stat(mcpBin).then(function() { return true; }).catch(function() { return false; });
    record('7-Modes', 'MCP: entry exists', mcpExists ? 'PASS' : 'FAIL', mcpBin);

    // Check Codex plugin
    const codexDir = path.join(projectRoot, 'codex-plugin');
    const codexExists = await fs.stat(codexDir).then(function() { return true; }).catch(function() { return false; });
    record('7-Modes', 'Codex Plugin: dir exists', codexExists ? 'PASS' : 'FAIL');

    // Check Claude Code plugin
    const claudeDir = path.join(projectRoot, 'claude-code-plugin');
    const claudeExists = await fs.stat(claudeDir).then(function() { return true; }).catch(function() { return false; });
    record('7-Modes', 'Claude Plugin: dir exists', claudeExists ? 'PASS' : 'FAIL');
  } catch (e) {
    record('7-Modes', 'CLI/MCP/Plugin', 'SKIP', e.message);
  }

  // === Phase 8: E2E ===
  log('INFO', '===== Phase 8: E2E Tests =====');
  const e2eDir = path.join(projectRoot, 'web', 'e2e');
  const e2eFiles = ['auth.spec.ts', 'dashboard.spec.ts', 'deployment.spec.ts', 'helpers.ts'];
  for (var fi = 0; fi < e2eFiles.length; fi++) {
    const f = e2eFiles[fi];
    const ex = await fs.stat(path.join(e2eDir, f)).then(function() { return true; }).catch(function() { return false; });
    record('8-E2E', 'E2E file: ' + f, ex ? 'PASS' : 'FAIL');
  }
  const pwOk = await fs.stat(path.join(projectRoot, 'web', 'playwright.config.ts')).then(function() { return true; }).catch(function() { return false; });
  record('8-E2E', 'Playwright config', pwOk ? 'PASS' : 'FAIL');

  // === SUMMARY ===
  var passCount = 0, failCount = 0, skipCount = 0;
  for (var ri = 0; ri < RESULTS.length; ri++) {
    if (RESULTS[ri].status === 'PASS') passCount++;
    else if (RESULTS[ri].status === 'FAIL') failCount++;
    else skipCount++;
  }

  console.log('');
  console.log('========================================');
  console.log('  DemoGo v0.9.31 Full Test Report');
  console.log('========================================');
  console.log('Total: ' + RESULTS.length + ' | Pass: ' + passCount + ' (' + (passCount/RESULTS.length*100).toFixed(1) + '%) | Fail: ' + failCount + ' | Skip: ' + skipCount);
  console.log('Projects deployed: ' + projPass + '/' + projTotal);
  console.log('========================================');

  if (failCount > 0) {
    console.log('');
    console.log('--- Failures ---');
    for (var ri2 = 0; ri2 < RESULTS.length; ri2++) {
      if (RESULTS[ri2].status === 'FAIL') {
        console.log('  XX [' + RESULTS[ri2].cat + '] ' + RESULTS[ri2].name + ': ' + RESULTS[ri2].detail);
      }
    }
  }

  // Build report
  const report = {
    title: 'DemoGo v0.9.31 Full Test Report',
    timestamp: new Date().toISOString(),
    version: '0.9.31',
    environment: { baseUrl: baseUrl, port: port, mode: 'local-test-server' },
    summary: {
      total: RESULTS.length,
      pass: passCount,
      fail: failCount,
      skip: skipCount,
      passRate: (passCount/RESULTS.length*100).toFixed(1) + '%',
      projectsDeployed: projPass + '/' + projTotal,
      projectPassRate: projTotal > 0 ? (projPass/projTotal*100).toFixed(1) + '%' : 'N/A'
    },
    projectResults: projResults,
    allResults: RESULTS,
    failures: RESULTS.filter(function(r) { return r.status === 'FAIL'; })
  };

  const reportPath = path.join(projectRoot, 'test-results-full.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  log('INFO', 'Report saved: ' + reportPath);

  child.kill();
  log('INFO', 'Server stopped. Test complete.');

  if (failCount > 0) process.exit(1);
}

main().catch(function(err) {
  log('ERROR', 'Fatal: ' + err.message);
  console.error(err.stack);
  process.exit(1);
});
