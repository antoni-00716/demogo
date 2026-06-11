with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "rb") as f:
    data = f.read()
# Count DEMOGO_BUILD_MODE occurrences
count = data.count(b"DEMOGO_BUILD_MODE")
print(f"DEMOGO_BUILD_MODE: {count} occurrences")
count2 = data.count(b"DEMOGO_QUEUE_NAME")
print(f"DEMOGO_QUEUE_NAME: {count2} occurrences")
