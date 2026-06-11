with open(r'C:\Users\wei.gu\Documents\demogo\server\src\routes\demos.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Update import
old_import = 'import { publicDemoDatabase, resetDemoDatabase, queryDemoDatabaseTables, queryDemoDatabaseRows } from \"../services/demo-database-service.js\";'
new_import = 'import { publicDemoDatabase, resetDemoDatabase, queryDemoDatabaseTables, queryDemoDatabaseRows, exportDemoDatabaseCsv } from \"../services/demo-database-service.js\";'
content = content.replace(old_import, new_import)

# Add export endpoints after the database rows endpoint
marker = "app.get('/api/demos/:id/database/tables/:tableName/rows'"
pos = content.find(marker)
# Find the end of this endpoint block (after res.json)
close_marker = "res.json({ tableName, rows });"
close_pos = content.find(close_marker, pos)
end_pos = content.find('});', close_pos + len(close_marker)) + 3

new_endpoints = """

  // --- 数据库表 CSV 导出 ---
  app.get('/api/demos/:id/database/tables/:tableName/export', requireUser, async (req, res, next) => {
    try {
      const demos = await readJson(demosFile, []);
      const demo = demos.find((d) => d.id === req.params.id && d.userId === req.user.id);
      if (!demo) {
        res.status(404).json({ error: '未找到该试用项目' });
        return;
      }
      if (!demo.database?.enabled) {
        res.status(409).json({ error: '这个项目没有 MySQL 试用数据库。' });
        return;
      }
      const tableName = req.params.tableName;
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
        res.status(400).json({ error: '无效的表名' });
        return;
      }
      const csv = await exportDemoDatabaseCsv(demo.database, tableName, hostingConfig());
      if (!csv) {
        res.status(404).json({ error: '该表暂无数据。' });
        return;
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=\"' + tableName + '.csv\"');
      res.send('\\uFEFF' + csv);
    } catch (error) {
      next(error);
    }
  });

  // --- 表单数据 CSV 导出 ---
  app.get('/api/demos/:id/forms/export', requireUser, async (req, res, next) => {
    try {
      const demos = await readJson(demosFile, []);
      const demo = demos.find((d) => d.id === req.params.id && d.userId === req.user.id);
      if (!demo) {
        res.status(404).json({ error: '未找到该试用项目' });
        return;
      }
      const forms = await readJson(formsFile, []);
      const demoForms = forms.filter((f) => f.demoId === demo.id);
      const submissions = await readJson(formSubmissionsFile, []);
      const demoSubmissions = submissions.filter((s) => demoForms.some((f) => f.id === s.formId));

      if (!demoSubmissions.length) {
        res.status(404).json({ error: '暂无表单提交数据。' });
        return;
      }

      // Build CSV: columns = [时间, form_name, field1, field2, ...]
      const allFieldNames = new Set();
      for (const sub of demoSubmissions) {
        if (sub.payload) Object.keys(sub.payload).forEach((k) => allFieldNames.add(k));
      }
      const headers = ['时间', '表单名称', ...allFieldNames];
      const csvLines = [headers.join(',')];
      for (const sub of demoSubmissions) {
        const form = demoForms.find((f) => f.id === sub.formId);
        const values = [
          sub.createdAt || '',
          (form?.name || '').replace(/,/g, '，'),
          ...[...allFieldNames].map((name) => {
            const v = sub.payload?.[name];
            if (v === null || v === undefined) return '';
            const s = String(v).replace(/,/g, '，').replace(/"/g, '""');
            return s.includes(',') ? '"' + s + '"' : s;
          })
        ];
        csvLines.push(values.join(','));
      }
      const csv = csvLines.join('\\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=\"submissions.csv\"');
      res.send('\\uFEFF' + csv);
    } catch (error) {
      next(error);
    }
  });

"""

content = content[:end_pos] + new_endpoints + content[end_pos:]

with open(r'C:\Users\wei.gu\Documents\demogo\server\src\routes\demos.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Added export endpoints')
