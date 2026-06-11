import urllib.request, re
req = urllib.request.Request("https://demogo.cn/app.html")
resp = urllib.request.urlopen(req)
html = resp.read().decode("utf-8")
match = re.search(r'src="(/assets/main-[^"]+\.js)"', html)
if match:
    js_url = "https://demogo.cn" + match.group(1)
    print("JS:", js_url)
    req2 = urllib.request.Request(js_url)
    resp2 = urllib.request.urlopen(req2)
    js = resp2.read().decode("utf-8")
    for p, d in [
        ("ag-step", "ag-step block"),
        ("ag-step-dot", "ag-step-dot"),
        ("ag-step-arrow", "ag-step-arrow"),
        ("ag-mode-btn", "ag-mode-btn"),
        ("ag-token-row", "ag-token-row"),
        ("ag-result", "ag-result"),
        ("ag-tools", "ag-tools"),
    ]:
        print(f"{'FOUND' if p in js else 'MISSING'}  {d}")
