with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "rb") as f:
    data = f.read()
# Find function definition
idx = data.find(b"async function testNodeRuntimeWithHostDriver()")
if idx >= 0:
    # Show 200 bytes from there
    print(repr(data[idx:idx+300]))
    # Check for resolveDeployment within next 1500 bytes
    chunk = data[idx:idx+1500]
    if b"resolveDeployment" in chunk:
        print("\nresolveDeployment FOUND in function")
    else:
        print("\nresolveDeployment NOT found - searching for deploy pattern...")
        if b"deployRaw" in chunk:
            print("deployRaw found")
        else:
            print("deployRaw NOT found either")
