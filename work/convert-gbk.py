path = r'C:\Users\wei.gu\Documents\demogo\server\src\server.js'
with open(path, 'rb') as f:
    raw = f.read()
text = raw.decode('gbk')
with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
print('Converted GBK -> UTF-8 successfully')
