path = r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js"
with open(path, "rb") as f:
    data = f.read()

# Fix line 1057-1059: Wrap deploy with resolveDeployment
old = b'    const deploy = await postZipWithBase(runtimeBaseUrl, "/api/deploy", runtimeZip, { name: "node-runtime-demo" });\r\n    deployId = deploy.id;\r\n    deploySlug = deploy.slug;'
new = b'    const deployRaw = await postZipWithBase(runtimeBaseUrl, "/api/deploy", runtimeZip, { name: "node-runtime-demo" });\r\n    const deploy = await resolveDeployment(deployRaw);\r\n    deployId = deploy.id;\r\n    deploySlug = deploy.slug;'

if old in data:
    data = data.replace(old, new)
    print("Fixed node runtime deploy handling")
else:
    print("Pattern not found - trying alt")
    # Try without \r\n
    old2 = b'    const deploy = await postZipWithBase(runtimeBaseUrl, "/api/deploy", runtimeZip, { name: "node-runtime-demo" });\n    deployId = deploy.id;\n    deploySlug = deploy.slug;'
    if old2 in data:
        data = data.replace(old2, new)
        print("Fixed (LF variant)")

with open(path, "wb") as f:
    f.write(data)
print("Done")
