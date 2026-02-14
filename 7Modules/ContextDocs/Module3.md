### Prompt B2 — Module 3: Route Optimization & Delivery (Build Second)


[Paste shared foundation, then:]
You are building Module 3: Route Optimization & Delivery for an industrial
spare parts procurement platform.
CONTEXT: Module 2 (Matching Engine) is already built by you and working. When
a supplier is matched and order is confirmed, this module computes the optimal
delivery route. You have access to supplier and buyer coordinates from the
database.
BUILD THE COMPLETE BACKEND AND FRONTEND.
BACKEND:

1. 
models/delivery.py — SQLAlchemy models for: deliveries, delivery_stops,
delivery_eta_logs. Exact shared schema.

2. 
schemas/delivery.py:

DeliveryCreate: order_assignment_ids (list), delivery_type
DeliveryResponse: full delivery with stops, route geometry, distances, ETAs
DeliveryStopResponse: stop details with sequence, ETA, coordinates
RouteOptimizationResult: optimized_distance, naive_distance, savings_percent,
route_geometry (GeoJSON), ordered_stops
VRPBatchRequest: list of order_assignment_ids to batch-optimize
VRPBatchResult: list of deliveries created, total savings


3. 
services/routing_service.py:
a) compute_single_route(origin_lat, origin_lng, dest_lat, dest_lng) → dict
Call OpenRouteService Directions API:
GET https://api.openrouteservice.org/v2/directions/driving-car
?start={lng},{lat}&end={lng},{lat}
Parse response: extract distance (km), duration (minutes), geometry
(GeoJSON LineString from the response's features[0].geometry).
Return {"distance_km": ..., "duration_minutes": ..., "geometry": GeoJSON}
b) compute_distance_matrix(locations: list[tuple[lat,lng]]) → 2D matrix
Call ORS Matrix API with all locations at once.
Return matrix of durations in seconds between every pair.
c) solve_vrp(pickups, dropoffs, time_windows, num_vehicles=3) → optimized routes
Use Google OR-Tools:
pythonDownloadCopy codefrom ortools.constraint_solver import routing_enums_pb2, pywrapcp

def solve_vrp(distance_matrix, pickups_deliveries, time_windows, num_vehicles):
    manager = pywrapcp.RoutingIndexManager(len(distance_matrix),
                                             num_vehicles, 0)  # depot at index 0
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return int(distance_matrix[from_node][to_node])

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # Add pickup-delivery pairs
    for pickup, delivery in pickups_deliveries:
        pickup_index = manager.NodeToIndex(pickup)
        delivery_index = manager.NodeToIndex(delivery)
        routing.AddPickupAndDelivery(pickup_index, delivery_index)
        routing.solver().Add(
            routing.VehicleVar(pickup_index) == routing.VehicleVar(delivery_index))
        routing.solver().Add(
            distance_callback(pickup_index, delivery_index) >= 0)

    # Add time window constraints
    time_dimension_name = 'Time'
    routing.AddDimension(transit_callback_index, 30*60, 24*60*60, False, time_dimension_name)
    time_dimension = routing.GetDimensionOrDie(time_dimension_name)
    for location_idx, (start, end) in enumerate(time_windows):
        index = manager.NodeToIndex(location_idx)
        time_dimension.CumulVar(index).SetRange(start, end)

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC)
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH)
    search_parameters.time_limit.FromSeconds(5)

    solution = routing.SolveWithParameters(search_parameters)
    # Parse solution into ordered stops per vehicle
Return: list of routes, each route being an ordered list of stop indices.
d) create_single_delivery(order_assignment_id) → Delivery
Load the order_assignment → get supplier coords and buyer coords.
Call compute_single_route.
Create delivery record with route geometry, distance, duration.
Create 2 delivery_stops: pickup at supplier, dropoff at buyer.
Compute ETA: now + supplier lead_time_hours + route duration.
Insert delivery_eta_log.
Return delivery.
e) create_batched_delivery(order_assignment_ids) → list[Delivery]
Load all assignments. Collect unique supplier coords (pickups) and
buyer coords (dropoffs).
Create a depot location (use geometric centroid of all points).
Build locations list: [depot, pickup1, dropoff1, pickup2, dropoff2, ...]
Compute distance matrix via ORS.
Define pickup-delivery pairs: [(1,2), (3,4), ...] — each pickup index
paired with its corresponding dropoff index.
Define time windows from each order's required_delivery_date.
Solve VRP.
For each vehicle route in the solution:
- Compute the actual road route by chaining ORS directions calls
between consecutive stops
- Create delivery record (batched type)
- Create delivery_stops with sequence_order
- Compute ETAs for each stop based on cumulative duration
- Also compute "naive distance" = sum of individual point-to-point
distances without optimization, for comparison
Return all created deliveries with savings metrics.
f) update_eta(delivery_id) → None
Recompute ETA based on current time and remaining stops.
Insert new delivery_eta_log. Emit ETA_UPDATED event.

4. 
routers/deliveries.py:

POST /api/deliveries/single (admin/system) — create single delivery for
one order assignment
POST /api/deliveries/batch (admin) — batch optimize multiple assignments.
Request body: list of order_assignment_ids
GET /api/deliveries/ — list deliveries (filtered by role: buyer sees theirs,
supplier sees theirs, admin sees all)
GET /api/deliveries/{id} — full delivery detail with stops, route, ETAs
GET /api/deliveries/{id}/route — just the GeoJSON route geometry (for map rendering)
PATCH /api/deliveries/{id}/status (admin) — update delivery status
(PLANNED → IN_PROGRESS → COMPLETED)
POST /api/deliveries/{id}/update-eta (admin/system) — trigger ETA recomputation
GET /api/deliveries/stats — route efficiency stats: avg distance, avg duration,
total savings from optimization (sum of naive - optimized across all batched deliveries)


5. 
Seed data additions:

For the orders seeded in CONFIRMED status, auto-create deliveries:
2 single deliveries (one per confirmed single-item order)
1 batched delivery combining 2 orders going to nearby buyers
Store actual route geometries from ORS calls during seeding
Ensure the batched delivery shows meaningful savings vs naive routing



FRONTEND:

1. 
src/pages/admin/DeliveryDashboard.tsx:

"Create Delivery" panel:

Dropdown multi-select of confirmed order assignments not yet in a delivery
Toggle: "Single Delivery" or "Batch Optimize"
"Optimize" button → calls batch endpoint → shows results


Results panel:

Map (Leaflet) showing all routes with different colors per delivery
Route efficiency card: "Optimized: X km | Naive: Y km | Saved: Z%"
List of deliveries with stops in order




2. 
src/pages/admin/DeliveryDetailPage.tsx:

Full-page Leaflet map showing the delivery route as a polyline
Markers for each stop: blue for pickup, red for dropoff, numbered by sequence
Clicking a marker shows: stop type, address, ETA, associated order info
Side panel: delivery status, total distance/duration, list of stops with ETAs
"Update ETA" button to trigger recomputation


3. 
src/components/DeliveryMap.tsx — reusable Leaflet map component:

Props: route geometry (GeoJSON), stops (list with lat/lng/type/sequence)
Renders polyline from geometry
Renders numbered markers for stops
Auto-fits bounds to show entire route
This component is reused in buyer's order detail page and admin dashboard


4. 
src/pages/buyer/TrackDeliveryPage.tsx:

Shows the delivery map for the buyer's order
Status indicator: Planned / In Progress / Completed
ETA display with last-updated timestamp
Visual timeline of stops (if batched delivery, show where their stop is
in the sequence)



Build every file completely. The VRP solver must actually run OR-Tools — not a
simplified greedy algorithm. The ORS API calls must return real routes with real
geometry that renders correctly on the Leaflet map. The savings calculation must
be mathematically correct: naive distance is sum of individual A→B distances,
optimized distance is the actual VRP solution distance.