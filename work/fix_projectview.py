import sys

with open(r'C:\Users\wei.gu\Documents\demogo\web\src\pages\dashboard\ProjectsView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
old_imports = "import { ExternalLink, Copy, RefreshCw, Share2, Archive, Trash2, X } from 'lucide-react';"
new_imports = """import { ExternalLink, Copy, RefreshCw, Share2, Archive, Trash2, X } from 'lucide-react';
import { DatabasePanel } from './DatabasePanel';
import { FormDataPanel } from './FormDataPanel';"""
content = content.replace(old_imports, new_imports)

# Find the detail-actions section and add database + forms panels before it
marker = '{/* ===== Actions ===== */}'
if marker not in content:
    marker = 'className="detail-actions"'

pos = content.find(marker)
if pos >= 0:
    # Find the opening div of detail-actions and insert before it
    div_start = content.rfind('<div', 0, pos)
    
    new_section = """
                {/* ===== 数据库表数据 ===== */}
                {demo.database?.enabled && (
                  <DatabasePanel demoId={demo.id} database={demo.database} onReset={onResetDatabase ? () => onResetDatabase(demo) : undefined} />
                )}

                {/* ===== 表单提交数据 ===== */}
                <FormDataPanel demoId={demo.id} />
"""
    content = content[:div_start] + new_section + '\n' + content[div_start:]

with open(r'C:\Users\wei.gu\Documents\demogo\web\src\pages\dashboard\ProjectsView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('ProjectsView updated')
