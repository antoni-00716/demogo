with open(r"C:\Users\wei.gu\Documents\demogo\server\src\server.js", "rb") as f:
    data = f.read()
idx = data.find(b"wqName")
if idx >= 0:
    for i in range(max(0, idx-20), min(len(data), idx+120)):
        pass
    print(repr(data[idx:idx+150]))
