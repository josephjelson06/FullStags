## CODER A's Prompts (Module 4 + Module 5)

### Prompt A1 — Module 4: Supplier & Inventory Management (Build First)


[Paste the entire shared foundation first, then:]
You are building Module 4: Supplier & Inventory Management for an industrial
spare parts procurement platform.
CONTEXT: Module 1 (Auth/RBAC) is being built by someone else in parallel. For
now, create a temporary simple auth dependency that extracts a user_id and role
from a hardcoded test header "X-Test-User" (JSON: {"user_id": 1, "role": "supplier"})
so you can develop independently. When Module 1 is ready, we'll swap this
dependency with the real JWT-based one in a single line change.
BUILD THE COMPLETE BACKEND AND FRONTEND FOR THIS MODULE.
BACKEND:

1. 
models/inventory.py — SQLAlchemy models for: part_categories, parts_catalog,
inventory_transactions. Use the exact shared schema definitions.

2. 
schemas/inventory.py — Pydantic schemas:

PartCategoryCreate/Response: name, subcategory
CatalogEntryCreate: category_id, part_name, part_number, brand, unit_price,
quantity_in_stock, min_order_quantity, lead_time_hours
CatalogEntryUpdate: all fields optional
CatalogEntryResponse: all fields + id + supplier business_name + category name
InventoryTransactionResponse: catalog_id, change_amount, reason, created_at
CSVUploadResponse: total_rows, successful, failed, errors[]


3. 
services/inventory_service.py — business logic:
a) normalize_part_number(raw: str) → str
Strips whitespace, converts to uppercase, removes special characters
except alphanumeric, maps common abbreviations ("BB" → "BALL BEARING",
"ZZ" → "DOUBLE SHIELDED"). Produces a canonical form like "BALLBEARING6205"
so that "6205 BB", "Ball Bearing - 6205 ZZ", "ball bearing 6205" all
normalize to the same searchable key. This is not NLP — it is deterministic
string normalization with an abbreviation lookup table.
b) check_low_stock(catalog_entry) → bool
Returns true if quantity_in_stock < min_order_quantity * 2 (configurable
threshold multiplier). When true, calls emit_event with LOW_STOCK_ALERT.
c) process_csv_upload(file: UploadFile, supplier_id: int) → CSVUploadResponse
Parse CSV with columns: part_name, part_number, category, brand, unit_price,
quantity, min_order_qty, lead_time_hours. Validate each row. Normalize
part numbers. If a part_number already exists for this supplier, UPDATE it.
If not, INSERT it. Log all changes as inventory_transactions with reason
"csv_upload". Return summary of successes and per-row errors.
d) decrement_stock(catalog_id: int, quantity: int) → bool
Reduce quantity_in_stock. Create inventory_transaction with reason
"order_confirmed". Check low stock after. Return false if insufficient stock.
e) search_parts(query: str, category_id: int|None, lat: float, lng: float,
radius_km: float) → list[CatalogEntryResponse]
Normalize the query string the same way part numbers are normalized.
Search parts_catalog WHERE normalized_part_number LIKE %normalized_query%
OR part_name LIKE %query%. If category_id provided, filter by it.
Join with supplier_profiles and filter by Haversine distance:
Use the formula: 6371 * acos(cos(radians(lat)) * cos(radians(supplier_lat))

cos(radians(supplier_lng) - radians(lng)) + sin(radians(lat))
sin(radians(supplier_lat))) < radius_km
(SQLite doesn't have PostGIS, so use this Haversine in a SQL function or
compute in Python after fetching candidates within a bounding box.)
Order by distance ascending.


4. 
routers/suppliers.py:

GET /api/suppliers/ (admin) — list all suppliers with profiles
GET /api/suppliers/{id} — supplier profile + summary stats (total parts,
total stock value, avg lead time)
GET /api/suppliers/{id}/catalog — paginated catalog for a supplier
GET /api/suppliers/nearby?lat=X&lng=Y&radius_km=Z — find suppliers within
radius using Haversine


5. 
routers/inventory.py:

GET /api/inventory/categories — list all part categories
POST /api/inventory/categories (admin) — create category
POST /api/inventory/catalog (supplier) — add catalog entry, auto-normalizes
part number
PUT /api/inventory/catalog/{id} (supplier, own only) — update entry
DELETE /api/inventory/catalog/{id} (supplier, own only) — remove entry
POST /api/inventory/catalog/csv-upload (supplier) — CSV bulk upload
GET /api/inventory/search?q=X&category_id=Y&lat=X&lng=Y&radius_km=Z
— the spatial search endpoint buyers use
GET /api/inventory/transactions/{catalog_id} — audit log for a catalog item
GET /api/inventory/low-stock (supplier) — list own catalog items below threshold


6. 
seed.py additions — seed realistic inventory data:

Categories: Bearings, Motors, Pumps, Valves, Hydraulic Components, Seals,
Gears, Belts & Chains, Electrical Components, Filters
For each of the 5 suppliers (use the same locations from Module 1 seed),
add 8-15 parts from various categories. Use real part numbers:
Bearings: 6205, 6206, 6207, 6305, 32205, NU205
Motors: ABB-M2AA-090, Siemens-1LE1, WEG-W22-71
Pumps: KSB-ETA-50-200, Grundfos-CR-10-5
Valves: Fisher-ED-4to20, Honeywell-V5011N
Give each realistic pricing (bearings ₹200-800, motors ₹15000-45000,
pumps ₹25000-80000). Vary stock levels (some high, some low to trigger
low-stock alerts). Vary lead times (4-72 hours).



FRONTEND:

1. 
src/pages/supplier/CatalogPage.tsx:

Table showing all catalog entries for the logged-in supplier
Columns: Part Name, Part #, Category, Brand, Price, Stock, Lead Time, Actions
Inline "Edit" button opens a modal with pre-filled form
"Delete" button with confirmation
"Add Part" button opens the same modal empty
Search/filter bar at top to filter own catalog
Stock quantity cell is color-coded: green > 20, yellow 5-20, red < 5


2. 
src/pages/supplier/CSVUploadPage.tsx:

Drag-and-drop zone for CSV file
On upload: show processing spinner, then results summary
Show table of any failed rows with error messages
"Download Template" link that generates a blank CSV with correct headers


3. 
src/pages/supplier/InventoryDashboard.tsx:

Summary cards: Total Parts Listed, Total Stock Value (Σ price × qty),
Low Stock Items count, Avg Lead Time
Low stock alerts section showing items below threshold with "Restock" action
Recent inventory transactions feed (last 20 changes)


4. 
src/pages/buyer/PartSearchPage.tsx:

Search input for part number or name
Category dropdown filter
Results displayed as cards showing: part name, part #, supplier name,
price, stock availability (In Stock / Low Stock / Out of Stock), lead time,
distance from buyer
"Add to Order" button on each card (stores in local cart state for Module 5)



Build every file completely. The part number normalization must actually work —
demonstrate that searching "6205" returns results originally entered as
"Ball Bearing - 6205 ZZ" and "6205 BB". The CSV upload must parse real files.
The Haversine distance calculation must return correct distances.