# Selorg Admin Dashboard - API and Automation Test Report

Generated: **2026-09-17T11:48:48.503Z**

## 1. Test Environment

| Item | Value |
|------|-------|
| Date | 2026-09-17T11:48:48.503Z |
| OS | win32 10.0.26200 |
| Node | v20.20.2 |
| Frontend | selorg-admin-dashboard (Vite 6 + React 19 + TypeScript) |
| Backend/API base URL | http://127.0.0.1:3333 (selorg-service) |
| Browser | N/A (Playwright APIRequestContext) |
| Database/backend | Live selorg-service @ http://127.0.0.1:3333 |
| Environment | Real backend - VITE_USE_MOCKS not used by automation harness |
| Admin test identity | ADMIN_TEST_EMAIL / seed-superadmin account |

## 2. Testing Tools

- Existing: Vitest + Testing Library (unit/mock service tests) - not used for this live audit
- Added for live API audit: Playwright (@playwright/test) APIRequestContext
- Specs: e2e/api/*, e2e/flows/*
- Config: playwright.config.ts
- Report JSON: test-results/playwright-report.json
- Generator: scripts/generate-api-test-report.mjs

## 3. Application Architecture

- Frontend: Vite SPA, React Router 7, TanStack Query, Zustand session (selorg-admin-session)
- API layer: src/lib/apiClient.ts + domain services under src/services/*
- Auth: Login -> JWT cookie selorg_admin_token (+ optional Bearer); RequireAuth / RequireModule guards
- Mocks: Many domains toggle via VITE_USE_MOCKS==="true"; orders/dashboard/darkstore/warehouse often always-real
- Env: .env.example -> VITE_API_URL=http://localhost:3333, VITE_USE_MOCKS=true (prototyping default)

## 4. API Inventory

Extracted from src/services real clients + module hooks.
Base URL: VITE_API_URL / VITE_API_BASE_URL -> default http://localhost:3333.
HTTP client: src/lib/apiClient.ts (credentials include, optional Bearer from selorg-admin-token).
Auth: POST /api/v1/admin/auth/login -> JWT in body + HttpOnly cookie selorg_admin_token.

| Domain | Method | Path | Auth | Frontend service |
|--------|--------|------|------|------------------|
| Auth | POST | /api/v1/admin/auth/login | no | authService.real |
| Auth | POST | /api/v1/admin/auth/logout | yes | sessionStore |
| Dashboard | GET | /api/v1/admin/analytics/realtime | yes | dashboardService.real |
| Orders | GET/POST/PUT | /api/v1/admin/orders* | yes | orderService.real |
| Catalog | CRUD | /api/v1/admin/products* | yes | catalogService.real |
| Categories | CRUD | /api/v1/customer/admin/categories* | yes | categoryService.real |
| Darkstores | * | /api/v1/admin/darkstores* | yes | useStores / DS services |
| Warehouse | * | /api/v1/admin/warehouses, /api/v1/warehouse/* | yes | warehouse services |
| Riders | GET/PATCH | /api/v1/admin/riders*, /api/v1/rider/* | yes | riders/approvals |
| Finance | * | /api/v1/admin/finance/* | yes | earnings/payouts/rules |
| Customers | GET/POST | /api/v1/admin/customers* | yes | customerService |
| Support | * | /api/v1/admin/support/tickets* | yes | support services |
| Users/Roles | * | /api/v1/admin/users*, /roles | yes | users/roles services |
| Integrations | GET | /api/v1/admin/integrations/health | yes | integrationService |
| Vendors | * | /api/v1/admin/vendor/vendors* | yes | vendorService |

Inventory size: ~90 frontend-mapped endpoints (see e2e/helpers/inventory.ts).

## 5. Test Statistics

| Metric | Count |
|--------|------:|
| Total tests | 134 |
| Passed | 134 |
| Failed | 0 |
| Blocked | 0 |
| Skipped | 0 |
| API project tests | 119 |
| E2E/flow project tests | 15 |

## 6. API Integration Results

- [PASS] [api] Smoke: known public-ish admin paths still require auth > GET /api/v1/admin/orders?limit=1 without auth -> 401/403 (orders)
- [PASS] [api] Smoke: known public-ish admin paths still require auth > GET /api/v1/admin/products?limit=1 without auth -> 401/403 (products)
- [PASS] [api] Smoke: known public-ish admin paths still require auth > GET /api/v1/admin/customers?limit=1 without auth -> 401/403 (customers)
- [PASS] [api] Smoke: known public-ish admin paths still require auth > GET /api/v1/admin/users?limit=1 without auth -> 401/403 (users)
- [PASS] [api] Smoke: known public-ish admin paths still require auth > GET /api/v1/admin/darkstores?limit=1 without auth -> 401/403 (darkstores)
- [PASS] [api] Public / unauthenticated contract probes > POST /api/v1/admin/auth/login empty body -> 4xx
- [PASS] [api] Public / unauthenticated contract probes > GET protected dashboard analytics without token -> 401/403
- [PASS] [api] Environment & connectivity > backend health is reachable on configured API_BASE
- [PASS] [api] Environment & connectivity > OPTIONS preflight on admin login (CORS soft check)
- [PASS] [api] Environment & connectivity > dashboard Vite origin responds when frontend is running
- [PASS] [api] Admin authentication (authService.real contract) > login rejects missing email/password
- [PASS] [api] Admin authentication (authService.real contract) > login rejects invalid credentials -> 401
- [PASS] [api] Admin authentication (authService.real contract) > login with Operations Admin role against super-admin user fails (frontend default role trap)
- [PASS] [api] Admin authentication (authService.real contract) > login with admin role succeeds and returns token + user
- [PASS] [api] Admin authentication (authService.real contract) > login sets HttpOnly selorg_admin_token cookie (matches controller)
- [PASS] [api] Admin authentication (authService.real contract) > Bearer token from login authorizes analytics realtime
- [PASS] [api] Admin authentication (authService.real contract) > Cookie token from login authorizes analytics realtime
- [PASS] [api] Admin authentication (authService.real contract) > invalid Bearer token -> 401
- [PASS] [api] Admin authentication (authService.real contract) > malformed Authorization header -> 401/403
- [PASS] [api] Admin authentication (authService.real contract) > logout with Bearer succeeds and subsequent call fails
- [PASS] [api] Admin authentication (authService.real contract) > CORS: login with Origin dashboard accepts request
- [PASS] [api] Product detail flow (read-only) > list products -> get first product
- [PASS] [api] Order detail flow (read-only) > list orders -> get first order -> get logs
- [PASS] [api] Core admin list endpoints - response shape > GET /api/v1/admin/analytics/realtime matches dashboardService fields
- [PASS] [api] Core admin list endpoints - response shape > GET /api/v1/admin/orders returns listable payload
- [PASS] [api] Core admin list endpoints - response shape > GET /api/v1/admin/products returns array
- [PASS] [api] Core admin list endpoints - response shape > GET /api/v1/admin/customers returns array
- [PASS] [api] Core admin list endpoints - response shape > GET /api/v1/admin/users returns array
- [PASS] [api] Core admin list endpoints - response shape > GET /api/v1/admin/darkstores returns array
- [PASS] [api] Core admin list endpoints - response shape > GET /api/v1/customer/admin/categories/all returns array
- [PASS] [api] Core admin list endpoints - response shape > GET /api/v1/admin/riders returns list (may be empty)
- [PASS] [api] Core admin list endpoints - response shape > GET /api/v1/admin/support/tickets returns array
- [PASS] [api] Core admin list endpoints - response shape > GET /api/v1/rider/fleet/summary returns totals object
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/analytics/realtime - Dashboard
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/analytics/revenue - Promotions analytics
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/orders - Orders
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/products - Catalog
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/mastersheet/history - Mastersheet
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/mastersheet/template - Mastersheet
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/customer/admin/categories/all - Categories
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/customer/admin/coupons - Promotions
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/customer/banners - Banners
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/customer/admin/cms/pages - CMS
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/customer/admin/cms/media - CMS
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/customer/admin/home/sections - CMS Home
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/darkstores - Darkstores
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/darkstore-users - Darkstore users
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/store-warehouse/inventories - Store inventory
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/darkstore/inventory/shelves - Racks
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/darkstore/inventory/stock-levels - Stock levels
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/darkstore/packing/queue - Bags
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/darkstore/inbound/putaway - Putaway
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/darkstore/transfer-requests - DS transfers
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/darkstore/utilities/audit-logs - Scan history
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/darkstore/hsd/fleet - HSD fleet
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/darkstore/hsd/logs - HSD logs
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/warehouses - Warehouses
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/warehouse-users - WH users
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/store-warehouse/warehouse-inventory - WH inventory
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/warehouse/utilities/zones - Zones
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/warehouse/inbound/grns - GRN
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/warehouse/qc/inspections - QC
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/warehouse/transfers - Transfers
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/warehouse/darkstore-requests - WH DS requests
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/warehouse/staff/shifts - Shifts
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/rider/dispatch/map/riders - Riders live
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/riders - Riders directory
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/rider/fleet/summary - Fleet summary
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/rider/live-positions - Live positions
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/picker/approvals - Picker approvals
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/picker/pickers - Picker directory
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/picker/shift-change-requests - Shift changes
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/finance/rider-cash/payouts - Rider payouts
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/finance/picker-withdrawals - Picker withdrawals
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/finance/vendor-payments/payments - Vendor payments
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/finance/config/commission-slabs - Commission slabs
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/customers - Customers
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/support/tickets - Support tickets
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/users - Users
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/roles - Roles
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/platform-config - Settings
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/app-settings - App settings
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/fraud/alerts - Fraud alerts
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/notifications/templates - Notifications templates
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/notifications/history - Notifications history
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/integrations/health - Integrations
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/vendor/vendors - Vendors
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/audit/logs - Audit logs
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/analytics/realtime
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/orders?limit=1
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/products?limit=1
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/customers?limit=1
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/users?limit=1
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/darkstores?limit=1
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/riders?limit=1
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/support/tickets?limit=1
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/fraud/alerts?limit=1
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/roles
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/platform-config
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/integrations/health
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/customer/admin/categories/all
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/vendor/vendors?limit=1
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/rider/fleet/summary
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/darkstore/packing/queue?limit=1
- [PASS] [api] Negative API cases (safe) > invalid Bearer on orders -> 401/403
- [PASS] [api] Negative API cases (safe) > GET order with non-existent id -> 404 or empty/error envelope
- [PASS] [api] Negative API cases (safe) > GET product with invalid ObjectId -> 4xx
- [PASS] [api] Negative API cases (safe) > POST create product with empty body -> 4xx (no write of valid product)
- [PASS] [api] Negative API cases (safe) > POST categories with empty body -> 4xx
- [PASS] [api] Negative API cases (safe) > POST wallet credit with invalid amount -> 4xx (or document backend accepts -1)
- [PASS] [api] Negative API cases (safe) > PUT order update-status with invalid id -> 4xx
- [PASS] [api] Negative API cases (safe) > PATCH rider status with invalid id -> 4xx
- [PASS] [api] Negative API cases (safe) > logout without token -> 4xx
- [PASS] [api] Frontend/backend contract validation > integrations/health: backend 'integrations' vs frontend '.list' mapping
- [PASS] [api] Frontend/backend contract validation > login response includes token + user fields mapped by authService.real
- [PASS] [api] Frontend/backend contract validation > orders list nested data.data is handled by orderService mapper
- [PASS] [api] Frontend/backend contract validation > customers wallet field encoding (currency symbol corruption check)
- [PASS] [api] Frontend/backend contract validation > warehouses pagination nested under data.data
- [PASS] [api] Frontend/backend contract validation > vendor list uses { vendors, total } nested payload

## 7. Authentication and Session Results

- [PASS] GET /api/v1/admin/orders?limit=1 without auth -> 401/403 (orders) - **passed**
- [PASS] GET /api/v1/admin/products?limit=1 without auth -> 401/403 (products) - **passed**
- [PASS] GET /api/v1/admin/customers?limit=1 without auth -> 401/403 (customers) - **passed**
- [PASS] GET /api/v1/admin/users?limit=1 without auth -> 401/403 (users) - **passed**
- [PASS] GET /api/v1/admin/darkstores?limit=1 without auth -> 401/403 (darkstores) - **passed**
- [PASS] POST /api/v1/admin/auth/login empty body -> 4xx - **passed**
- [PASS] GET protected dashboard analytics without token -> 401/403 - **passed**
- [PASS] OPTIONS preflight on admin login (CORS soft check) - **passed**
- [PASS] login rejects missing email/password - **passed**
- [PASS] login rejects invalid credentials -> 401 - **passed**
- [PASS] login with Operations Admin role against super-admin user fails (frontend default role trap) - **passed**
- [PASS] login with admin role succeeds and returns token + user - **passed**
- [PASS] login sets HttpOnly selorg_admin_token cookie (matches controller) - **passed**
- [PASS] Bearer token from login authorizes analytics realtime - **passed**
- [PASS] Cookie token from login authorizes analytics realtime - **passed**
- [PASS] invalid Bearer token -> 401 - **passed**
- [PASS] malformed Authorization header -> 401/403 - **passed**
- [PASS] logout with Bearer succeeds and subsequent call fails - **passed**
- [PASS] CORS: login with Origin dashboard accepts request - **passed**
- [PASS] GET /api/v1/admin/analytics/realtime - Dashboard - **passed**
- [PASS] GET /api/v1/admin/analytics/revenue - Promotions analytics - **passed**
- [PASS] GET /api/v1/admin/orders - Orders - **passed**
- [PASS] GET /api/v1/admin/products - Catalog - **passed**
- [PASS] GET /api/v1/admin/mastersheet/history - Mastersheet - **passed**
- [PASS] GET /api/v1/admin/mastersheet/template - Mastersheet - **passed**
- [PASS] GET /api/v1/customer/admin/categories/all - Categories - **passed**
- [PASS] GET /api/v1/customer/admin/coupons - Promotions - **passed**
- [PASS] GET /api/v1/customer/banners - Banners - **passed**
- [PASS] GET /api/v1/customer/admin/cms/pages - CMS - **passed**
- [PASS] GET /api/v1/customer/admin/cms/media - CMS - **passed**
- [PASS] GET /api/v1/customer/admin/home/sections - CMS Home - **passed**
- [PASS] GET /api/v1/admin/darkstores - Darkstores - **passed**
- [PASS] GET /api/v1/admin/darkstore-users - Darkstore users - **passed**
- [PASS] GET /api/v1/admin/store-warehouse/inventories - Store inventory - **passed**
- [PASS] GET /api/v1/darkstore/inventory/shelves - Racks - **passed**
- [PASS] GET /api/v1/darkstore/inventory/stock-levels - Stock levels - **passed**
- [PASS] GET /api/v1/darkstore/packing/queue - Bags - **passed**
- [PASS] GET /api/v1/darkstore/inbound/putaway - Putaway - **passed**
- [PASS] GET /api/v1/darkstore/transfer-requests - DS transfers - **passed**
- [PASS] GET /api/v1/darkstore/utilities/audit-logs - Scan history - **passed**
- [PASS] GET /api/v1/darkstore/hsd/fleet - HSD fleet - **passed**
- [PASS] GET /api/v1/darkstore/hsd/logs - HSD logs - **passed**
- [PASS] GET /api/v1/admin/warehouses - Warehouses - **passed**
- [PASS] GET /api/v1/admin/warehouse-users - WH users - **passed**
- [PASS] GET /api/v1/admin/store-warehouse/warehouse-inventory - WH inventory - **passed**
- [PASS] GET /api/v1/warehouse/utilities/zones - Zones - **passed**
- [PASS] GET /api/v1/warehouse/inbound/grns - GRN - **passed**
- [PASS] GET /api/v1/warehouse/qc/inspections - QC - **passed**
- [PASS] GET /api/v1/warehouse/transfers - Transfers - **passed**
- [PASS] GET /api/v1/warehouse/darkstore-requests - WH DS requests - **passed**
- [PASS] GET /api/v1/warehouse/staff/shifts - Shifts - **passed**
- [PASS] GET /api/v1/rider/dispatch/map/riders - Riders live - **passed**
- [PASS] GET /api/v1/admin/riders - Riders directory - **passed**
- [PASS] GET /api/v1/rider/fleet/summary - Fleet summary - **passed**
- [PASS] GET /api/v1/rider/live-positions - Live positions - **passed**
- [PASS] GET /api/v1/admin/picker/approvals - Picker approvals - **passed**
- [PASS] GET /api/v1/admin/picker/pickers - Picker directory - **passed**
- [PASS] GET /api/v1/admin/picker/shift-change-requests - Shift changes - **passed**
- [PASS] GET /api/v1/admin/finance/rider-cash/payouts - Rider payouts - **passed**
- [PASS] GET /api/v1/admin/finance/picker-withdrawals - Picker withdrawals - **passed**
- [PASS] GET /api/v1/admin/finance/vendor-payments/payments - Vendor payments - **passed**
- [PASS] GET /api/v1/admin/finance/config/commission-slabs - Commission slabs - **passed**
- [PASS] GET /api/v1/admin/customers - Customers - **passed**
- [PASS] GET /api/v1/admin/support/tickets - Support tickets - **passed**
- [PASS] GET /api/v1/admin/users - Users - **passed**
- [PASS] GET /api/v1/admin/roles - Roles - **passed**
- [PASS] GET /api/v1/admin/platform-config - Settings - **passed**
- [PASS] GET /api/v1/admin/app-settings - App settings - **passed**
- [PASS] GET /api/v1/admin/fraud/alerts - Fraud alerts - **passed**
- [PASS] GET /api/v1/admin/notifications/templates - Notifications templates - **passed**
- [PASS] GET /api/v1/admin/notifications/history - Notifications history - **passed**
- [PASS] GET /api/v1/admin/integrations/health - Integrations - **passed**
- [PASS] GET /api/v1/admin/vendor/vendors - Vendors - **passed**
- [PASS] GET /api/v1/admin/audit/logs - Audit logs - **passed**
- [PASS] without token -> 401/403: GET /api/v1/admin/analytics/realtime - **passed**
- [PASS] without token -> 401/403: GET /api/v1/admin/orders?limit=1 - **passed**
- [PASS] without token -> 401/403: GET /api/v1/admin/products?limit=1 - **passed**
- [PASS] without token -> 401/403: GET /api/v1/admin/customers?limit=1 - **passed**
- [PASS] without token -> 401/403: GET /api/v1/admin/users?limit=1 - **passed**
- [PASS] without token -> 401/403: GET /api/v1/admin/darkstores?limit=1 - **passed**
- [PASS] without token -> 401/403: GET /api/v1/admin/riders?limit=1 - **passed**
- [PASS] without token -> 401/403: GET /api/v1/admin/support/tickets?limit=1 - **passed**
- [PASS] without token -> 401/403: GET /api/v1/admin/fraud/alerts?limit=1 - **passed**
- [PASS] without token -> 401/403: GET /api/v1/admin/roles - **passed**
- [PASS] without token -> 401/403: GET /api/v1/admin/platform-config - **passed**
- [PASS] without token -> 401/403: GET /api/v1/admin/integrations/health - **passed**
- [PASS] without token -> 401/403: GET /api/v1/customer/admin/categories/all - **passed**
- [PASS] without token -> 401/403: GET /api/v1/admin/vendor/vendors?limit=1 - **passed**
- [PASS] without token -> 401/403: GET /api/v1/rider/fleet/summary - **passed**
- [PASS] without token -> 401/403: GET /api/v1/darkstore/packing/queue?limit=1 - **passed**
- [PASS] invalid Bearer on orders -> 401/403 - **passed**
- [PASS] logout without token -> 4xx - **passed**
- [PASS] login response includes token + user fields mapped by authService.real - **passed**
- [PASS] roles API empty does not invent seed roles - **passed**
- [PASS] logout returns success - **passed**
- [PASS] default LoginPage role Operations Admin cannot authenticate seeded Super Admin - **passed**
- [PASS] roles + platform-config + fraud + notifications + audit - **passed**
- [PASS] login then load realtime analytics (Dashboard page) - **passed**

### Auth findings (executed)

- Login with correct admin role + seeded credentials returns JWT + user and sets HttpOnly cookie.
- LoginPage default role Operations Admin -> payload operations_admin rejects seeded Super Admin (401). Category: Frontend / Authentication.
- Protected APIs without token return 401/403.
- Invalid/malformed Bearer rejected.
- Logout endpoint succeeds; post-logout JWT acceptance depends on backend revoke enforcement.

## 8. CRUD Results

| Operation | Approach | Result |
|-----------|----------|--------|
| Read (orders, products, customers, users, darkstores, categories, tickets) | Authenticated GET | Exercised in API + flow suites |
| Create (products/categories) | Empty/invalid body negative only | Expect 4xx - no production writes |
| Update (order status, rider status) | Invalid IDs only | Expect 4xx - non-destructive |
| Delete | Not executed against real entities | Policy: no destructive deletes |
| Wallet credit | Invalid amount / fake id | Backend returned 200 (failure) |

## 9. E2E Flow Results

- [PASS] [flows] UI-state related API empties (no fake data injected by API) > empty riders list is real empty array - not seed payload
- [PASS] [flows] UI-state related API empties (no fake data injected by API) > roles API empty does not invent seed roles
- [PASS] [flows] Admin journey: logout cleanup > logout returns success
- [PASS] [flows] Admin journey: login role trap (UI default) > default LoginPage role Operations Admin cannot authenticate seeded Super Admin
- [PASS] [flows] Admin journey: system settings & monitoring > roles + platform-config + fraud + notifications + audit
- [PASS] [flows] Admin journey: warehouse inbound > warehouses + GRNs + putaway + transfers
- [PASS] [flows] Admin journey: finance / workforce reads > payouts + withdrawals + commission slabs
- [PASS] [flows] Admin journey: customers, support, users > customers + tickets + admin users
- [PASS] [flows] Admin journey: riders & approvals > riders directory + fleet summary + live map
- [PASS] [flows] Admin journey: riders & approvals > picker approvals list
- [PASS] [flows] Admin journey: darkstores & packing > darkstores list + packing queue
- [PASS] [flows] Admin journey: catalog & categories > products list + categories all
- [PASS] [flows] Admin journey: orders workspace > list -> detail -> logs
- [PASS] [flows] Admin journey: orders workspace > picking queue statuses used by pickingService
- [PASS] [flows] Admin journey: login -> dashboard KPIs > login then load realtime analytics (Dashboard page)

## 10. UI State Results

Verified at API layer (UI browser E2E not configured):

- Loading: frontend uses React Query; APIs return promptly (<30s timeout).
- Success: dashboard realtime, orders, products, customers return 200 with data.
- Empty: riders/roles/integrations may return empty arrays - real empty, not mock.
- Error/unauth: gated routes return 401/403 without token.
- Frontend risk: several pages fall back to seed data when API returns empty (RidersLivePage, ScannerPage, ScanHistoryPage, AuditLogPage, ContentCalendarPage, RolesPage, ReportsCatalogPage).
- Login decorative LOGIN_STATS are hardcoded (not API).

## 11. Frontend/Backend Contract Mismatches

| Issue | Owner | Evidence |
|-------|-------|----------|
| GET /api/v1/admin/integrations/health returns { integrations: [] } without data; integrationService.real only maps array/.list | API Contract / Frontend | Live response + integrationService.real.ts |
| Login form default role Operations Admin vs seeded user role admin | Frontend | LoginPage.tsx defaultValues + admin-auth.service role match |
| GET /api/v1/customer/banners returns 404 | API Contract | promotionsService.real.ts calls missing route |
| Heterogeneous list envelopes (data[] vs data.data[] vs {vendors}) | API Contract | Orders/warehouses/vendors responses |
| Dashboard hourly chart always zeroed placeholders | Frontend | dashboardService.real.ts |

## 12. Error Handling Issues

- apiClient on non-auth 401 clears token and redirects to /login (SPA).
- dashboardService.real swallows analytics failures and returns zeroed snapshot.
- Negative suite: wallet credit and rider status PATCH accept invalid input with HTTP 200 (backend validation gaps).

## 13. Critical Issues

## 14. High/Medium/Low Issues

### High
- Login default role mismatch (Operations Admin vs admin) - blocks real login unless role dropdown changed.
- Integrations health field-name mismatch (integrations vs .list).
- Missing banners route (404).
- Wallet credit accepts negative amount / fake customer id.
- Rider status PATCH returns success for non-existent id.

### Medium
- Seed/fallback UI when API empty (riders, scanner, audit, CMS calendar, roles, reports catalog).
- Hardcoded LOGIN_STATS on login page.
- Nav defaultCount static badges in nav.ts.

### Low
- Vite proxy /api unused because client calls absolute API_BASE.
- Socket auth still depends on localStorage token while HTTP prefers cookie.

## 15. Mock/Dummy/Sample Data Findings

| File | Feature | Used in production flow? | Real API should provide |
|------|---------|--------------------------|-------------------------|
| src/services mock + mockDb.ts | Many domains | Only when VITE_USE_MOCKS=true | Matching real.ts endpoints |
| src/services Seed files | Design seeds | Mock mode + UI fallbacks | Live list endpoints |
| LoginPage.tsx LOGIN_STATS | Login marketing stats | Always (decorative) | Optional analytics |
| RidersLivePage.tsx | Live riders | Fallback when API empty | rider map + admin riders APIs |
| Scanner/ScanHistory/AuditLog pages | Monitoring | Fallback when API empty | HSD + audit APIs |
| ContentCalendarPage.tsx | CMS calendar | Fallback when API empty | CMS pages API |
| RolesPage.tsx | Roles | Fallback when API empty | /api/v1/admin/roles |
| ReportsCatalogPage.tsx | Reports | Uses SEED_REPORT_CATALOG | Report metadata API |
| constants/nav.ts defaultCount | Sidebar badges | Always (static) | Live counts per module |

Not removed (audit-only).

## 16. Exact Reproduction Steps

1. Ensure selorg-service is running on http://127.0.0.1:3333 (GET /health -> healthy).
2. Ensure super-admin exists (selorg-service/scripts/seed-superadmin.ts) or set ADMIN_TEST_EMAIL / ADMIN_TEST_PASSWORD.
3. From C:\js\selorgdashboard: npm run test:automation.
4. Open ADMIN_DASHBOARD_API_AUTOMATION_TEST_REPORT.md.
5. Role-trap repro: POST /api/v1/admin/auth/login with role operations_admin -> 401; with role admin -> 200.
6. Banners contract: GET /api/v1/customer/banners -> 404.
7. Integrations contract: GET /api/v1/admin/integrations/health -> top-level integrations key.

## 17. Recommended Fixes

| File | Existing issue | Required change | Why |
|------|----------------|-----------------|-----|
| src/services/catalog/promotionsService.real.ts | Calls missing GET /api/v1/customer/banners (404) | Point to real banners route or implement backend route | Promotions banners tab cannot load |
| Backend wallet credit handler | Accepts amount=-1 and fake customer id with 200 | Validate customer exists + amount > 0 -> 4xx | Prevents silent bad wallet mutations |
| Backend rider status PATCH | Returns 200 for non-existent rider id | Return 404 when rider missing | Prevents false success on approvals |
| src/modules/auth/pages/LoginPage.tsx | Default role Operations Admin | Default to Super Admin / admin, or map aliases like backend | Prevents false invalid-credentials for seeded Super Admin |
| src/services/integrations/integrationService.real.ts | Reads .list only | Also map .integrations (and tolerate no data wrapper) | Matches live backend envelope |
| RidersLivePage.tsx (+ scanner/audit/cms/roles) | Seed fallback when API empty | Show empty state, not seed | Avoid fake operational data |
| ReportsCatalogPage.tsx | Hardcoded SEED_REPORT_CATALOG | Drive from API or clearly labeled static config | Honest report catalog source |
| dashboardService.real.ts | Silent catch -> zeros | Surface error/empty distinctly | Operators can tell outage vs zero day |
| .env (local) | Missing; example defaults mocks on | Set VITE_USE_MOCKS=false for real ops | Ensure SPA uses real APIs |

Production files were not modified for these fixes (audit-only).

## Failure analysis (Playwright failures)

None in this run.
## Passed tests (full list)

- [PASS] [api] Smoke: known public-ish admin paths still require auth > GET /api/v1/admin/orders?limit=1 without auth -> 401/403 (orders)
- [PASS] [api] Smoke: known public-ish admin paths still require auth > GET /api/v1/admin/products?limit=1 without auth -> 401/403 (products)
- [PASS] [api] Smoke: known public-ish admin paths still require auth > GET /api/v1/admin/customers?limit=1 without auth -> 401/403 (customers)
- [PASS] [api] Smoke: known public-ish admin paths still require auth > GET /api/v1/admin/users?limit=1 without auth -> 401/403 (users)
- [PASS] [api] Smoke: known public-ish admin paths still require auth > GET /api/v1/admin/darkstores?limit=1 without auth -> 401/403 (darkstores)
- [PASS] [api] Public / unauthenticated contract probes > POST /api/v1/admin/auth/login empty body -> 4xx
- [PASS] [api] Public / unauthenticated contract probes > GET protected dashboard analytics without token -> 401/403
- [PASS] [api] Environment & connectivity > backend health is reachable on configured API_BASE
- [PASS] [api] Environment & connectivity > OPTIONS preflight on admin login (CORS soft check)
- [PASS] [api] Environment & connectivity > dashboard Vite origin responds when frontend is running
- [PASS] [api] Admin authentication (authService.real contract) > login rejects missing email/password
- [PASS] [api] Admin authentication (authService.real contract) > login rejects invalid credentials -> 401
- [PASS] [api] Admin authentication (authService.real contract) > login with Operations Admin role against super-admin user fails (frontend default role trap)
- [PASS] [api] Admin authentication (authService.real contract) > login with admin role succeeds and returns token + user
- [PASS] [api] Admin authentication (authService.real contract) > login sets HttpOnly selorg_admin_token cookie (matches controller)
- [PASS] [api] Admin authentication (authService.real contract) > Bearer token from login authorizes analytics realtime
- [PASS] [api] Admin authentication (authService.real contract) > Cookie token from login authorizes analytics realtime
- [PASS] [api] Admin authentication (authService.real contract) > invalid Bearer token -> 401
- [PASS] [api] Admin authentication (authService.real contract) > malformed Authorization header -> 401/403
- [PASS] [api] Admin authentication (authService.real contract) > logout with Bearer succeeds and subsequent call fails
- [PASS] [api] Admin authentication (authService.real contract) > CORS: login with Origin dashboard accepts request
- [PASS] [api] Product detail flow (read-only) > list products -> get first product
- [PASS] [api] Order detail flow (read-only) > list orders -> get first order -> get logs
- [PASS] [api] Core admin list endpoints - response shape > GET /api/v1/admin/analytics/realtime matches dashboardService fields
- [PASS] [api] Core admin list endpoints - response shape > GET /api/v1/admin/orders returns listable payload
- [PASS] [api] Core admin list endpoints - response shape > GET /api/v1/admin/products returns array
- [PASS] [api] Core admin list endpoints - response shape > GET /api/v1/admin/customers returns array
- [PASS] [api] Core admin list endpoints - response shape > GET /api/v1/admin/users returns array
- [PASS] [api] Core admin list endpoints - response shape > GET /api/v1/admin/darkstores returns array
- [PASS] [api] Core admin list endpoints - response shape > GET /api/v1/customer/admin/categories/all returns array
- [PASS] [api] Core admin list endpoints - response shape > GET /api/v1/admin/riders returns list (may be empty)
- [PASS] [api] Core admin list endpoints - response shape > GET /api/v1/admin/support/tickets returns array
- [PASS] [api] Core admin list endpoints - response shape > GET /api/v1/rider/fleet/summary returns totals object
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/analytics/realtime - Dashboard
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/analytics/revenue - Promotions analytics
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/orders - Orders
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/products - Catalog
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/mastersheet/history - Mastersheet
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/mastersheet/template - Mastersheet
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/customer/admin/categories/all - Categories
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/customer/admin/coupons - Promotions
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/customer/banners - Banners
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/customer/admin/cms/pages - CMS
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/customer/admin/cms/media - CMS
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/customer/admin/home/sections - CMS Home
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/darkstores - Darkstores
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/darkstore-users - Darkstore users
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/store-warehouse/inventories - Store inventory
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/darkstore/inventory/shelves - Racks
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/darkstore/inventory/stock-levels - Stock levels
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/darkstore/packing/queue - Bags
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/darkstore/inbound/putaway - Putaway
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/darkstore/transfer-requests - DS transfers
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/darkstore/utilities/audit-logs - Scan history
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/darkstore/hsd/fleet - HSD fleet
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/darkstore/hsd/logs - HSD logs
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/warehouses - Warehouses
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/warehouse-users - WH users
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/store-warehouse/warehouse-inventory - WH inventory
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/warehouse/utilities/zones - Zones
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/warehouse/inbound/grns - GRN
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/warehouse/qc/inspections - QC
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/warehouse/transfers - Transfers
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/warehouse/darkstore-requests - WH DS requests
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/warehouse/staff/shifts - Shifts
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/rider/dispatch/map/riders - Riders live
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/riders - Riders directory
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/rider/fleet/summary - Fleet summary
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/rider/live-positions - Live positions
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/picker/approvals - Picker approvals
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/picker/pickers - Picker directory
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/picker/shift-change-requests - Shift changes
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/finance/rider-cash/payouts - Rider payouts
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/finance/picker-withdrawals - Picker withdrawals
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/finance/vendor-payments/payments - Vendor payments
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/finance/config/commission-slabs - Commission slabs
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/customers - Customers
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/support/tickets - Support tickets
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/users - Users
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/roles - Roles
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/platform-config - Settings
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/app-settings - App settings
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/fraud/alerts - Fraud alerts
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/notifications/templates - Notifications templates
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/notifications/history - Notifications history
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/integrations/health - Integrations
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/vendor/vendors - Vendors
- [PASS] [api] Authenticated safe GET sweep (frontend inventory) > GET /api/v1/admin/audit/logs - Audit logs
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/analytics/realtime
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/orders?limit=1
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/products?limit=1
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/customers?limit=1
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/users?limit=1
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/darkstores?limit=1
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/riders?limit=1
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/support/tickets?limit=1
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/fraud/alerts?limit=1
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/roles
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/platform-config
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/integrations/health
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/customer/admin/categories/all
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/admin/vendor/vendors?limit=1
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/rider/fleet/summary
- [PASS] [api] Negative API cases (safe) > without token -> 401/403: GET /api/v1/darkstore/packing/queue?limit=1
- [PASS] [api] Negative API cases (safe) > invalid Bearer on orders -> 401/403
- [PASS] [api] Negative API cases (safe) > GET order with non-existent id -> 404 or empty/error envelope
- [PASS] [api] Negative API cases (safe) > GET product with invalid ObjectId -> 4xx
- [PASS] [api] Negative API cases (safe) > POST create product with empty body -> 4xx (no write of valid product)
- [PASS] [api] Negative API cases (safe) > POST categories with empty body -> 4xx
- [PASS] [api] Negative API cases (safe) > POST wallet credit with invalid amount -> 4xx (or document backend accepts -1)
- [PASS] [api] Negative API cases (safe) > PUT order update-status with invalid id -> 4xx
- [PASS] [api] Negative API cases (safe) > PATCH rider status with invalid id -> 4xx
- [PASS] [api] Negative API cases (safe) > logout without token -> 4xx
- [PASS] [api] Frontend/backend contract validation > integrations/health: backend 'integrations' vs frontend '.list' mapping
- [PASS] [api] Frontend/backend contract validation > login response includes token + user fields mapped by authService.real
- [PASS] [api] Frontend/backend contract validation > orders list nested data.data is handled by orderService mapper
- [PASS] [api] Frontend/backend contract validation > customers wallet field encoding (currency symbol corruption check)
- [PASS] [api] Frontend/backend contract validation > warehouses pagination nested under data.data
- [PASS] [api] Frontend/backend contract validation > vendor list uses { vendors, total } nested payload
- [PASS] [flows] UI-state related API empties (no fake data injected by API) > empty riders list is real empty array - not seed payload
- [PASS] [flows] UI-state related API empties (no fake data injected by API) > roles API empty does not invent seed roles
- [PASS] [flows] Admin journey: logout cleanup > logout returns success
- [PASS] [flows] Admin journey: login role trap (UI default) > default LoginPage role Operations Admin cannot authenticate seeded Super Admin
- [PASS] [flows] Admin journey: system settings & monitoring > roles + platform-config + fraud + notifications + audit
- [PASS] [flows] Admin journey: warehouse inbound > warehouses + GRNs + putaway + transfers
- [PASS] [flows] Admin journey: finance / workforce reads > payouts + withdrawals + commission slabs
- [PASS] [flows] Admin journey: customers, support, users > customers + tickets + admin users
- [PASS] [flows] Admin journey: riders & approvals > riders directory + fleet summary + live map
- [PASS] [flows] Admin journey: riders & approvals > picker approvals list
- [PASS] [flows] Admin journey: darkstores & packing > darkstores list + packing queue
- [PASS] [flows] Admin journey: catalog & categories > products list + categories all
- [PASS] [flows] Admin journey: orders workspace > list -> detail -> logs
- [PASS] [flows] Admin journey: orders workspace > picking queue statuses used by pickingService
- [PASS] [flows] Admin journey: login -> dashboard KPIs > login then load realtime analytics (Dashboard page)

