"""Integration tests for v0 API contract."""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from app.config import DB_PATH
from app.main import app


@pytest.fixture(scope="module")
def client() -> TestClient:
    if DB_PATH.exists():
        os.remove(DB_PATH)
    with TestClient(app) as c:
        yield c


# ──── Helper: register & get token ────
def _register(client: TestClient, role: str, email: str) -> dict:
    body: dict = {
        "email": email,
        "password": "password123",
        "name": f"Test {role}",
        "role": role,
        "companyName": f"Test {role.title()} Co",
    }
    if role in ("buyer", "supplier"):
        body["location"] = {"lat": 41.8781, "lng": -87.6298, "address": "1400 Industrial Blvd, Chicago, IL"}
    r = client.post("/api/auth/register", json=body)
    assert r.status_code == 201, r.text
    return r.json()


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ──── A: Auth ────
def test_register_and_login(client: TestClient) -> None:
    # Registration is done via seed, but test fresh registration
    data = _register(client, "buyer", "test_buyer_new@test.com")
    assert data["role"] == "buyer"
    assert "token" in data

    # Login
    r = client.post("/api/auth/login", json={"email": "test_buyer_new@test.com", "password": "password123"})
    assert r.status_code == 200
    assert "token" in r.json()


def test_register_duplicate_email(client: TestClient) -> None:
    _register(client, "buyer", "dup@test.com")
    r = client.post("/api/auth/register", json={
        "email": "dup@test.com", "password": "password123",
        "name": "Dup", "role": "buyer", "companyName": "Dup Co",
        "location": {"lat": 40.0, "lng": -74.0, "address": "NYC"},
    })
    assert r.status_code == 409


def test_login_wrong_password(client: TestClient) -> None:
    r = client.post("/api/auth/login", json={"email": "buyer@factory.com", "password": "wrongpass1"})
    assert r.status_code == 401


# ──── B: Orders & Matching ────
def test_full_order_lifecycle(client: TestClient) -> None:
    # Login as seeded users
    buyer = client.post("/api/auth/login", json={"email": "buyer@factory.com", "password": "password123"}).json()
    supplier = client.post("/api/auth/login", json={"email": "supplier@parts.com", "password": "password123"}).json()
    admin = client.post("/api/auth/login", json={"email": "admin@urgentparts.com", "password": "password123"}).json()

    b_headers = _auth_headers(buyer["token"])
    s_headers = _auth_headers(supplier["token"])
    a_headers = _auth_headers(admin["token"])

    # Create order
    r = client.post("/api/orders", json={
        "partName": "Hydraulic Pressure Sensor",
        "partNumber": "HPS-4420",
        "urgency": "critical",
        "deliveryLocation": {"lat": 41.8781, "lng": -87.6298, "address": "1400 Industrial Blvd, Chicago, IL, Gate 4"},
    }, headers=b_headers)
    assert r.status_code == 201
    order = r.json()
    order_id = order["orderId"]
    assert order["status"] == "matching"

    # Get matches
    r = client.get(f"/api/orders/{order_id}/matches", headers=b_headers)
    assert r.status_code == 200
    matches = r.json()
    assert len(matches["matches"]) >= 1
    match_id = matches["matches"][0]["matchId"]

    # Select supplier
    r = client.patch(f"/api/orders/{order_id}", json={"action": "select_supplier", "matchId": match_id}, headers=b_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "pending_acceptance"

    # Supplier accepts
    r = client.patch(f"/api/orders/{order_id}", json={"action": "accept"}, headers=s_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "picking"

    # Supplier marks ready
    r = client.patch(f"/api/orders/{order_id}", json={"action": "ready"}, headers=s_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "courier_to_supplier"

    # Check route tracking
    r = client.get(f"/api/orders/{order_id}/route", headers=b_headers)
    assert r.status_code == 200
    route = r.json()
    assert len(route["legs"]) == 2

    # Admin triggers courier picked up
    r = client.patch(f"/api/orders/{order_id}", json={"action": "courier_picked_up"}, headers=a_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "courier_to_factory"

    # Buyer marks delivered
    r = client.patch(f"/api/orders/{order_id}", json={"action": "delivered"}, headers=b_headers)
    assert r.status_code == 200
    result = r.json()
    assert result["status"] == "delivered"
    assert result["deliveredAt"] is not None
    assert result["totalFulfillmentMinutes"] is not None


def test_order_invalid_transition(client: TestClient) -> None:
    buyer = client.post("/api/auth/login", json={"email": "buyer@factory.com", "password": "password123"}).json()
    # Try to deliver a matching-state order
    r = client.patch("/api/orders/ord_demo01", json={"action": "delivered"}, headers=_auth_headers(buyer["token"]))
    assert r.status_code == 400


def test_order_detail(client: TestClient) -> None:
    buyer = client.post("/api/auth/login", json={"email": "buyer@factory.com", "password": "password123"}).json()
    r = client.get("/api/orders/ord_demo02", headers=_auth_headers(buyer["token"]))
    assert r.status_code == 200
    detail = r.json()
    assert detail["status"] == "delivered"
    assert detail["buyer"]["companyName"] == "Midwest Auto Assembly"


def test_list_orders(client: TestClient) -> None:
    buyer = client.post("/api/auth/login", json={"email": "buyer@factory.com", "password": "password123"}).json()
    r = client.get("/api/orders", params={"status": "all"}, headers=_auth_headers(buyer["token"]))
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1
    assert "orders" in data


# ──── C: Route not available before supplier selected ────
def test_route_409_before_selection(client: TestClient) -> None:
    buyer = client.post("/api/auth/login", json={"email": "buyer@factory.com", "password": "password123"}).json()
    r = client.get("/api/orders/ord_demo01/route", headers=_auth_headers(buyer["token"]))
    assert r.status_code == 409


# ──── D: Inventory CRUD ────
def test_inventory_crud(client: TestClient) -> None:
    sup = client.post("/api/auth/login", json={"email": "supplier@parts.com", "password": "password123"}).json()
    h = _auth_headers(sup["token"])

    # List
    r = client.get("/api/inventory", headers=h)
    assert r.status_code == 200
    assert r.json()["total"] >= 1

    # Create
    r = client.post("/api/inventory", json={
        "partName": "New Part", "partNumber": "NP-001", "quantity": 10, "price": 99.99,
    }, headers=h)
    assert r.status_code == 201
    item_id = r.json()["itemId"]

    # Patch
    r = client.patch(f"/api/inventory/{item_id}", json={"quantity": 5, "price": 89.99}, headers=h)
    assert r.status_code == 200
    assert r.json()["quantity"] == 5

    # Delete
    r = client.delete(f"/api/inventory/{item_id}", headers=h)
    assert r.status_code == 200
    assert r.json()["deleted"] is True


def test_inventory_duplicate_part_number(client: TestClient) -> None:
    sup = client.post("/api/auth/login", json={"email": "supplier@parts.com", "password": "password123"}).json()
    h = _auth_headers(sup["token"])
    r = client.post("/api/inventory", json={
        "partName": "Duplicate", "partNumber": "HPS-4420", "quantity": 1, "price": 10.0,
    }, headers=h)
    assert r.status_code == 409


# ──── E: Supplier Profile ────
def test_update_pick_time(client: TestClient) -> None:
    sup = client.post("/api/auth/login", json={"email": "supplier@parts.com", "password": "password123"}).json()
    r = client.patch("/api/suppliers/me", json={"pickTimeMinutes": 20}, headers=_auth_headers(sup["token"]))
    assert r.status_code == 200
    assert r.json()["pickTimeMinutes"] == 20


# ──── F: Admin Dashboard ────
def test_admin_dashboard(client: TestClient) -> None:
    admin = client.post("/api/auth/login", json={"email": "admin@urgentparts.com", "password": "password123"}).json()
    r = client.get("/api/admin/dashboard", headers=_auth_headers(admin["token"]))
    assert r.status_code == 200
    data = r.json()
    assert "totalOrdersToday" in data
    assert "fulfillmentRate" in data
    assert "totalDowntimeSavedDollars" in data


def test_admin_dashboard_forbidden_for_buyer(client: TestClient) -> None:
    buyer = client.post("/api/auth/login", json={"email": "buyer@factory.com", "password": "password123"}).json()
    r = client.get("/api/admin/dashboard", headers=_auth_headers(buyer["token"]))
    assert r.status_code == 403


# ──── Auth required ────
def test_unauthenticated_access(client: TestClient) -> None:
    r = client.get("/api/orders")
    assert r.status_code == 401


def test_list_orders_invalid_pagination(client: TestClient) -> None:
    buyer = client.post('/api/auth/login', json={'email': 'buyer@factory.com', 'password': 'password123'}).json()
    r = client.get('/api/orders', params={'page': 0}, headers=_auth_headers(buyer['token']))
    assert r.status_code == 422
