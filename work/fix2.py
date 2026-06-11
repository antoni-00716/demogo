with open(r"C:\Users\wei.gu\Documents\demogo\server\src\server.js", "rb") as f:
    data = f.read()

# Fix: clean up extra space in import
data = data.replace(b"isExpired , getArchivedDemoDir", b"isExpired, getArchivedDemoDir")

# Fix: add getArchivedDemoDir to registerDemosRoutes deps (before restartDemoRuntime or writeTrialEvent)
old = b"    restartDemoRuntime,\r\n    writeTrialEvent: writeTrialEvent,"
new = b"    restartDemoRuntime,\r\n    getArchivedDemoDir,\r\n    writeTrialEvent: writeTrialEvent,"
if old in data:
    data = data.replace(old, new)
    print("Added getArchivedDemoDir to deps")
else:
    # Try LF
    old = b"    restartDemoRuntime,\n    writeTrialEvent: writeTrialEvent,"
    new = b"    restartDemoRuntime,\n    getArchivedDemoDir,\n    writeTrialEvent: writeTrialEvent,"
    if old in data:
        data = data.replace(old, new)
        print("Added getArchivedDemoDir to deps (LF)")
    else:
        print("Pattern not found, showing bytes around restartDemoRuntime")
        # Find the position
        idx = data.find(b"restartDemoRuntime")
        if idx >= 0:
            print(repr(data[idx-5:idx+60]))

with open(r"C:\Users\wei.gu\Documents\demogo\server\src\server.js", "wb") as f:
    f.write(data)
print("Done")
