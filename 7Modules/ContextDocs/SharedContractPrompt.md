You are building one piece of a larger industrial spare parts procurement platform.
The full system has 7 modules being built by 3 people in parallel. They will
merge later. Your job is to build YOUR assigned modules while strictly respecting
the shared database schema and API contract below.

TECH STACK:
- Backend: Python FastAPI, SQLite with SQLAlchemy ORM (use aiosqlite for async)
- Frontend: React SPA with TypeScript, Vite bundler
- API docs: auto-generated via FastAPI OpenAPI/Swagger at /docs
- Real-time: Socket.IO (python-socketio on backend, socket.io-client on frontend)
- Maps/Geo: Leaflet.js on frontend, OpenRouteService API for routing/distance
- Optimization: Google OR-Tools for VRP (Module 3 only)
- Auth: JWT tokens (python-jose), bcrypt for password hashing

PROJECT STRUCTURE (monorepo):

project/
├── backend/
│   ├── main.py              # FastAPI app + Socket.IO mount
│   ├── database.py          # SQLAlchemy engine, session, Base
│   ├── models/              # one file per module's DB models
│   ├── schemas/             # Pydantic request/response schemas
│   ├── routers/             # one router file per module
│   ├── services/            # business logic layer
│   ├── middleware/          # auth middleware, RBAC
│   ├── events/             # event bus + socket handlers
│   └── seed.py             # seed script for demo data
├── frontend/
│   ├── src/
│   │   ├── api/            # typed API client (auto-gen from OpenAPI)
│   │   ├── components/     # shared UI components
│   │   ├── pages/          # route-level page components
│   │   ├── hooks/          # custom hooks (useAuth, useSocket, etc.)
│   │   ├── stores/         # zustand or context state
│   │   └── types/          # shared TypeScript interfaces
│   └── index.html

SHARED DATABASE SCHEMA (everyone uses these exact table names and columns):

```sql
-- Module 1 tables
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('buyer','supplier','admin')) NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE buyer_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE REFERENCES users(id),
    factory_name TEXT NOT NULL,
    industry_type TEXT,
    delivery_address TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL
);

CREATE TABLE supplier_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE REFERENCES users(id),
    business_name TEXT NOT NULL,
    warehouse_address TEXT,
    gst_number TEXT,
    service_radius_km REAL DEFAULT 100,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    reliability_score REAL DEFAULT 0.5
);

-- Module 4 tables
CREATE TABLE part_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    subcategory TEXT
);

CREATE TABLE parts_catalog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER REFERENCES supplier_profiles(id),
    category_id INTEGER REFERENCES part_categories(id),
    part_name TEXT NOT NULL,
    part_number TEXT NOT NULL,
    normalized_part_number TEXT NOT NULL,
    brand TEXT,
    unit_price REAL NOT NULL,
    quantity_in_stock INTEGER NOT NULL,
    min_order_quantity INTEGER DEFAULT 1,
    lead_time_hours INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    catalog_id INTEGER REFERENCES parts_catalog(id),
    change_amount INTEGER NOT NULL,
    reason TEXT CHECK(reason IN ('restock','order_confirmed','manual_adjustment','csv_upload')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Module 5 tables
CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_id INTEGER REFERENCES buyer_profiles(id),
    status TEXT CHECK(status IN ('PLACED','MATCHED','CONFIRMED','DISPATCHED','IN_TRANSIT','DELIVERED','CANCELLED')) DEFAULT 'PLACED',
    urgency TEXT CHECK(urgency IN ('standard','urgent','critical')) DEFAULT 'standard',
    required_delivery_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER REFERENCES orders(id),
    category_id INTEGER REFERENCES part_categories(id),
    part_number TEXT NOT NULL,
    part_description TEXT,
    quantity INTEGER NOT NULL,
    status TEXT CHECK(status IN ('PENDING','MATCHED','CONFIRMED','DISPATCHED','IN_TRANSIT','DELIVERED','CANCELLED')) DEFAULT 'PENDING'
);

CREATE TABLE order_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_item_id INTEGER REFERENCES order_items(id),
    supplier_id INTEGER REFERENCES supplier_profiles(id),
    catalog_id INTEGER REFERENCES parts_catalog(id),
    assigned_price REAL,
    match_score REAL,
    status TEXT CHECK(status IN ('PROPOSED','ACCEPTED','REJECTED','FULFILLED')) DEFAULT 'PROPOSED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER REFERENCES orders(id),
    order_item_id INTEGER REFERENCES order_items(id),
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Module 2 tables
CREATE TABLE matching_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_item_id INTEGER REFERENCES order_items(id),
    supplier_id INTEGER REFERENCES supplier_profiles(id),
    distance_km REAL,
    distance_score REAL,
    reliability_score REAL,
    price_score REAL,
    urgency_score REAL,
    total_score REAL,
    rank INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Module 3 tables
CREATE TABLE deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    delivery_type TEXT CHECK(delivery_type IN ('single','batched')) DEFAULT 'single',
    status TEXT CHECK(status IN ('PLANNED','IN_PROGRESS','COMPLETED')) DEFAULT 'PLANNED',
    total_distance_km REAL,
    total_duration_minutes REAL,
    optimized_distance_km REAL,
    naive_distance_km REAL,
    route_geometry TEXT,  -- GeoJSON stored as text
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE delivery_stops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    delivery_id INTEGER REFERENCES deliveries(id),
    order_assignment_id INTEGER REFERENCES order_assignments(id),
    stop_type TEXT CHECK(stop_type IN ('pickup','dropoff')),
    sequence_order INTEGER NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    time_window_start TIMESTAMP,
    time_window_end TIMESTAMP,
    eta TIMESTAMP
);

CREATE TABLE delivery_eta_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    delivery_id INTEGER REFERENCES deliveries(id),
    estimated_arrival TIMESTAMP,
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Module 6 tables
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    metadata TEXT,  -- JSON string for extra data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE event_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    entity_type TEXT,
    entity_id INTEGER,
    payload TEXT,  -- JSON string
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SHARED API ROUTE PREFIX CONVENTION:

* /api/auth/*          — Module 1
* /api/users/*         — Module 1
* /api/suppliers/*     — Module 4 (profiles + catalog)
* /api/inventory/*     — Module 4
* /api/orders/*        — Module 5
* /api/matching/*      — Module 2
* /api/deliveries/*    — Module 3
* /api/notifications/* — Module 6
* /api/analytics/*     — Module 7

SHARED EVENT TYPES (used by Module 6, emitted by other modules):
ORDER_PLACED, SUPPLIER_MATCHED, ORDER_CONFIRMED, ORDER_DISPATCHED,
ORDER_IN_TRANSIT, ORDER_DELIVERED, ORDER_CANCELLED, LOW_STOCK_ALERT,
DELIVERY_PLANNED, DELIVERY_COMPLETED, ETA_UPDATED
Every module that triggers a state change should call a shared function:
async def emit_event(event_type: str, payload: dict, target_user_ids: list[int])
This function is defined in backend/events/bus.py. If Module 6 isn't built
yet, this function simply inserts into event_logs table and returns. When
Module 6 is integrated, it also pushes via Socket.IO.
JWT TOKEN PAYLOAD: {"sub": user_id, "role": "buyer"|"supplier"|"admin", "exp": ...}
Every protected route receives the current user via a dependency: get_current_user
Do NOT use mock data in business logic. Do NOT use placeholder returns.
Do NOT simplify scoring to basic if-else. Implement actual computations.
Use real API calls to OpenRouteService (free tier, api key from openrouteservice.org).
Seed data should be realistic Indian industrial locations and real part numbers.