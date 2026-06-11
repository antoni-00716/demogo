with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "rb") as f:
    data = f.read()

# For the runtime spawn blocks, add QUEUE_NAME after BUILD_MODE
# Pattern: DEMOGO_BUILD_MODE: "host",\n      DEMOGO_RUNTIME_ENABLED
# But only where QUEUE_NAME is not already present
old = b'DEMOGO_BUILD_MODE: "host",\n      DEMOGO_RUNTIME_ENABLED'
new = b'DEMOGO_BUILD_MODE: "host",\n      DEMOGO_QUEUE_NAME: "demogo-smoke-test",\n      DEMOGO_RUNTIME_ENABLED'

fixed = 0
search_start = 0
while True:
    idx = data.find(old, search_start)
    if idx < 0:
        break
    prefix = data[max(0, idx-100):idx]
    if b"DEMOGO_QUEUE_NAME" not in prefix:
        data = data[:idx] + new + data[idx+len(old):]
        fixed += 1
        search_start = idx + len(new)
    else:
        search_start = idx + 1
print(f"Fixed {fixed} occurrences")

with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "wb") as f:
    f.write(data)
print("Done")
