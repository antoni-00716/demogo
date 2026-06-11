import sys, os

base = r'C:\Users\wei.gu\Documents\demogo\server\src'

# === 1. demo-database-service.js ===
with open(os.path.join(base, 'services', 'demo-database-service.js'), 'r', encoding='utf-8') as f:
    content = f.read()

content += '''

/**
 * 查询试用数据库中的所有表及其结构
 */
export async function queryDemoDatabaseTables(database, config = {}) {
  if (!database?.databaseName || !config.demoDbAdminHost) return [];
  let connection;
  try {
    connection = await mysql.createConnection({
      host: config.demoDbAdminHost, port: Number(config.demoDbAdminPort || 3306),
      user: config.demoDbAdminUser || 'root', password: config.demoDbAdminPassword || '',
      database: database.databaseName
    });
    const [columns] = await connection.query(
      "SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME, TABLE_COMMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME",
      [database.databaseName]
    );
    const tables = [];
    for (const col of columns) {
      const [fields] = await connection.query(
        "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_COMMENT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION",
        [database.databaseName, col.TABLE_NAME]
      );
      tables.push({
        name: col.TABLE_NAME, rowCount: Number(col.TABLE_ROWS || 0),
        createdAt: col.CREATE_TIME, comment: col.TABLE_COMMENT || '',
        columns: fields.map((f) => ({ name: f.COLUMN_NAME, type: f.DATA_TYPE, nullable: f.IS_NULLABLE === 'YES', isPrimaryKey: f.COLUMN_KEY === 'PRI', comment: f.COLUMN_COMMENT || '' }))
      });
    }
    return tables;
  } catch (e) { return []; }
  finally { if (connection) await connection.end().catch(() => {}); }
}

/**
 * 查询试用数据库中某个表的数据
 */
export async function queryDemoDatabaseRows(database, tableName, config = {}) {
  if (!database?.databaseName || !config.demoDbAdminHost) return [];
  let connection;
  try {
    connection = await mysql.createConnection({
      host: config.demoDbAdminHost, port: Number(config.demoDbAdminPort || 3306),
      user: config.demoDbAdminUser || 'root', password: config.demoDbAdminPassword || '',
      database: database.databaseName
    });
    const sql = 'SELECT * FROM ' + connection.escapeId(tableName) + ' ORDER BY 1 DESC';
    const [rows] = await connection.query(sql);
    return rows;
  } catch (e) { return []; }
  finally { if (connection) await connection.end().catch(() => {}); }
}

/**
 * 导出试用数据库中某个表的全部数据为 CSV
 */
export async function exportDemoDatabaseCsv(database, tableName, config = {}) {
  if (!database?.databaseName || !config.demoDbAdminHost) return '';
  let connection;
  try {
    connection = await mysql.createConnection({
      host: config.demoDbAdminHost, port: Number(config.demoDbAdminPort || 3306),
      user: config.demoDbAdminUser || 'root', password: config.demoDbAdminPassword || '',
      database: database.databaseName
    });
    const sql = 'SELECT * FROM ' + connection.escapeId(tableName);
    const [rows] = await connection.query(sql);
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const csvLines = [headers.join(',')];
    for (const row of rows) {
      const values = headers.map((h) => {
        const v = row[h];
        if (v === null || v === undefined) return '';
        const s = String(v);
        if (s.includes(',') || s.includes('\"') || s.includes('\\n') || s.includes('\\r')) {
          return '\"' + s.replace(/\"/g, '\"\"') + '\"';
        }
        return s;
      });
      csvLines.push(values.join(','));
    }
    return csvLines.join('\\n');
  } catch (e) { return ''; }
  finally { if (connection) await connection.end().catch(() => {}); }
}
'''

with open(os.path.join(base, 'services', 'demo-database-service.js'), 'w', encoding='utf-8') as f:
    f.write(content)
print('1. demo-database-service.js updated')

# === 2. deployment-pipeline-service.js - add getDeployEvents import ===
with open(os.path.join(base, 'services', 'deployment-pipeline-service.js'), 'r', encoding='utf-8') as f:
    content = f.read()

old_imp = '} from \"./runtime-service.js\";'
new_imp = '} from \"./runtime-service.js\";\n\nimport {\\n  getDeployEvents,\\n} from \"./quota-service.js\";'
content = content.replace(old_imp, new_imp)

with open(os.path.join(base, 'services', 'deployment-pipeline-service.js'), 'w', encoding='utf-8') as f:
    f.write(content)
print('2. deployment-pipeline-service.js - added getDeployEvents import')

# === 3. demos.js ===
with open(os.path.join(base, 'routes', 'demos.js'), 'r', encoding='utf-8') as f:
    content = f.read()

# Update import
content = content.replace(
  'import { publicDemoDatabase, resetDemoDatabase } from \"../services/demo-database-service.js\";',
  'import { publicDemoDatabase, resetDemoDatabase, queryDemoDatabaseTables, queryDemoDatabaseRows, exportDemoDatabaseCsv } from \"../services/demo-database-service.js\";'
)

# Update function signature
content = content.replace(
  '  restartDemoRuntime,\\n}) {',
  '  restartDemoRuntime,\\n  formsFile,\\n  formSubmissionsFile,\\n}) {'
)

# Add endpoints
marker = 'res.json({ demo: publicUserDemo(nextDemo), database: publicDemoDatabase(database) });'
pos = content.find(marker)
close_pos = content.find('});', pos + len(marker))
end_pos = close_pos + 3

new_eps = """

  // --- 数据库表浏览 ---
  app.get('/api/demos/:id/database/tables', requireUser, async (req, res, next) => {
    try {
      const demos = await readJson(demosFile, []);
      const demo = demos.find((d) => d.id === req.params.id && d.userId === req.user.id);
      if (!demo) { res.status(404).json({ error: '未找到该试用项目' }); return; }
      if (!demo.database?.enabled) { res.status(409).json({ error: '这个项目没有 MySQL 试用数据库。' }); return; }
      const tables = await queryDemoDatabaseTables(demo.database, hostingConfig());
      res.json({ tables });
    } catch (error) { next(error); }
  });

  app.get('/api/demos/:id/database/tables/:tableName/rows', requireUser, async (req, res, next) => {
    try {
      const demos = await readJson(demosFile, []);
      const demo = demos.find((d) => d.id === req.params.id && d.userId === req.user.id);
      if (!demo) { res.status(404).json({ error: '未找到该试用项目' }); return; }
      if (!demo.database?.enabled) { res.status(409).json({ error: '这个项目没有 MySQL 试用数据库。' }); return; }
      const tableName = req.params.tableName;
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*\x24/.test(tableName)) { res.status(400).json({ error: '无效的表名' }); return; }
      const rows = await queryDemoDatabaseRows(demo.database, tableName, hostingConfig());
      res.json({ tableName, rows });
    } catch (error) { next(error); }
  });

  // --- 数据库表 CSV 导出 ---
  app.get('/api/demos/:id/database/tables/:tableName/export', requireUser, async (req, res, next) => {
    try {
      const demos = await readJson(demosFile, []);
      const demo = demos.find((d) => d.id === req.params.id && d.userId === req.user.id);
      if (!demo) { res.status(404).json({ error: '未找到该试用项目' }); return; }
      if (!demo.database?.enabled) { res.status(409).json({ error: '这个项目没有 MySQL 试用数据库。' }); return; }
      const tableName = req.params.tableName;
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*\x24/.test(tableName)) { res.status(400).json({ error: '无效的表名' }); return; }
      const csv = await exportDemoDatabaseCsv(demo.database, tableName, hostingConfig());
      if (!csv) { res.status(404).json({ error: '该表暂无数据。' }); return; }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=\"' + tableName + '.csv\"');
      res.send('\\uFEFF' + csv);
    } catch (error) { next(error); }
  });

  // --- 表单数据 CSV 导出 ---
  app.get('/api/demos/:id/forms/export', requireUser, async (req, res, next) => {
    try {
      const demos = await readJson(demosFile, []);
      const demo = demos.find((d) => d.id === req.params.id && d.userId === req.user.id);
      if (!demo) { res.status(404).json({ error: '未找到该试用项目' }); return; }
      const forms = await readJson(formsFile, []);
      const demoForms = forms.filter((f) => f.demoId === demo.id);
      const submissions = await readJson(formSubmissionsFile, []);
      const demoSubmissions = submissions.filter((s) => demoForms.some((f) => f.id === s.formId));
      if (!demoSubmissions.length) { res.status(404).json({ error: '暂无表单提交数据。' }); return; }
      const allFieldNames = new Set();
      for (const sub of demoSubmissions) { if (sub.payload) Object.keys(sub.payload).forEach((k) => allFieldNames.add(k)); }
      const headers = ['时间', '表单名称', ...allFieldNames];
      const csvLines = [headers.join(',')];
      for (const sub of demoSubmissions) {
        const form = demoForms.find((f) => f.id === sub.formId);
        const values = [
          sub.createdAt || '',
          (form?.name || '').replace(/,/g, '\\uFF0C'),
          ...[...allFieldNames].map((name) => {
            const v = sub.payload?.[name];
            if (v === null || v === undefined) return '';
            const s = String(v).replace(/,/g, '\\uFF0C').replace(/\"/g, '\"\"');
            return s.includes(',') ? '\"' + s + '\"' : s;
          })
        ];
        csvLines.push(values.join(','));
      }
      const csv = csvLines.join('\\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=\"submissions.csv\"');
      res.send('\\uFEFF' + csv);
    } catch (error) { next(error); }
  });

  // --- 表单数据查看（用户端）---
  app.get('/api/demos/:id/forms', requireUser, async (req, res, next) => {
    try {
      const demos = await readJson(demosFile, []);
      const demo = demos.find((d) => d.id === req.params.id && d.userId === req.user.id);
      if (!demo) { res.status(404).json({ error: '未找到该试用项目' }); return; }
      const forms = await readJson(formsFile, []);
      const demoForms = forms.filter((f) => f.demoId === demo.id);
      const submissions = await readJson(formSubmissionsFile, []);
      const demoSubmissions = submissions.filter((s) => demoForms.some((f) => f.id === s.formId));
      res.json({
        forms: demoForms.map((f) => ({ ...f, submissionCount: demoSubmissions.filter((s) => s.formId === f.id).length })),
        submissions: demoSubmissions
      });
    } catch (error) { next(error); }
  });

"""

content = content[:end_pos] + new_eps + content[end_pos:]

with open(os.path.join(base, 'routes', 'demos.js'), 'w', encoding='utf-8') as f:
    f.write(content)
print('3. demos.js updated with all endpoints')

# === 4. server.js - add formsFile/formSubmissionsFile to registerDemosRoutes call ===
with open(os.path.join(base, 'server.js'), 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
  '      restartDemoRuntime,\\n      writeTrialEvent: writeTrialEvent,\\n    });',
  '      restartDemoRuntime,\\n      formsFile,\\n      formSubmissionsFile,\\n      writeTrialEvent: writeTrialEvent,\\n    });'
)

with open(os.path.join(base, 'server.js'), 'w', encoding='utf-8') as f:
    f.write(content)
print('4. server.js updated')

# === 5. integration-test.mjs - fix proId bug ===
with open(os.path.join(base, 'tests', 'integration-test.mjs'), 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('proId = proId;', 'proId = proDeploy.data.id;')
with open(os.path.join(base, 'tests', 'integration-test.mjs'), 'w', encoding='utf-8') as f:
    f.write(content)
print('5. integration-test.mjs fixed')

# === 6. smoke-test.js - fix field paths ===
with open(os.path.join(base, 'tests', 'smoke-test.js'), 'r', encoding='utf-8') as f:
    content = f.read()

# Fix inspection field paths
content = content.replace(
  "assert(distInspection.inspection?.entryFile === \\\"dist/index.html\\\"",
  "assert(distInspection.inspection?.entries?.entryFile === \\\"dist/index.html\\\""
)
content = content.replace(
  "assert(distInspection.inspection?.detectedType === \\\"dist\\\"",
  "assert(distInspection.inspection?.analysis?.detectedType === \\\"dist\\\""
)
content = content.replace(
  "assert(buildInspection.inspection?.entryFile === \\\"build/index.html\\\"",
  "assert(buildInspection.inspection?.entries?.entryFile === \\\"build/index.html\\\""
)
content = content.replace(
  "assert(buildInspection.inspection?.detectedType === \\\"build\\\"",
  "assert(buildInspection.inspection?.analysis?.detectedType === \\\"build\\\""
)
content = content.replace(
  "assert(inspection.inspection?.detectedType === \\\"single-html\\\"",
  "assert(inspection.inspection?.analysis?.detectedType === \\\"single-html\\\""
)
content = content.replace(
  "assert(inspection.inspection?.entryFile === \\\"landing-page.html\\\"",
  "assert(inspection.inspection?.entries?.entryFile === \\\"landing-page.html\\\""
)
content = content.replace(
  "assert(outInspection.inspection?.entryFile === \\\"out/index.html\\\"",
  "assert(outInspection.inspection?.entries?.entryFile === \\\"out/index.html\\\""
)
content = content.replace(
  "assert(outInspection.inspection?.detectedType === \\\"out\\\"",
  "assert(outInspection.inspection?.analysis?.detectedType === \\\"out\\\""
)
content = content.replace(
  "assert(inspection.inspection?.detectedType === \\\"source\\\"",
  "assert(inspection.inspection?.analysis?.detectedType === \\\"source\\\""
)
content = content.replace('.inspection?.hostingMode', '.inspection?.analysis?.hostingMode')
content = content.replace('.inspection?.projectProfile', '.inspection?.analysis?.projectProfile')
content = content.replace('.inspection?.projectAssessment', '.inspection?.analysis?.projectAssessment')
content = content.replace('.inspection?.externalBackend', '.inspection?.externalBackend')
content = content.replace('.inspection?.formFields', '.inspection?.forms?.formFields')
content = content.replace('.inspection?.ignoredFiles', '.inspection?.files?.ignoredFiles')
content = content.replace('.inspection?.apiCalls', '.inspection?.forms?.apiCalls')
content = content.replace('.inspection?.ruleReport', '.inspection?.presentation?.ruleReport')
content = content.replace('.inspection?.blockedFiles', '.inspection?.files?.blockedFiles')
content = content.replace('.inspection?.issues', '.inspection?.presentation?.issues')
content = content.replace(
  "assert(outInspection.inspection?.userStatusLabel === \\\"支持\\\"",
  "assert(outInspection.inspection?.presentation?.userStatusLabel === \\\"支持\\\""
)

with open(os.path.join(base, 'tests', 'smoke-test.js'), 'w', encoding='utf-8') as f:
    f.write(content)
print('6. smoke-test.js field paths fixed')

print('\\nAll server changes applied successfully!')
