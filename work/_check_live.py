import urllib.request, re
req = urllib.request.Request("https://demogo.cn/app.html")
resp = urllib.request.urlopen(req)
html = resp.read().decode("utf-8")
match = re.search(r'src="(/assets/main-[^"]+\.js)"', html)
if match:
    js_url = "https://demogo.cn" + match.group(1)
    print("JS bundle:", js_url)
    req2 = urllib.request.Request(js_url)
    resp2 = urllib.request.urlopen(req2)
    js = resp2.read().decode("utf-8")
    checks = [
        ("agent-step-block", "NEW step block layout"),
        ("agent-step-dot", "NEW step dots"),
        ("agent-step-connector", "NEW connectors"),
        ("agent-token-card", "OLD token card (should be gone)"),
        ("agent-onboarding-icon", "OLD onboarding icon")
    ]
    for pattern, desc in checks:
        found = pattern in js
        print(f"{'FOUND' if found else 'NOT'}  {desc}")
else:
    print("Could not find JS bundle")
