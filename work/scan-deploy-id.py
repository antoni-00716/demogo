with open(r"C:\Users\wei.gu\Documents\demogo\server\src\tests\smoke-test.js", "rb") as f:
    data = f.read()
lines = data.split(b"\n")
# Find all "deploy.id" or "deploy.slug" that aren't preceded by resolveDeployment
for i, line in enumerate(lines):
    s = line.decode("utf-8", errors="replace")
    if "deploy.id" in s or "deploy.slug" in s:
        # Check if resolveDeployment is nearby (within 5 lines)
        ctx_start = max(0, i-3)
        ctx_end = min(len(lines), i+1)
        has_resolve = any(b"resolveDeployment" in lines[j] for j in range(ctx_start, i))
        marker = "OK" if has_resolve else "???"
        print(f"  {marker} Line {i+1}: {s.strip()[:120]}")
