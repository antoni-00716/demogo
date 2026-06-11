fp = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\dashboard\FormHostingPanel.tsx"
with open(fp, 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace('>????</Button>', '>\u590d\u5236</Button>')
with open(fp, 'w', encoding='utf-8') as f:
    f.write(c)
print("FHP L57 fixed")

fp = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\dashboard\ProjectDetail.tsx"
with open(fp, 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace('<dt>????</dt><dd>{formatDate(demo.expiresAt)}', '<dt>\u8fc7\u671f\u65f6\u95f4</dt><dd>{formatDate(demo.expiresAt)}')
with open(fp, 'w', encoding='utf-8') as f:
    f.write(c)
print("PD L40 fixed")

for p in [fp, r"C:\Users\wei.gu\Documents\demogo\web\src\pages\dashboard\FormHostingPanel.tsx"]:
    with open(p, 'r', encoding='utf-8') as f:
        c2 = f.read()
    print(f"{p.split(chr(92))[-1]}: ????={c2.count('????')} U+FFFD={c2.count(chr(0xfffd))}")
