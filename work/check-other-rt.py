with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "rb") as f:
    data = f.read()
lines = data.split(b"\n")
for i, line in enumerate(lines):
    s = line.decode('utf-8', errors='replace')
    if 'testMysqlRuntime' in s or 'testComplexCommerce' in s:
        print(f"{i+1}: {s.strip()[:120]}")
