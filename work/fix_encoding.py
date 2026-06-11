import os

base = r"C:\Users\wei.gu\Documents\demogo\web\src"

def fix_file(rel_path, replacements):
    full_path = os.path.join(base, rel_path)
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new in replacements:
        if old not in content:
            print(f"  WARNING: pattern not found in {rel_path}: {repr(old[:40])}")
        content = content.replace(old, new)
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  Fixed: {rel_path}")

# FeedbackPanel.tsx
fix_file(r"components\dashboard\FeedbackPanel.tsx", [
    ("          ????\r\n          <select className=\"select\" value={type}",
     "          问题类型\r\n          <select className=\"select\" value={type}"),
    ("          ????\r\n          <select className=\"select\" value={demoId}",
     "          关联项目\r\n          <select className=\"select\" value={demoId}"),
    ("          ????\r\n          <textarea className=\"textarea\"",
     "          问题描述\r\n          <textarea className=\"textarea\""),
])

# FormHostingPanel.tsx
fix_file(r"pages\dashboard\FormHostingPanel.tsx", [
    ("<p>DemoGo ??????????????????????????</p>",
     "<p>DemoGo 自动识别项目中的表单字段，帮你收集用户信息。</p>"),
    ("<p>??? {form.submissionCount || 0} ??? ? ??? {formatDate(form.createdAt)}</p>",
     "<p>已收到 {form.submissionCount || 0} 条提交 · {formatDate(form.createdAt)}</p>"),
    ("<Badge tone=\"success\">??</Badge>",
     "<Badge tone=\"success\">收集中</Badge>"),
])

# ProjectDetail.tsx
fix_file(r"pages\dashboard\ProjectDetail.tsx", [
    ("<dt>????</dt><dd>{demo.deploySourceLabel",
     "<dt>发布来源</dt><dd>{demo.deploySourceLabel"),
    ("<dt>????</dt><dd>{demo.hostingModeLabel",
     "<dt>托管方式</dt><dd>{demo.hostingModeLabel"),
    ("<dt>????</dt><dd>{demo.runtime?.statusLabel",
     "<dt>运行状态</dt><dd>{demo.runtime?.statusLabel"),
])

print("All done!")
