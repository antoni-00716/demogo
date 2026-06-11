fp = r"C:\Users\wei.gu\Documents\demogo\server\src\services\deployment-job-service.js"
with open(fp, 'r', encoding='utf-8') as f:
    c = f.read()

# Fix L245: running status should be "执行中"
c = c.replace(
    'status: "running",\n      statusLabel: "排队中",',
    'status: "running",\n      statusLabel: "\u6267\u884c\u4e2d",')

# Fix L287: success messages for update vs create
c = c.replace(
    'job.action === "update" ? "\u672a\u627e\u5230\u7528\u6237\u4fe1\u606f\uff0c\u65e0\u6cd5\u7ee7\u7eed\u90e8\u7f72" : "\u672a\u627e\u5230\u7528\u6237\u4fe1\u606f\uff0c\u65e0\u6cd5\u7ee7\u7eed\u90e8\u7f72"',
    'job.action === "update" ? "\u9879\u76ee\u66f4\u65b0\u6210\u529f\uff0c\u94fe\u63a5\u5df2\u5237\u65b0" : "\u9879\u76ee\u90e8\u7f72\u6210\u529f\uff0c\u94fe\u63a5\u5df2\u751f\u6210"')

# Fix L307: failed status should be "失败"  
c = c.replace(
    'status: "failed",\n        statusLabel: "排队中",',
    'status: "failed",\n        statusLabel: "\u5931\u8d25",')

with open(fp, 'w', encoding='utf-8') as f:
    f.write(c)

# Verify
with open(fp, 'r', encoding='utf-8') as f:
    lines = f.read().split('\n')
for i in [244, 286, 306]:
    print(f'L{i+1}: {lines[i].strip()[:120]}')
    print(f'L{i+2}: {lines[i+1].strip()[:120]}')
