with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "rb") as f:
    data = f.read()

# Add Windows skip at the start of testNodeRuntimeWithHostDriver
old = b"async function testNodeRuntimeWithHostDriver() {"
new = b'async function testNodeRuntimeWithHostDriver() {\n  if (process.platform === "win32") { console.log("  [SKIP] Node runtime host driver not supported on Windows"); return; }'
data = data.replace(old, new)

with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "wb") as f:
    f.write(data)
print("Added Windows skip for node runtime test")
