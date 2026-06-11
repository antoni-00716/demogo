with open(r"C:\Users\wei.gu\Documents\demogo\server\src\server.js", "rb") as f:
    data = f.read()

# Fix the broken line
old = b'const wqName = process.env.DEMOGO_QUEUE_NAME || "demogo-deployments";\n  const inProcessWorker = const wqName = process.env.DEMOGO_QUEUE_NAME || "demogo-deployments";'
new = b'const wqName = process.env.DEMOGO_QUEUE_NAME || "demogo-deployments";\n  const inProcessWorker = new Worker(wqName, async (job) => {'
data = data.replace(old, new)

with open(r"C:\Users\wei.gu\Documents\demogo\server\src\server.js", "wb") as f:
    f.write(data)
print("Fixed")
