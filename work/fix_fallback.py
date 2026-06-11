fp = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\dashboard\ProjectDetail.tsx"
with open(fp, 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace('|| "\u003f\u003f\u003f\u003f"', '|| "\u672a\u77e5"')
# The file has 3 occurrences, but they might be the same pattern
# Just do a global replace
with open(fp, 'w', encoding='utf-8') as f:
    f.write(c)
print('fallback values fixed')

with open(fp, 'r', encoding='utf-8') as f:
    lines = f.read().split('\n')
for i in [33, 34, 36]:
    print(f'L{i+1}: {lines[i].strip()[:100]}')
