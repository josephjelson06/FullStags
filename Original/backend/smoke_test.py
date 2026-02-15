"""Quick smoke test to verify seeded data via API."""

import json
import urllib.request
import urllib.error

BASE = "http://localhost:8000"


def api(method, path, body=None, headers=None):
    url = BASE + path
    data = json.dumps(body).encode() if body else None
    hdrs = {"Content-Type": "application/json"}
    if headers:
        hdrs.update(headers)
    req = urllib.request.Request(url, data=data, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body_text = e.read().decode() if e.fp else ""
        print(f"  ERROR {e.code} on {method} {path}: {body_text[:200]}")
        return None


# Login as admin
r = api(
    "POST", "/api/auth/login", {"email": "admin@sparehub.in", "password": "admin123"}
)
token = r["access_token"]
h = {"Authorization": f"Bearer {token}"}
print("Admin login OK")

# Users
users = api("GET", "/api/users", headers=h)
print(f"Users: {len(users)}")

# Orders
orders_resp = api("GET", "/api/orders", headers=h)
if orders_resp:
    orders = (
        orders_resp.get("orders", orders_resp)
        if isinstance(orders_resp, dict)
        else orders_resp
    )
    print(f"Orders: {len(orders)}")
    for o in orders:
        print(f"   #{o['id']} status={o['status']} urgency={o['urgency']}")

# Deliveries
deliveries = api("GET", "/api/deliveries", headers=h)
if deliveries:
    print(f"Deliveries: {len(deliveries)}")
    for d in deliveries:
        print(f"   #{d['id']} status={d['status']} dist={d['total_distance_km']:.1f}km")

# Notifications
notifs = api("GET", "/api/notifications", headers=h)
if notifs:
    print(f"Notifications: {len(notifs)}")

# Matching config
config = api("GET", "/api/matching/config", headers=h)
if config:
    print(f"Matching config tiers: {list(config.keys())}")

# Suppliers
suppliers = api("GET", "/api/suppliers", headers=h)
if suppliers:
    print(f"Suppliers: {len(suppliers)}")

# Supplier catalog
if suppliers:
    sid = suppliers[0]["id"]
    catalog = api("GET", f"/api/suppliers/{sid}/catalog", headers=h)
    if catalog:
        print(f"Supplier {sid} catalog items: {catalog.get('total', len(catalog))}")

# Buyer login
r2 = api(
    "POST",
    "/api/auth/login",
    {"email": "buyer.mumbai@sparehub.in", "password": "buyer123"},
)
if r2:
    print("Buyer login OK")

# Supplier login
r3 = api(
    "POST",
    "/api/auth/login",
    {"email": "supplier.thane@sparehub.in", "password": "supplier123"},
)
if r3:
    print("Supplier login OK")

print("\nDone!")
