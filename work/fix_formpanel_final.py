import sys

content = """import { useState } from 'react';
import { Button } from '../../components/Button';
import { formatDate } from '../../utils/format';
import { getDemoForms } from '../../api/demos';
import type { HostedForm, FormSubmission } from '../../types';
import { Download } from 'lucide-react';

const API_BASE = '';

export function FormDataPanel({ demoId }: { demoId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [forms, setForms] = useState<HostedForm[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [formPages, setFormPages] = useState<Record<string, number>>({});
  const PAGE_SIZE = 100;

  function handleToggle() {
    const willExpand = !expanded;
    setExpanded(willExpand);
    if (willExpand && forms.length === 0) {
      setLoading(true);
      getDemoForms(demoId)
        .then((data) => {
          setForms(data.forms || []);
          setSubmissions(data.submissions || []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }

  function exportForms() {
    const a = document.createElement('a');
    a.href = API_BASE + '/api/demos/' + demoId + '/forms/export';
    a.download = 'submissions.csv';
    a.click();
  }

  function loadMore(formId: string) {
    setFormPages((prev) => ({ ...prev, [formId]: (prev[formId] || 0) + 1 }));
  }

  return (
    <div className='hosting-architecture' style={{ marginTop: 12 }}>
      <div className='section-mini-head'>
        <div>
          <h3>表单数据</h3>
          <p>查看和导出该项目收集到的用户提交数据。</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant='ghost' onClick={handleToggle}>
            {expanded ? '收起' : '查看数据'}
          </Button>
          {expanded && submissions.length > 0 && (
            <Button variant='ghost' onClick={exportForms} style={{ padding: '2px 8px', fontSize: 11 }}>
              <Download size={13} /> 导出全部 CSV
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12 }}>
          {loading ? (
            <p className='muted'>加载中...</p>
          ) : forms.length === 0 ? (
            <p className='muted'>该项目暂无表单数据。</p>
          ) : (
            forms.map((form) => {
              const formSubs = submissions.filter((s) => s.formId === form.id);
              const page = formPages[form.id] || 0;
              const visibleSubs = formSubs.slice(0, (page + 1) * PAGE_SIZE);
              const hasMore = formSubs.length > visibleSubs.length;
              return (
                <div key={form.id} style={{ marginBottom: 16 }}>
                  <div className='section-mini-head'>
                    <h4>{form.name}</h4>
                    <span>{formSubs.length} 条提交 · {formatDate(form.createdAt)}</span>
                  </div>
                  {formSubs.length === 0 ? (
                    <p className='muted'>暂无提交。</p>
                  ) : (
                    <div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', fontWeight: 600 }}>时间</th>
                              {form.fields?.map((f) => (
                                <th key={f.name} style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', fontWeight: 600 }}>{f.label || f.name}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {visibleSubs.map((sub, i) => (
                              <tr key={sub.id || i}>
                                <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border-light)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatDate(sub.createdAt)}</td>
                                {form.fields?.map((f) => (
                                  <td key={f.name} style={{ padding: '4px 8px', borderBottom: '1px solid var(--border-light)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(sub.payload?.[f.name] ?? '-')}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {hasMore && (
                        <div style={{ textAlign: 'center', marginTop: 8 }}>
                          <Button variant='ghost' onClick={() => loadMore(form.id)}>
                            加载更多（已显示 {visibleSubs.length}/{formSubs.length} 条）
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
"""

with open(r'C:\Users\wei.gu\Documents\demogo\web\src\pages\dashboard\FormDataPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('FormDataPanel updated')
