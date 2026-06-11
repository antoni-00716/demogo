with open(r"C:\Users\wei.gu\Documents\demogo\server\src\server.js", "rb") as f:
    data = f.read()

# 1. Find the import from slug-utils.js
import_line = None
lines = data.split(b"\n")
for i, line in enumerate(lines):
    if b"slug-utils" in line and b"import" in line:
        print(f"Found import at line {i+1}: {line.decode('utf-8', errors='replace')[:120]}")
        import_line = line
        break

if import_line:
    # Check if getArchivedDemoDir is already in the import
    if b"getArchivedDemoDir" in import_line:
        print("getArchivedDemoDir already imported")
    else:
        # Add it to the import list
        # Find the closing brace
        old = import_line
        # Insert getArchivedDemoDir before platformHost or at the end
        new = old.replace(b"platformHost", b"getArchivedDemoDir, platformHost")
        if new == old:
            # Try other patterns
            new = old.replace(b"} from", b", getArchivedDemoDir } from")
        if new != old:
            data = data.replace(old, new)
            print("Added getArchivedDemoDir to import")

# 2. Find registerDemosRoutes call and add getArchivedDemoDir
old_call = b"    restartDemoRuntime,\n    writeTrialEvent: writeTrialEvent,"
new_call = b"    restartDemoRuntime,\n    getArchivedDemoDir,\n    writeTrialEvent: writeTrialEvent,"
if old_call in data:
    data = data.replace(old_call, new_call)
    print("Added getArchivedDemoDir to registerDemosRoutes deps")
else:
    print("registerDemosRoutes pattern not found")

with open(r"C:\Users\wei.gu\Documents\demogo\server\src\server.js", "wb") as f:
    f.write(data)
print("Done")
