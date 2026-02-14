# Phase 2 Integration + Module 7 Analytics

This workspace includes:
- Module 2 (matching)
- Module 3 (routing/deliveries)
- Phase 2 integration wiring
- Module 7 analytics APIs + demo dataset flow

## Included

- Module 2 supplier matching engine with weighted scoring and full audit logs.
- Module 3 delivery planning with ORS routing + matrix + OR-Tools VRP.
- Dynamic router integration in `backend/main.py` for all shared module router names (`auth`, `users`, `suppliers`, `inventory`, `orders`, `matching`, `deliveries`, `notifications`).
- Analytics router (`/api/analytics/*`) with dashboard-ready KPI endpoints.
- Auth alignment with `get_current_user` + `RoleChecker` in module routers.
- Event handler dispatch wiring:
  - `ORDER_PLACED` -> auto `match_full_order`
  - `ORDER_CONFIRMED` -> auto `create_single_delivery` for unplanned confirmed assignments
- Integration helper emitters in `backend/services/integration_events.py` for order/inventory services to call during merge.
- Order lifecycle helper service in `backend/services/order_lifecycle_service.py`.
- Delivery lifecycle endpoints (`single`, `batch`, `status`, `update-eta`, `stats`) and realtime events (`DELIVERY_PLANNED`, `DELIVERY_COMPLETED`, `ETA_UPDATED`).
- Seed data with:
  - 1 admin + buyers + suppliers
  - 5 suppliers
  - 20 catalog entries
  - placed and confirmed orders/items
  - matching outputs + assignments
  - auto-created deliveries:
    - 2 single deliveries
    - 1 batched optimized delivery
  - 1 extra confirmed assignment left available for dashboard testing
  - sample notifications for Module 6 UI/testing
- Frontend pages:
  - unified app shell with sidebar menu + `ProtectedRoute`
  - `/auth/login` quick role entry (merge-safe placeholder until Module 1 login page is mounted)
  - `/admin/matching`
  - `/admin/deliveries`
  - `/admin/deliveries/:deliveryId`
  - `/buyer/deliveries/:deliveryId`
  - `/analytics`
  - reserved merged routes: `/users/profile`, `/suppliers/catalog`, `/inventory`, `/orders`, `/notifications`

## OpenRouteService API key

1. Create a free account at `https://openrouteservice.org/`.
2. Generate an API key.
3. Set `ORS_API_KEY` before running backend.

```powershell
$env:ORS_API_KEY = "your-api-key"
```

When `ORS_API_KEY` is missing or ORS fails, backend falls back to Haversine-based estimates.

## Run backend

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
python -m backend.seed
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Swagger: `http://localhost:8000/docs`

## Run full demo flow (recommended for Module 7)

```powershell
python -m backend.demo_seed
```

This script resets and repopulates the DB with a complete scenario:
- users/profiles
- rich overlapping inventory
- orders A-G lifecycle scenarios
- matching execution and logs
- assignment confirmation + stock decrements + low stock alerts
- single and batched deliveries (VRP)
- lifecycle transitions and reliability refresh
- notification history generated from event logs
- one runnable `PLACED` order left for matching dashboard interaction

## Swagger / OpenAPI testing

1. Seed data:
```powershell
python -m backend.seed
```
2. Start API:
```powershell
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```
3. Open Swagger: `http://localhost:8000/docs`
4. Use these core scenarios:
- Matching happy path: `POST /api/matching/order/{order_id}` with a PLACED order ID from `GET /api/matching/orders/placed`
- Matching dry-run: `POST /api/matching/simulate` with exactly one selector (`order_id` OR `order_item_id` OR `item_ids`)
- Matching config validation: `PUT /api/matching/config` with each urgency profile summing to 1.0
- Delivery single route: `POST /api/deliveries/single` with one available assignment from `GET /api/deliveries/assignments/available`
- Delivery batch route: `POST /api/deliveries/batch` with 2+ unique assignment IDs
- Delivery lifecycle: `PATCH /api/deliveries/{delivery_id}/status` (`PLANNED -> IN_PROGRESS -> COMPLETED`)
- ETA recompute: `POST /api/deliveries/{delivery_id}/update-eta`
5. Edge-case checks (should fail cleanly):
- Non-positive IDs in path/body -> `422`
- Invalid status transition (e.g., `PLANNED -> COMPLETED`) -> `400`
- Duplicate assignment IDs in batch -> `422`
- Missing/unknown delivery or order IDs -> `404`
- Role violation on admin endpoints -> `403`

## Run frontend

```powershell
cd frontend
npm install
npm run dev
```

Optional API override:

```powershell
$env:VITE_API_BASE_URL = "http://localhost:8000"
```

## Module 3 API routes

- `POST /api/deliveries/single`
- `POST /api/deliveries/batch`
- `GET /api/deliveries/`
- `GET /api/deliveries/assignments/available`
- `GET /api/deliveries/stats`
- `GET /api/deliveries/{id}`
- `GET /api/deliveries/{id}/route`
- `PATCH /api/deliveries/{id}/status`
- `POST /api/deliveries/{id}/update-eta`

## Module 2 API routes

- `POST /api/matching/order/{order_id}`
- `POST /api/matching/item/{item_id}`
- `POST /api/matching/simulate`
- `GET /api/matching/logs/{order_item_id}`
- `GET /api/matching/config`
- `PUT /api/matching/config`
- `GET /api/matching/orders/placed`

## Module 7 Analytics routes

- `GET /api/analytics/overview`
- `GET /api/analytics/orders/status-distribution`
- `GET /api/analytics/matching/quality`
- `GET /api/analytics/deliveries/efficiency`
- `GET /api/analytics/suppliers/performance`
- `GET /api/analytics/inventory/low-stock`
- `GET /api/analytics/events/timeline`
- `GET /api/analytics/snapshot`
