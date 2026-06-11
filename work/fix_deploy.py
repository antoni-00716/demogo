import os

fp = r"C:\Users\wei.gu\Documents\demogo\server\src\services\deployment-job-service.js"

with open(fp, 'r', encoding='utf-8') as f:
    c = f.read()

# Replacements from longest to shortest to avoid partial matches
fixes = [
    # Step messages (L23-31) - specific full-line patterns
    ('["receive", "success", "??????"]', '["receive", "success", "\u6587\u4ef6\u5df2\u63a5\u6536"]'),
    ('["extract", "pending", "????????"]', '["extract", "pending", "\u6b63\u5728\u89e3\u538b\u9879\u76ee\u6587\u4ef6"]'),
    ('["security_check", "pending", "??????"]', '["security_check", "pending", "\u6b63\u5728\u5b89\u5168\u68c0\u67e5"]'),
    ('["inspect", "pending", "????????"]', '["inspect", "pending", "\u6b63\u5728\u5206\u6790\u9879\u76ee\u7ed3\u6784"]'),
    ('["build", "pending", "??????"]', '["build", "pending", "\u6b63\u5728\u6784\u5efa\u9879\u76ee"]'),
    ('["content_review", "pending", "????????"]', '["content_review", "pending", "\u6b63\u5728\u5185\u5bb9\u5ba1\u6838"]'),
    ('["form_hosting", "pending", "????????"]', '["form_hosting", "pending", "\u6b63\u5728\u8bc6\u522b\u8868\u5355"]'),
    ('["publish", "pending", "??????"]', '["publish", "pending", "\u6b63\u5728\u751f\u6210\u94fe\u63a5"]'),
    ('["success", "pending", "????????"]', '["success", "pending", "\u94fe\u63a5\u751f\u6210\u5b8c\u6210"]'),
    
    # Job creation message (L220)
    ('"??????????????"', '"\u4efb\u52a1\u5df2\u63d0\u4ea4\uff0c\u7b49\u5f85\u670d\u52a1\u5668\u5904\u7406"'),
    
    # Job running message (L246)
    ('"DemoGo ???????????????????"', '"DemoGo \u6b63\u5728\u5904\u7406\u4f60\u7684\u9879\u76ee\uff0c\u8bf7\u7a0d\u5019"'),
    
    # User not found error (L254)
    ('"?????????????????"', '"\u672a\u627e\u5230\u7528\u6237\u4fe1\u606f\uff0c\u65e0\u6cd5\u7ee7\u7eed\u90e8\u7f72"'),
    
    # Job success message - update (L287)
    ('job.action === "update" ? "?????????????????" : "?????????????????"',
     'job.action === "update" ? "\u9879\u76ee\u66f4\u65b0\u6210\u529f\uff0c\u94fe\u63a5\u5df2\u5237\u65b0" : "\u9879\u76ee\u90e8\u7f72\u6210\u529f\uff0c\u94fe\u63a5\u5df2\u751f\u6210"'),
    
    # Job failure message (L297)
    ('"????????????????"', '"\u90e8\u7f72\u5931\u8d25\uff0c\u8bf7\u67e5\u770b\u8bca\u65ad\u4fe1\u606f"'),
    
    # Status labels - in deploymentJobStatusLabel function (L144-148)
    ('status === "queued") return "????"', 'status === "queued") return "\u6392\u961f\u4e2d"'),
    ('status === "running") return "????"', 'status === "running") return "\u6267\u884c\u4e2d"'),
    ('status === "success") return "???"', 'status === "success") return "\u6210\u529f"'),
    ('status === "failed") return "????"', 'status === "failed") return "\u5931\u8d25"'),
    ('return "????"', 'return "\u672a\u77e5"'),
    
    # job creation statusLabel and message (L219-220)
    ('statusLabel: "????"', 'statusLabel: "\u6392\u961f\u4e2d"'),
    ('statusLabel: "????"', 'statusLabel: "\u6267\u884c\u4e2d"'),
    ('statusLabel: "???"', 'statusLabel: "\u6210\u529f"'),
    
    # Generic error (L69)
    ('error.message : "????"', 'error.message : "\u672a\u77e5\u9519\u8bef"'),
]

for old, new in fixes:
    if old in c:
        c = c.replace(old, new)
    else:
        # Try without the outer quotes
        print(f"  WARN not found: {old[:60]}")

# Final check for any remaining ????
remaining = c.count('????')
if remaining:
    # Find all remaining ???? lines
    for i, line in enumerate(c.split('\n')):
        if '????' in line:
            print(f"  REMAINING L{i+1}: {line.strip()[:100]}")

with open(fp, 'w', encoding='utf-8') as f:
    f.write(c)

print(f"Done. Remaining ????: {c.count('????')}")
print(f"Remaining U+FFFD: {c.count(chr(0xfffd))}")
