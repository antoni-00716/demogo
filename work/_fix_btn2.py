path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\dashboard\AgentPublishPanel.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix generate button
old1 = '''            <Button variant="primary" onClick={handleGenerate} disabled={!canGenerate}>
              <Wand2 size={16} /> 生成发布指令
            </Button>'''
new1 = '''            <Button variant="primary" onClick={handleGenerate} disabled={!canGenerate} style={{ width: "100%", justifyContent: "center", minHeight: 44 }}>
              <Wand2 size={18} /> 生成发布指令
            </Button>'''
if old1 in content:
    content = content.replace(old1, new1)
    print("Generate button updated")
else:
    print("Generate button NOT found")

# Fix copy button
old2 = '''              <Button variant="primary" onClick={() => copyToClipboard(generatedInstruction, setCopiedInstruction)}>
                {copiedInstruction ? <><CheckCircle2 size={16} /> 已复制</> : <><Copy size={16} /> 复制给 AI</>}
              </Button>'''
new2 = '''              <Button variant="primary" onClick={() => copyToClipboard(generatedInstruction, setCopiedInstruction)} style={{ width: "100%", justifyContent: "center", minHeight: 44 }}>
                {copiedInstruction ? <><CheckCircle2 size={18} /> 已复制</> : <><Copy size={18} /> 复制给 AI</>}
              </Button>'''
if old2 in content:
    content = content.replace(old2, new2)
    print("Copy button updated")
else:
    print("Copy button NOT found")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
