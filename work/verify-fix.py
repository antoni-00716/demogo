with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "rb") as f:
    data = f.read()
# Check the node runtime deploy area
idx = data.find(b"testNodeRuntimeWithHostDriver")
print(repr(data[idx:idx+120]))
idx2 = data.find(b"resolveDeployment(deployRaw)", idx)
if idx2 > 0 and idx2 < idx + 500:
    print("resolveDeployment fix is in place")
else:
    print("WARNING: resolveDeployment fix might be missing!")
