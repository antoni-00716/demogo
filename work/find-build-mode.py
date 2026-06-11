with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "rb") as f:
    data = f.read()
# Find DEMOGO_BUILD_MODE
idx = data.find(b"DEMOGO_BUILD_MODE")
if idx >= 0:
    for i in range(idx-5, min(len(data), idx+80)):
        pass
    print(repr(data[idx-20:idx+80]))
