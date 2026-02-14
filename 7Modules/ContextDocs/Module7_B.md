### Prompt for CODER A — Buyer & Supplier Dashboard Panels


You are building the Buyer and Supplier panels of Module 7: Analytics Dashboard.
All modules (1-6) are integrated. Real data exists in the database.
FOR BUYER — page at /buyer/dashboard:

1. 
ORDER TRACKING MAP:

Leaflet map showing all active orders' delivery routes
Each route is a colored polyline (get geometry from deliveries table)
Markers at buyer's factory and each supplier warehouse involved
Popup on route click shows: Order #{id}, status, ETA
Data from: GET /api/orders/?status=DISPATCHED,IN_TRANSIT joined with
delivery route geometry


2. 
ORDER SUMMARY CARDS:

Active Orders count
Pending Deliveries count
Avg delivery time for completed orders
Total spend (sum of assigned_price * quantity for DELIVERED orders)


3. 
ORDER HISTORY:

Table with filters: status, date range, urgency
Status breakdown pie chart: how many orders in each status
Recent orders feed (last 10)



FOR SUPPLIER — page at /supplier/dashboard:

1. 
INVENTORY STATUS:

Donut chart: stock distribution across categories
Low stock alert list with "Restock" quick action
Total catalog value (Σ price × qty)


2. 
FULFILLMENT METRICS:

Reliability score displayed as a gauge/meter (0-100%)
Orders Fulfilled this month
Avg Dispatch Time (time from CONFIRMED to DISPATCHED)
Revenue this month


3. 
INCOMING ORDERS FEED:

Live feed of new assignments (uses the Socket.IO notification hook)
Each entry: part name, quantity, buyer factory, distance, urgency
"Accept" button right in the feed for fast action



Backend endpoints:

* GET /api/analytics/buyer/summary (buyer only) — buyer's KPIs
* GET /api/analytics/buyer/order-map-data (buyer only) — active order routes
* GET /api/analytics/supplier/summary (supplier only) — supplier's KPIs
* GET /api/analytics/supplier/inventory-stats (supplier only) — stock breakdown

All queries filtered to the current user's data only. No cross-user data leaks.