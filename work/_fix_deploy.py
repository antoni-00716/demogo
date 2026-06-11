path = r"C:\Users\wei.gu\Documents\demogo\server\src\services\deployment-executor.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix: re-check hasPackageJson after promoteDirectory in the "else" branch (no build script) 
# and after the build+promote block

# Find the pattern and add re-check
old = """    // Determine hosting mode
    const hasHtml = await exists(path.join(targetDir, "index.html"));
    let hostingMode = hasHtml ? "static" : "unknown";

    // Detect Node.js runtime capability
    if (hasPackageJson) {
      const pkgRaw = await fs.readFile(path.join(targetDir, "package.json"), "utf8");"""

new = """    // Determine hosting mode
    const hasHtml = await exists(path.join(targetDir, "index.html"));
    let hostingMode = hasHtml ? "static" : "unknown";

    // Re-check package.json — it may have been removed by promoteDirectory during build
    const finalHasPackageJson = await exists(path.join(targetDir, "package.json"));

    // Detect Node.js runtime capability
    if (finalHasPackageJson) {
      const pkgRaw = await fs.readFile(path.join(targetDir, "package.json"), "utf8");"""

if old in content:
    content = content.replace(old, new)
    print("Fix applied: re-check package.json after build/promote")
else:
    print("Pattern not found - searching...")
    idx = content.find("Determine hosting mode")
    if idx > 0:
        print(content[idx:idx+300])

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
