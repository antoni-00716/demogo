with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "rb") as f:
    data = f.read()

# At byte 53838: testNodeRuntimeWithHostDriver spawn
idx1 = 53838
nearby1 = data[idx1-50:idx1+600]
print("Block 1:")
print(repr(nearby1[:200]))
print()

# Find the exact pattern to replace
# Look for the line before CSRF_DISABLED in each block
# Add DEMOGO_QUEUE_NAME right before CSRF_DISABLED
# But each block might be slightly different

# Strategy: for each occurrence of CSRF_DISABLED that's NOT preceded by QUEUE_NAME, add it
fixed = 0
old_patterns = [
    b'DEMOGO_CSRF_DISABLED: "1",\n      DEMOGO_RUNTIME_ENABLED',
    b'DEMOGO_CSRF_DISABLED: "1",\n        DEMOGO_RUNTIME_ENABLED',
    b'DEMOGO_CSRF_DISABLED: "1",\n    DEMOGO_RUNTIME_ENABLED',
]
for old in old_patterns:
    # Only replace if DEMOGO_QUEUE_NAME is not right before
    search_start = 0
    while True:
        idx = data.find(old, search_start)
        if idx < 0:
            break
        # Check if QUEUE_NAME was already added before this
        prefix = data[max(0, idx-100):idx]
        if b"DEMOGO_QUEUE_NAME" not in prefix:
            indent = b"      " if b"      DEMOGO_RUNTIME" in old else b"        "
            new_line = indent + b'DEMOGO_QUEUE_NAME: "demogo-smoke-test",\n'
            new_text = new_line + old
            data = data[:idx] + new_text + data[idx+len(old):]
            fixed += 1
            search_start = idx + len(new_text)
        else:
            search_start = idx + 1

print(f"Fixed {fixed} more occurrences")

with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "wb") as f:
    f.write(data)
print("Done")
