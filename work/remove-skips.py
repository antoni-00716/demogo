with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "rb") as f:
    data = f.read()

# Remove Windows skips (revert back to original)
data = data.replace(
    b'async function testNodeRuntimeWithHostDriver() {\n  if (process.platform === "win32") { console.log("  [SKIP] Node runtime host driver not supported on Windows"); return; }',
    b'async function testNodeRuntimeWithHostDriver() {'
)
data = data.replace(
    b'async function testNodeRuntimeWithMysqlTrialDatabase() {\n  if (process.platform === "win32") { console.log("  [SKIP] Node runtime with MySQL not supported on Windows"); return; }',
    b'async function testNodeRuntimeWithMysqlTrialDatabase() {'
)

with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "wb") as f:
    f.write(data)
print("Removed Windows skips")
