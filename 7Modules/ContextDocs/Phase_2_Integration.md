## Phase 2: Integration Prompts

After all three coders have their modules working independently, use these prompts to merge.

### Integration Prompt — For YOU (Auth wiring)


We have 3 independently-built module sets that need to merge into one application.
Module 1 (Auth/RBAC) and Module 6 (Notifications) — built by me, fully working.
Module 4 (Inventory) and Module 5 (Orders) — built by Coder A, using a temporary
X-Test-User header auth dependency.
Module 2 (Matching) and Module 3 (Routing) — built by Coder B, using similar
temporary auth.
TASK 1: Merge all routers into the single FastAPI app in main.py.
Import and include all routers:
pythonDownloadCopy codefrom routers import auth, users, suppliers, inventory, orders, matching, deliveries, notifications
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(suppliers.router)
app.include_router(inventory.router)
app.include_router(orders.router)
app.include_router(matching.router)
app.include_router(deliveries.router)
app.include_router(notifications.router)
TASK 2: Replace all temporary auth dependencies in Coder A and Coder B's routers.
Search for any usage of the X-Test-User temporary header dependency. Replace with:
pythonDownloadCopy codefrom middleware.auth import get_current_user, RoleChecker
Every route that was using the temp dependency now uses:

* current_user = Depends(get_current_user) for user identification
* dependencies=[Depends(RoleChecker(["supplier"]))] for role gating

TASK 3: Wire emit_event calls into Module 5's order state transitions:

* In order_service.py: after every status transition, call emit_event with the
appropriate event type and target user IDs (buyer and/or supplier involved).
* In inventory_service.py: when low stock detected, call emit_event with
LOW_STOCK_ALERT targeting the supplier user_id.

TASK 4: Wire Module 2 (Matching) to trigger automatically:

* In the ORDER_PLACED event handler (events/handlers.py), call the matching
service's match_full_order function automatically.
* This means: buyer places order → event emitted → handler triggers matching →
matching finds suppliers → assignments created → SUPPLIER_MATCHED event emitted →
supplier gets notification.

TASK 5: Wire Module 3 (Routing) to trigger on confirmation:

* In the ORDER_CONFIRMED event handler, call the routing service's
create_single_delivery for each confirmed assignment.
* Periodically (or via admin trigger), allow batch optimization.

TASK 6: Merge all frontend routes into a single React Router config.
Combine all pages from all three codebases into one src/pages/ directory.
Update the Layout sidebar to include all menu items.
Ensure ProtectedRoute wraps all role-specific pages.
TASK 7: Run the unified seed script that seeds all data in the correct order:

1. Users + profiles (Module 1)
2. Categories + catalog (Module 4)
3. Orders + items (Module 5)
4. Matching results + assignments (Module 2)
5. Deliveries + routes (Module 3)
6. Sample notifications (Module 6)

Do this merge systematically. List every file that needs changes and what changes.

---