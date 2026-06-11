import sys

# === Fix demos.js ===
with open(r'C:\Users\wei.gu\Documents\demogo\server\src\routes\demos.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_import = 'import { publicDemoDatabase, resetDemoDatabase } from "../services/demo-database-service.js";'
new_import = 'import { publicDemoDatabase, resetDemoDatabase, queryDemoDatabaseTables, queryDemoDatabaseRows } from "../services/demo-database-service.js";'
content = content.replace(old_import, new_import)

marker = 'res.json({ demo: publicUserDemo(nextDemo), database: publicDemoDatabase(database) });'
insert_pos = content.find(marker)
if insert_pos >= 0:
    close_pos = content.find('});', insert_pos + len(marker))
    if close_pos >= 0:
        end_pos = close_pos + 3

        new_endpoints = """

  // --- 数据库表浏览 ---
  app.get('/api/demos/:id/database/tables', requireUser, async (req, res, next) => {
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
      const tables = await queryDemoDatabaseTables(demo.database, hostingConfig());
      res.json({ tables });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/demos/:id/database/tables/:tableName/rows', requireUser, async (req, res, next) => {
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
      const rows = await queryDemoDatabaseRows(demo.database, tableName, hostingConfig());
      res.json({ tableName, rows });
    } catch (error) {
      next(error);
    }
  });

  // --- 表单数据查看（用户端）---
  app.get('/api/demos/:id/forms', requireUser, async (req, res, next) => {
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
      res.json({
        forms: demoForms.map((f) => ({
          ...f,
          submissionCount: demoSubmissions.filter((s) => s.formId === f.id).length
        })),
        submissions: demoSubmissions.slice(0, 100)
      });
    } catch (error) {
      next(error);
    }
  });

"""
        content = content[:end_pos] + new_endpoints + content[end_pos:]

with open(r'C:\Users\wei.gu\Documents\demogo\server\src\routes\demos.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('demos.js updated')
