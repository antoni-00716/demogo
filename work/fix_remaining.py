import re

# FormHostingPanel.tsx - all fixes
fp = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\dashboard\FormHostingPanel.tsx"
with open(fp, 'r', encoding='utf-8') as f:
    c = f.read()

fixes_fhp = [
    ('<h2>????/??</h2>', '<h2>\u8868\u5355/\u7559\u8d44</h2>'),
    ('"???????"', '"\u590d\u5236\u94fe\u63a5"'),
    ('onCopyText(form.submitUrl || "", "???????")', 'onCopyText(form.submitUrl || "", "\u590d\u5236\u94fe\u63a5")'),
    ('hasActiveForms ? "??????" : "????"', 'hasActiveForms ? "\u7ba1\u7406\u8868\u5355" : "\u65b0\u5efa\u8868\u5355"'),
]
for old, new in fixes_fhp:
    if old in c:
        c = c.replace(old, new)
    else:
        print(f"  WARN FHP: not found: {old[:50]}")

with open(fp, 'w', encoding='utf-8') as f:
    f.write(c)
print("FormHostingPanel.tsx fixed")

# ProjectDetail.tsx - all fixes
fp = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\dashboard\ProjectDetail.tsx"
with open(fp, 'r', encoding='utf-8') as f:
    c = f.read()

fixes_pd = [
    ('<div><dt>????</dt><dd>{demo.publicUrl', '<div><dt>\u8bd5\u7528\u94fe\u63a5</dt><dd>{demo.publicUrl'),
    ('<div><dt>????</dt><dd>{projectTypeText}', '<div><dt>\u9879\u76ee\u7c7b\u578b</dt><dd>{projectTypeText}'),
    ('<div><dt>????</dt><dd>{demo.fileCount', '<div><dt>\u6587\u4ef6\u6570\u91cf</dt><dd>{demo.fileCount'),
    ('} ??? / {formatBytes', '} \u4e2a\u6587\u4ef6 / {formatBytes'),
    ('<div><dt>????</dt><dd>{formatDate(demo.updatedAt', '<div><dt>\u66f4\u65b0\u65f6\u95f4</dt><dd>{formatDate(demo.updatedAt'),
    ('<div><dt>????</dt><dd>{formatDate(demo.expiresAt}', '<div><dt>\u8fc7\u671f\u65f6\u95f4</dt><dd>{formatDate(demo.expiresAt}'),
    ('>??????</LinkButton>', '>\u6253\u5f00\u8bd5\u7528</LinkButton>'),
]
for old, new in fixes_pd:
    if old in c:
        c = c.replace(old, new)
    else:
        print(f"  WARN PD: not found: {old[:50]}")

with open(fp, 'w', encoding='utf-8') as f:
    f.write(c)
print("ProjectDetail.tsx fixed")

# Final verify
for p in [r"C:\Users\wei.gu\Documents\demogo\web\src\pages\dashboard\FormHostingPanel.tsx",
          r"C:\Users\wei.gu\Documents\demogo\web\src\pages\dashboard\ProjectDetail.tsx"]:
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()
    q = c.count('????')
    r = c.count('\ufffd')
    print(f"{p.split(chr(92))[-1]}: ????={q} U+FFFD={r}")
