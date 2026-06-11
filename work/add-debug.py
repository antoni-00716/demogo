path = r"C:\Users\wei.gu\Documents\demogo\server\src\tests\integration-test.mjs"
with open(path, "rb") as f:
    data = f.read()

old = b'  assert.ok(slugUpdate.demo?.slug === "pro-custom-link", "slug should be updated");'
new = b'  console.log("SLUG_UPDATE_RESPONSE:", JSON.stringify(slugUpdate).slice(0, 500));\n  assert.ok(slugUpdate.demo?.slug === "pro-custom-link", "slug should be updated");'
data = data.replace(old, new)

with open(path, "wb") as f:
    f.write(data)
print("Added debug log")
