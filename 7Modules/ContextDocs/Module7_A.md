## Phase 2: Module 7 (Split among all 3)

### Prompt for YOU — Admin Analytics Panel


You are building the Admin panel of Module 7: Analytics Dashboard.
All other modules (1-6) are integrated and running. You have real data flowing
through the system: orders, matches, deliveries, notifications.
Build the admin analytics page at /admin/analytics with these sections:

1. 
KPI CARDS (top row):

Total Orders (count from orders table)
Fulfillment Rate (DELIVERED / total non-cancelled, as percentage)
Avg Matching Time (avg seconds between order created_at and the timestamp
of the first matching_log entry for that order's items)
Avg Delivery ETA (avg duration_minutes from deliveries table)
Route Efficiency (avg savings: (naive - optimized) / naive * 100)
All computed via real SQL aggregation queries — not hardcoded.


2. 
GEOGRAPHIC HEAT MAP (Leaflet):

Plot all supplier locations as circle markers
Color by stock availability: compute total stock per supplier,
green (>1000 units), yellow (200-1000), red (<200)
Plot all buyer locations as diamond/square markers
Use Leaflet.markercluster for clustering if many points
Show a heat layer for order density (heatmap plugin using buyer locations
weighted by number of orders)


3. 
DEMAND ANALYTICS:

Bar chart: top 10 most ordered part categories (GROUP BY category_id, COUNT)
Line chart: orders over time (GROUP BY date, COUNT) — last 30 days
Horizontal bar: orders by region/city (GROUP BY buyer city approximation
from lat/lng — use reverse geocoding or just bucket by known city ranges)
Use recharts or chart.js for React charts. All data comes from
GET /api/analytics/demand endpoint.


4. 
ROUTE EFFICIENCY PANEL:

Stat card: total km saved by VRP optimization across all batched deliveries
Comparison bar chart: for each batched delivery, show naive vs optimized
distance as grouped bars
Avg distance per delivery over time (line chart)
Data from GET /api/analytics/routes


5. 
SUPPLIER PERFORMANCE TABLE:

Table: Supplier Name | Orders Fulfilled | Avg Dispatch Time | Reliability Score
| Revenue (sum of assigned_price * quantity)
Sortable by each column
Click supplier to see their detail page



Backend endpoints:

* GET /api/analytics/kpis — returns all KPI values
* GET /api/analytics/demand — returns category counts, time series, region breakdown
* GET /api/analytics/routes — returns route efficiency metrics
* GET /api/analytics/suppliers — returns supplier performance data
* GET /api/analytics/geo — returns all coordinates with metadata for the map

All endpoints admin-only. All queries use actual SQL aggregation on real data.