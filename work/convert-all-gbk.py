import os

root = r'C:\Users\wei.gu\Documents\demogo\server\src'
gbk_files = [
    r'lib\deploy-helpers.js',
    r'lib\deploy-rate-limiter.js',
    r'lib\login-rate-limiter.js',
    r'lib\session-store.js',
    r'middleware\request-id.js',
    r'tests\build-service.test.mjs',
    r'tests\integration\helpers.mjs',
]

converted = []
errors = []
for rel in gbk_files:
    fpath = os.path.join(root, rel)
    with open(fpath, 'rb') as f:
        raw = f.read()
    try:
        text = raw.decode('gbk')
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(text)
        converted.append(rel)
    except Exception as e:
        errors.append(f'{rel}: {e}')

print(f'Converted: {len(converted)} files')
for f in converted:
    print(f'  OK: {f}')
if errors:
    print(f'Errors: {errors}')
