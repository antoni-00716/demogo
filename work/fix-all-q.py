with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "rb") as f:
    data = f.read()

# Find all DEMOGO_BUILD_MODE positions and which ones lack DEMOGO_QUEUE_NAME
positions = []
start = 0
while True:
    idx = data.find(b"DEMOGO_BUILD_MODE", start)
    if idx < 0:
        break
    # Check if DEMOGO_QUEUE_NAME is within next 500 bytes
    if b"DEMOGO_QUEUE_NAME" not in data[idx:idx+500]:
        positions.append(idx)
    start = idx + 1

print(f"Missing QUEUE_NAME at {len(positions)} spawn blocks")

# For each missing, add before CSRF_DISABLED
old = b'DEMOGO_CSRF_DISABLED: "1",\n    DEMOGO_RUNTIME_ENABLED'
new = b'DEMOGO_QUEUE_NAME: "demogo-smoke-test",\n    DEMOGO_CSRF_DISABLED: "1",\n    DEMOGO_RUNTIME_ENABLED'
data = data.replace(old, new)

with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "wb") as f:
    f.write(data)
print("Fixed remaining spawn blocks")
