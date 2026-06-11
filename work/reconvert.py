import os

root = r'C:\Users\wei.gu\Documents\demogo\server\src'
files = [
    'lib/deploy-rate-limiter.js',
    'lib/login-rate-limiter.js',
    'lib/deploy-helpers.js',
    'lib/session-store.js',
    'middleware/request-id.js',
    'tests/build-service.test.mjs',
    'tests/integration/helpers.mjs',
]

for rel in files:
    fpath = os.path.join(root, rel)
    with open(fpath, 'rb') as f:
        raw = f.read()
    # Strip BOM
    if raw.startswith(b'\xef\xbb\xbf'):
        raw = raw[3:]
        print(f'Stripped BOM: {rel}')
    # Decode as GBK, write as UTF-8
    text = raw.decode('gbk')
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f'Converted: {rel}')
