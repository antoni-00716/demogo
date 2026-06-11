import urllib.request, json, os

BASE = "http://127.0.0.1:3001"
DATA_DIR = "/var/lib/demogo/data"

def api(method, path, data=None):
    url = BASE + path
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method=method)
    return json.loads(urllib.request.urlopen(req).read().decode())

# Send verification code
print("Sending verification code...")
resp = api("POST", "/api/auth/send-verification-code", {"email": "flow-test@demogo.cn", "password": "TestPass123!"})
print(f"Response: {resp}")

# Check the JSON file
fpath = os.path.join(DATA_DIR, "email-verifications.json")
print(f"Checking {fpath}...")
if os.path.exists(fpath):
    with open(fpath) as f:
        data = json.load(f)
    print(f"Found {len(data)} records")
    for item in reversed(data):
        if item.get("email") == "flow-test@demogo.cn":
            print(f"Latest code: {item.get('code')}")
            break
else:
    print("File does not exist!")
    # Check data dir permissions
    print(f"Data dir files: {os.listdir(DATA_DIR)}")
