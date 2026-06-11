import urllib.request, json, http.cookiejar
BASE = "http://127.0.0.1:3001"
CJ = http.cookiejar.CookieJar()
OPENER = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CJ))

# First request - capture response headers for cookies
req = urllib.request.Request(BASE + "/api/health")
resp = OPENER.open(req)
print("Response headers:")
for k,v in resp.headers.items():
    if 'cookie' in k.lower() or 'set' in k.lower():
        print(f"  {k}: {v}")
print(f"Cookie jar: {[f'{c.name}={c.value[:12]} domain={c.domain} path={c.path}' for c in CJ]}")
print()

# Second request to same URL - check if cookies are sent
class DebugProcessor(urllib.request.BaseHandler):
    def http_request(self, req):
        print(f"Request to {req.full_url}")
        print(f"  Headers: {dict(req.headers)}")
        return req
OPENER2 = urllib.request.build_opener(DebugProcessor, urllib.request.HTTPCookieProcessor(CJ))
resp2 = OPENER2.open(urllib.request.Request(BASE + "/api/health"))
print(f"Cookie jar after: {[f'{c.name}={c.value[:12]} domain={c.domain} path={c.path}' for c in CJ]}")
