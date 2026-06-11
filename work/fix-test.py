path = r'C:\Users\wei.gu\Documents\demogo\server\src\tests\deployment-job-crud.test.mjs'
with open(path, 'rb') as f:
    data = f.read()

replacements = [
    (b'statusLabel, "????")', 'statusLabel, "\u6392\u961f\u4e2d")'.encode('utf-8')),
    (b'deploymentJobStatusLabel("queued"), "????")', 'deploymentJobStatusLabel("queued"), "\u6392\u961f\u4e2d")'.encode('utf-8')),
    (b'deploymentJobStatusLabel("running"), "????")', 'deploymentJobStatusLabel("running"), "\u6267\u884c\u4e2d")'.encode('utf-8')),
    (b'deploymentJobStatusLabel("success"), "???")', 'deploymentJobStatusLabel("success"), "\u6210\u529f")'.encode('utf-8')),
    (b'deploymentJobStatusLabel("failed"), "????")', 'deploymentJobStatusLabel("failed"), "\u5931\u8d25")'.encode('utf-8')),
    (b'deploymentJobStatusLabel("unknown"), "????")', 'deploymentJobStatusLabel("unknown"), "\u672a\u77e5")'.encode('utf-8')),
]

for old, new in replacements:
    if old in data:
        data = data.replace(old, new)
        print(f'Replaced')
    else:
        print(f'NOT FOUND: {old[:60]}')

with open(path, 'wb') as f:
    f.write(data)
print('Done')
