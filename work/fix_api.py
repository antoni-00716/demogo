import sys

with open(r'C:\Users\wei.gu\Documents\demogo\web\src\api\demos.ts', 'r', encoding='utf-8') as f:
    content = f.read()

new_funcs = '''
export type DatabaseTable = {
  name: string;
  rowCount: number;
  createdAt: string;
  comment: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    isPrimaryKey: boolean;
    comment: string;
  }>;
};

export type DatabaseRow = Record<string, unknown>;

export function getDemoDatabaseTables(id: string) {
  return api<{ tables: DatabaseTable[] }>(/api/demos//database/tables);
}

export function getDemoDatabaseRows(id: string, tableName: string) {
  return api<{ tableName: string; rows: DatabaseRow[] }>(/api/demos//database/tables//rows);
}

export function getDemoForms(id: string) {
  return api<{ forms: import('../types').HostedForm[]; submissions: import('../types').FormSubmission[] }>(/api/demos//forms);
}
'''

# Add before the last closing
content = content.rstrip() + '\n' + new_funcs

with open(r'C:\Users\wei.gu\Documents\demogo\web\src\api\demos.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print('API functions added')
