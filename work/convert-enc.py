path = r'C:\Users\wei.gu\Documents\demogo\server\src\server.js'
# Read raw bytes
with open(path, 'rb') as f:
    raw = f.read()

# Try to decode as GBK, fall back to latin-1 for bytes that fail
try:
    text = raw.decode('gbk')
    print('Successfully decoded as GBK')
except Exception as e:
    print(f'GBK decode error: {e}')
    # Try with errors='replace'
    text = raw.decode('gbk', errors='replace')
    print('Decoded with replacement chars')

# Write back as UTF-8
with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
print('Converted to UTF-8')
