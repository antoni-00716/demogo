path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\dashboard\AgentPublishPanel.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix 1: Make generate button full width
old1 = '<Button variant="primary" onClick={handleGenerate} disabled={!canGenerate}>\n              <Wand2 size={16} /> 生成发布指令\n              </Button>'
new1 = '<Button variant="primary" onClick={handleGenerate} disabled={!canGenerate} style={{ width: "100%", justifyContent: "center", minHeight: 44 }}>\n              <Wand2 size={18} /> 生成发布指令\n              </Button>'
content = content.replace(old1, new1)

# Fix 2: Make copy button full width
old2 = '<Button variant="primary" onClick={() => copyToClipboard(generatedInstruction, setCopiedInstruction)}>\n                {copiedInstruction ? <><CheckCircle2 size={16} /> 已复制</> : <><Copy size={16} /> 复制给 AI</>}\n                </Button>'
new2 = '<Button variant="primary" onClick={() => copyToClipboard(generatedInstruction, setCopiedInstruction)} style={{ width: "100%", justifyContent: "center", minHeight: 44 }}>\n                {copiedInstruction ? <><CheckCircle2 size={18} /> 已复制</> : <><Copy size={18} /> 复制给 AI</>}\n                </Button>'
content = content.replace(old2, new2)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Buttons updated to full width")
