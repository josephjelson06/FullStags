from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

EXPECTED_PATHS = {
    "/api/auth/register",
    "/api/auth/login",
    "/api/orders",
    "/api/orders/{order_id}",
    "/api/orders/{order_id}/matches",
    "/api/orders/{order_id}/route",
    "/api/inventory",
    "/api/inventory/{item_id}",
    "/api/suppliers/me",
    "/api/admin/dashboard",
}


def test_openapi_contains_expected_contract_paths() -> None:
    with TestClient(app) as client:
        response = client.get('/openapi.json')

    assert response.status_code == 200
    paths = set(response.json().get('paths', {}).keys())
    missing = EXPECTED_PATHS - paths
    assert not missing, f'Missing contract paths: {sorted(missing)}'


def test_error_envelope_contains_compat_and_trace_fields() -> None:
    with TestClient(app) as client:
        response = client.get('/api/orders')

    assert response.status_code == 401
    body = response.json()

    assert 'error' in body
    assert 'message' in body
    assert 'code' in body
    assert 'traceId' in body
    assert response.headers.get('X-Request-ID')
