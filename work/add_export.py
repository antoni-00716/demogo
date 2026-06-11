with open(r'C:\Users\wei.gu\Documents\demogo\server\src\services\demo-database-service.js', 'r', encoding='utf-8') as f:
    content = f.read()

export_func = '''

/**
 * 导出试用数据库中某个表的全部数据为 CSV
 */
export async function exportDemoDatabaseCsv(database, tableName, config = {}) {
  if (!database?.databaseName || !config.demoDbAdminHost) {
    return '';
  }
  let connection;
  try {
    connection = await mysql.createConnection({
      host: config.demoDbAdminHost,
      port: Number(config.demoDbAdminPort || 3306),
      user: config.demoDbAdminUser || 'root',
      password: config.demoDbAdminPassword || '',
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
        if (s.includes(',') || s.includes('"') || s.includes('\\n') || s.includes('\\r')) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      });
      csvLines.push(values.join(','));
    }
    return csvLines.join('\\n');
  } catch (error) {
    return '';
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
}
'''

content += export_func

with open(r'C:\Users\wei.gu\Documents\demogo\server\src\services\demo-database-service.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Added exportDemoDatabaseCsv')
