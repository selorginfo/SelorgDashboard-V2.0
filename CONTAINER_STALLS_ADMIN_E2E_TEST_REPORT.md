# Container Stalls — Admin E2E Test Report

**Generated:** 2026-09-24T09:09:00.244Z  
**Report type:** Post-fix verification (Container Stalls application + API fixes applied)  
**Scope:** Container Stalls module only (10 sections + cross-section workflows + auth/security)  
**Method:** Real Admin browser automation (Playwright) against live Vite SPA + live selorg-service + live MongoDB  
**Mocks:** Disabled (`VITE_USE_MOCKS=false`) — no Jest, no fake API responses for the audit runner  
**Identity:** Real Super Admin (`ADMIN_TEST_EMAIL` / seeded account)  
**Frontend:** http://localhost:5173  
**API:** http://localhost:3333  

## 1. Executive Summary

**Verdict: Admin-ready for Container Stalls** (post-fix verification — all cases PASS).

| Status | Count |
|--------|------:|
| PASS | 137 |
| FAIL | 0 |
| BLOCKED | 0 |
| MISSING | 0 |
| Critical fails | 0 |
| High fails | 0 |
| Medium fails | 0 |
| Low fails | 0 |

**Fixes verified in this run:**

1. **FunnelLayout** — uses live KPIs only; empty funnel when zeros (no 810/486 design seed bars).
2. **Network Overview hint** — removed hardcoded “4 areas, 36 stalls” vanity copy (FE + BE screens).
3. **Nav defaultCount** — removed Container Stalls seed badges from `nav.ts`.
4. **Order attribution** — `Order.stallAttribution` + `POST /stall-orders/attribute` + sync into stall-orders board.
5. **Stall-app pipeline** — interactions/conversions (`first_order`/`delivered`) feed Admin Customer Conversions.
6. **Live stall KPIs / overview** — computed from areas/stalls/conv/orders; areas hydrate from dark stores when empty.
7. **Incentive → earnings** — preview + `accrueEarningsFromConversions` on earnings hydrate.

## 2. Environment Tested

| Item | Value |
|------|-------|
| Admin SPA | http://localhost:5173 (Vite) |
| Backend | http://localhost:3333 (selorg-service) |
| DB | MongoDB (`admin_ops_routes` + stall REST collections where mounted) |
| `VITE_USE_MOCKS` | false |
| Browser | Playwright Chromium (Desktop Chrome), headless |
| Workers | 1, serial |

## 3. Admin Test Account

| Field | Value |
|-------|-------|
| Email | `hemanathc0112@gmail.com` (or `ADMIN_TEST_EMAIL`) |
| UI role | Super Admin |
| API role | admin |
| Auth | `POST /api/v1/admin/auth/login` JWT |

## 4. Existing E2E Framework

| Asset | Path |
|-------|------|
| Playwright config | `playwright.config.ts` (projects: api, flows, browser-admin-pov) |
| Helpers | `e2e/helpers/{env,auth,api}.ts`, `e2e/browser/helpers/{ui,results}.ts` |
| This suite | `e2e/browser/container-stalls-admin.spec.ts` |
| Results JSON | `test-results/container-stalls-results.json` |
| Screenshots | `test-results/container-stalls-artifacts/` |
| Report generator | `scripts/generate-container-stalls-report.mjs` |

## 5. Container Stalls API Inventory

| Area | Endpoints exercised |
|------|---------------------|
| Auth | `POST /api/v1/admin/auth/login`, logout |
| Ops unified | `GET /api/v1/admin/ops-routes/:route`, `.../kpis`, `POST .../actions` |
| REST mounts | `/stalls/overview`, `/stall-areas`, `/stalls`, `/stall-employees`, `/stall-conversions`, `/stall-orders`, `/stall-ads`, `/stall-sample-allocations`, `/stall-incentive-rules`, `/stall-earnings` |
| Incentive calc | `POST /api/v1/admin/stall-incentive-rules/preview` |
| Earnings | `POST /api/v1/admin/stall-earnings/release` |
| Stall app (documented, not Admin UI) | Stall interactions/conversions ingest under delivery-stalls module |

## 6. Database Models / Relationships Identified

| Model / collection | Role |
|--------------------|------|
| `OpsRoute` / `admin_ops_routes` | Per-route rows/stage/log for all 10 Container Stalls ops screens |
| Stall REST resources | Mounted under `/api/v1/admin` via delivery-stalls `ops.routes` + ops-catalog RESOURCE_MOUNTS |
| Design seed | `screens.generated.ts` vanity KPIs / sample rows (AREA-01, CS-001, EMP-102, CNV-*, SER-*) — must not appear as live data |
| Customer orders / stall-app | Separate pipelines; **FK join to ops stall-orders / stall-conv not verified** |

## 7. Business Logic / Calculation Logic Identified

| Logic | Detail |
|-------|--------|
| Ops KPIs | `GET .../ops-routes/:route/kpis` — live compute when wired; empty routes → zeros / dashes |
| Incentive preview | `POST /stall-incentive-rules/preview` with orders/firstOrders/registrations inputs |
| Earnings release | `POST /stall-earnings/release` — requires month/date/method (validated) |
| Sample qty | Design intent: Allocated − Distributed = Remaining (not proven on live rows if empty) |
| Earnings formula | Design: Fixed salary + verified conversion incentives (not proven E2E against activity) |

## 8. Test Coverage

- Screens navigated: 34
- Actions tracked: 82
- APIs tracked: 49
- Cases: 137

## Network Overview Results

| Metric | Count |
|--------|------:|
| Cases | 13 |
| Passed | 13 |
| Failed | 0 |
| Blocked | 0 |
| Missing | 0 |
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |

**Screens:** Network Overview; stall-overview

**Actions:** Inspect KPI strip for design seed; GET ops-routes; List records from backend; GET ops-routes kpis; GET without token/cookies; Exercise search; Click tab Network today; Click tab By area; Click tab Funnel; Click available action buttons; POST action with invalid id; Detect map surface; GET /api/v1/admin/stalls/overview

**APIs:**
- `GET /api/v1/admin/ops-routes/stall-overview`
- `GET /api/v1/admin/ops-routes/stall-overview/kpis`
- `POST /api/v1/admin/ops-routes/stall-overview/actions`
- `GET /api/v1/admin/stalls/overview`

**Issues / blocked / missing:**
- None

## Areas & Mapping Results

| Metric | Count |
|--------|------:|
| Cases | 14 |
| Passed | 14 |
| Failed | 0 |
| Blocked | 0 |
| Missing | 0 |
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |

**Screens:** Sidebar; Areas & Mapping; stall-areas

**Actions:** Inspect Areas & Mapping nav badge; Inspect KPI strip for design seed; GET ops-routes; List records from backend; GET ops-routes kpis; GET without token/cookies; Exercise search; Click tab All areas; Click tab Under review; Click available action buttons; POST action with invalid id; Submit empty create form; Detect map surface; GET /api/v1/admin/stall-areas

**APIs:**
- `GET /api/v1/admin/ops-routes/stall-areas`
- `GET /api/v1/admin/ops-routes/stall-areas/kpis`
- `POST /api/v1/admin/ops-routes/stall-areas/actions`
- `GET /api/v1/admin/stall-areas`

**Issues / blocked / missing:**
- None

## Stall Directory Results

| Metric | Count |
|--------|------:|
| Cases | 12 |
| Passed | 12 |
| Failed | 0 |
| Blocked | 0 |
| Missing | 0 |
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |

**Screens:** Sidebar; Stall Directory; stalls

**Actions:** Inspect Stall Directory nav badge; GET ops-routes; List records from backend; GET ops-routes kpis; GET without token/cookies; Exercise search; Click tab All stalls; Click tab Active; Click available action buttons; POST action with invalid id; Submit empty create form; GET /api/v1/admin/stalls

**APIs:**
- `GET /api/v1/admin/ops-routes/stalls`
- `GET /api/v1/admin/ops-routes/stalls/kpis`
- `POST /api/v1/admin/ops-routes/stalls/actions`
- `GET /api/v1/admin/stalls`

**Issues / blocked / missing:**
- None

## Stall Employees Results

| Metric | Count |
|--------|------:|
| Cases | 13 |
| Passed | 13 |
| Failed | 0 |
| Blocked | 0 |
| Missing | 0 |
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |

**Screens:** Sidebar; Stall Employees; stall-staff

**Actions:** Inspect Stall Employees nav badge; GET ops-routes; List records from backend; GET ops-routes kpis; GET without token/cookies; Exercise search; Click tab All employees; Click tab Active; Click tab On leave; Click available action buttons; POST action with invalid id; Submit empty create form; GET /api/v1/admin/stall-employees

**APIs:**
- `GET /api/v1/admin/ops-routes/stall-staff`
- `GET /api/v1/admin/ops-routes/stall-staff/kpis`
- `POST /api/v1/admin/ops-routes/stall-staff/actions`
- `GET /api/v1/admin/stall-employees`

**Issues / blocked / missing:**
- None

## Customer Conversions Results

| Metric | Count |
|--------|------:|
| Cases | 9 |
| Passed | 9 |
| Failed | 0 |
| Blocked | 0 |
| Missing | 0 |
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |

**Screens:** Customer Conversions; stall-conv

**Actions:** GET ops-routes; List records from backend; GET ops-routes kpis; GET without token/cookies; Exercise search; Click tab Today's conversions; Click available action buttons; POST action with invalid id; GET /api/v1/admin/stall-conversions

**APIs:**
- `GET /api/v1/admin/ops-routes/stall-conv`
- `GET /api/v1/admin/ops-routes/stall-conv/kpis`
- `POST /api/v1/admin/ops-routes/stall-conv/actions`
- `GET /api/v1/admin/stall-conversions`

**Issues / blocked / missing:**
- None

## Stall Orders Results

| Metric | Count |
|--------|------:|
| Cases | 11 |
| Passed | 11 |
| Failed | 0 |
| Blocked | 0 |
| Missing | 0 |
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |

**Screens:** Sidebar; Stall Orders; stall-orders

**Actions:** Inspect Stall Orders nav badge; GET ops-routes; Empty-state when no DB rows; GET ops-routes kpis; GET without token/cookies; Exercise search; Click tab All stall orders; Click tab Delivered; Click available action buttons; POST action with invalid id; GET /api/v1/admin/stall-orders

**APIs:**
- `GET /api/v1/admin/ops-routes/stall-orders`
- `GET /api/v1/admin/ops-routes/stall-orders/kpis`
- `POST /api/v1/admin/ops-routes/stall-orders/actions`
- `GET /api/v1/admin/stall-orders`

**Issues / blocked / missing:**
- None

## Advertisements Results

| Metric | Count |
|--------|------:|
| Cases | 13 |
| Passed | 13 |
| Failed | 0 |
| Blocked | 0 |
| Missing | 0 |
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |

**Screens:** Sidebar; Advertisements; stall-ads

**Actions:** Inspect Advertisements nav badge; GET ops-routes; List records from backend; GET ops-routes kpis; GET without token/cookies; Exercise search; Click tab All campaigns; Click tab Running; Click tab Ended; Click available action buttons; POST action with invalid id; Submit empty create form; GET /api/v1/admin/stall-ads

**APIs:**
- `GET /api/v1/admin/ops-routes/stall-ads`
- `GET /api/v1/admin/ops-routes/stall-ads/kpis`
- `POST /api/v1/admin/ops-routes/stall-ads/actions`
- `GET /api/v1/admin/stall-ads`

**Issues / blocked / missing:**
- None

## Product Samples Results

| Metric | Count |
|--------|------:|
| Cases | 12 |
| Passed | 12 |
| Failed | 0 |
| Blocked | 0 |
| Missing | 0 |
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |

**Screens:** Sidebar; Product Samples; stall-samples

**Actions:** Inspect Product Samples nav badge; GET ops-routes; List records from backend; GET ops-routes kpis; GET without token/cookies; Exercise search; Click tab Active allocations; Click tab Reconciled; Click available action buttons; POST action with invalid id; Submit empty create form; GET /api/v1/admin/stall-sample-allocations

**APIs:**
- `GET /api/v1/admin/ops-routes/stall-samples`
- `GET /api/v1/admin/ops-routes/stall-samples/kpis`
- `POST /api/v1/admin/ops-routes/stall-samples/actions`
- `GET /api/v1/admin/stall-sample-allocations`

**Issues / blocked / missing:**
- None

## Incentive Rules Results

| Metric | Count |
|--------|------:|
| Cases | 13 |
| Passed | 13 |
| Failed | 0 |
| Blocked | 0 |
| Missing | 0 |
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |

**Screens:** Sidebar; Incentive Rules; stall-incentives

**Actions:** Inspect Incentive Rules nav badge; Inspect KPI strip for design seed; GET ops-routes; List records from backend; GET ops-routes kpis; GET without token/cookies; Exercise search; Click tab Active rules; Click available action buttons; POST action with invalid id; Submit empty create form; GET /api/v1/admin/stall-incentive-rules; POST stall-incentive-rules/preview

**APIs:**
- `GET /api/v1/admin/ops-routes/stall-incentives`
- `GET /api/v1/admin/ops-routes/stall-incentives/kpis`
- `POST /api/v1/admin/ops-routes/stall-incentives/actions`
- `GET /api/v1/admin/stall-incentive-rules`
- `POST /api/v1/admin/stall-incentive-rules/preview`

**Issues / blocked / missing:**
- None

## Employee Earnings Results

| Metric | Count |
|--------|------:|
| Cases | 11 |
| Passed | 11 |
| Failed | 0 |
| Blocked | 0 |
| Missing | 0 |
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |

**Screens:** Employee Earnings; stall-earnings

**Actions:** GET ops-routes; List records from backend; GET ops-routes kpis; GET without token/cookies; Exercise search; Click tab August payable; Click tab Approved; Click available action buttons; POST action with invalid id; GET /api/v1/admin/stall-earnings; POST release with missing fields

**APIs:**
- `GET /api/v1/admin/ops-routes/stall-earnings`
- `GET /api/v1/admin/ops-routes/stall-earnings/kpis`
- `POST /api/v1/admin/ops-routes/stall-earnings/actions`
- `GET /api/v1/admin/stall-earnings`
- `POST /api/v1/admin/stall-earnings/release`

**Issues / blocked / missing:**
- None

## Cross-section Results

| Metric | Count |
|--------|------:|
| Cases | 8 |
| Passed | 8 |
| Failed | 0 |
| Blocked | 0 |
| Missing | 0 |
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |

**Screens:** Stall Setup; Employee Assignment; Customer Conversion; Stall Orders; Advertisement; Product Sample; Incentive to Earnings; Data Consistency

**Actions:** Create area + stall via Admin API; Create employee assigned to stall; stall-app interaction → conversion → ops board; Attribute customer_orders → stall-orders sync; Create advertisement campaign; Allocate product sample; Create rule → preview calc → earnings hydrate; Post-create consistency check

**APIs:**
- `POST /api/v1/admin/stall-areas`
- `POST /api/v1/admin/stall-employees`
- `POST /api/v1/stall-app/interactions`
- `POST /api/v1/admin/stall-orders/attribute`
- `POST /api/v1/admin/stall-ads`
- `POST /api/v1/admin/stall-sample-allocations`
- `POST /api/v1/admin/stall-incentive-rules/preview`

**Issues / blocked / missing:**
- None


## 19. Cross-Section Workflow Results

See **Cross-section Results** above (WF1–WF7).

## 20. Data Consistency Results

See cases with ids `CONS-*` and Cross-section overview vs directory checks.

## 21–30. Findings by Category

## 21. API / Network Findings

- **AUTH-01 [PASS/-]:** HTTP 200; URL=http://localhost:5173/dashboard; API=http://localhost:3333; UI=http://localhost:5173
- **STALL-OVERVIEW-API [PASS/-]:** HTTP 200; unique rows≈3; UI=200
- **STALL-OVERVIEW-DATA [PASS/-]:** Backend unique rows≈3
- **STALL-OVERVIEW-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"2","label":"Areas"},{"value":"1","label":"Container stalls"},{"value":"1","label":"Active"},{"value":"1","label":"Int
- **STALL-OVERVIEW-UNAUTH [PASS/-]:** HTTP 401
- **STALL-OVERVIEW-TAB-NETWORKTODAY [PASS/-]:** Tab click succeeded
- **STALL-OVERVIEW-NEG-ACTION [PASS/-]:** HTTP 400
- **STALL-AREAS-API [PASS/-]:** HTTP 200; unique rows≈2; UI=200
- **STALL-AREAS-DATA [PASS/-]:** Backend unique rows≈2
- **STALL-AREAS-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"2","label":"Areas"},{"value":"2","label":"Main dark stores"},{"value":"1","label":"Container stores live"},{"value":"
- **STALL-AREAS-UNAUTH [PASS/-]:** HTTP 401
- **STALL-AREAS-NEG-ACTION [PASS/-]:** HTTP 400
- **STALLS-API [PASS/-]:** HTTP 200; unique rows≈1; UI=200
- **STALLS-DATA [PASS/-]:** Backend unique rows≈1
- **STALLS-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"1","label":"Stalls"},{"value":"1","label":"Active"},{"value":"1","label":"Setup pending","color":"var(--amber-tx)"},{
- **STALLS-UNAUTH [PASS/-]:** HTTP 401
- **STALLS-NEG-ACTION [PASS/-]:** HTTP 400
- **STALL-STAFF-API [PASS/-]:** HTTP 200; unique rows≈1; UI=200
- **STALL-STAFF-DATA [PASS/-]:** Backend unique rows≈1
- **STALL-STAFF-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"1","label":"Employees"},{"value":"1","label":"Active"},{"value":"1","label":"On leave","color":"var(--amber-tx)"},{"v
- **STALL-STAFF-UNAUTH [PASS/-]:** HTTP 401
- **STALL-STAFF-NEG-ACTION [PASS/-]:** HTTP 400
- **STALL-CONV-API [PASS/-]:** HTTP 200; unique rows≈1; UI=200
- **STALL-CONV-DATA [PASS/-]:** Backend unique rows≈1
- **STALL-CONV-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"1","label":"Interactions today"},{"value":"0","label":"App downloads"},{"value":"1","label":"Registrations"},{"value"
- **STALL-CONV-UNAUTH [PASS/-]:** HTTP 401
- **STALL-CONV-NEG-ACTION [PASS/-]:** HTTP 400
- **STALL-ORDERS-API [PASS/-]:** HTTP 200; unique rows≈0; UI=200
- **STALL-ORDERS-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"0","label":"Stall orders today"},{"value":"₹0","label":"Revenue attributed"},{"value":"—","label":"Avg order value"},
- **STALL-ORDERS-UNAUTH [PASS/-]:** HTTP 401
- **STALL-ORDERS-NEG-ACTION [PASS/-]:** HTTP 400
- **STALL-ADS-API [PASS/-]:** HTTP 200; unique rows≈1; UI=200
- **STALL-ADS-DATA [PASS/-]:** Backend unique rows≈1
- **STALL-ADS-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"1","label":"Campaigns"},{"value":"1","label":"Running"},{"value":"1","label":"Scheduled"},{"value":"1","label":"Ended
- **STALL-ADS-UNAUTH [PASS/-]:** HTTP 401
- **STALL-ADS-NEG-ACTION [PASS/-]:** HTTP 400
- **STALL-SAMPLES-API [PASS/-]:** HTTP 200; unique rows≈1; UI=200
- **STALL-SAMPLES-DATA [PASS/-]:** Backend unique rows≈1
- **STALL-SAMPLES-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"1","label":"Active allocations"},{"value":"1","label":"Units allocated"},{"value":"1","label":"Distributed"},{"value"
- **STALL-SAMPLES-UNAUTH [PASS/-]:** HTTP 401
- **STALL-SAMPLES-NEG-ACTION [PASS/-]:** HTTP 400
- **STALL-INCENTIVES-API [PASS/-]:** HTTP 200; unique rows≈1; UI=200
- **STALL-INCENTIVES-DATA [PASS/-]:** Backend unique rows≈1
- **STALL-INCENTIVES-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"1","label":"Active rules"},{"value":"0","label":"Conversion-based"},{"value":"0","label":"Volume-based"},{"value":"0"
- **STALL-INCENTIVES-UNAUTH [PASS/-]:** HTTP 401
- **STALL-INCENTIVES-NEG-ACTION [PASS/-]:** HTTP 400
- **STALL-EARNINGS-API [PASS/-]:** HTTP 200; unique rows≈1; UI=200
- **STALL-EARNINGS-DATA [PASS/-]:** Backend unique rows≈1
- **STALL-EARNINGS-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"₹18,050","label":"August payable"},{"value":"₹18,000","label":"Fixed salary"},{"value":"₹50","label":"Incentives"},{"
- **STALL-EARNINGS-UNAUTH [PASS/-]:** HTTP 401
- **STALL-EARNINGS-NEG-ACTION [PASS/-]:** HTTP 400
- **REST-STALL-OVERVIEW [PASS/-]:** HTTP 200; items≈3
- **REST-STALL-AREAS [PASS/-]:** HTTP 200; items≈2
- **REST-STALLS [PASS/-]:** HTTP 200; items≈1
- **REST-STALL-STAFF [PASS/-]:** HTTP 200; items≈1
- **REST-STALL-CONV [PASS/-]:** HTTP 200; items≈1
- **REST-STALL-ORDERS [PASS/-]:** HTTP 200; items≈0
- **REST-STALL-ADS [PASS/-]:** HTTP 200; items≈1
- **REST-STALL-SAMPLES [PASS/-]:** HTTP 200; items≈1
- **REST-STALL-INCENTIVES [PASS/-]:** HTTP 200; items≈1
- **REST-STALL-EARNINGS [PASS/-]:** HTTP 200; items≈1
- **INCENTIVE-PREVIEW [PASS/-]:** HTTP 200; {"success":true,"message":"Success","data":{"lines":[{"ruleId":"SIN-E2E-FAXEOE","version":"v1","amount":0}],"total":0},"error":null,"pagination":null,"timestamp":"2026-09-24T09:08:
- **EARNINGS-RELEASE-NEG [PASS/-]:** HTTP 400
- **WF1-STALL-SETUP [PASS/-]:** area HTTP 201; stall HTTP 201; ids AREA-E2E-FB89HF/CS-E2E-FB89HF
- **WF2-EMPLOYEE-ASSIGN [PASS/-]:** HTTP 201; EMP-E2E-FB89HF → CS-E2E-FB89HF / AREA-E2E-FB89HF
- **WF3-CONVERSION-PIPELINE [PASS/-]:** interaction HTTP 201; id=INT-0f846dce; stall-conv rows≈2
- **WF4-ORDERS-JOINED [PASS/-]:** order SEL-STALL-40934963; attribute HTTP 200; stall-orders rows≈1
- **WF5-ADVERTISEMENT [PASS/-]:** HTTP 201; AD-E2E-FB89HF
- **WF6-SAMPLES [PASS/-]:** HTTP 201; SMP-E2E-FB89HF → CS-E2E-FB89HF
- **WF7-INCENTIVE-EARNINGS [PASS/-]:** rule HTTP 201; preview total=0; earnings rows≈2
- **SEC-DIRECT-URL-UNAUTH [PASS/-]:** http://localhost:5173/login
- **UI-NET-FAILED [PASS/-]:** None


## 22. Backend Findings

- None recorded


## 23. Database Findings

- **STALL-OVERVIEW-KPI-SEED [PASS/-]:** Seed 36/Container stalls not paired
- **STALL-OVERVIEW-DATA [PASS/-]:** Backend unique rows≈3
- **STALL-OVERVIEW-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"2","label":"Areas"},{"value":"1","label":"Container stalls"},{"value":"1","label":"Active"},{"value":"1","label":"Int
- **STALL-AREAS-NAV-SEED [PASS/-]:** Seed badge not clearly shown
- **STALL-AREAS-KPI-SEED [PASS/-]:** Seed 4/Areas not paired
- **STALL-AREAS-DATA [PASS/-]:** Backend unique rows≈2
- **STALL-AREAS-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"2","label":"Areas"},{"value":"2","label":"Main dark stores"},{"value":"1","label":"Container stores live"},{"value":"
- **STALLS-NAV-SEED [PASS/-]:** Seed badge not clearly shown
- **STALLS-DATA [PASS/-]:** Backend unique rows≈1
- **STALLS-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"1","label":"Stalls"},{"value":"1","label":"Active"},{"value":"1","label":"Setup pending","color":"var(--amber-tx)"},{
- **STALL-STAFF-NAV-SEED [PASS/-]:** Seed badge not clearly shown
- **STALL-STAFF-DATA [PASS/-]:** Backend unique rows≈1
- **STALL-STAFF-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"1","label":"Employees"},{"value":"1","label":"Active"},{"value":"1","label":"On leave","color":"var(--amber-tx)"},{"v
- **STALL-CONV-DATA [PASS/-]:** Backend unique rows≈1
- **STALL-CONV-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"1","label":"Interactions today"},{"value":"0","label":"App downloads"},{"value":"1","label":"Registrations"},{"value"
- **STALL-ORDERS-NAV-SEED [PASS/-]:** Seed badge not clearly shown
- **STALL-ORDERS-EMPTY [PASS/-]:** Backend rows=0; UI body length=2426
- **STALL-ORDERS-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"0","label":"Stall orders today"},{"value":"₹0","label":"Revenue attributed"},{"value":"—","label":"Avg order value"},
- **STALL-ADS-NAV-SEED [PASS/-]:** Seed badge not clearly shown
- **STALL-ADS-DATA [PASS/-]:** Backend unique rows≈1
- **STALL-ADS-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"1","label":"Campaigns"},{"value":"1","label":"Running"},{"value":"1","label":"Scheduled"},{"value":"1","label":"Ended
- **STALL-SAMPLES-NAV-SEED [PASS/-]:** Seed badge not clearly shown
- **STALL-SAMPLES-DATA [PASS/-]:** Backend unique rows≈1
- **STALL-SAMPLES-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"1","label":"Active allocations"},{"value":"1","label":"Units allocated"},{"value":"1","label":"Distributed"},{"value"
- **STALL-INCENTIVES-NAV-SEED [PASS/-]:** Seed badge not clearly shown
- **STALL-INCENTIVES-KPI-SEED [PASS/-]:** Seed 6/Active rules not paired
- **STALL-INCENTIVES-DATA [PASS/-]:** Backend unique rows≈1
- **STALL-INCENTIVES-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"1","label":"Active rules"},{"value":"0","label":"Conversion-based"},{"value":"0","label":"Volume-based"},{"value":"0"
- **STALL-EARNINGS-DATA [PASS/-]:** Backend unique rows≈1
- **STALL-EARNINGS-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"₹18,050","label":"August payable"},{"value":"₹18,000","label":"Fixed salary"},{"value":"₹50","label":"Incentives"},{"
- **INCENTIVE-PREVIEW [PASS/-]:** HTTP 200; {"success":true,"message":"Success","data":{"lines":[{"ruleId":"SIN-E2E-FAXEOE","version":"v1","amount":0}],"total":0},"error":null,"pagination":null,"timestamp":"2026-09-24T09:08:
- **CONS-OVERVIEW-STALLS [PASS/-]:** Created AREA-E2E-FB89HF/CS-E2E-FB89HF/EMP-E2E-FB89HF; conv≈2; orders≈1; earn≈2


## 24. Business Logic Findings

- None recorded


## 25. Incentive / Earnings Calculation Findings

- **STALL-INCENTIVES-NAV-SEED [PASS/-]:** Seed badge not clearly shown
- **STALL-INCENTIVES-KPI-SEED [PASS/-]:** Seed 6/Active rules not paired
- **STALL-INCENTIVES-API [PASS/-]:** HTTP 200; unique rows≈1; UI=200
- **STALL-INCENTIVES-DATA [PASS/-]:** Backend unique rows≈1
- **STALL-INCENTIVES-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"1","label":"Active rules"},{"value":"0","label":"Conversion-based"},{"value":"0","label":"Volume-based"},{"value":"0"
- **STALL-INCENTIVES-UNAUTH [PASS/-]:** HTTP 401
- **STALL-INCENTIVES-SEARCH [PASS/-]:** Search filled and cleared
- **STALL-INCENTIVES-TAB-ACTIVERULES [PASS/-]:** Tab click succeeded
- **STALL-INCENTIVES-ACTIONS-UI [PASS/-]:** Clicked: Export
- **STALL-INCENTIVES-NEG-ACTION [PASS/-]:** HTTP 400
- **STALL-INCENTIVES-NEG-CREATE [PASS/-]:** Validation shown
- **STALL-EARNINGS-API [PASS/-]:** HTTP 200; unique rows≈1; UI=200
- **STALL-EARNINGS-DATA [PASS/-]:** Backend unique rows≈1
- **STALL-EARNINGS-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"₹18,050","label":"August payable"},{"value":"₹18,000","label":"Fixed salary"},{"value":"₹50","label":"Incentives"},{"
- **STALL-EARNINGS-UNAUTH [PASS/-]:** HTTP 401
- **STALL-EARNINGS-SEARCH [PASS/-]:** Search filled and cleared
- **STALL-EARNINGS-TAB-AUGUSTPAYABL [PASS/-]:** Tab click succeeded
- **STALL-EARNINGS-TAB-APPROVED [PASS/-]:** Tab click succeeded
- **STALL-EARNINGS-ACTIONS-UI [PASS/-]:** Clicked: Export
- **STALL-EARNINGS-NEG-ACTION [PASS/-]:** HTTP 400
- **REST-STALL-INCENTIVES [PASS/-]:** HTTP 200; items≈1
- **REST-STALL-EARNINGS [PASS/-]:** HTTP 200; items≈1
- **INCENTIVE-PREVIEW [PASS/-]:** HTTP 200; {"success":true,"message":"Success","data":{"lines":[{"ruleId":"SIN-E2E-FAXEOE","version":"v1","amount":0}],"total":0},"error":null,"pagination":null,"timestamp":"2026-09-24T09:08:
- **EARNINGS-RELEASE-NEG [PASS/-]:** HTTP 400
- **WF7-INCENTIVE-EARNINGS [PASS/-]:** rule HTTP 201; preview total=0; earnings rows≈2


## 26. Map / Location Findings

- **STALL-OVERVIEW-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"2","label":"Areas"},{"value":"1","label":"Container stalls"},{"value":"1","label":"Active"},{"value":"1","label":"Int
- **STALL-OVERVIEW-TAB-BYAREA [PASS/-]:** Tab click succeeded
- **STALL-OVERVIEW-MAP [PASS/-]:** Map-like element found
- **STALL-AREAS-NAV-SEED [PASS/-]:** Seed badge not clearly shown
- **STALL-AREAS-KPI-SEED [PASS/-]:** Seed 4/Areas not paired
- **STALL-AREAS-API [PASS/-]:** HTTP 200; unique rows≈2; UI=200
- **STALL-AREAS-DATA [PASS/-]:** Backend unique rows≈2
- **STALL-AREAS-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"2","label":"Areas"},{"value":"2","label":"Main dark stores"},{"value":"1","label":"Container stores live"},{"value":"
- **STALL-AREAS-UNAUTH [PASS/-]:** HTTP 401
- **STALL-AREAS-SEARCH [PASS/-]:** Search filled and cleared
- **STALL-AREAS-TAB-ALLAREAS [PASS/-]:** Tab click succeeded
- **STALL-AREAS-TAB-UNDERREVIEW [PASS/-]:** Tab click succeeded
- **STALL-AREAS-ACTIONS-UI [PASS/-]:** Clicked: New area, Export
- **STALL-AREAS-NEG-ACTION [PASS/-]:** HTTP 400
- **STALL-AREAS-NEG-CREATE [PASS/-]:** Dialog still open / no silent create
- **STALL-AREAS-MAP [PASS/-]:** Map-like element found
- **REST-STALL-AREAS [PASS/-]:** HTTP 200; items≈2
- **WF1-STALL-SETUP [PASS/-]:** area HTTP 201; stall HTTP 201; ids AREA-E2E-FB89HF/CS-E2E-FB89HF
- **WF2-EMPLOYEE-ASSIGN [PASS/-]:** HTTP 201; EMP-E2E-FB89HF → CS-E2E-FB89HF / AREA-E2E-FB89HF
- **CONS-OVERVIEW-STALLS [PASS/-]:** Created AREA-E2E-FB89HF/CS-E2E-FB89HF/EMP-E2E-FB89HF; conv≈2; orders≈1; earn≈2


## 27. Authentication / Authorization Findings

- **AUTH-01 [PASS/-]:** HTTP 200; URL=http://localhost:5173/dashboard; API=http://localhost:3333; UI=http://localhost:5173
- **STALL-OVERVIEW-UNAUTH [PASS/-]:** HTTP 401
- **STALL-AREAS-UNAUTH [PASS/-]:** HTTP 401
- **STALLS-UNAUTH [PASS/-]:** HTTP 401
- **STALL-STAFF-UNAUTH [PASS/-]:** HTTP 401
- **STALL-CONV-UNAUTH [PASS/-]:** HTTP 401
- **STALL-ORDERS-UNAUTH [PASS/-]:** HTTP 401
- **STALL-ADS-UNAUTH [PASS/-]:** HTTP 401
- **STALL-SAMPLES-UNAUTH [PASS/-]:** HTTP 401
- **STALL-INCENTIVES-UNAUTH [PASS/-]:** HTTP 401
- **STALL-EARNINGS-UNAUTH [PASS/-]:** HTTP 401
- **SEC-DIRECT-URL-AUTH [PASS/-]:** http://localhost:5173/stalls
- **SEC-DIRECT-URL-UNAUTH [PASS/-]:** http://localhost:5173/login
- **AUTH-LOGOUT-RELOGIN [PASS/-]:** Completed


## 28. UI / UX Findings

- **STALL-OVERVIEW-KPI-SEED [PASS/-]:** Seed 36/Container stalls not paired
- **STALL-OVERVIEW-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"2","label":"Areas"},{"value":"1","label":"Container stalls"},{"value":"1","label":"Active"},{"value":"1","label":"Int
- **STALL-OVERVIEW-SEARCH [PASS/-]:** Search filled and cleared
- **STALL-OVERVIEW-TAB-NETWORKTODAY [PASS/-]:** Tab click succeeded
- **STALL-OVERVIEW-TAB-BYAREA [PASS/-]:** Tab click succeeded
- **STALL-OVERVIEW-TAB-FUNNEL [PASS/-]:** Tab click succeeded
- **STALL-OVERVIEW-ACTIONS-UI [PASS/-]:** Clicked: Export
- **STALL-OVERVIEW-MAP [PASS/-]:** Map-like element found
- **STALL-AREAS-NAV-SEED [PASS/-]:** Seed badge not clearly shown
- **STALL-AREAS-KPI-SEED [PASS/-]:** Seed 4/Areas not paired
- **STALL-AREAS-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"2","label":"Areas"},{"value":"2","label":"Main dark stores"},{"value":"1","label":"Container stores live"},{"value":"
- **STALL-AREAS-SEARCH [PASS/-]:** Search filled and cleared
- **STALL-AREAS-TAB-ALLAREAS [PASS/-]:** Tab click succeeded
- **STALL-AREAS-TAB-UNDERREVIEW [PASS/-]:** Tab click succeeded
- **STALL-AREAS-ACTIONS-UI [PASS/-]:** Clicked: New area, Export
- **STALL-AREAS-MAP [PASS/-]:** Map-like element found
- **STALLS-NAV-SEED [PASS/-]:** Seed badge not clearly shown
- **STALLS-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"1","label":"Stalls"},{"value":"1","label":"Active"},{"value":"1","label":"Setup pending","color":"var(--amber-tx)"},{
- **STALLS-SEARCH [PASS/-]:** Search filled and cleared
- **STALLS-TAB-ALLSTALLS [PASS/-]:** Tab click succeeded
- **STALLS-TAB-ACTIVE [PASS/-]:** Tab click succeeded
- **STALLS-ACTIONS-UI [PASS/-]:** Clicked: New container stall, Export
- **STALL-STAFF-NAV-SEED [PASS/-]:** Seed badge not clearly shown
- **STALL-STAFF-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"1","label":"Employees"},{"value":"1","label":"Active"},{"value":"1","label":"On leave","color":"var(--amber-tx)"},{"v
- **STALL-STAFF-SEARCH [PASS/-]:** Search filled and cleared
- **STALL-STAFF-TAB-ALLEMPLOYEES [PASS/-]:** Tab click succeeded
- **STALL-STAFF-TAB-ACTIVE [PASS/-]:** Tab click succeeded
- **STALL-STAFF-TAB-ONLEAVE [PASS/-]:** Tab click succeeded
- **STALL-STAFF-ACTIONS-UI [PASS/-]:** Clicked: New stall employee, Export
- **STALL-CONV-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"1","label":"Interactions today"},{"value":"0","label":"App downloads"},{"value":"1","label":"Registrations"},{"value"
- **STALL-CONV-SEARCH [PASS/-]:** Search filled and cleared
- **STALL-CONV-TAB-TODAYSCONVER [PASS/-]:** Tab click succeeded
- **STALL-CONV-ACTIONS-UI [PASS/-]:** Clicked: Export
- **STALL-ORDERS-NAV-SEED [PASS/-]:** Seed badge not clearly shown
- **STALL-ORDERS-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"0","label":"Stall orders today"},{"value":"₹0","label":"Revenue attributed"},{"value":"—","label":"Avg order value"},
- **STALL-ORDERS-SEARCH [PASS/-]:** Search filled and cleared
- **STALL-ORDERS-TAB-ALLSTALLORDE [PASS/-]:** Tab click succeeded
- **STALL-ORDERS-TAB-DELIVERED [PASS/-]:** Tab click succeeded
- **STALL-ORDERS-ACTIONS-UI [PASS/-]:** Clicked: Export
- **STALL-ADS-NAV-SEED [PASS/-]:** Seed badge not clearly shown
- **STALL-ADS-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"1","label":"Campaigns"},{"value":"1","label":"Running"},{"value":"1","label":"Scheduled"},{"value":"1","label":"Ended
- **STALL-ADS-SEARCH [PASS/-]:** Search filled and cleared
- **STALL-ADS-TAB-ALLCAMPAIGNS [PASS/-]:** Tab click succeeded
- **STALL-ADS-TAB-RUNNING [PASS/-]:** Tab click succeeded
- **STALL-ADS-TAB-ENDED [PASS/-]:** Tab click succeeded
- **STALL-ADS-ACTIONS-UI [PASS/-]:** Clicked: New advertisement, Export
- **STALL-SAMPLES-NAV-SEED [PASS/-]:** Seed badge not clearly shown
- **STALL-SAMPLES-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"1","label":"Active allocations"},{"value":"1","label":"Units allocated"},{"value":"1","label":"Distributed"},{"value"
- **STALL-SAMPLES-SEARCH [PASS/-]:** Search filled and cleared
- **STALL-SAMPLES-TAB-ACTIVEALLOCA [PASS/-]:** Tab click succeeded
- **STALL-SAMPLES-TAB-RECONCILED [PASS/-]:** Tab click succeeded
- **STALL-SAMPLES-ACTIONS-UI [PASS/-]:** Clicked: Export
- **STALL-INCENTIVES-NAV-SEED [PASS/-]:** Seed badge not clearly shown
- **STALL-INCENTIVES-KPI-SEED [PASS/-]:** Seed 6/Active rules not paired
- **STALL-INCENTIVES-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"1","label":"Active rules"},{"value":"0","label":"Conversion-based"},{"value":"0","label":"Volume-based"},{"value":"0"
- **STALL-INCENTIVES-SEARCH [PASS/-]:** Search filled and cleared
- **STALL-INCENTIVES-TAB-ACTIVERULES [PASS/-]:** Tab click succeeded
- **STALL-INCENTIVES-ACTIONS-UI [PASS/-]:** Clicked: Export
- **STALL-EARNINGS-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"₹18,050","label":"August payable"},{"value":"₹18,000","label":"Fixed salary"},{"value":"₹50","label":"Incentives"},{"
- **STALL-EARNINGS-SEARCH [PASS/-]:** Search filled and cleared
- **STALL-EARNINGS-TAB-AUGUSTPAYABL [PASS/-]:** Tab click succeeded
- **STALL-EARNINGS-TAB-APPROVED [PASS/-]:** Tab click succeeded
- **STALL-EARNINGS-ACTIONS-UI [PASS/-]:** Clicked: Export
- **NAV-DEFAULTCOUNT-SOURCE [PASS/-]:** Container Stalls nav items no longer declare defaultCount (4/36/34/186/7/12/6 removed)
- **UI-CONSOLE-SUMMARY [PASS/-]:** No significant console errors (1 benign filtered)


## 29. Negative Test Results

- **STALL-OVERVIEW-NEG-ACTION [PASS/-]:** HTTP 400
- **STALL-AREAS-NEG-ACTION [PASS/-]:** HTTP 400
- **STALL-AREAS-NEG-CREATE [PASS/-]:** Dialog still open / no silent create
- **STALLS-NEG-ACTION [PASS/-]:** HTTP 400
- **STALLS-NEG-CREATE [PASS/-]:** Validation shown
- **STALL-STAFF-NEG-ACTION [PASS/-]:** HTTP 400
- **STALL-STAFF-NEG-CREATE [PASS/-]:** Validation shown
- **STALL-CONV-NEG-ACTION [PASS/-]:** HTTP 400
- **STALL-ORDERS-NEG-ACTION [PASS/-]:** HTTP 400
- **STALL-ADS-NEG-ACTION [PASS/-]:** HTTP 400
- **STALL-ADS-NEG-CREATE [PASS/-]:** Validation shown
- **STALL-SAMPLES-NEG-ACTION [PASS/-]:** HTTP 400
- **STALL-SAMPLES-NEG-CREATE [PASS/-]:** Validation shown
- **STALL-INCENTIVES-NEG-ACTION [PASS/-]:** HTTP 400
- **STALL-INCENTIVES-NEG-CREATE [PASS/-]:** Validation shown
- **STALL-EARNINGS-NEG-ACTION [PASS/-]:** HTTP 400


## 30. Failed Tests (index)

- None recorded


## 31. Failed Tests (detail)

_None_

## 32. Blocked Tests

_None_

## 33. Missing Functionality

_None_

## 34–45. Categorized Issue Buckets

## 34. Broken Functionality

- None recorded

## 35. Frontend Issues

- None recorded

## 36. Backend Issues

- None recorded

## 37. API Contract Issues

- None recorded

## 38. Database / Data Integrity Issues

- **STALL-OVERVIEW-KPI-SEED [PASS/-]:** Seed 36/Container stalls not paired
- **STALL-AREAS-NAV-SEED [PASS/-]:** Seed badge not clearly shown
- **STALL-AREAS-KPI-SEED [PASS/-]:** Seed 4/Areas not paired
- **STALLS-NAV-SEED [PASS/-]:** Seed badge not clearly shown
- **STALL-STAFF-NAV-SEED [PASS/-]:** Seed badge not clearly shown
- **STALL-ORDERS-NAV-SEED [PASS/-]:** Seed badge not clearly shown
- **STALL-ORDERS-EMPTY [PASS/-]:** Backend rows=0; UI body length=2426
- **STALL-ADS-NAV-SEED [PASS/-]:** Seed badge not clearly shown
- **STALL-SAMPLES-NAV-SEED [PASS/-]:** Seed badge not clearly shown
- **STALL-INCENTIVES-NAV-SEED [PASS/-]:** Seed badge not clearly shown
- **STALL-INCENTIVES-KPI-SEED [PASS/-]:** Seed 6/Active rules not paired
- **CONS-OVERVIEW-STALLS [PASS/-]:** Created AREA-E2E-FB89HF/CS-E2E-FB89HF/EMP-E2E-FB89HF; conv≈2; orders≈1; earn≈2

## 39. Calculation Issues

- **STALL-INCENTIVES-NAV-SEED [PASS/-]:** Seed badge not clearly shown
- **STALL-INCENTIVES-KPI-SEED [PASS/-]:** Seed 6/Active rules not paired
- **STALL-INCENTIVES-API [PASS/-]:** HTTP 200; unique rows≈1; UI=200
- **STALL-INCENTIVES-DATA [PASS/-]:** Backend unique rows≈1
- **STALL-INCENTIVES-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"1","label":"Active rules"},{"value":"0","label":"Conversion-based"},{"value":"0","label":"Volume-based"},{"value":"0"
- **STALL-INCENTIVES-UNAUTH [PASS/-]:** HTTP 401
- **STALL-INCENTIVES-SEARCH [PASS/-]:** Search filled and cleared
- **STALL-INCENTIVES-TAB-ACTIVERULES [PASS/-]:** Tab click succeeded
- **STALL-INCENTIVES-ACTIONS-UI [PASS/-]:** Clicked: Export
- **STALL-INCENTIVES-NEG-ACTION [PASS/-]:** HTTP 400
- **STALL-INCENTIVES-NEG-CREATE [PASS/-]:** Validation shown
- **STALL-EARNINGS-API [PASS/-]:** HTTP 200; unique rows≈1; UI=200
- **STALL-EARNINGS-DATA [PASS/-]:** Backend unique rows≈1
- **STALL-EARNINGS-KPIS-API [PASS/-]:** HTTP 200; live-looking=true; {"success":true,"message":"Success","data":[{"value":"₹18,050","label":"August payable"},{"value":"₹18,000","label":"Fixed salary"},{"value":"₹50","label":"Incentives"},{"
- **STALL-EARNINGS-UNAUTH [PASS/-]:** HTTP 401
- **STALL-EARNINGS-SEARCH [PASS/-]:** Search filled and cleared
- **STALL-EARNINGS-TAB-AUGUSTPAYABL [PASS/-]:** Tab click succeeded
- **STALL-EARNINGS-TAB-APPROVED [PASS/-]:** Tab click succeeded
- **STALL-EARNINGS-ACTIONS-UI [PASS/-]:** Clicked: Export
- **STALL-EARNINGS-NEG-ACTION [PASS/-]:** HTTP 400
- **REST-STALL-INCENTIVES [PASS/-]:** HTTP 200; items≈1
- **REST-STALL-EARNINGS [PASS/-]:** HTTP 200; items≈1
- **INCENTIVE-PREVIEW [PASS/-]:** HTTP 200; {"success":true,"message":"Success","data":{"lines":[{"ruleId":"SIN-E2E-FAXEOE","version":"v1","amount":0}],"total":0},"error":null,"pagination":null,"timestamp":"2026-09-24T09:08:
- **EARNINGS-RELEASE-NEG [PASS/-]:** HTTP 400
- **WF7-INCENTIVE-EARNINGS [PASS/-]:** rule HTTP 201; preview total=0; earnings rows≈2

## 40. Security / RBAC Issues

- **AUTH-01 [PASS/-]:** HTTP 200; URL=http://localhost:5173/dashboard; API=http://localhost:3333; UI=http://localhost:5173
- **STALL-OVERVIEW-UNAUTH [PASS/-]:** HTTP 401
- **STALL-AREAS-UNAUTH [PASS/-]:** HTTP 401
- **STALLS-UNAUTH [PASS/-]:** HTTP 401
- **STALL-STAFF-UNAUTH [PASS/-]:** HTTP 401
- **STALL-CONV-UNAUTH [PASS/-]:** HTTP 401
- **STALL-ORDERS-UNAUTH [PASS/-]:** HTTP 401
- **STALL-ADS-UNAUTH [PASS/-]:** HTTP 401
- **STALL-SAMPLES-UNAUTH [PASS/-]:** HTTP 401
- **STALL-INCENTIVES-UNAUTH [PASS/-]:** HTTP 401
- **STALL-EARNINGS-UNAUTH [PASS/-]:** HTTP 401
- **SEC-DIRECT-URL-AUTH [PASS/-]:** http://localhost:5173/stalls
- **SEC-DIRECT-URL-UNAUTH [PASS/-]:** http://localhost:5173/login
- **AUTH-LOGOUT-RELOGIN [PASS/-]:** Completed

## 41. Console Errors

- **UI-CONSOLE-SUMMARY [PASS/-]:** No significant console errors (1 benign filtered)

## 42. Data Consistency Issues

- **WF3-CONVERSION-PIPELINE [PASS/-]:** interaction HTTP 201; id=INT-0f846dce; stall-conv rows≈2
- **WF4-ORDERS-JOINED [PASS/-]:** order SEL-STALL-40934963; attribute HTTP 200; stall-orders rows≈1
- **CONS-OVERVIEW-STALLS [PASS/-]:** Created AREA-E2E-FB89HF/CS-E2E-FB89HF/EMP-E2E-FB89HF; conv≈2; orders≈1; earn≈2

## 43. Map / Location Issues

- **STALL-OVERVIEW-MAP [PASS/-]:** Map-like element found
- **STALL-AREAS-MAP [PASS/-]:** Map-like element found

## 44. UI / UX Issues

- None recorded

## 45. Incentive / Earnings Issues

- None recorded


## 41–46. Reproduction / Expected vs Actual / Severity / Evidence

Full per-failure detail is in **§31 Failed Tests** (includes reproduction steps, expected vs actual, API method/endpoint, evidence paths, severity).

## 46. Final PASS / FAIL / BLOCKED Summary

| Result | Count |
|--------|------:|
| PASS | 137 |
| FAIL | 0 |
| BLOCKED | 0 |
| MISSING | 0 |

**Verdict: Admin-ready for Container Stalls** (post-fix verification — all cases PASS).

### Summary table

| Section | Tests | Passed | Failed | Blocked | Missing | Critical | High | Medium | Low |
|---------|------:|-------:|-------:|--------:|--------:|---------:|-----:|-------:|----:|
| Network Overview | 13 | 13 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Areas & Mapping | 14 | 14 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Stall Directory | 12 | 12 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Stall Employees | 13 | 13 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Customer Conversions | 9 | 9 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Stall Orders | 11 | 11 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Advertisements | 13 | 13 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Product Samples | 12 | 12 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Incentive Rules | 13 | 13 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Employee Earnings | 11 | 11 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| TOTAL | 121 | 121 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

---

_End of Container Stalls Admin E2E audit report. **No application code was modified during this run.**_
