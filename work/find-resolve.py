with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "rb") as f:
    data = f.read()
lines = data.split(b"\n")
# Find where resolveDeployment is used
for i, line in enumerate(lines):
    if b"resolveDeployment" in line and b"function" not in line:
        print(f"{i+1}: {line.decode('utf-8', errors='replace')[:120]}")
