"""Comprehensive smoke test hitting every API endpoint the frontend uses."""

import json
import urllib.request
import urllib.error
import sys

BASE = "http://localhost:8000"


def post(path, body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers)
    try:
        resp = urllib.request.urlopen(req)
        return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body_text = e.read().decode() if e.fp else ""
        return e.code, body_text


def get(path, token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{BASE}{path}", headers=headers)
    try:
        resp = urllib.request.urlopen(req)
        return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body_text = e.read().decode() if e.fp else ""
        return e.code, body_text


def login(email, password):
    status, data = post("/api/auth/login", {"email": email, "password": password})
    if status == 200:
        return data.get("access_token") or data.get("token")
    print(f"  FAIL login {email}: {status} {data}")
    return None


results = []


def check(label, status, data, expected=200):
    ok = status == expected
    count = ""
    if ok and isinstance(data, list):
        count = f" ({len(data)} items)"
    elif ok and isinstance(data, dict):
        if "items" in data:
            count = f" ({len(data['items'])} items)"
        elif "orders" in data:
            count = f" ({len(data['orders'])} orders)"
    symbol = "✅" if ok else "❌"
    print(f"  {symbol} {label}: {status}{count}")
    if not ok:
        detail = str(data)[:200] if data else "no body"
        print(f"     → {detail}")
    results.append(ok)


# ── Auth ──
print("🔑 Auth:")
admin_token = login("admin@sparehub.in", "admin123")
buyer_token = login("buyer.mumbai@sparehub.in", "buyer123")
supplier_token = login("supplier.thane@sparehub.in", "supplier123")
check("Admin login", 200 if admin_token else 0, {}, 200)
check("Buyer login", 200 if buyer_token else 0, {}, 200)
check("Supplier login", 200 if supplier_token else 0, {}, 200)

# ── Users (admin) ──
print("\n👤 Users:")
s, d = get("/api/users", admin_token)
check("GET /api/users", s, d)

# ── Orders ──
print("\n📋 Orders:")
s, d = get("/api/orders", admin_token)
check("GET /api/orders (admin)", s, d)
s, d = get("/api/orders", buyer_token)
check("GET /api/orders (buyer)", s, d)

# ── Single order ──
s, d = get("/api/orders/1", admin_token)
check("GET /api/orders/1", s, d)

# ── Deliveries ──
print("\n🚚 Deliveries:")
s, d = get("/api/deliveries", admin_token)
check("GET /api/deliveries (admin)", s, d)
s, d = get("/api/deliveries", supplier_token)
check("GET /api/deliveries (supplier)", s, d)

# ── Delivery stats ──
s, d = get("/api/deliveries/stats", admin_token)
check("GET /api/deliveries/stats", s, d)

# ── Suppliers ──
print("\n🏭 Suppliers:")
s, d = get("/api/suppliers", admin_token)
check("GET /api/suppliers", s, d)

s, d = get("/api/suppliers/1", admin_token)
check("GET /api/suppliers/1", s, d)

s, d = get("/api/suppliers/1/catalog?page=1&page_size=20", admin_token)
check("GET /api/suppliers/1/catalog", s, d)

s, d = get("/api/suppliers/me", supplier_token)
check("GET /api/suppliers/me", s, d)

# ── Inventory ──
print("\n📦 Inventory:")
s, d = get("/api/inventory/categories", admin_token)
check("GET /api/inventory/categories", s, d)

s, d = get("/api/inventory/low-stock", supplier_token)
check("GET /api/inventory/low-stock", s, d)

s, d = get("/api/inventory/mine?page=1&page_size=20", supplier_token)
check("GET /api/inventory/mine", s, d)

# ── Matching ──
print("\n🔗 Matching:")
s, d = get("/api/matching/config", admin_token)
check("GET /api/matching/config", s, d)

s, d = get("/api/matching/orders/placed", admin_token)
check("GET /api/matching/orders/placed", s, d)

# ── Analytics ──
print("\n📊 Analytics:")
s, d = get("/api/analytics/kpis", admin_token)
check("GET /api/analytics/kpis", s, d)

s, d = get("/api/analytics/demand", admin_token)
check("GET /api/analytics/demand", s, d)

s, d = get("/api/analytics/routes", admin_token)
check("GET /api/analytics/routes", s, d)

s, d = get("/api/analytics/suppliers", admin_token)
check("GET /api/analytics/suppliers", s, d)

s, d = get("/api/analytics/geo", admin_token)
check("GET /api/analytics/geo", s, d)

# ── Admin Dashboard ──
print("\n🏠 Admin Dashboard:")
s, d = get("/api/admin/dashboard", admin_token)
check("GET /api/admin/dashboard", s, d)

# ── Notifications ──
print("\n🔔 Notifications:")
s, d = get("/api/notifications", admin_token)
check("GET /api/notifications (admin)", s, d)

s, d = get("/api/notifications", buyer_token)
check("GET /api/notifications (buyer)", s, d)

s, d = get("/api/notifications", supplier_token)
check("GET /api/notifications (supplier)", s, d)

s, d = get("/api/notifications/unread-count", buyer_token)
check("GET /api/notifications/unread-count", s, d)

# ── Notification Templates ──
print("\n📄 Notification Templates:")
s, d = get("/api/notifications/templates", admin_token)
check("GET /api/notifications/templates", s, d)

# ── Summary ──
passed = sum(results)
total = len(results)
print(f"\n{'=' * 40}")
print(f"Results: {passed}/{total} passed")
if passed == total:
    print("🎉 All endpoints working!")
else:
    print(f"⚠ {total - passed} endpoint(s) failed")
    sys.exit(1)
