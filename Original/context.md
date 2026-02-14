# UrgentParts — Project Context

## Last Updated

2026-02-15

## Problem Statement

Industrial operations face downtime from delayed spare parts sourcing. UrgentParts matches
emergency orders with the nearest available supplier and computes optimized delivery routes
in real time, minimizing delays and downtime costs ($25,000/hour).

## Architecture

- **Backend**: FastAPI + SQLite (Python 3.11+)
  - Port: 8000
  - Entry: `backend/run.py`
  - DB: `backend/data/supply_match.db` (auto-created on startup)
- **Frontend**: Vite + React 19 + TypeScript + Tailwind 4
  - Port: 5173
  - Proxy: `/api` → `http://localhost:8000`
- **Database**: SQLite (5 tables: users, inventory_items, orders, matches, order_legs)

## Demo Credentials

| Role     | Email                 | Password    |
| -------- | --------------------- | ----------- |
| Buyer    | buyer@factory.com     | password123 |
| Supplier | supplier@parts.com    | password123 |
| Admin    | admin@urgentparts.com | password123 |

## Key Features

- [x] JWT authentication with role-based routing
- [x] Emergency order creation with urgency levels (critical/high/standard)
- [x] Nearest-supplier matching engine (haversine + drive time)
- [x] Supplier inventory management (CRUD)
- [x] Order lifecycle (matching → acceptance → picking → delivery)
- [x] Admin analytics dashboard
- [x] Leaflet route map visualization
- [x] Dark mode support (auto via prefers-color-scheme)

## How to Run

```powershell
# Option A: One-command launch
.\start-demo.ps1

# Option B: Manual
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
python run.py

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

## Current Phase

v4 — Demo-ready. Mock layer removed, real API integration complete, dark mode + UI polish applied.

## File Structure

```
FullStags/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI entrypoint
│   │   ├── config.py        # Environment config
│   │   ├── database.py      # SQLite schema + connection
│   │   ├── seed.py          # Demo seed data (5 users, 13 items, 3 orders)
│   │   ├── models/          # Pydantic request/response models
│   │   ├── repositories/    # DB query layer
│   │   ├── routes/          # API endpoints
│   │   └── services/        # Business logic (matching, geo)
│   ├── tests/
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Router + role-based routes
│   │   ├── context/         # Auth context/provider
│   │   ├── hooks/           # Data hooks (useOrders, useInventory, etc.)
│   │   ├── components/      # Shared UI components
│   │   ├── pages/           # buyer/, supplier/, admin/, auth/
│   │   ├── services/api/    # API client + service files
│   │   ├── styles/          # CSS tokens + dark mode
│   │   └── types/           # TypeScript interfaces
│   ├── vite.config.ts
│   └── package.json
├── start-demo.ps1           # One-command launcher
├── context.md               # This file
└── README.md
```

## Known Issues

- None — all mock data removed, API integration complete, theming resolved
