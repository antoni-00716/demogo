import urllib.request, re
req = urllib.request.Request("https://demogo.cn/app.html")
resp = urllib.request.urlopen(req)
html = resp.read().decode("utf-8")
match = re.search(r'src="(/assets/main-[^"]+\.js)"', html)
if match:
    js_url = "https://demogo.cn" + match.group(1)
    req2 = urllib.request.Request(js_url)
    resp2 = urllib.request.urlopen(req2)
    js = resp2.read().decode("utf-8")
    checks = [
        ("agent-section-label", "NEW section label"),
        ("agent-mode-selector", "mode selector"),
        ("agent-token-hint", "token hint"),
        ("agent-step-num", "OLD step cards (should be gone)"),
        ("agent-token-bar", "OLD token bar (should be gone)"),
    ]
    for pattern, desc in checks:
        found = pattern in js
        print(f"{'FOUND' if found else 'NOT'} - {desc}")
    print(f"JS bundle: {js_url}")
else:
    print("Could not find JS bundle")
