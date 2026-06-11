with open(r"C:\Users\wei.gu\Documents\demogo\server\src\server.js", "rb") as f:
    data = f.read()

idx = data.find(b"const inProcessWorker = new Worker(wqName")
if idx >= 0:
    # Find start of this line
    line_start = data.rfind(b"\n", 0, idx) + 1
    # Replace just this line to add the wqName declaration
    line_end = data.find(b"\n", idx)
    old_line = data[line_start:line_end]
    new_line = b"const wqName = process.env.DEMOGO_QUEUE_NAME || \"demogo-deployments\";\n  const inProcessWorker = new Worker(wqName, async (job) => {"
    data = data[:line_start] + new_line + data[line_end+1:]
    
    with open(r"C:\Users\wei.gu\Documents\demogo\server\src\server.js", "wb") as f:
        f.write(data)
    print("Fixed properly")
else:
    print("Pattern not found")
