with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "rb") as f:
    data = f.read()
lines = data.split(b"\n")
# Find testNodeRuntimeWithMysqlTrialDatabase
for i, line in enumerate(lines):
    if b"testNodeRuntimeWithMysqlTrialDatabase" in line:
        for j in range(i, min(i+30, len(lines))):
            print(f"{j+1}: {lines[j].decode('utf-8', errors='replace')[:150]}")
        break
