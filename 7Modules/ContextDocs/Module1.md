## YOUR Prompts (Module 1 + Module 6)

### Prompt 1A — Module 1: Auth & RBAC (Build First)


[Paste the entire shared foundation above first, then continue with:]
You are building Module 1: User Management & RBAC for an industrial spare parts
procurement platform.
BUILD THE COMPLETE BACKEND AND FRONTEND FOR THIS MODULE.
BACKEND — FastAPI:

1. 
database.py — SQLAlchemy async setup with aiosqlite. Create engine, sessionmaker,
Base, and a get_db dependency. On startup, create all tables from the shared schema.

2. 
models/user.py — SQLAlchemy models for users, buyer_profiles, supplier_profiles.
Use the exact column definitions from the shared schema.

3. 
schemas/auth.py — Pydantic schemas:

RegisterBuyerRequest: email, password, factory_name, industry_type,
delivery_address, latitude, longitude
RegisterSupplierRequest: email, password, business_name, warehouse_address,
gst_number, service_radius_km, latitude, longitude
LoginRequest: email, password
TokenResponse: access_token, token_type, role, user_id
UserProfile: all profile fields, varies by role


4. 
middleware/auth.py:

create_access_token(data: dict) → JWT string, 24hr expiry
verify_token(token: str) → payload dict
get_current_user dependency: extracts Bearer token from Authorization header,
verifies, queries user from DB, returns user object. Raises 401 if invalid.
RoleChecker class: takes list of allowed roles, returns a dependency that
raises 403 if current user's role not in list. Usage:
@router.get("/admin-only", dependencies=[Depends(RoleChecker(["admin"]))])
Permission matrix implemented as a dict mapping role → set of permissions.
Permissions: "manage_users", "view_all_orders", "place_order", "manage_inventory",
"update_catalog", "view_analytics", "manage_assignments"
buyer: place_order, view_own_orders
supplier: manage_inventory, update_catalog, manage_assignments
admin: everything


5. 
routers/auth.py:

POST /api/auth/register/buyer — creates user with role="buyer" + buyer_profile
POST /api/auth/register/supplier — creates user with role="supplier" + supplier_profile
POST /api/auth/login — verify credentials, return JWT
GET /api/auth/me — return current user's full profile based on role


6. 
routers/users.py:

GET /api/users/ (admin only) — list all users with role filter
GET /api/users/{id}/profile — get user profile (admin or self only)
PUT /api/users/profile — update own profile fields
PATCH /api/users/{id}/activate (admin only) — toggle is_active


7. 
seed.py — seed script that creates:

1 admin: admin@sparehub.in / admin123
3 buyers: factories in Mumbai (19.076, 72.8777), Chennai (13.0827, 80.2707),
Pune (18.5204, 73.8567) with realistic factory names and industries
5 suppliers: warehouses in Thane (19.2183, 72.9781), Nashik (20.0063, 73.7895),
Coimbatore (11.0168, 76.9558), Bangalore (12.9716, 77.5946),
Hyderabad (17.385, 78.4867) with realistic business names, GST numbers,
service_radius between 80–200km
Run via: python -m backend.seed


8. 
events/bus.py — implement the shared emit_event function:
async def emit_event(event_type: str, payload: dict, target_user_ids: list[int])
For now: insert into event_logs table + insert into notifications table for each
target user. Add a global variable sio_server = None that Module 6 will set later.
If sio_server is set, also emit via Socket.IO to each user's room.


FRONTEND — React + TypeScript:

1. 
src/api/client.ts — axios instance with baseURL /api, interceptor that attaches
JWT from localStorage on every request, interceptor that redirects to /login on 401.

2. 
src/stores/authStore.ts — zustand store: user object, token, isAuthenticated,
login(), logout(), fetchProfile() actions.

3. 
src/pages/LoginPage.tsx — login form with email/password, calls POST /api/auth/login,
stores token, redirects to role-appropriate dashboard (/buyer, /supplier, /admin).

4. 
src/pages/RegisterPage.tsx — tabbed registration: Buyer tab and Supplier tab.
Buyer form has all buyer fields. Supplier form has all supplier fields.
Latitude/longitude fields should have a "Pick on Map" button that opens a
Leaflet map modal where they click to set coordinates.

5. 
src/components/ProtectedRoute.tsx — wrapper component that checks auth store,
redirects to login if not authenticated, optionally checks role.

6. 
src/components/Layout.tsx — sidebar navigation that shows different menu items
based on role. Buyer sees: Dashboard, Place Order, My Orders. Supplier sees:
Dashboard, Inventory, Assigned Orders. Admin sees: Dashboard, Users, All Orders,
Analytics. Topbar shows user name + logout button.

7. 
src/pages/admin/UsersPage.tsx — table of all users with role filter dropdown,
active/inactive toggle, click to view profile.


Build every file completely. No placeholders, no TODOs, no "implement later" comments.
Every API endpoint must be functional and tested via the /docs Swagger UI.
Use proper HTTP status codes and error messages throughout.