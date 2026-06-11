with open(r"C:\Users\wei.gu\Documents\demogo\server\src\server.js", "rb") as f:
    data = f.read()
lines = data.split(b"\n")
for i, line in enumerate(lines):
    if b"registerDemoRoutes" in line:
        for j in range(i-2, i+30):
            if j < len(lines):
                print(f"{j+1}: {lines[j].decode('utf-8', errors='replace')[:150]}")
        print("---")
