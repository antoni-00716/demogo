import os

root = r'C:\Users\wei.gu\Documents\demogo\server\src'
gbk_files = []
for dirpath, dirnames, filenames in os.walk(root):
    for fn in filenames:
        if not fn.endswith('.js') and not fn.endswith('.mjs'):
            continue
        fpath = os.path.join(dirpath, fn)
        with open(fpath, 'rb') as f:
            raw = f.read()
        # Check if it looks like GBK (has high bytes that form valid GBK sequences)
        has_gbk = False
        i = 0
        while i < len(raw):
            b = raw[i]
            if b < 0x80:
                i += 1
            elif 0x81 <= b <= 0xFE and i + 1 < len(raw):
                b2 = raw[i+1]
                if 0x40 <= b2 <= 0xFE and b2 != 0x7F:
                    has_gbk = True
                    i += 2
                else:
                    i += 1
            else:
                i += 1
        if has_gbk:
            # Try GBK decode
            try:
                raw.decode('gbk')
                gbk_files.append(fpath)
            except:
                pass

if gbk_files:
    print(f'Found {len(gbk_files)} GBK-encoded files:')
    for f in gbk_files:
        rel = os.path.relpath(f, root)
        print(f'  {rel}')
else:
    print('No GBK-encoded files found')
