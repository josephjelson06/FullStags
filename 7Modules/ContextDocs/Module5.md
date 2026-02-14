### Prompt A2 — Module 5: Order Management (Build Second)


[Paste shared foundation, then:]
You are building Module 5: Order Management for an industrial spare parts
procurement platform.
CONTEXT: Module 4 (Supplier & Inventory) is already built by you and running.
You have working parts_catalog, part_categories, and the inventory service.
Module 1 (Auth) is being built by someone else — keep using the temporary auth
dependency for now.
BUILD THE COMPLETE BACKEND AND FRONTEND.
BACKEND:

1. 
models/order.py — SQLAlchemy models for: orders, order_items, order_assignments,
order_status_history. Exact shared schema.

2. 
schemas/order.py:

OrderItemCreate: category_id, part_number, part_description, quantity
OrderCreate: items: list[OrderItemCreate], urgency, required_delivery_date
OrderResponse: full order with nested items, each item with its assignments
OrderAssignmentResponse: supplier info, price, score, status
StatusTransitionRequest: new_status
OrderHistoryEntry: from_status, to_status, timestamp, changed_by


3. 
services/order_service.py:
a) STATE MACHINE — define valid transitions as a dict:
{
"PLACED": ["MATCHED", "CANCELLED"],
"MATCHED": ["CONFIRMED", "CANCELLED"],
"CONFIRMED": ["DISPATCHED", "CANCELLED"],
"DISPATCHED": ["IN_TRANSIT"],
"IN_TRANSIT": ["DELIVERED"],
"DELIVERED": [],
"CANCELLED": []
}
transition_order_status(order_id, new_status, user) →
Validates transition is legal. Validates user has permission (buyer can
cancel before DISPATCHED, supplier can transition assignments they own
through CONFIRMED→DISPATCHED→IN_TRANSIT→DELIVERED, admin can do anything).
Creates order_status_history entry. Updates order.status.
Calls emit_event with the appropriate event type.
b) transition_item_status(order_item_id, new_status, user) →
Same validation but at item level. When ALL items in an order reach a
status, the order-level status auto-advances (e.g., all items CONFIRMED →
order becomes CONFIRMED).
c) create_order(buyer_id, order_data) →
Create order + order_items. Set status PLACED for both.
Emit ORDER_PLACED event.
Return order with items.
d) assign_supplier_to_item(order_item_id, supplier_id, catalog_id, price, score) →
Create order_assignment. This is called by the Matching Engine (Module 2).
Update item status to MATCHED. Emit SUPPLIER_MATCHED.
e) confirm_assignment(assignment_id, supplier_user) →
Supplier accepts. Decrement stock via inventory_service.decrement_stock().
Update assignment status to ACCEPTED. Transition item to CONFIRMED.
Emit ORDER_CONFIRMED.
f) cancel_order(order_id, user) →
Only if status is before DISPATCHED. Cancel all items. If any assignments
exist with ACCEPTED status, restore stock. Emit ORDER_CANCELLED.

4. 
routers/orders.py:

POST /api/orders/ (buyer) — create order with multiple line items
GET /api/orders/ (buyer: own orders, supplier: assigned orders, admin: all)
Paginated, filterable by status, urgency, date range
GET /api/orders/{id} — full order detail with items, assignments, status history
PATCH /api/orders/{id}/status (buyer/admin) — transition order-level status
PATCH /api/orders/items/{item_id}/status — transition item-level status
POST /api/orders/assignments/{id}/confirm (supplier) — supplier confirms assignment
POST /api/orders/assignments/{id}/reject (supplier) — supplier rejects, triggers
re-matching for that item
GET /api/orders/{id}/history — full status change timeline


5. 
seed.py additions — create 5-8 demo orders in various states:

2 orders in PLACED (ready for matching demo)
1 order in MATCHED (waiting supplier confirmation)
2 orders in CONFIRMED (ready for dispatch/routing demo)
1 order in DELIVERED (for analytics history)
1 order CANCELLED (for analytics)
Use realistic multi-item orders (e.g., order for 10x bearing 6205 + 2x pump seal)
Create matching order_assignments and status_history entries for non-PLACED orders.



FRONTEND:

1. 
src/pages/buyer/CreateOrderPage.tsx:

Multi-line item form: each line has category dropdown, part number input
(with autocomplete hitting /api/inventory/search), quantity, description
"Add Item" button to add more lines
Urgency selector: Standard / Urgent / Critical with visual indicator
(green/yellow/red)
Required delivery date picker (default: 3 days for standard, 1 day urgent,
same day critical)
Order summary before submission showing all items
Submit calls POST /api/orders/


2. 
src/pages/buyer/OrdersPage.tsx:

Tabbed view: Active Orders | Completed | Cancelled
Each order card shows: Order #{id}, date, urgency badge, status badge,
item count, total value
Click to expand/navigate to order detail


3. 
src/pages/buyer/OrderDetailPage.tsx:

Order info header: status, urgency, dates
Status timeline component (the visual step tracker — PLACED through DELIVERED)
Table of items: part name, qty, status, assigned supplier (if matched),
assigned price
Cancel button (visible only if cancellable)
Map showing delivery route (placeholder div that Module 3 will populate)


4. 
src/pages/supplier/AssignedOrdersPage.tsx:

List of order_assignments for this supplier
Each shows: Order #{id}, part requested, quantity, buyer factory name,
distance, proposed price, match score
Action buttons: "Accept" / "Reject" for PROPOSED assignments
Status badge for accepted/fulfilled assignments


5. 
src/pages/admin/AllOrdersPage.tsx:

Full table of all orders with filters: status, urgency, buyer, supplier,
date range
Export to CSV button
Click row to view order detail



Build every file completely. The state machine must enforce valid transitions
and reject invalid ones with proper error messages. Multi-item orders must work
correctly with independent item statuses rolling up to order status.