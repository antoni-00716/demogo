with open(r"C:\Users\wei.gu\Documents\demogo\server\src\server.js", "rb") as f:
    data = f.read()

# Fix the worker to use the same queue name
old = b'new Worker("demogo-deployments", async (job) => {'
new = b'const wqName = process.env.DEMOGO_QUEUE_NAME || "demogo-deployments";\n  const inProcessWorker = new Worker(wqName, async (job) => {'
data = data.replace(old, new)

# Also add DEMOGO_QUEUE_NAME to smoke test env
old_smoke = b"      DEMOGO_BUILD_MODE: \"host\",\n      DEMOGO_CSRF_DISABLED: \"1\","
new_smoke = b"      DEMOGO_BUILD_MODE: \"host\",\n      DEMOGO_QUEUE_NAME: \"demogo-smoke-test\",\n      DEMOGO_CSRF_DISABLED: \"1\","
data = data.replace(old_smoke, new_smoke)

with open(r"C:\Users\wei.gu\Documents\demogo\server\src\server.js", "wb") as f:
    f.write(data)
print("Fixed worker queue name and smoke test config")
