import re
with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\build-service.test.mjs", "rb") as f:
    data = f.read()
lines = data.split(b"\n")
line34 = lines[33]
print(repr(line34))
m = re.search(rb'svc.stripBom\("(.+?)"', line34)
if m:
    arg = m.group(1)
    print(f"arg bytes: {arg!r}")
    print(f"arg decoded: {arg.decode('utf-8')!r}")
