with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\integration-test.mjs", "rb") as f:
    data = f.read()

# Undo my wrong fix: slugUpdate.demo?.slug -> slugUpdate.data.demo?.slug
old = b"slugUpdate.demo?.slug"
new = b"slugUpdate.data.demo?.slug"
if old in data:
    data = data.replace(old, new)
    print("Restored .data.demo?.slug")
else:
    print("Pattern not found")

# Also remove debug log
old2 = b'  console.log("SLUG_UPDATE_RESPONSE:", JSON.stringify(slugUpdate).slice(0, 500));\n  assert.ok(slugUpdate.data.demo?.slug === "pro-custom-link", "slug should be updated");'
new2 = b'  assert.ok(slugUpdate.data.demo?.slug === "pro-custom-link", "slug should be updated");'
if old2 in data:
    data = data.replace(old2, new2)
    print("Removed debug log")
else:
    print("Debug log pattern not found")

with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\integration-test.mjs", "wb") as f:
    f.write(data)
print("Done")
