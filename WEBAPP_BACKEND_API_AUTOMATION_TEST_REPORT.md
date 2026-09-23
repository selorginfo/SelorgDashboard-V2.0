# Selorg Dashboard ↔ Backend Automation Test Report

Generated: **2026-09-19T09:51:00Z** (local: Saturday Sep 19, 2026 ~14:25–15:00 IST)

---

## 1. Test Environment

| Item | Value |
|------|-------|
| Dashboard | `selorg-admin-dashboard-develoment` (Vite 6 + React 19 + TypeScript) |
| Backend | `selorg-service-development` (Express + TypeScript + Mongoose) |
| API base URL | `http://127.0.0.1:3333` (`VITE_API_URL=http://localhost:3333`) |
| Browser | N/A for Playwright API project; Vite SPA was started at `http://localhost:5173` during part of the run |
| Node version | v24.17.0 |
| Testing framework | **Existing:** Playwright (`@playwright/test`) API + flows under `e2e/`; Vitest for unit/mocks |
| Database | Ephemeral MongoDB Memory Server (replica set) — no production DB used |
| Admin test identity | `hemanathc0112@gmail.com` / `Selorg@2024` / role `admin` (seeded via `scripts/seed-superadmin.ts`) |
| Customer test identity | Phone `9698790921`, OTP `8790` (`ALLOW_CUSTOMER_TEST_OTP=true`) |
| Mocks | `VITE_USE_MOCKS=false` — real backend only |
| Date/time of test | 2026-09-19T09:06:40Z – 2026-09-19T09:07:21Z (Playwright rerun); customer journey ~09:06Z |

### How the environment was brought up (test infrastructure only)

1. No `.env` / MongoDB / Docker existed on the machine.
2. Test-only bootstrap: `scripts/_test-db-bootstrap.mjs` (mongodb-memory-server replica set) wrote backend `.env`.
3. Seeded super-admin + catalog product `AUTO-MILK-1L`.
4. Started `npm run dev` on backend (port 3333) and dashboard (port 5173).
5. Ran existing Playwright suite: `npx playwright test`.

**Production / business logic was not modified.** Only test infrastructure (`.env`, bootstrap script, seed) was used.

---

## 2. Backend API Inventory

**Source:** Full route scan of `src/app.ts` + all `*.routes.ts` under `src/modules` and `src/routes`.  
**Machine-readable dump:** `selorg-service-development/API_ENDPOINT_INVENTORY.tsv`

| Metric | Count |
|--------|------:|
| Total HTTP endpoints discovered | **~2020** |
| Route files | 60 (all mounted; none orphaned) |
| Primary prefix | `/api/v1` |
| Extra prefix | `/api/payment` (no v1) |
| Health endpoints | `/health`, `/healthz`, `/health/db`, `/health/ready` (+ module `/health`s) |
| Swagger | `/api-docs` (non-prod / `ENABLE_SWAGGER=true`) |

### Mount summary (all reachable)

| Mount | Domain |
|-------|--------|
| `/api/v1/customer/auth` | Customer OTP auth |
| `/api/v1/customer/*` | Storefront: products, cart, orders, wallet, payments, addresses, search, home, … |
| `/api/v1/customer/admin/*` | CMS / categories / coupons / banners (admin JWT) |
| `/api/v1/admin` | Dashboard admin tree (users, analytics, riders, customers, fraud, …) |
| `/api/v1/admin/orders` | Admin order router (also nested under admin) |
| `/api/v1/admin/picker` | Picker admin (also nested under admin — **shadowing**) |
| `/api/v1/admin/products`, `/mastersheet`, `/darkstores`, `/vendor`, `/finance` | Catalog / ops / finance |
| `/api/v1/rider`, `/picker`, `/darkstore`, `/warehouse`, `/hhd`, `/merch`, `/production` | Ops apps |
| `/api/v1/shared`, `/logistics`, `/diag` (non-prod) | Shared / diagnostics |

### Auth model

| Domain | Mechanism |
|--------|-----------|
| Admin / Dashboard | Cookie `selorg_admin_token` **or** `Authorization: Bearer` signed with `JWT_SECRET` |
| Customer | Bearer only; `CUSTOMER_JWT_SECRET` \|\| `JWT_SECRET` |
| Picker / Rider app | Bearer; `aud: 'picker'`; `PICKER_JWT_SECRET` |
| HHD | Bearer with HHD JWT |

### Representative endpoint sample (dashboard-relevant)

| Method | Endpoint | Auth | Controller area | Mounted | Tested | Result |
|--------|----------|------|-----------------|---------|--------|--------|
| GET | `/health` | no | app.ts | yes | yes | PASS |
| POST | `/api/v1/admin/auth/login` | no | admin auth | yes | yes | PASS |
| POST | `/api/v1/admin/auth/logout` | yes | admin auth | yes | yes | PASS |
| GET | `/api/v1/admin/analytics/realtime` | yes + permission | analytics | yes | yes | PASS |
| GET | `/api/v1/admin/orders` | yes | admin orders | yes | yes | PASS |
| GET | `/api/v1/admin/products` | yes | products.admin | yes | yes | PASS |
| GET | `/api/v1/admin/customers` | yes | admin customers | yes | yes | PASS |
| GET | `/api/v1/admin/riders` | yes | rider master | yes | yes (flaky late in suite) | PASS / intermittent 403 |
| GET | `/api/v1/admin/picker/approvals` | yes | **admin-picker-ops stub** | yes (shadows real picker admin) | yes | **FAIL 501** |
| GET | `/api/v1/admin/picker/pickers` | yes | stub | yes | yes | **FAIL 501** |
| GET | `/api/v1/admin/picker/shift-change-requests` | yes | stub | yes | yes | **FAIL 501** |
| GET | `/api/v1/customer/admin/categories/all` | yes | categories admin | yes | yes | PASS |
| POST | `/api/v1/customer/auth/send-otp` | no | customer auth | yes | yes | PASS |
| POST | `/api/v1/customer/auth/verify-otp` | no | customer auth | yes | yes | PASS |
| POST | `/api/v1/customer/addresses` | customer | addresses | yes | yes | PASS |
| POST | `/api/v1/customer/cart/items` | customer | cart | yes | yes | PASS |
| POST | `/api/v1/customer/orders` | customer | orders | yes | yes | PASS (needs Mongo replica set) |

Full inventory of ~2020 rows: see `API_ENDPOINT_INVENTORY.tsv`.

---

## 3. Web App (Dashboard) API Inventory

**Source:** `src/lib/apiClient.ts` + all `src/services/**` + module hooks; cross-checked with `e2e/helpers/inventory.ts`.

| Metric | Count |
|--------|------:|
| Dashboard-mapped API calls (inventory helper) | **~98 curated** |
| Estimated real calls across services (full scan) | **~150+** |

### API client contract

| Concern | Behavior |
|---------|----------|
| Base URL | `VITE_API_BASE_URL \|\| VITE_API_URL \|\| http://localhost:3333` |
| Transport | Native `fetch` (not axios) |
| Credentials | `credentials: "include"` |
| Auth | Optional Bearer from `localStorage["selorg-admin-token"]` + HttpOnly cookie |
| Unwrap | Prefer `body.data` |
| 401 | Clear token → `/login` (except login/logout) |
| Refresh | **None** |
| Mocks | `VITE_USE_MOCKS=true` only (forced off in production builds) |

### Inventory (by feature)

| Screen/Feature | Method | Endpoint | Auth | Request | Response Expected | Result |
|----------------|--------|----------|------|---------|-------------------|--------|
| Auth | POST | `/api/v1/admin/auth/login` | no | `{email,password,role}` | `{token,user}` | PASS |
| Auth | POST | `/api/v1/admin/auth/logout` | yes | — | 200 | PASS |
| Dashboard | GET | `/api/v1/admin/analytics/realtime` | yes | — | KPI numbers | PASS |
| Orders | GET | `/api/v1/admin/orders` | yes | `?limit` / `?status` | list | PASS |
| Orders | GET | `/api/v1/admin/orders/:id` | yes | — | detail | PASS (when data exists) |
| Orders | PUT | `/api/v1/admin/orders/:id/update-status` | yes | `{status}` | updated | Negative tested |
| Catalog | CRUD | `/api/v1/admin/products*` | yes | product body | product | PASS reads |
| Categories | CRUD | `/api/v1/customer/admin/categories*` | yes | category | category | PASS reads |
| Promotions | GET | `/api/v1/customer/admin/coupons` | yes | — | list | PASS |
| Banners | GET | `/api/v1/customer/banners` | yes | — | list | PASS |
| CMS | GET | `/api/v1/customer/admin/cms/pages` | yes | — | list | PASS |
| Darkstores | GET | `/api/v1/admin/darkstores` | yes | — | array | PASS |
| Packing | GET | `/api/v1/darkstore/packing/queue` | yes | — | queue | PASS |
| Warehouse | GET | `/api/v1/warehouse/inbound/grns` etc. | yes | — | list | PASS (&lt;500) |
| Riders | GET | `/api/v1/admin/riders` | yes | — | list | PASS (one late FAIL 403 — see §15) |
| Fleet | GET | `/api/v1/rider/fleet/summary` | yes | — | totals | PASS |
| Picker approvals | GET | `/api/v1/admin/picker/approvals` | yes | — | list | **FAIL 501** |
| Picker directory | GET | `/api/v1/admin/picker/pickers` | yes | — | list | **FAIL 501** |
| Shift changes | GET | `/api/v1/admin/picker/shift-change-requests` | yes | — | list | **FAIL 501** |
| Finance | GET | `/api/v1/admin/finance/*` | yes | — | lists | PASS (&lt;500) |
| Customers | GET | `/api/v1/admin/customers` | yes | — | array | PASS |
| Wallet credit | POST | `/api/v1/admin/customers/:id/wallet/credit` | yes | `{amount}` | customer | Negative tested |
| Support | GET | `/api/v1/admin/support/tickets` | yes | — | array | PASS |
| Users / Roles | GET | `/api/v1/admin/users`, `/roles` | yes | — | arrays | PASS |
| Settings | GET | `/api/v1/admin/platform-config` | yes | — | config | PASS |
| Integrations | GET | `/api/v1/admin/integrations/health` | yes | — | health | PASS (contract note) |
| Vendors | GET | `/api/v1/admin/vendor/vendors` | yes | — | `{vendors,total}` | PASS |
| Audit | GET | `/api/v1/admin/audit/logs` | yes | — | events | PASS |

---

## 4. Backend ↔ Web App Cross Reference

| Backend Endpoint | Used By Web App | Integration Status | Issue |
|------------------|-----------------|--------------------|-------|
| Most `/api/v1/admin/*` list/read endpoints used by dashboard | Yes | **A — correct** | — |
| Customer storefront (`/customer/cart`, `/customer/orders`, …) | No (admin dashboard) | **B — unused by Dashboard** | Expected — customer app territory |
| Picker/Rider/HHD app OTP & delivery APIs | No | **B — unused** | Expected |
| Production / Merch / Shared analytics stubs | Partially / no | **B** | Many return 501 intentionally |
| `/api/v1/admin/picker/approvals` (nested stub) | Yes | **P + R — mounted stub shadows working router** | See Critical #1 |
| `/api/v1/admin/picker/pickers` | Yes | **P + R** | Same |
| `/api/v1/admin/picker/shift-change-requests` | Yes | **P + R** | Same |
| Admin login role `operations_admin` vs seeded `admin` | Login UI default | **R — UX/auth trap** | Wrong default role → 401 |
| Integrations health `integrations` vs FE `.list` | Yes | **M — contract** | Covered by contract tests (passed with mapping) |
| ~1800+ backend endpoints | No | **B — unused by Dashboard** | Not bugs |

### Classification legend (this run)

| Code | Meaning | Count (this audit) |
|------|---------|-------------------|
| A | Backend exists + Dashboard uses correctly | Majority of ~90 inventory GETs |
| B | Backend exists + Dashboard does not use | ~1900+ (customer/picker/rider/hhd/production/…) |
| C | Dashboard calls missing endpoint | **0 verified** (stubs return 501, not 404) |
| P | Mounted but not usefully implemented | Picker ops under nested admin router |
| R | Other contract / mount order issue | Route shadowing |
| Q | Env / base URL | Resolved via `.env`; was missing initially |

---

## 5. API Test Results

| Metric | Count |
|--------|------:|
| Total backend APIs discovered | ~2020 |
| Total Dashboard API calls discovered | ~150+ (~98 in automation inventory) |
| Playwright tests executed | **134** |
| Passed | **129** |
| Failed | **5** |
| Skipped / Blocked in final rerun | **0** |
| API project failures | 3 (all picker 501 stubs) |
| Flow project failures | 2 (picker 501 + late riders 403) |

### Failures (executed — not hypothetical)

1. `GET /api/v1/admin/picker/approvals` → **501 NOT_IMPLEMENTED**
2. `GET /api/v1/admin/picker/pickers` → **501 NOT_IMPLEMENTED**
3. `GET /api/v1/admin/picker/shift-change-requests` → **501 NOT_IMPLEMENTED**
4. Flow: picker approvals list → **501**
5. Flow: empty riders list → **403** (session/token interaction late in suite; direct probe with fresh token returned **200**)

---

## 6. E2E Test Results

| Flow | Tests | Passed | Failed | Blocked | Result |
|------|------:|-------:|-------:|--------:|--------|
| Login → dashboard KPIs | 1 | 1 | 0 | 0 | PASS |
| Orders workspace (list→detail→logs) | 2 | 2 | 0 | 0 | PASS (order created via customer journey) |
| Catalog & categories | 1 | 1 | 0 | 0 | PASS |
| Darkstores & packing | 1 | 1 | 0 | 0 | PASS |
| Riders & approvals | 2 | 1 | 1 | 0 | FAIL (picker 501) |
| Customers / support / users | 1 | 1 | 0 | 0 | PASS |
| Finance reads | 1 | 1 | 0 | 0 | PASS |
| Warehouse inbound | 1 | 1 | 0 | 0 | PASS |
| System settings | 1 | 1 | 0 | 0 | PASS |
| Login role trap | 1 | 1 | 0 | 0 | PASS (documents UI bug) |
| Logout | 1 | 1 | 0 | 0 | PASS |
| Empty-state integrity | 2 | 1 | 1 | 0 | FAIL (riders 403 flake) |
| **Customer journey (manual real API)** | OTP→address→cart→order | — | — | — | **PASS** (COD order `ORD-20260919-00001`, total 169) |

**Note:** Dashboard does not implement customer cart/checkout UI. Those flows were validated against the **backend** that the ecosystem shares, not invented as dashboard screens.

---

## 7. Authentication Results

| Check | Result |
|-------|--------|
| Admin login with `{email,password,role:"admin"}` | PASS — token + user + HttpOnly `selorg_admin_token` |
| Login missing body | PASS — 4xx |
| Invalid credentials | PASS — 401 |
| Default UI role `operations_admin` against Super Admin | PASS as negative — **401** (frontend default role trap) |
| Bearer authorizes analytics | PASS |
| Cookie authorizes analytics | PASS |
| Invalid / malformed Bearer | PASS — 401/403 |
| Logout + subsequent call fails | PASS |
| CORS with Origin `http://localhost:5173` | PASS |
| Customer OTP send + verify (test OTP 8790) | PASS |
| Token refresh | **Not implemented** (frontend or backend admin) |
| Admin OTP (`/otp` page) | Real path throws — mock-only; backend has no admin OTP |

---

## 8. Cart Results

| Check | Result |
|-------|--------|
| Dashboard cart UI | **N/A** — admin dashboard does not own customer cart |
| Backend `POST /api/v1/customer/cart/items` | PASS — added product `AUTO-MILK-1L` qty 2 |
| Auth required on cart | Verified by customer JWT requirement |

---

## 9. Address Results

| Check | Result |
|-------|--------|
| Dashboard address UI | **N/A** (customer domain) |
| Backend create address | PASS — Chennai address with lat/lng |
| Used in order create | PASS |

---

## 10. Order Results

| Check | Result |
|-------|--------|
| Admin list orders | PASS |
| Admin order detail / logs | PASS when orders exist |
| Customer create order (COD) | PASS after switching Mongo to **replica set** (transactions) |
| First order created | `ORD-20260919-00001`, status `pending`, `totalBill` 169, `paymentStatus` `cod_pending` |
| Standalone Mongo (no RS) | Order create → **500** `Transaction numbers are only allowed on a replica set member or mongos` — **ENVIRONMENT / ops requirement**, not a dashboard bug |

---

## 11. Payment Results

| Check | Result |
|-------|--------|
| Dashboard payment UI | Limited (finance / vendor / wallet credit) |
| Worldline | `WORLDLINE_ENABLED=0` in test env — online payment **BLOCKED** by config |
| COD order path | PASS — `requiresOnlinePayment: false` |
| Wallet credit negative amount | Negative suite covered |

---

## 12. Wallet Results

| Check | Result |
|-------|--------|
| Admin wallet credit endpoint | Present; negative amount tested |
| Customer wallet APIs | Exist on backend; not primary dashboard flows |
| Funded wallet seed | Not required for COD path |

---

## 13. Profile Results

| Check | Result |
|-------|--------|
| Admin users list includes seeded Super Admin | PASS |
| Account prefs `/api/v1/admin/app-settings` | Exercised in sweep (some paths return 403 without permission — documented in logs) |
| Customer profile APIs | Backend-only for this report |

---

## 14. API Contract Mismatches

### Mismatch 1 — Picker admin route shadowing (CRITICAL)

| Field | Value |
|-------|-------|
| Frontend file | Services calling `/api/v1/admin/picker/approvals`, `/pickers`, `/shift-change-requests` |
| Backend files | `src/modules/admin/admin.routes.ts` mounts stub `pickerOpsRouter` at `/picker`; later `app.ts` mounts `pickerAdminRouter` at `/api/v1/admin/picker` |
| Endpoint | `GET /api/v1/admin/picker/approvals` (and siblings) |
| Method | GET |
| Expected request | Authenticated admin GET |
| Actual request | Same |
| Expected response | Picker list / approvals payload |
| Actual response | **501** `{ error: 'NOT_IMPLEMENTED', message: 'Picker approvals list' }` from `admin-picker-ops.controller.ts` |
| Root cause | Nested stub registered **inside** `/api/v1/admin` **before** the real `pickerAdminRouter` can handle the same path. Express matches the stub first. Real implementations exist on `pickerAdminRouter` (`adminListPickers` etc.) but are unreachable for these paths. |

### Mismatch 2 — Login role default trap

| Field | Value |
|-------|-------|
| Frontend file | Login page default role (Operations Admin → `operations_admin`) |
| Backend | Login matches role against seeded user role `admin` |
| Expected | Super Admin can log in with UI defaults |
| Actual | 401 unless role selector is changed to Admin / Super Admin |
| Root cause | Frontend default role ≠ seeded Super Admin role |

### Mismatch 3 — Mongo transactions require replica set

| Field | Value |
|-------|-------|
| Backend | Order create uses Mongo sessions/transactions |
| Expected | Orders create on local Mongo |
| Actual | 500 on standalone mongod; works on replica set |
| Root cause | Ops/environment — Atlas RS OK; local standalone fails |

---

## 15. Critical Issues

1. **BACKEND BUG / API CONTRACT — Picker admin stubs return 501**  
   Dashboard workforce screens that call `/api/v1/admin/picker/approvals|pickers|shift-change-requests` always fail against the nested stub controllers. Verified with live HTTP 501.

2. **FRONTEND UX BUG — Login default role**  
   Default “Operations Admin” cannot authenticate the seeded Super Admin. Verified 401.

3. **CONFIGURATION / OPS — Order transactions need replica set**  
   Document for local/dev: Mongo must be replica set (or Atlas). Not a dashboard mapping bug.

---

## 16. Non-Critical Issues

1. **Late-suite 403 on `/api/v1/admin/riders`** during one flow after logout tests — likely revoked/shared token interaction. Fresh login probe returned 200. Treat as **flaky TEST SETUP / auth session hygiene**, not confirmed permanent backend deny for admins.

2. **Large unused backend surface** (~1900 endpoints) for customer/picker/rider/HHD/production — expected for a shared monolith; not Dashboard defects.

3. **Many warehouse/shared analytics endpoints intentionally 501** — documented stubs; do not treat as Dashboard wrong-path unless FE calls them as required happy-path.

4. **No admin OTP on real backend** — `/otp` route is mock-oriented.

5. **Vite frontend not running at end of session** — connectivity soft-check may be BLOCKED if SPA stopped; API tests do not require it.

6. **Vitest `npm test`** picks up Playwright `e2e/*.spec.ts` (6 files fail under Vitest) — **TEST SETUP ISSUE**; Playwright suite is the live API authority.

---

## 17. Blocked Tests

| Item | Why blocked | Required action |
|------|-------------|-----------------|
| Worldline / online payment E2E | `WORLDLINE_ENABLED=0`, no merchant secrets | Configure Worldline env + return URLs |
| Real SMS OTP delivery | No MSG91/Twilio/DLT in test env | Providers or keep `ALLOW_CUSTOMER_TEST_OTP` |
| Production Mongo Atlas | Not provided; used memory RS instead | Supply `MONGO_URI` for staging parity |
| Browser UI click-through E2E | Suite is APIRequestContext-based (by design of existing harness) | Add Playwright browser project if UI E2E required |

Do **not** classify these as FAILED.

---

## 18. Exact Reproduction Steps

### Fail picker approvals (501)

1. Start backend on `:3333` with valid `MONGO_URI` + `JWT_SECRET`.
2. `POST /api/v1/admin/auth/login` with `{ "email":"hemanathc0112@gmail.com","password":"Selorg@2024","role":"admin" }`.
3. `GET /api/v1/admin/picker/approvals` with `Authorization: Bearer <token>`.
4. Observe **501 NOT_IMPLEMENTED**.

### Fail login with UI default role

1. `POST /api/v1/admin/auth/login` with role `"operations_admin"` and Super Admin credentials.
2. Observe **401**.

### Pass customer COD order (requires replica set)

1. Mongo replica set + seed catalog product + test OTP.
2. send-otp → verify-otp → create address → add cart item → `POST /api/v1/customer/orders` with `paymentMethodType:"cash"`.
3. Observe **200** and order number.

---

## 19. Required Code Fixes

**Do not apply automatically (per audit rules). Document only.**

### Fix 1 — Unshadow picker admin routes

**FILE:** `selorg-service-development/src/modules/admin/admin.routes.ts`  
**CURRENT PROBLEM:** Nested `pickerOpsRouter` handlers call `notImplemented()` for approvals/pickers/shift-change while a real `pickerAdminRouter` is also mounted at the same URL prefix.  
**EXACT CHANGE REQUIRED:** Either remove/disable the stub routes under `protectedRouter.use('/picker', pickerOpsRouter)` for endpoints that exist on `pickerAdminRouter`, **or** wire stub handlers to call the real `pickerService.listPickers` / approvals logic, **or** mount stubs only for paths not covered by `pickerAdminRouter`.  
**REASON:** Express matches the nested stub first → Dashboard always gets 501.  
**EXPECTED RESULT:** Authenticated GET returns 200 with picker list / empty array.

### Fix 2 — Login default role

**FILE:** Dashboard login page / auth form default role  
**CURRENT PROBLEM:** Defaults to Operations Admin.  
**EXACT CHANGE REQUIRED:** Default to Super Admin / `admin`, or omit role and let backend resolve, or show clear error when role mismatches.  
**REASON:** Operators fail first login against real Super Admin seed.  
**EXPECTED RESULT:** Seeded Super Admin logs in without changing role.

### Fix 3 — Document Mongo replica set for local order create

**FILE:** Backend README / `.env.example`  
**CURRENT PROBLEM:** Order create uses transactions; standalone mongod returns 500.  
**EXACT CHANGE REQUIRED:** Document `mongodb-memory-server` replSet or Atlas requirement.  
**REASON:** Avoid false “order API broken” reports.

---

## 20. Final Statistics

| Metric | Value |
|--------|------:|
| Backend APIs discovered | ~2020 |
| Dashboard API calls discovered | ~150+ (98 in automation inventory) |
| Playwright tests run | 134 |
| Passed | 129 |
| Failed | 5 |
| Blocked (env/payment SMS) | Documented separately (not in Playwright fail count) |
| E2E admin flows exercised | 12 describe blocks |
| E2E flow failures | 2 |
| Customer real journey | PASS (OTP, address, cart, COD order) |
| Critical issues | 3 |
| Non-critical issues | 6 |
| Production files changed | **0** |
| Test infrastructure files | Backend `.env` (local), `scripts/_test-db-bootstrap.mjs` (test-only), dashboard `.env` |
| Report file | `WEBAPP_BACKEND_API_AUTOMATION_TEST_REPORT.md` (this file) |

---

## Appendix A — Playwright failure list (final rerun)

```
[api] GET /api/v1/admin/picker/approvals — Picker approvals          → 501
[api] GET /api/v1/admin/picker/pickers — Picker directory            → 501
[api] GET /api/v1/admin/picker/shift-change-requests — Shift changes → 501
[flows] picker approvals list                                        → 501
[flows] empty riders list is real empty array                        → 403 (flake)
129 passed (30.1s)
```

## Appendix B — Commands used

```bash
# Backend
node scripts/_test-db-bootstrap.mjs   # test-only memory RS + .env
npx ts-node -r tsconfig-paths/register scripts/seed-superadmin.ts
node scripts/seed-customer-catalog-automation.mjs
npm run dev                           # :3333

# Dashboard
# .env: VITE_USE_MOCKS=false, VITE_API_URL=http://localhost:3333
npm run dev                           # :5173
npx playwright test                   # real API automation
```
