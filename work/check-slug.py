with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\integration-test.mjs", "rb") as f:
    data = f.read()
lines = data.split(b"\n")
print(f"Line 448: {lines[447]!r}")
# Search for all occurrences
count = data.count(b"slugUpdate")
print(f"slugUpdate count: {count}")
for i, line in enumerate(lines):
    if b"slugUpdate" in line:
        print(f"  Line {i+1}: {line!r}")
