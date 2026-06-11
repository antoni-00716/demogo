with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "rb") as f:
    data = f.read()
lines = data.split(b"\n")
for i in range(1320, 1360):
    print(f"{i+1}: {lines[i].decode('utf-8', errors='replace')[:150]}")
