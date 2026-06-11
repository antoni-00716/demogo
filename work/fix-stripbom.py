path = r'C:\Users\wei.gu\Documents\demogo\server\src\tests\build-service.test.mjs'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the garbled BOM string with actual BOM character
# Old: "锟縣ello" (GBK-misread BOM + ello)
# New: "\uFEFFhello" (actual BOM + hello) 
old = 'svc.stripBom("锟縣ello"), "hello"'
new = 'svc.stripBom("\uFEFFhello"), "hello"'
content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed stripBom test')
