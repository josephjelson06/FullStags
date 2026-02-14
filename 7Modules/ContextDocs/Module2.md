## CODER B's Prompts (Module 2 + Module 3)

### Prompt B1 — Module 2: Supplier Matching Engine (Build First)


[Paste entire shared foundation first, then:]
You are building Module 2: Supplier Matching Engine for an industrial spare
parts procurement platform.
CONTEXT: Module 4 (Inventory) and Module 5 (Orders) are being built by someone
else in parallel. You will work against the shared database schema. For
development, seed your own test data matching the schema so you can test
independently. When we integrate, the real data from Modules 4 and 5 will be
there.
Create your own minimal seed data for testing: 5 suppliers with coordinates
(use the shared Indian city locations), 20+ catalog entries across them, 3 test
orders with items in PLACED status.
BUILD THE COMPLETE BACKEND FOR THIS MODULE. (Frontend for matching is minimal —
it's triggered automatically and results show in Module 5's order detail page.
Build only an admin matching dashboard page.)
BACKEND:

1. 
models/matching.py — SQLAlchemy model for matching_logs. Exact shared schema.

2. 
schemas/matching.py:

MatchRequest: order_item_id (or list of item IDs for batch matching)
SupplierScore: supplier_id, business_name, distance_km, distance_score,
reliability_score, price_score, urgency_score, total_score, catalog_entry details
MatchResult: order_item_id, top_matches: list[SupplierScore], selected_supplier_id
MatchConfigResponse: current weight profiles per urgency level
MatchConfigUpdate: admin can update weights


3. 
services/matching_service.py — THE CORE ENGINE:
a) WEIGHT PROFILES — stored in a config table or JSON file:
weight_profiles = {
  "standard":  {"distance": 0.20, "reliability": 0.25, "price": 0.35, "urgency": 0.20},
  "urgent":    {"distance": 0.30, "reliability": 0.25, "price": 0.15, "urgency": 0.30},
  "critical":  {"distance": 0.35, "reliability": 0.20, "price": 0.10, "urgency": 0.35}
}

b) find_eligible_suppliers(order_item, buyer_profile) → list[supplier_candidates]
Step 1: Normalize the requested part_number using the same normalization
function from Module 4 (duplicate it here or import — for parallel dev,
duplicate the normalize function).
Step 2: Query parts_catalog WHERE normalized_part_number matches AND
quantity_in_stock >= requested quantity.
Step 3: Filter by distance — compute Haversine distance from each supplier's
warehouse to the buyer's location. Include only suppliers whose distance <=
their service_radius_km.
Step 4: If zero results, EXPAND — increase search radius by 50km increments
up to 500km max, re-query each time. Log expansions.
c) compute_distance_batch(buyer_coords, supplier_coords_list) → dict[supplier_id, km]
Call OpenRouteService Distance Matrix API:
POST https://api.openrouteservice.org/v2/matrix/driving-car
Body: {"locations": [[buyer_lng, buyer_lat], [s1_lng, s1_lat], ...],
"sources": [0], "destinations": [1,2,3,...], "metrics": ["distance"]}
Headers: {"Authorization": YOUR_ORS_API_KEY}
Parse response distances (returned in meters, convert to km).
IMPORTANT: ORS free tier allows 40 requests/min. Batch all suppliers in one
matrix call, don't call one by one.
If ORS fails (rate limit, network error), fall back to Haversine distances
with a 1.3x road factor multiplier and log the fallback.
d) score_supplier(supplier, distance_km, order_item, urgency, weights) → float
Compute each sub-score normalized to 0-1:
distance_score:
max_distance = max distance among all candidates (or 500 if only one)
score = (max_distance - this_distance) / max_distance
reliability_score:
Directly use supplier_profiles.reliability_score (already 0-1).
price_score:
max_price = max unit_price among candidates
score = (max_price - this_price) / max_price
urgency_score:
hours_available = (order.required_delivery_date - now).total_hours
- (distance_km / 50) [assume 50km/h avg delivery speed]
lead_time = catalog_entry.lead_time_hours
if lead_time > hours_available: score = 0 (can't make it)
else: score = 1 - (lead_time / hours_available)  # earlier ready = higher
total = w1distance_score + w2reliability_score + w3price_score + w4urgency_score
e) single_supplier_bonus(order, top_matches_per_item) → adjusted scores
After scoring all items in a multi-item order, check if any supplier can
fulfill ALL items. If yes, add a 0.10 bonus to that supplier's total score
for each item (capped at 1.0). This reduces split shipments.
f) match_order_item(order_item_id) → MatchResult
Orchestrator function:

Load order_item + parent order + buyer_profile
Find eligible suppliers
Compute real distances via ORS batch call
Score each supplier
Rank by total_score descending
Log ALL candidates to matching_logs (not just top 3)
Return top 3

g) match_full_order(order_id) → list[MatchResult]
For each item in the order, call match_order_item.
Then apply single_supplier_bonus across all items.
Re-rank after bonus.
Auto-assign top-ranked supplier for each item by calling the order service's
assign_supplier_to_item function (or hit POST /api/orders/assignments/ endpoint).
Update order status to MATCHED.
Emit SUPPLIER_MATCHED event.
Return all match results.

4. 
routers/matching.py:

POST /api/matching/order/{order_id} (admin or system) — trigger matching for
full order. Returns match results with scores.
POST /api/matching/item/{item_id} (admin) — trigger matching for single item.
Returns ranked suppliers.
GET /api/matching/logs/{order_item_id} — get matching log showing all
suppliers considered and their scores (for explainability/audit)
GET /api/matching/config — get current weight profiles
PUT /api/matching/config (admin) — update weight profiles
POST /api/matching/simulate — dry-run matching without creating assignments.
Takes same input as order matching but doesn't modify database. For testing.


5. 
services/reliability.py:

update_reliability_score(supplier_id) → float
Query all order_assignments for this supplier.
on_time_rate = (delivered on time) / (total delivered)
cancellation_penalty = (cancelled by supplier) / (total assignments) * 0.5
score = on_time_rate - cancellation_penalty
Clamp to [0, 1]. Update supplier_profiles.reliability_score.
This is called after every ORDER_DELIVERED or ORDER_CANCELLED event.



FRONTEND:

1. src/pages/admin/MatchingDashboard.tsx:

"Trigger Matching" panel: dropdown to select an order in PLACED status,
"Run Matching" button, shows results in real-time
Results display: for each order item, show a table of top 3 suppliers with
all sub-scores displayed as horizontal bars (distance: 0.8 bar, price: 0.6 bar, etc.)
and total score. Highlight the selected supplier in green.
"Match Logs" panel: select any order item, see full log of all candidates
with scores. Useful for understanding why a supplier was or wasn't selected.
Weight configuration panel: sliders for each urgency level's weights.
Weights must sum to 1.0 — if one slider moves up, others adjust proportionally.
"Save Config" button calls PUT /api/matching/config.



Build every file completely. The scoring formula must use actual computed values
— not random numbers, not hardcoded scores. The ORS API call must actually fire
(provide instructions for getting a free API key). Matching logs must capture
every candidate considered for full transparency.