with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "rb") as f:
    data = f.read()
lines = data.split(b"\n")
issues = []
for i, line in enumerate(lines):
    s = line.decode('utf-8', errors='replace')
    if 'deployId = deploy.id' in s or 'deploySlug = deploy.slug' in s:
        # Check if resolveDeployment is in the 3 preceding lines
        found = False
        for j in range(max(0, i-3), i):
            if b'resolveDeployment' in lines[j]:
                found = True
                break
        if not found:
            issues.append(f"Line {i+1}: {s.strip()[:100]}")
for iss in issues:
    print(iss)
if not issues:
    print("All deploy.id accesses are properly wrapped with resolveDeployment")
