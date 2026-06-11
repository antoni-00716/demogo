path = r'C:\Users\wei.gu\Documents\demogo\server\src\server.js'
with open(path, 'rb') as f:
    raw = f.read()

# Use chardet to detect encoding
try:
    import chardet
    result = chardet.detect(raw)
    print(f'Detected: {result}')
except ImportError:
    print('chardet not available')

# Try to identify non-GBK bytes
bad_positions = []
i = 0
while i < len(raw):
    b = raw[i]
    if b < 0x80:
        i += 1
    elif b >= 0x81 and b <= 0xFE and i + 1 < len(raw):
        b2 = raw[i+1]
        if (b2 >= 0x40 and b2 <= 0xFE and b2 != 0x7F):
            i += 2
        else:
            bad_positions.append(i)
            i += 1
    else:
        bad_positions.append(i)
        i += 1

if bad_positions:
    print(f'Non-GBK bytes at positions: {bad_positions[:10]}...')
    for pos in bad_positions[:5]:
        ctx = raw[max(0,pos-5):pos+10]
        print(f'  pos {pos}: byte=0x{raw[pos]:02x} ctx={ctx!r}')
else:
    print('All bytes are valid GBK sequences!')
