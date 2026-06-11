with open(r"C:\Users\wei.gu\Documents\demogo\server\src\server.js", "rb") as f:
    data = f.read()
lines = data.split(b"\n")
# Check line 54 area
for i in range(50, 60):
    if i < len(lines):
        print(f"{i+1}: {lines[i].decode('utf-8', errors='replace')[:150]}")
print("---")
# Check registerDemosRoutes area
for i in range(388, 410):
    if i < len(lines):
        print(f"{i+1}: {lines[i].decode('utf-8', errors='replace')[:200]}")
