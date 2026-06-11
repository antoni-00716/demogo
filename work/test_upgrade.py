import urllib.request, json, http.cookiejar
BASE = "http://127.0.0.1:3001"
def get_csrf():
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    opener.open(urllib.request.Request(BASE + "/api/health"))
    for c in cj:
        if c.name == "csrf_token": return c.value
    return ""
def api(method, path, data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token: headers["x-csrf-token"] = token
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(BASE + path, data=body, headers=headers, method=method)
    try:
        return json.loads(urllib.request.urlopen(req).read().decode())
    except urllib.error.HTTPError as e:
        return {"error": str(e.code), "body": e.read().decode()[:300]}
csrf = get_csrf()
print("CSRF:", csrf[:10] if csrf else "NONE")
r = api("POST", "/api/plan-upgrade-requests", {"plan": "lite", "contact": "QQ: 304598006", "message": "test"}, token=csrf)
print("Response:", json.dumps(r, indent=2, ensure_ascii=False))
