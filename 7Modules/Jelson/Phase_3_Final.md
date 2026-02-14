## Phase 3: Final End-to-End Test Prompt (For everyone)


Run through this exact demo flow and verify every step works:

1. 
Open browser. Go to /login. Log in as admin@sparehub.in / admin123.
✓ Redirects to /admin dashboard
✓ Analytics show populated KPIs, charts, and map

2. 
Open a second browser/incognito tab. Register a new buyer:
Factory: "Tata Steel Jamshedpur", lat: 22.8046, lng: 86.2029
✓ Registration succeeds, redirected to /buyer dashboard

3. 
As the buyer, go to "Place Order". Create an order:
Item 1: Category "Bearings", Part # "6205", Qty: 50, Urgent
Item 2: Category "Seals", Part # "CR-10", Qty: 10
Required delivery: tomorrow
✓ Order created, status shows PLACED

4. 
Check admin tab — WITHOUT REFRESHING:
✓ Notification bell shows new notification
✓ Live activity feed shows "New Order #X"
✓ Order count KPI incremented

5. 
On admin tab, go to Matching Dashboard. The new order should already be
matched (auto-triggered). Verify:
✓ Each item shows top 3 suppliers with scores
✓ Scores are different (not all the same)
✓ Distance, reliability, price, urgency sub-scores are visible
✓ Matching logs show ALL candidates, not just top 3

6. 
Open third tab. Log in as the matched supplier.
✓ Notification bell shows "New order assignment"
✓ Assigned Orders page shows the items with "Accept" button
Click Accept on both items.
✓ Stock decremented in inventory
✓ Buyer tab (without refresh) shows status update to CONFIRMED

7. 
On admin tab, go to Deliveries. Create delivery for the confirmed assignments.
✓ Route appears on map with correct geometry
✓ ETA is computed and displayed
✓ If batched with another nearby delivery, savings % is shown

8. 
Advance delivery to COMPLETED via admin.
✓ Buyer gets "Order Delivered" notification
✓ Supplier reliability score updates
✓ Analytics KPIs refresh


If any step fails, identify which module and which specific function is broken.