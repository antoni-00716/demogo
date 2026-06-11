with open(r"C:\Users\wei.gu\Documents\demogo\server\src\server.js", "rb") as f:
    data = f.read()
# Find all occurrences
import re
for m in re.finditer(rb"const (?:inProcessWorker|wqName)", data):
    start = m.start()
    end = min(len(data), start + 100)
    line_num = data[:start].count(b"\n") + 1
    print(f"Line {line_num}: {data[start:end]!r}")
