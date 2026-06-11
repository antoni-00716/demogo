with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "rb") as f:
    data = f.read()
lines = data.split(b"\n")
for i in range(1020, 1065):
    line_str = lines[i].decode("utf-8", errors="replace")
    print(f"{i+1}: {line_str[:150]}")
