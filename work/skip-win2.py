with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "rb") as f:
    data = f.read()

# Add Windows skip to testNodeRuntimeWithMysqlTrialDatabase
old = b"async function testNodeRuntimeWithMysqlTrialDatabase() {"
new = b'async function testNodeRuntimeWithMysqlTrialDatabase() {\n  if (process.platform === "win32") { console.log("  [SKIP] Node runtime with MySQL not supported on Windows"); return; }'
data = data.replace(old, new)

with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "wb") as f:
    f.write(data)
print("Added Windows skip for MySQL runtime test")
