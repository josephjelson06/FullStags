### Prompt for CODER B — Analytics API Optimization + Demo Data


You are responsible for two critical final tasks:
TASK 1: Ensure all analytics endpoints return meaningful data.
Go through every GET /api/analytics/* endpoint. For each one:

* Run the actual SQL query against the seeded database
* Verify the response has non-zero, non-trivial values
* If any endpoint returns empty data, add more seed data to fill it

TASK 2: Create the demo flow seed script — backend/demo_seed.py
This script creates a COMPLETE, realistic demo dataset that shows off every feature:
pythonDownloadCopy code# demo_seed.py
# Run this to populate the database with a full demo scenario

# 1. Create users (if not exists)
# admin@sparehub.in, 3 buyers, 5 suppliers — all with real Indian coordinates

# 2. Populate rich inventory
# Each supplier gets 10-15 parts across different categories
# Include deliberate overlaps: multiple suppliers carrying bearing 6205
# Include scarcity: only one supplier has a specific rare part
# Include varied pricing: same part different prices across suppliers

# 3. Create demo orders that exercise every scenario:
# Order A: simple, single-item, standard urgency — goes through full lifecycle
# Order B: multi-item, urgent — tests split supplier matching
# Order C: critical urgency, nearby supplier — tests urgency weight boost
# Order D: cancelled order — shows cancellation flow
# Order E: multi-item where one supplier can fulfill all — tests single-supplier bonus
# Order F & G: two orders to nearby buyers from same region — tests batch VRP

# 4. Run matching for each PLACED order
# Call matching_service.match_full_order() programmatically
# This populates matching_logs with real scores

# 5. Confirm assignments (simulate supplier acceptance)
# Decrement stock, trigger low-stock alerts for items near threshold

# 6. Create deliveries
# Single deliveries for orders A, C
# Batched delivery for orders F, G — runs VRP, stores optimized route
# Compute and store naive vs optimized distances

# 7. Advance some orders through lifecycle
# Order A: advance to DELIVERED (full lifecycle complete)
# Order B: advance to IN_TRANSIT
# Order C: advance to DISPATCHED
# Order D: CANCELLED
# Order E: CONFIRMED, waiting dispatch

# 8. Update reliability scores based on delivery history

# 9. Create notification history for all events that occurred
Implement this COMPLETE script. It must:

* Call actual service functions (not just raw SQL inserts) so all side effects
(events, stock decrements, matching logs) fire naturally
* Use asyncio.run() to execute async functions
* Print progress as it runs: "Creating users... ✓", "Seeding inventory... ✓", etc.
* Be idempotent: check if data exists before creating, or drop and recreate

After running this script, every page in the app should show real, meaningful data.
The matching dashboard should show real scoring breakdowns.
The delivery map should show real routes rendered on the map.
The analytics should show non-trivial KPIs and charts.