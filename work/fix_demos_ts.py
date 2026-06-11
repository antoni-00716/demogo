with open(r'C:\Users\wei.gu\Documents\demogo\web\src\api\demos.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix: inline import types cause TS parsing errors. Replace with any[]
old = "export function getDemoForms(id: string) {\n  return api<{ forms: import('../types').HostedForm[]; submissions: import('../types').FormSubmission[] }>(\x60/api/demos/\x24{id}/forms\x60);\n}"
new = "export function getDemoForms(id: string) {\n  return api<{ forms: any[]; submissions: any[] }>(\x60/api/demos/\x24{id}/forms\x60);\n}"
content = content.replace(old, new)

with open(r'C:\Users\wei.gu\Documents\demogo\web\src\api\demos.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed demos.ts')
