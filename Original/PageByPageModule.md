Complete User & Module Breakdown
Based on your 7 modules, here are the 3 core user roles:

Admin · Supplier · Buyer

(No separate Delivery Partner role — Route Optimization will be managed by Admin/system level)


👤 ROLE 1: ADMIN
The platform superuser who controls, monitors, and configures everything.

Module 1 — Auth/RBAC
Pages:

* Login Page — Email/password login with admin credentials
* User Management Page — View all registered users (suppliers + buyers) in a table with search/filter
* User Detail / Edit Page — View a single user's profile, assign or change roles, activate/deactivate accounts
* Role & Permission Settings Page — Define roles (admin, supplier, buyer), assign granular permissions (who can access what module)

Operations:
Create/edit/delete users, assign roles, set permissions per role, activate/deactivate accounts, reset passwords, view login activity logs, force logout a user

Module 2 — Matching Engine
Pages:

* Matching Configuration Page — Set algorithm weights (how much importance to give price vs distance vs supplier rating vs stock availability)
* Match Logs Page — View history of all matches made (which buyer was matched to which supplier, why, score breakdown)

Operations:
Adjust matching algorithm parameters, view all match logs with filters (by date, buyer, supplier), see match score breakdown, identify failed or low-confidence matches, override a match manually if needed

Module 3 — Route Optimization
Pages:

* Route Monitoring Dashboard — Map view showing all active delivery routes across the platform
* Route History Page — Past routes with distance, time taken, and efficiency metrics

Operations:
View all active routes on map in real-time, see estimated vs actual delivery times, identify bottlenecks or delayed routes, view route efficiency reports, configure route optimization parameters (max distance, preferred zones)

Module 4 — Supplier & Inventory
Pages:

* All Suppliers List Page — View all registered suppliers with their status, rating, total products, location
* Supplier Detail Page — Drill into a specific supplier's full inventory, order history, performance metrics
* Platform Inventory Overview Page — Bird's-eye view of all inventory across all suppliers (total parts, category-wise stock, low stock alerts platform-wide)

Operations:
View/search/filter all suppliers, view any supplier's inventory, flag or suspend a supplier, see low stock alerts across platform, export supplier/inventory data, verify supplier details

Module 5 — Order Management
Pages:

* All Orders Page — View every order on the platform with status filters (pending, confirmed, in-transit, delivered, cancelled, disputed)
* Order Detail Page — Full details of a specific order (buyer info, supplier info, items, route, timeline, payment status)
* Disputed Orders Page — Orders flagged with issues that need admin intervention

Operations:
View all orders with search/filter/sort, drill into any order's full details, change order status manually, resolve disputed orders, cancel orders, view order timeline (every status change with timestamps), export order reports

Module 6 — Notifications/WebSockets
Pages:

* Notification Center Page — View all platform-level notifications and alerts
* Notification Templates Page — Create/edit notification templates for different events (order placed, low stock, delivery completed, etc.)

Operations:
View all system notifications, create/edit notification templates, send platform-wide announcements to all users or specific roles, configure which events trigger which notifications, monitor WebSocket connection health

Module 7 — Analytics Dashboard
Pages:

* Main Analytics Dashboard — KPIs at a glance: total orders, revenue, active users, top suppliers, top-selling parts, delivery success rate, platform growth trends
* Reports Page — Generate detailed reports (sales report, supplier performance, buyer activity, inventory turnover, route efficiency) with date range filters. Export as PDF/CSV.

Operations:
View real-time KPIs, filter analytics by date range/region/category, compare time periods, view top/bottom performing suppliers, track buyer acquisition and retention, monitor inventory turnover rates, generate and export custom reports

📊 Admin Summary
ModulePagesKey FocusAuth/RBAC4User & role controlMatching Engine2Configure & monitor matchesRoute Optimization2Monitor delivery routesSupplier & Inventory3Oversee all suppliers & stockOrder Management3Oversee all orders & disputesNotifications2Templates & announcementsAnalytics2KPIs & reportsTotal18


🏭 ROLE 2: SUPPLIER
Businesses that list auto parts, manage stock, and fulfill orders.

Module 1 — Auth/RBAC
Pages:

* Register Page — Signup with business details (company name, address, GST/license, contact info)
* Login Page — Email/password login
* My Profile Page — View/edit business profile, logo, operating hours, supported vehicle brands, delivery radius

Operations:
Register account, login/logout, update profile details, change password, view own role and permissions

Module 2 — Matching Engine
Pages:

* My Match Requests Page — View all instances where the algorithm matched this supplier to a buyer's search query. See match score, buyer requirements, and whether it converted to an order.

Operations:
View incoming match requests, see why they were matched (score breakdown — price, distance, rating, availability), see match-to-order conversion rate, understand what factors to improve for better matching

Module 3 — Route Optimization
Pages:

* Outgoing Deliveries Map Page — Map view showing routes of all their active outgoing orders (from their warehouse to buyers)

Operations:
View active delivery routes for their orders, see estimated delivery time for each active order, see pickup schedule (when delivery is expected to pick up from their location)

Module 4 — Supplier & Inventory
Pages:

* My Inventory Page — Full list of all their parts with search/filter. Each item shows name, category, brand compatibility, price, quantity in stock, status.
* Add/Edit Part Page — Form to add a new part or edit existing. Fields: part name, description, category, compatible vehicles, price, quantity, images, SKU.
* Bulk Upload Page — Upload inventory via CSV/Excel for mass additions or updates
* Low Stock Alerts Page — View all parts below the defined threshold quantity

Operations:
Add/edit/delete parts, set pricing, update stock quantities, bulk upload via CSV, set low-stock threshold per item, view low-stock alerts, mark items as available/unavailable, search and filter own inventory, view part performance (how often each part is matched/ordered)

Module 5 — Order Management
Pages:

* Incoming Orders Page — View all orders placed with this supplier. Tabs or filters by status: new, accepted, packing, ready for pickup, in-transit, delivered, cancelled.
* Order Detail Page — Full details of a specific order (buyer info, items ordered, quantities, total amount, delivery address, timeline)
* Order History Page — Past completed/cancelled orders with ratings received

Operations:
View new incoming orders, accept or reject an order, update order status (accepted → packing → ready for pickup), view buyer details for each order, see delivery tracking once picked up, view order history, download order invoices, see rating received per order

Module 6 — Notifications/WebSockets
Pages:

* My Notifications Page — All notifications: new order received, order status updates, low stock alert, new rating received, match request, payment received

Operations:
View all notifications, mark as read/unread, receive real-time push notifications via WebSocket (instant alert when new order comes in, when stock hits low threshold), configure notification preferences (which alerts they want)

Module 7 — Analytics Dashboard
Pages:

* My Dashboard Page — Supplier-specific KPIs: total orders this month, revenue, average order value, top-selling parts, inventory health (% in stock vs low stock), average rating, match-to-order conversion rate
* My Reports Page — Sales trends over time, inventory movement report, rating trends. Filter by date range.

Operations:
View personal KPIs, see top-selling vs slow-moving parts, track revenue trends, monitor rating over time, see how often they're matched vs how often it converts, identify which parts need restocking, export own reports

📊 Supplier Summary
ModulePagesKey FocusAuth/RBAC3Register, login, profileMatching Engine1View my matchesRoute Optimization1Track my outgoing deliveriesSupplier & Inventory4Manage my parts & stockOrder Management3Handle my ordersNotifications1Real-time alertsAnalytics2My performance & reportsTotal15


🛒 ROLE 3: BUYER
Mechanics, garages, repair shops, or individuals purchasing auto parts.

Module 1 — Auth/RBAC
Pages:

* Register Page — Signup with details (name, business name if applicable, address, phone, email)
* Login Page — Email/password login
* My Profile Page — View/edit personal details, saved addresses, preferred vehicle brands, payment preferences

Operations:
Register account, login/logout, update profile details, change password, manage saved addresses, view own role and permissions

Module 2 — Matching Engine
Pages:

* Search & Match Results Page — Search for a part by name, category, or vehicle model. The matching engine returns a ranked list of suppliers showing: supplier name, price, distance, rating, availability, overall match score. Side-by-side comparison view.
* Match Detail Page — Click on a specific matched supplier to see full breakdown: why this supplier was recommended, score per factor, supplier profile, full part details, estimated delivery time

Operations:
Search for parts with filters (category, vehicle brand, price range, distance), view AI-ranked supplier matches, compare multiple suppliers side by side, see match score breakdown per supplier, select a supplier and proceed to order, re-run match with different filters/preferences

Module 3 — Route Optimization
Pages:

* Live Delivery Tracking Page — Real-time map showing where the delivery is currently, with optimized route displayed, ETA, and status updates

Operations:
Track active order delivery on map in real-time, see estimated time of arrival (continuously updated), see route being taken, view delivery status changes (picked up → in transit → nearby → delivered)

Module 4 — Supplier & Inventory
Pages:

* Supplier Profile Page — View a specific supplier's public profile: business info, rating, reviews, catalog of available parts, operating hours, location on map
* Part Detail Page — Detailed view of a specific part: description, images, price, compatible vehicles, supplier info, availability status, reviews

Operations:
Browse supplier profiles, view their available inventory/catalog, check part details and compatibility, see supplier ratings and reviews, check if a specific part is in stock at a specific supplier

Module 5 — Order Management
Pages:

* Cart / Checkout Page — Review selected parts, adjust quantities, see pricing breakdown (item cost + delivery estimate), confirm delivery address, place order
* My Orders Page — View all orders with status tabs: active, completed, cancelled. Each shows order summary, status, supplier name, total amount.
* Order Detail Page — Full details of a specific order: items, quantities, supplier info, order timeline (every status change), delivery tracking link, invoice

Operations:
Add parts to cart, adjust quantities, remove items, place order, view all my orders with filters, track active order status, view full order timeline, cancel order (if still in pending/accepted status), rate supplier after delivery, download invoice/receipt, reorder from past order

Module 6 — Notifications/WebSockets
Pages:

* My Notifications Page — All notifications: order confirmed, order status updates (accepted, packed, picked up, in transit, delivered), price drop on frequently ordered part, match results ready

Operations:
View all notifications, mark as read/unread, receive real-time push notifications via WebSocket (instant update when order status changes, when delivery is nearby), configure notification preferences

Module 7 — Analytics Dashboard
Pages:

* My Dashboard Page — Buyer-specific overview: total spending this month, number of orders, frequently ordered parts, preferred suppliers, recommended parts (based on order history / demand forecasting)

Operations:
View personal spending trends, see most ordered parts, see most used suppliers, view recommended/suggested parts based on past orders, track order frequency over time

📊 Buyer Summary
ModulePagesKey FocusAuth/RBAC3Register, login, profileMatching Engine2Search & view matched suppliersRoute Optimization1Live delivery trackingSupplier & Inventory2Browse suppliers & partsOrder Management3Cart, orders, invoicesNotifications1Real-time order updatesAnalytics1My spending & trendsTotal13


🔢 Grand Total Summary
RoleTotal PagesPrimary PurposeAdmin18Control, configure, monitor everythingSupplier15List parts, manage stock, fulfill ordersBuyer13Search, match, order, trackGrand Total46
After removing shared/reusable pages (login, register, notifications layout, order detail template, profile layout), the actual unique screens to build comes down to approximately 30–34 pages.

Want me to now break these into a sprint-wise development plan or create the database schema that supports all three roles across all 7 modules?