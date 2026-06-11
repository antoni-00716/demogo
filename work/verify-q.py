with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "rb") as f:
    data = f.read()
print(f"DEMOGO_BUILD_MODE: {data.count(b'DEMOGO_BUILD_MODE')}")
print(f"DEMOGO_QUEUE_NAME: {data.count(b'DEMOGO_QUEUE_NAME')}")
