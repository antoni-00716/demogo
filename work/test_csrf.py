import urllib.request, json, http.cookiejar

BASE = "http://127.0.0.1:3001"
CJ = http.cookiejar.CookieJar()
OPENER = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CJ))

def dump_cookies(msg):
    print(f"  Cookies {msg}:")
    for c in CJ: print(f"    {c.name}={c.value} path={c.path} domain={c.domain}")

# Step 1: Health check to get CSRF cookie
print("Step 1: GET /api/health")
OPENER.open(urllib.request.Request(BASE + "/api/health"))
dump_cookies("after health")

# Step 2: Try plan-upgrade with CSRF token
csrf = None
for c in CJ:
    if c.name == "csrf_token": csrf = c.value
print(f"  CSRF token: {csrf[:15] if csrf else 'NONE'}")

print("\nStep 2: POST /api/plan-upgrade-requests")
data = json.dumps({"plan":"lite","contact":"QQ: 304598006","message":"test"}).encode()
req = urllib.request.Request(BASE + "/api/plan-upgrade-requests", data=data, headers={"Content-Type":"application/json","x-csrf-token": csrf or ""}, method="POST")
try:
    resp = json.loads(OPENER.open(req).read().decode())
    print(f"  Response: {resp}")
except urllib.error.HTTPError as e:
    print(f"  Error {e.code}: {e.read().decode()[:200]}")
dump_cookies("after request")
