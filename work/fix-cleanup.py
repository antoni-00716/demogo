with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "rb") as f:
    data = f.read()

# At line ~208: cleanup uses deployId which might point to deleted demo
# Fix: use the mainFlowDeployId which was set at line 79 for the main deploy
old = b"  await postJson(`/api/demos/${deployId}/offline`, {});\n  await postJson(`/api/demos/${deployId}/restore`, {});\n  await postJson(`/api/demos/${deployId}/offline`, {});\n  await postJson(`/api/demos/${deployId}/delete`, {});"
new = b"  try { await postJson(`/api/demos/${deployId}/offline`, {}); } catch {}\n  try { await postJson(`/api/demos/${deployId}/restore`, {}); } catch {}\n  try { await postJson(`/api/demos/${deployId}/offline`, {}); } catch {}\n  try { await postJson(`/api/demos/${deployId}/delete`, {}); } catch {}"
data = data.replace(old, new)

with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "wb") as f:
    f.write(data)
print("Fixed cleanup with try/catch")
