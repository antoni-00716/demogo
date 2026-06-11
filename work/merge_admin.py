with open('server/src/routes/admin_clean.js','r',encoding='utf-8') as f:
    lines = f.read().split('\n')
insert_idx = -1
for i in range(len(lines)):
    if 'app.get("/api/admin/feedback"' in lines[i]:
        insert_idx = i
        break
print('Insert at:', insert_idx+1, 'of', len(lines))
new_code = open('work/new_admin_routes.js','r',encoding='utf-8').read()
new_lines = new_code.strip().split('\n')
result = lines[:insert_idx] + new_lines + lines[insert_idx:]
open('server/src/routes/admin.js','w',encoding='utf-8').write('\n'.join(result))
print('Written', len(result), 'lines')
