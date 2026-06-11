path = r'C:\Users\wei.gu\Documents\demogo\server\src\tests\deployment-job-crud.test.mjs'
with open(path, 'rb') as f:
    data = f.read()

# Line 168: statusLabel: "????" -> statusLabel: "执行中"
old = b'statusLabel: "????",'
new = 'statusLabel: "\u6267\u884c\u4e2d",'.encode('utf-8')
data = data.replace(old, new)

# Line 174: expected should match: 排队中 -> 执行中
old2 = b'assert.strictEqual(updated.statusLabel, \"\xe6\x8e\x92\xe9\x98\x9f\xe4\xb8\xad\")'
new2 = 'assert.strictEqual(updated.statusLabel, \"\u6267\u884c\u4e2d\")'.encode('utf-8')
data = data.replace(old2, new2)

with open(path, 'wb') as f:
    f.write(data)
print('Done')
