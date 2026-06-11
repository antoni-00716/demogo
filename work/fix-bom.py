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
    'server.js',
]

for rel in files_to_check:
    fpath = os.path.join(root, rel)
    with open(fpath, 'rb') as f:
        raw = f.read()
    # Check if starts with garbled BOM
    if raw.startswith(b'\xef\xbb\xbf'):
        raw = raw[3:]
        with open(fpath, 'wb') as f:
            f.write(raw)
        print(f'Stripped BOM (raw): {rel}')
    elif raw.startswith(b'\xe9\x94\x98\xe7\xb8\xa0'):
        # This is the garbled BOM from GBK->UTF-8 conversion
        # \xe9\x94\x98\xe7\xb8\xa0 = "锘縠" (7 bytes)
        raw = raw[7:]  # "export" starts at position 7
        with open(fpath, 'wb') as f:
            f.write(raw)
        print(f'Fixed garbled BOM: {rel}')
    else:
        # Check first 8 bytes
        first_bytes = raw[:8]
        if b'export' not in first_bytes[:10] and b'import' not in first_bytes[:10] and b'//' not in first_bytes[:5] and b'/*' not in first_bytes[:5] and b"'use" not in first_bytes[:5] and b'"use' not in first_bytes[:5]:
            print(f'UNEXPECTED start ({rel}): {first_bytes!r}')
        else:
            print(f'OK: {rel}')
