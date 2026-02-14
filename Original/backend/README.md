# UrgentParts API

FastAPI + SQLite backend for emergency industrial parts orchestration.

## Requirements

- Python 3.11+

## Setup

```bash
python -m pip install -r requirements.txt
python run.py
```

API base URL: `http://localhost:8000`
OpenAPI docs: `http://localhost:8000/docs`

## Environment

Copy `.env.example` and set values as needed:

- `JWT_SECRET` required for production
- `CORS_ORIGINS` comma-separated allowlist
- `HOST`, `PORT`, `SCHEMA_VERSION`, `DATABASE_URL`

## Core endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/{order_id}`
- `PATCH /api/orders/{order_id}`
- `GET /api/orders/{order_id}/matches`
- `GET /api/orders/{order_id}/route`
- `GET /api/inventory`
- `POST /api/inventory`
- `PATCH /api/inventory/{item_id}`
- `DELETE /api/inventory/{item_id}`
- `PATCH /api/suppliers/me`
- `GET /api/admin/dashboard`

## Tests

```bash
python -m pytest -q
```
