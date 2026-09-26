import urllib.request
import json

BASE = "http://127.0.0.1:8000"

def get(path, headers=None):
    req = urllib.request.Request(f"{BASE}{path}", headers=headers or {})
    with urllib.request.urlopen(req) as resp:
        return resp.status, resp.headers.get_content_type(), resp.read()

def post(path, data, headers=None):
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(f"{BASE}{path}", data=json.dumps(data).encode("utf-8"), headers=req_headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        return resp.status, resp.headers.get_content_type(), resp.read()

print("--- Testing ML Service API & SDK ---")

# 1. Root
status, ctype, body = get("/")
print(f"1. Root [/]: status={status}, body={body.decode('utf-8')}")
assert status == 200

# 2. Key validate default
status, ctype, body = get("/api-keys/validate", {"X-API-Key": "bio_live_default_lms_key"})
data = json.loads(body)
print(f"2. Validate Default Key: tenant_id={data.get('tenant_id')}")
assert data.get("tenant_id") == "default"

# 3. Key validate custom tenant
status, ctype, body = get("/api-keys/validate", {"X-API-Key": "bio_live_acme_university"})
data = json.loads(body)
print(f"3. Validate Custom Tenant: tenant_id={data.get('tenant_id')}")
assert data.get("tenant_id") == "acme_university"

# 4. SDK Script Delivery
status, ctype, body = get("/sdk.js")
print(f"4. SDK Delivery [/sdk.js]: status={status}, ctype={ctype}, size={len(body)} bytes")
assert status == 200
assert "application/javascript" in ctype
assert b"BioAuth" in body

# 5. Demo Page Delivery
status, ctype, body = get("/demo")
print(f"5. Demo Delivery [/demo]: status={status}, ctype={ctype}, size={len(body)} bytes")
assert status == 200
assert "text/html" in ctype

# 6. Existing user 'vijay' status in default tenant
status, ctype, body = get("/users/vijay/status", {"X-API-Key": "bio_live_default_lms_key"})
data = json.loads(body)
print(f"6. Check existing student 'vijay': samples={data.get('samples_collected')}, state={data.get('state')}, tenant={data.get('tenant_id')}")
assert data.get("tenant_id") == "default"
assert data.get("samples_collected", 0) > 0

# 7. Check user 'vijay' in another tenant (e.g. acme_university) -> should be 0 samples (clean tenant isolation)
status, ctype, body = get("/users/vijay/status", {"X-API-Key": "bio_live_acme_university"})
data = json.loads(body)
print(f"7. Check 'vijay' in 'acme_university' tenant: samples={data.get('samples_collected')}, state={data.get('state')}, tenant={data.get('tenant_id')}")
assert data.get("tenant_id") == "acme_university"
assert data.get("samples_collected", 0) == 0

print("--> All 7 API Service tests passed successfully!")
