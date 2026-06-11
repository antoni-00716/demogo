import re

path = r'C:\Users\wei.gu\Documents\demogo\server\src\server.js'
with open(path, 'rb') as f:
    data = f.read()

# Replace GBK-encoded Chinese strings with UTF-8 in userStatusLabel assignments
# Line 2310: \xd6\xa7\xb3\xd6 (GBK "支持") -> UTF-8
data = data.replace(b'\xd6\xa7\xb3\xd6', '\u652f\u6301'.encode('utf-8'))  # 支持

# Line 2328: \xd4\xdd\xb2\xbb\xd6\xa7\xb3\xd6 (GBK "暂不支持") -> UTF-8
data = data.replace(b'\xd4\xdd\xb2\xbb\xd6\xa7\xb3\xd6', '\u6682\u4e0d\u652f\u6301'.encode('utf-8'))  # 暂不支持

# Also fix line 2642 which has the same pattern  
# And there might be other occurrences of the same GBK strings, so let's be thorough

# Check if there are remaining GBK sequences
remaining = []
for i in range(len(data)):
    b = data[i]
    if 0x80 <= b <= 0xFF:
        remaining.append((i, b))
if len(remaining) < 50:
    for pos, byte in remaining[:30]:
        ctx = data[max(0,pos-5):pos+10]
        print(f'Pos {pos}: byte={byte:02x} ctx={ctx!r}')

print(f'Total non-ASCII bytes remaining: {len(remaining)}')

with open(path, 'wb') as f:
    f.write(data)
print('Done')
