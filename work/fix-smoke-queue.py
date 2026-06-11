with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "rb") as f:
    data = f.read()

# Add DEMOGO_QUEUE_NAME to the main smoke test server spawn env
old = b"      DEMOGO_BUILD_MODE: \"host\",\n      DEMOGO_CSRF_DISABLED: \"1\","
new = b"      DEMOGO_BUILD_MODE: \"host\",\n      DEMOGO_QUEUE_NAME: \"demogo-smoke-test\",\n      DEMOGO_CSRF_DISABLED: \"1\","
count = data.count(old)
data = data.replace(old, new)
print(f"Replaced {count} occurrences")

with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "wb") as f:
    f.write(data)
print("Done")
