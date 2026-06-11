path = r"C:\Users\wei.gu\Documents\demogo\server\src\tests\integration-test.mjs"
with open(path, "rb") as f:
    data = f.read()

# Fix: slugUpdate.data.demo?.slug -> slugUpdate.demo?.slug
old = b"slugUpdate.data.demo?.slug"
new = b"slugUpdate.demo?.slug"
data = data.replace(old, new)

with open(path, "wb") as f:
    f.write(data)
print("Fixed slug assertion")
