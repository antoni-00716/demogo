with open(r"C:\Users\wei.gu\Documents\demogo\server\src\server.js", "rb") as f:
    data = f.read()
lines = data.split(b"\n")
for i in range(385, 420):
    if i < len(lines):
        print(f"{i+1}: {lines[i].decode('utf-8', errors='replace')[:200]}")
