"""Live demo — all 7 scenarios."""
import requests, json

BASE = "http://localhost:8000/api"

def p(label, r):
    print(f"\n--- {label} ---")
    print(f"Status: {r.status_code}")
    print(json.dumps(r.json(), indent=2))
    return r.json()

print("=" * 60)
print("SCENARIO 1: AUTHENTICATION")
print("=" * 60)

p("Register a new buyer", requests.post(f"{BASE}/auth/register", json={
    "email": "demo_buyer@factory.com", "password": "securePass1",
    "name": "Demo Buyer", "role": "buyer", "companyName": "Demo Factory",
    "location": {"lat": 41.88, "lng": -87.63, "address": "100 Factory Ave, Chicago"}
}))

buyer = p("Login as seeded buyer", requests.post(f"{BASE}/auth/login", json={
    "email": "buyer@factory.com", "password": "password123"
}))
bt = buyer["token"]

sup = requests.post(f"{BASE}/auth/login", json={"email": "supplier@parts.com", "password": "password123"}).json()
st = sup["token"]

admin = requests.post(f"{BASE}/auth/login", json={"email": "admin@urgentparts.com", "password": "password123"}).json()
at = admin["token"]

p("Login with wrong password (expect 401)", requests.post(f"{BASE}/auth/login", json={
    "email": "buyer@factory.com", "password": "wrongpass1"
}))

print("\n" + "=" * 60)
print("SCENARIO 2: FULL ORDER LIFECYCLE (6 state transitions)")
print("=" * 60)

order = p("Buyer creates emergency order", requests.post(f"{BASE}/orders", json={
    "partName": "Hydraulic Pressure Sensor", "partNumber": "HPS-4420",
    "urgency": "critical",
    "deliveryLocation": {"lat": 41.88, "lng": -87.63, "address": "1400 Industrial Blvd, Gate 4"}
}, headers={"Authorization": f"Bearer {bt}"}))
oid = order["orderId"]

matches = p("View ranked supplier matches", requests.get(
    f"{BASE}/orders/{oid}/matches", headers={"Authorization": f"Bearer {bt}"}
))

if matches["matches"]:
    mid = matches["matches"][0]["matchId"]

    p("Buyer selects best supplier → pending_acceptance",
      requests.patch(f"{BASE}/orders/{oid}", json={"action": "select_supplier", "matchId": mid},
                     headers={"Authorization": f"Bearer {bt}"}))

    p("Supplier accepts → picking",
      requests.patch(f"{BASE}/orders/{oid}", json={"action": "accept"},
                     headers={"Authorization": f"Bearer {st}"}))

    p("Supplier marks ready → courier_to_supplier",
      requests.patch(f"{BASE}/orders/{oid}", json={"action": "ready"},
                     headers={"Authorization": f"Bearer {st}"}))

    p("Route tracking (courier simulation)",
      requests.get(f"{BASE}/orders/{oid}/route", headers={"Authorization": f"Bearer {bt}"}))

    p("Admin: courier picked up → courier_to_factory",
      requests.patch(f"{BASE}/orders/{oid}", json={"action": "courier_picked_up"},
                     headers={"Authorization": f"Bearer {at}"}))

    p("Buyer confirms delivery → delivered",
      requests.patch(f"{BASE}/orders/{oid}", json={"action": "delivered"},
                     headers={"Authorization": f"Bearer {bt}"}))

print("\n" + "=" * 60)
print("SCENARIO 3: ORDER DETAIL & LIST")
print("=" * 60)

p("Order detail (seeded delivered order)", requests.get(
    f"{BASE}/orders/ord_demo02", headers={"Authorization": f"Bearer {bt}"}
))

r = requests.get(f"{BASE}/orders?status=all&page=1&pageSize=5", headers={"Authorization": f"Bearer {bt}"})
data = r.json()
print(f"\n--- List buyer orders ---")
print(f"Total: {data['total']}, Page: {data['page']}")
for o in data["orders"][:3]:
    print(f"  {o['orderId']} | {o['status']:25s} | {o.get('partName') or 'N/A'}")

print("\n" + "=" * 60)
print("SCENARIO 4: INVENTORY CRUD")
print("=" * 60)

inv = p("List supplier inventory", requests.get(f"{BASE}/inventory", headers={"Authorization": f"Bearer {st}"}))
print(f"  → {inv['total']} items, pick time: {inv['pickTimeMinutes']}min")

created = p("Create new item", requests.post(f"{BASE}/inventory", json={
    "partName": "Emergency Coupling", "partNumber": "EC-9900", "quantity": 8, "price": 67.50
}, headers={"Authorization": f"Bearer {st}"}))

p("Update quantity & price", requests.patch(
    f"{BASE}/inventory/{created['itemId']}", json={"quantity": 5, "price": 72.00},
    headers={"Authorization": f"Bearer {st}"}))

p("Delete item", requests.delete(
    f"{BASE}/inventory/{created['itemId']}", headers={"Authorization": f"Bearer {st}"}))

print("\n" + "=" * 60)
print("SCENARIO 5: SUPPLIER PROFILE")
print("=" * 60)

p("Update pick time SLA to 25 min", requests.patch(
    f"{BASE}/suppliers/me", json={"pickTimeMinutes": 25},
    headers={"Authorization": f"Bearer {st}"}))

print("\n" + "=" * 60)
print("SCENARIO 6: ADMIN DASHBOARD")
print("=" * 60)

p("Admin KPI dashboard", requests.get(
    f"{BASE}/admin/dashboard", headers={"Authorization": f"Bearer {at}"}))

p("Dashboard blocked for buyer (expect 403)", requests.get(
    f"{BASE}/admin/dashboard", headers={"Authorization": f"Bearer {bt}"}))

print("\n" + "=" * 60)
print("SCENARIO 7: ERROR HANDLING")
print("=" * 60)

p("No auth token (expect 401)", requests.get(f"{BASE}/orders"))

p("Invalid state transition (expect 400)", requests.patch(
    f"{BASE}/orders/ord_demo02", json={"action": "accept"},
    headers={"Authorization": f"Bearer {st}"}))

p("Duplicate email (expect 409)", requests.post(f"{BASE}/auth/register", json={
    "email": "buyer@factory.com", "password": "password123",
    "name": "Dup", "role": "buyer", "companyName": "Dup Co",
    "location": {"lat": 40.0, "lng": -74.0, "address": "NYC"}
}))

print("\n" + "=" * 60)
print("ALL 7 SCENARIOS COMPLETE ✓")
print("=" * 60)
