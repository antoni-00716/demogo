with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "rb") as f:
    data = f.read()
lines = data.split(b"\n")
# Find the node runtime function and show the deploy lines
for i, line in enumerate(lines):
    if b"async function testNodeRuntimeWithHostDriver" in line:
        for j in range(i, min(i+80, len(lines))):
            if b"deploy" in lines[j].lower() or b"deployId" in lines[j] or b"deploySlug" in lines[j]:
                print(f"{j+1}: {lines[j].decode('utf-8', errors='replace')[:150]}")
        break
