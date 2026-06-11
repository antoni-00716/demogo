import sys

# === Fix DatabasePanel - remove useEffect, use direct fetch ===
content = """import { useState } from 'react';
import type { Demo } from '../../types';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { formatDate } from '../../utils/format';
import { getDemoDatabaseTables, getDemoDatabaseRows, type DatabaseTable, type DatabaseRow } from '../../api/demos';

export function DatabasePanel({ demoId, database, onReset }: { demoId: string; database?: Demo['database'] | null; onReset?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [tables, setTables] = useState<DatabaseTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState('');
  const [rows, setRows] = useState<DatabaseRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);

  function handleToggle() {
    const willExpand = !expanded;
    setExpanded(willExpand);
    if (willExpand && tables.length === 0) {
      setLoading(true);
      getDemoDatabaseTables(demoId)
        .then((data) => setTables(data.tables || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }

  function loadRows(tableName: string) {
    setSelectedTable(tableName);
    setRowsLoading(true);
    setRows([]);
    getDemoDatabaseRows(demoId, tableName)
      .then((data) => setRows(data.rows || []))
      .catch(() => {})
      .finally(() => setRowsLoading(false));
  }

  if (!database?.enabled) return null;

  return (
    <div className='hosting-architecture database-panel'>
      <div className='section-mini-head'>
        <div>
          <h3>试用数据库</h3>
          <p>这个项目已分配独立的 MySQL 试用库，只用于当前试用环境。</p>
        </div>
        <Badge tone={database.status === 'ready' ? 'success' : 'neutral'}>{database.statusLabel || '已启用'}</Badge>
      </div>
      <div className='hosting-route-grid'>
        <span>数据库：{database.databaseName || '-'}</span>
        <span>账号：{database.userName || '-'}</span>
        <span>类型：{database.engine?.toUpperCase() || 'MySQL'}</span>
        <span>初始化：{database.schema?.statusLabel || '未检测到初始化脚本'}</span>
        <span>创建时间：{formatDate(database.createdAt || '')}</span>
        {database.resetAt ? <span>最近重置：{formatDate(database.resetAt)}</span> : null}
      </div>
      {database.schema?.error ? (
        <div className='runtime-log-panel'>
          <strong>数据库初始化错误</strong>
          <pre>{database.schema.error}</pre>
        </div>
      ) : null}

      <div className='row-actions compact' style={{ gap: 8 }}>
        <Button variant='ghost' onClick={handleToggle}>
          {expanded ? '收起数据' : '浏览数据'}
        </Button>
        {onReset ? <Button variant='danger' onClick={onReset}>重置试用数据库</Button> : null}
      </div>

      {expanded && (
        <div className='db-browser' style={{ marginTop: 12 }}>
          {loading ? (
            <p className='muted'>加载中...</p>
          ) : tables.length === 0 ? (
            <p className='muted'>数据库中暂无表，请先上传包含 schema.sql 的项目或等待应用初始化。</p>
          ) : (
            <div>
              <div className='db-table-list' style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {tables.map((t) => (
                  <button
                    key={t.name}
                    className={'ag-mode-btn' + (selectedTable === t.name ? ' active' : '')}
                    style={{ padding: '4px 12px', fontSize: 12 }}
                    onClick={() => loadRows(t.name)}
                  >
                    {t.name}
                    <span className='muted' style={{ marginLeft: 4, fontSize: 11 }}>({t.rowCount})</span>
                  </button>
                ))}
              </div>

              {selectedTable && (
                <div className='db-table-data'>
                  <div className='section-mini-head'>
                    <h4>{selectedTable}</h4>
                    <span>{rows.length} 条记录</span>
                  </div>
                  {rowsLoading ? (
                    <p className='muted'>加载中...</p>
                  ) : rows.length === 0 ? (
                    <p className='muted'>该表暂无数据。</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            {Object.keys(rows[0] || {}).map((key) => (
                              <th key={key} style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, i) => (
                            <tr key={i}>
                              {Object.keys(rows[0] || {}).map((key) => (
                                <td key={key} style={{ padding: '4px 8px', borderBottom: '1px solid var(--border-light)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {row[key] === null ? <span className='muted'>NULL</span> : String(row[key])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className='runtime-help-box'>
        <strong>使用说明</strong>
        <ul>
          <li>DemoGo 已把数据库连接信息注入到运行环境，项目代码通过 MYSQL_HOST、MYSQL_DATABASE、MYSQL_USER、MYSQL_PASSWORD 或 DATABASE_URL 读取。</li>
          <li>如果项目包根目录包含 schema.sql，DemoGo 会在创建或重置数据库时尝试执行。</li>
          <li>Prisma、Sequelize、TypeORM 等迁移暂不自动执行，请先用 schema.sql 或应用启动逻辑完成初始化。</li>
        </ul>
      </div>
    </div>
  );
}
"""

with open(r'C:\Users\wei.gu\Documents\demogo\web\src\pages\dashboard\DatabasePanel.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('DatabasePanel fixed')
