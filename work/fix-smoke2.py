with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "rb") as f:
    data = f.read()

old = b'    const deploy = await postZipWithBase(runtimeBaseUrl, "/api/deploy", runtimeZip, { name: "node-runtime-demo" });\n    deployId = deploy.id;\n    deploySlug = deploy.slug;'
new = b'    const deployRaw = await postZipWithBase(runtimeBaseUrl, "/api/deploy", runtimeZip, { name: "node-runtime-demo" });\n    const deploy = await resolveDeployment(deployRaw);\n    deployId = deploy.id;\n    deploySlug = deploy.slug;'
data = data.replace(old, new)

with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "wb") as f:
    f.write(data)
print("Fixed node runtime deploy")
