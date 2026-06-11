path = r"C:\Users\wei.gu\Documents\demogo\server\src\tests\build-service.test.mjs"
with open(path, "rb") as f:
    data = f.read()

# Replace: \xe9\x94\x98\xe7\xb8\xa3ello -> \xef\xbb\xbfhello (actual BOM + hello)
old = b'\xe9\x94\x98\xe7\xb8\xa3ello'
new = b'\xef\xbb\xbfhello'
data = data.replace(old, new)

with open(path, "wb") as f:
    f.write(data)
print("Fixed")
