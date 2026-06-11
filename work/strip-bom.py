import os

root = r'C:\Users\wei.gu\Documents\demogo\server\src'
files_to_check = [
    'lib/deploy-rate-limiter.js',
    'lib/login-rate-limiter.js',
    'lib/deploy-helpers.js',
    'lib/session-store.js',
    'middleware/request-id.js',
    'tests/build-service.test.mjs',
    'tests/integration/helpers.mjs',
]

for rel in files_to_check:
    fpath = os.path.join(root, rel)
    with open(fpath, 'rb') as f:
        raw = f.read()
    # Strip BOM if present
    if raw.startswith(b'\xef\xbb\xbf'):
        raw = raw[3:]
        with open(fpath, 'wb') as f:
            f.write(raw)
        print(f'Stripped BOM: {rel}')
    else:
        print(f'No BOM: {rel}')
