### Prompt 1B — Module 6: Notifications & Real-Time Events (Build Second)


[Paste the shared foundation, then:]
You are building Module 6: Notifications & Real-Time Events for an industrial
spare parts procurement platform.
CONTEXT: Module 1 (Auth/RBAC) is already built and running. The events/bus.py
file already has an emit_event function that inserts into event_logs and
notifications tables. You are now upgrading it with full Socket.IO support
and building the notification UI.
The emit_event function is called by other modules whenever state changes happen:
ORDER_PLACED, SUPPLIER_MATCHED, ORDER_CONFIRMED, ORDER_DISPATCHED,
ORDER_IN_TRANSIT, ORDER_DELIVERED, ORDER_CANCELLED, LOW_STOCK_ALERT,
DELIVERY_PLANNED, DELIVERY_COMPLETED, ETA_UPDATED.
BUILD THE COMPLETE BACKEND AND FRONTEND FOR THIS MODULE.
BACKEND:

1. 
Update main.py to mount Socket.IO:

Use python-socketio with AsyncServer and ASGIApp
Mount Socket.IO at path /ws alongside the FastAPI app
On client connect: expect auth token in handshake, verify JWT, join the
socket to a room named "user_{user_id}" and a room named "role_{role}"
On disconnect: clean up


2. 
events/bus.py — upgrade emit_event:

Still insert into event_logs and notifications tables
Now ALSO emit via Socket.IO to:
a) Each specific user room: sio.emit("notification", data, room=f"user_{uid}")
b) The admin role room always: sio.emit("system_event", data, room="role_admin")
The emitted payload should include: event_type, title (human-readable),
message (descriptive), metadata (JSON with entity IDs), timestamp


3. 
events/handlers.py — define what happens for each event type:

ORDER_PLACED: notify the admin + run matching (call matching endpoint internally).
Title: "New Order #{order_id}" Message: "Factory X placed an order for Y parts"
SUPPLIER_MATCHED: notify the buyer + the matched supplier.
Title: "Supplier Matched" Message: "Supplier X has been matched to your order"
ORDER_CONFIRMED: notify buyer.
Title: "Order Confirmed" Message: "Supplier X confirmed order item Y"
ORDER_DISPATCHED: notify buyer.
Title: "Order Dispatched" Message: "Your order is on its way"
ORDER_DELIVERED: notify buyer + update supplier reliability score.
Title: "Order Delivered" Message: "Order #{id} delivered successfully"
LOW_STOCK_ALERT: notify the supplier + admin.
Title: "Low Stock Alert" Message: "Part X is below threshold (Y remaining)"
ORDER_CANCELLED: notify affected supplier + admin.
ETA_UPDATED: notify buyer with new ETA.


4. 
routers/notifications.py:

GET /api/notifications/ — list current user's notifications, newest first,
with pagination (limit/offset). Filter by is_read.
PATCH /api/notifications/{id}/read — mark as read
PATCH /api/notifications/read-all — mark all as read for current user
GET /api/notifications/unread-count — return count of unread
GET /api/events/ (admin only) — list all event logs with filters on event_type,
date range, entity_type



FRONTEND:

1. 
src/hooks/useSocket.ts — custom hook:

Connects to Socket.IO server at /ws with auth token in handshake
Returns socket instance
Auto-reconnects on disconnect
Cleans up on component unmount


2. 
src/hooks/useNotifications.ts — custom hook:

Uses useSocket to listen for "notification" events
Maintains a zustand store of notifications + unread count
Fetches initial notifications on mount via GET /api/notifications/
Exposes: notifications[], unreadCount, markAsRead(id), markAllRead()
When new notification arrives via socket, add to top of list, increment
unread count, and show a toast notification (use react-hot-toast or similar)


3. 
src/components/NotificationBell.tsx — bell icon in the top nav bar:

Shows unread count as a badge
Clicking opens a dropdown panel listing recent notifications
Each notification shows: icon based on event_type, title, message, time ago
Click "Mark all read" button at top
Click individual notification to mark as read and navigate to relevant page
(e.g., clicking an order notification goes to /orders/{id})


4. 
src/components/LiveActivityFeed.tsx — for admin dashboard:

Listens to "system_event" socket events
Shows a live scrolling feed of all system events with timestamp,
event type badge (color-coded), and description
New events appear at top with a subtle slide-in animation


5. 
src/components/OrderStatusTracker.tsx — reusable component:

Takes an order_id prop
Listens for socket events related to that order
Shows a visual step tracker: PLACED → MATCHED → CONFIRMED → DISPATCHED →
IN_TRANSIT → DELIVERED. Each step lights up as the status progresses.
Updates in real-time without refresh



Build every file completely. The Socket.IO connection must actually work.
Test by opening two browser tabs — one as buyer, one as supplier — and verify
that events propagate in real-time when you manually trigger them via the
/docs Swagger endpoint.