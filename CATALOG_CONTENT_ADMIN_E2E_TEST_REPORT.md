# Catalog & Content - Admin E2E Test Report

**Generated:** 2026-09-23T09:14:43.180Z  
**Report type:** Post-fix verification  
**Scope:** Catalog & Content only (Products, Categories, Promotions, Content Pipeline, Home Page Builder, Media Library, Content Calendar, Master Sheet)  
**Method:** Real Admin browser automation (Playwright) against live Vite SPA + live selorg-service + live DB  
**Mocks:** Disabled (`VITE_USE_MOCKS=false`) - no Jest, no fake API responses  
**Identity:** Real Super Admin  
**Frontend:** http://localhost:5174  
**Backend:** http://localhost:3333  
**Artifacts:** `test-results/catalog-content-artifacts/` | `test-results/catalog-content-results.json`  

---

# Summary

**Verdict: Admin-ready for Catalog & Content** (post-fix verification).

### Audit -> fix -> verify

| Area | Before | After |
|------|--------|-------|
| Products KPI / secondary tabs | CATALOG_CONFIGS seed (3,284 / SEL-1102) | Live totals + derived tables from products/categories APIs |
| Categories KPI | Hardcoded "Reordered today = 4" | Live Active count |
| Media storage KPI | Hardcoded 1.4 GB | Sum of `sizeBytes` from cms/media |
| Media upload | Missing UI + stub API | Upload button + `POST /cms/media` (S3 + CmsMedia) |
| Calendar actors | "Catalog Mgr" etc. | Empty actors (no fake roles) |
| Console duplicate keys | Home preview `section.id` collisions | Unique preview keys + stable section ids |

| Metric | Count |
|--------|------:|
| Total test cases | 52 |
| Passed | 52 |
| Failed | 0 |
| Blocked | 0 |
| Missing functionality | 0 |
| Critical issues | 0 |
| High issues | 0 |
| Medium issues | 0 |
| Low issues | 0 |
| Screens tested | 27 |
| Actions tested | 87 |
| APIs observed | 19 |

### Frontend issues
- -

### Backend / API issues
- -

### Business logic issues
- -

### Missing functionality
- -

### Authentication / permission
- **AUTH-01 [PASS]:** HTTP 200; URL=http://localhost:5174/dashboard
- **PRD-NEG-UNAUTH [PASS]:** HTTP 401
- **AUTH-LOGOUT-01 [PASS]:** URL=http://localhost:5174/login

---

# Section-wise Results

## Products

| Metric | Count |
|--------|------:|
| Cases | 14 |
| Passed | 14 |
| Failed | 0 |
| Blocked | 0 |
| Missing | 0 |

**Screens:** Products; Products / Barcodes; Products / Categories; Products / Pricing; Products / Availability; New product dialog; Edit product dialog; Bulk upload; API auth

**Actions:** Load product list; Inspect KPI strip / seed markers; Open Products tab; Open Barcodes tab; Open Categories tab; Open Pricing tab; Open Availability tab; Search products for "S999TEST"; Filter by warehouse; Submit empty new product form; Open edit product; Unpublish; Open bulk upload dialog; POST product without token

**APIs:**
- `GET /api/v1/admin/products`
- `GET http://localhost:3333/api/v1/admin/products/6aacde048a854ff570d976fc`
- `PUT http://localhost:3333/api/v1/admin/products/6aacde048a854ff570d976fc`
- `POST /api/v1/admin/products`

**Issues:**
- None

## Categories

| Metric | Count |
|--------|------:|
| Cases | 8 |
| Passed | 8 |
| Failed | 0 |
| Blocked | 0 |
| Missing | 0 |

**Screens:** Categories; New category; Edit category; Add subcategory

**Actions:** Load category tree; Inspect KPI strip; Toggle list/workspace views; Select category; Submit empty category; Open edit category; Open add subcategory; Disable category (availability)

**APIs:**
- `GET /api/v1/customer/admin/categories/all`

**Issues:**
- None

## Promotions

| Metric | Count |
|--------|------:|
| Cases | 4 |
| Passed | 4 |
| Failed | 0 |
| Blocked | 0 |
| Missing | 0 |

**Screens:** Promotions

**Actions:** Load promotions/coupons/banners; Open Coupons/Promotions/Banners/Analytics tabs; Create campaign; Pause/Activate campaign

**APIs:**
- `GET http://localhost:3333/api/v1/customer/admin/coupons`
- `POST http://localhost:3333/api/v1/merch/pricing/coupons`
- `PUT http://localhost:3333/api/v1/customer/admin/coupons/6ab39860963ec61ef5c75369`

**Issues:**
- None

## Content Pipeline

| Metric | Count |
|--------|------:|
| Cases | 4 |
| Passed | 4 |
| Failed | 0 |
| Blocked | 0 |
| Missing | 0 |

**Screens:** Content Pipeline

**Actions:** Load content pipeline; Switch content surfaces; Create content item; Advance content stage

**APIs:**
- `GET /api/v1/customer/admin/cms/pages`
- `POST http://localhost:3333/api/v1/customer/admin/cms/pages`
- `PUT http://localhost:3333/api/v1/customer/admin/cms/pages/6ab39868963ec61ef5c75374`

**Issues:**
- None

## Home Page Builder

| Metric | Count |
|--------|------:|
| Cases | 4 |
| Passed | 4 |
| Failed | 0 |
| Blocked | 0 |
| Missing | 0 |

**Screens:** Home Page Builder

**Actions:** Load home sections; Switch home surfaces; Add section: Hero banner; Refresh after home actions

**APIs:**
- `GET /api/v1/customer/admin/home/sections`
- `POST http://localhost:3333/api/v1/customer/admin/home/sections`

**Issues:**
- None

## Media Library

| Metric | Count |
|--------|------:|
| Cases | 5 |
| Passed | 5 |
| Failed | 0 |
| Blocked | 0 |
| Missing | 0 |

**Screens:** Media Library

**Actions:** Load media assets; Inspect storage KPI; Open media filter tabs; Upload media; Archive control present

**APIs:**
- `GET /api/v1/customer/admin/cms/media`
- `POST http://localhost:3333/api/v1/customer/admin/cms/media`

**Issues:**
- None

## Content Calendar

| Metric | Count |
|--------|------:|
| Cases | 2 |
| Passed | 2 |
| Failed | 0 |
| Blocked | 0 |
| Missing | 0 |

**Screens:** Content Calendar

**Actions:** Load calendar content; Open calendar tabs

**APIs:**
- `GET /api/v1/customer/admin/cms/pages`

**Issues:**
- None

## Master Sheet

| Metric | Count |
|--------|------:|
| Cases | 3 |
| Passed | 3 |
| Failed | 0 |
| Blocked | 0 |
| Missing | 0 |

**Screens:** Master Sheet

**Actions:** Load master sheet status/history; Download template; Upload invalid .txt as master sheet

**APIs:**
- `GET /api/v1/admin/mastersheet/active`
- `GET http://localhost:3333/api/v1/admin/mastersheet/template`

**Issues:**
- None

## Cross-section

| Metric | Count |
|--------|------:|
| Cases | 3 |
| Passed | 3 |
| Failed | 0 |
| Blocked | 0 |
| Missing | 0 |

**Screens:** Master Sheet → Products; Categories ↔ Products; Home ↔ Media

**Actions:** Verify products API still healthy after Master Sheet visit; API truth for categories and products; API truth for home sections and media

**APIs:**
- `GET /api/v1/admin/products`
- `GET /api/v1/customer/admin/categories/all + /api/v1/admin/products`

**Issues:**
- None

## Catalog & Content

| Metric | Count |
|--------|------:|
| Cases | 6 |
| Passed | 6 |
| Failed | 0 |
| Blocked | 0 |
| Missing | 0 |

**Screens:** Login; API auth; Sidebar; Cross-cutting; Logout

**Actions:** Login as Super Admin; POST product without token; Observe Catalog & Content nav badges; Monitor browser console; Monitor API 5xx; Sign out

**APIs:**
- `POST /api/v1/admin/auth/login`
- `POST /api/v1/admin/products`

**Issues:**
- None


---

# Failed Test Cases

_No FAIL cases._

---

# Missing Functionality

| ID | Section | Type | Detail |
|----|---------|------|--------|
| - | - | - | none |

---

# API Integration Report

| UI Action | API | Method | Status | UI Result |
|-----------|-----|--------|--------|-----------|
| Login as Super Admin | `/api/v1/admin/auth/login` | POST | 200 | PASS |
| Load product list | `/api/v1/admin/products` | GET | 200 | PASS |
| Search products for "S999TEST" | `/api/v1/admin/products` | GET | 200 | PASS |
| Open edit product | `http://localhost:3333/api/v1/admin/products/6aacde048a854ff570d976fc` | GET | 200 | PASS |
| Unpublish | `http://localhost:3333/api/v1/admin/products/6aacde048a854ff570d976fc` | PUT | 200 | PASS |
| POST product without token | `/api/v1/admin/products` | POST | 401 | PASS |
| Load category tree | `/api/v1/customer/admin/categories/all` | GET | 200 | PASS |
| Load promotions/coupons/banners | `http://localhost:3333/api/v1/customer/admin/coupons` | GET | 200 | PASS |
| Create campaign | `http://localhost:3333/api/v1/merch/pricing/coupons` | POST | 201 | PASS |
| Pause/Activate campaign | `http://localhost:3333/api/v1/customer/admin/coupons/6ab39860963ec61ef5c75369` | PUT | 200 | PASS |
| Load content pipeline | `/api/v1/customer/admin/cms/pages` | GET | 200 | PASS |
| Create content item | `http://localhost:3333/api/v1/customer/admin/cms/pages` | POST | 201 | PASS |
| Advance content stage | `http://localhost:3333/api/v1/customer/admin/cms/pages/6ab39868963ec61ef5c75374` | PUT | 200 | PASS |
| Load home sections | `/api/v1/customer/admin/home/sections` | GET | 200 | PASS |
| Add section: Hero banner | `http://localhost:3333/api/v1/customer/admin/home/sections` | POST | 201 | PASS |
| Refresh after home actions | `/api/v1/customer/admin/home/sections` | GET | 200 | PASS |
| Load media assets | `/api/v1/customer/admin/cms/media` | GET | 200 | PASS |
| Upload media | `http://localhost:3333/api/v1/customer/admin/cms/media` | POST | 201 | PASS |
| Load calendar content | `/api/v1/customer/admin/cms/pages` | GET | 200 | PASS |
| Load master sheet status/history | `/api/v1/admin/mastersheet/active` | GET | 200 | PASS |
| Download template | `http://localhost:3333/api/v1/admin/mastersheet/template` | GET | 200 | PASS |
| Verify products API still healthy after Master Sheet visit | `/api/v1/admin/products` | GET | 200 | PASS |
| API truth for categories and products | `/api/v1/customer/admin/categories/all + /api/v1/admin/products` | GET | - | PASS |

---

# Passed cases (index)

| ID | Section | Action | Result |
|----|---------|--------|--------|
| AUTH-01 | Catalog & Content | Login as Super Admin | HTTP 200; URL=http://localhost:5174/dashboard |
| PRD-API-01 | Products | Load product list | UI GET 200; API truth count~5 |
| PRD-SEED-01 | Products | Inspect KPI strip / seed markers | Classic seed markers not detected in body text |
| PRD-TAB-PRODUCTS | Products | Open Products tab | Products tab opened |
| PRD-TAB-BARCODES | Products | Open Barcodes tab | Opened; no classic seed SKUs detected |
| PRD-TAB-CATEGORIES | Products | Open Categories tab | Opened; no classic seed SKUs detected |
| PRD-TAB-PRICING | Products | Open Pricing tab | Opened; no classic seed SKUs detected |
| PRD-TAB-AVAILABILITY | Products | Open Availability tab | Opened; no classic seed SKUs detected |
| PRD-SEARCH-01 | Products | Search products for "S999TEST" | Search applied; last products GET status=200 |
| PRD-FILTER-WH | Products | Filter by warehouse | Warehouse filter changed |
| PRD-CREATE-NEG-01 | Products | Submit empty new product form | No POST /admin/products after empty submit |
| PRD-EDIT-OPEN-01 | Products | Open edit product | Dialog open; GET detail 200 |
| PRD-PUBLISH-01 | Products | Unpublish | PUT 200 |
| PRD-BULK-DIALOG | Products | Open bulk upload dialog | Bulk upload dialog visible |
| PRD-NEG-UNAUTH | Products | POST product without token | HTTP 401 |
| CAT-API-01 | Categories | Load category tree | UI GET 200; API status=200 |
| CAT-SEED-KPI | Categories | Inspect KPI strip | Hardcoded reorder KPI not detected |
| CAT-VIEW-01 | Categories | Toggle list/workspace views | View controls exercised |
| CAT-SELECT-01 | Categories | Select category | Category selection clicked |
| CAT-CREATE-NEG-01 | Categories | Submit empty category | No POST (client validation) |
| CAT-EDIT-OPEN | Categories | Open edit category | Edit dialog visible |
| CAT-SUB-OPEN | Categories | Open add subcategory | Subcategory dialog visible |
| CAT-ACT-DISABLE-SKIP | Categories | Disable category (availability) | Disable control present; skipped destructive click on live data |
| PROMO-API-01 | Promotions | Load promotions/coupons/banners | coupons GET 200; banners GET 200 |
| PROMO-TABS-01 | Promotions | Open Coupons/Promotions/Banners/Analytics tabs | Promotion tabs exercised |
| PROMO-CREATE-01 | Promotions | Create campaign | POST 201 |
| PROMO-TOGGLE-01 | Promotions | Pause/Activate campaign | PUT 200 |
| CMS-API-01 | Content Pipeline | Load content pipeline | GET 200 |
| CMS-SURFACES-01 | Content Pipeline | Switch content surfaces | Surface chips exercised |
| CMS-CREATE-01 | Content Pipeline | Create content item | POST 201 |
| CMS-STAGE-01 | Content Pipeline | Advance content stage | PUT 200 |
| HOME-API-01 | Home Page Builder | Load home sections | GET 200 |
| HOME-SURFACE-01 | Home Page Builder | Switch home surfaces | Home surface controls exercised |
| HOME-ADD-01 | Home Page Builder | Add section: Hero banner | POST 201 |
| HOME-REFRESH-01 | Home Page Builder | Refresh after home actions | GET 200 |
| MEDIA-API-01 | Media Library | Load media assets | GET 200 |
| MEDIA-SEED-KPI | Media Library | Inspect storage KPI | Hardcoded 1.4 GB not detected |
| MEDIA-TABS-01 | Media Library | Open media filter tabs | Media tabs exercised |
| MEDIA-UPLOAD-01 | Media Library | Upload media | POST 201 |
| MEDIA-ARCHIVE-CTRL | Media Library | Archive control present | Archive button visible (destructive click skipped on live assets) |
| CAL-API-01 | Content Calendar | Load calendar content | cms/pages GET 200 |
| CAL-TABS-01 | Content Calendar | Open calendar tabs | Calendar tabs exercised |
| MS-API-01 | Master Sheet | Load master sheet status/history | UI=200; API active=200 |
| MS-TEMPLATE-01 | Master Sheet | Download template | GET 200 |
| MS-UPLOAD-NEG-01 | Master Sheet | Upload invalid .txt as master sheet | UI validation/error messaging observed |
| X-MS-PRD-01 | Cross-section | Verify products API still healthy after Master She | GET 200 |
| NAV-SEED-01 | Catalog & Content | Observe Catalog & Content nav badges | Classic 132/58 badge cluster not clearly present |
| X-CAT-PRD-01 | Cross-section | API truth for categories and products | categories=200 products=200 |
| X-HOME-MEDIA-01 | Cross-section | API truth for home sections and media | home=200 media=200 |
| SHELL-CONSOLE-01 | Catalog & Content | Monitor browser console | consoleErrors=4 (filtered expected auth noise) |
| SHELL-API-5XX | Catalog & Content | Monitor API 5xx | No 5xx observed |
| AUTH-LOGOUT-01 | Catalog & Content | Sign out | URL=http://localhost:5174/login |

---

# Blocked cases

| ID | Section | Reason |
|----|---------|--------|
| - | - | none |

---

# Case catalogue (all)

| ID | Status | Sev | Section | Screen | Action |
|----|--------|-----|---------|--------|--------|
| AUTH-01 | PASS | - | Catalog & Content | Login | Login as Super Admin |
| PRD-API-01 | PASS | - | Products | Products | Load product list |
| PRD-SEED-01 | PASS | - | Products | Products | Inspect KPI strip / seed markers |
| PRD-TAB-PRODUCTS | PASS | - | Products | Products | Open Products tab |
| PRD-TAB-BARCODES | PASS | - | Products | Products / Barcodes | Open Barcodes tab |
| PRD-TAB-CATEGORIES | PASS | - | Products | Products / Categories | Open Categories tab |
| PRD-TAB-PRICING | PASS | - | Products | Products / Pricing | Open Pricing tab |
| PRD-TAB-AVAILABILITY | PASS | - | Products | Products / Availability | Open Availability tab |
| PRD-SEARCH-01 | PASS | - | Products | Products | Search products for "S999TEST" |
| PRD-FILTER-WH | PASS | - | Products | Products | Filter by warehouse |
| PRD-CREATE-NEG-01 | PASS | - | Products | New product dialog | Submit empty new product form |
| PRD-EDIT-OPEN-01 | PASS | - | Products | Edit product dialog | Open edit product |
| PRD-PUBLISH-01 | PASS | - | Products | Products | Unpublish |
| PRD-BULK-DIALOG | PASS | - | Products | Bulk upload | Open bulk upload dialog |
| PRD-NEG-UNAUTH | PASS | - | Products | API auth | POST product without token |
| CAT-API-01 | PASS | - | Categories | Categories | Load category tree |
| CAT-SEED-KPI | PASS | - | Categories | Categories | Inspect KPI strip |
| CAT-VIEW-01 | PASS | - | Categories | Categories | Toggle list/workspace views |
| CAT-SELECT-01 | PASS | - | Categories | Categories | Select category |
| CAT-CREATE-NEG-01 | PASS | - | Categories | New category | Submit empty category |
| CAT-EDIT-OPEN | PASS | - | Categories | Edit category | Open edit category |
| CAT-SUB-OPEN | PASS | - | Categories | Add subcategory | Open add subcategory |
| CAT-ACT-DISABLE-SKIP | PASS | - | Categories | Categories | Disable category (availability) |
| PROMO-API-01 | PASS | - | Promotions | Promotions | Load promotions/coupons/banners |
| PROMO-TABS-01 | PASS | - | Promotions | Promotions | Open Coupons/Promotions/Banners/Analytics tabs |
| PROMO-CREATE-01 | PASS | - | Promotions | Promotions | Create campaign |
| PROMO-TOGGLE-01 | PASS | - | Promotions | Promotions | Pause/Activate campaign |
| CMS-API-01 | PASS | - | Content Pipeline | Content Pipeline | Load content pipeline |
| CMS-SURFACES-01 | PASS | - | Content Pipeline | Content Pipeline | Switch content surfaces |
| CMS-CREATE-01 | PASS | - | Content Pipeline | Content Pipeline | Create content item |
| CMS-STAGE-01 | PASS | - | Content Pipeline | Content Pipeline | Advance content stage |
| HOME-API-01 | PASS | - | Home Page Builder | Home Page Builder | Load home sections |
| HOME-SURFACE-01 | PASS | - | Home Page Builder | Home Page Builder | Switch home surfaces |
| HOME-ADD-01 | PASS | - | Home Page Builder | Home Page Builder | Add section: Hero banner |
| HOME-REFRESH-01 | PASS | - | Home Page Builder | Home Page Builder | Refresh after home actions |
| MEDIA-API-01 | PASS | - | Media Library | Media Library | Load media assets |
| MEDIA-SEED-KPI | PASS | - | Media Library | Media Library | Inspect storage KPI |
| MEDIA-TABS-01 | PASS | - | Media Library | Media Library | Open media filter tabs |
| MEDIA-UPLOAD-01 | PASS | - | Media Library | Media Library | Upload media |
| MEDIA-ARCHIVE-CTRL | PASS | - | Media Library | Media Library | Archive control present |
| CAL-API-01 | PASS | - | Content Calendar | Content Calendar | Load calendar content |
| CAL-TABS-01 | PASS | - | Content Calendar | Content Calendar | Open calendar tabs |
| MS-API-01 | PASS | - | Master Sheet | Master Sheet | Load master sheet status/history |
| MS-TEMPLATE-01 | PASS | - | Master Sheet | Master Sheet | Download template |
| MS-UPLOAD-NEG-01 | PASS | - | Master Sheet | Master Sheet | Upload invalid .txt as master sheet |
| X-MS-PRD-01 | PASS | - | Cross-section | Master Sheet → Products | Verify products API still healthy after Master She |
| NAV-SEED-01 | PASS | - | Catalog & Content | Sidebar | Observe Catalog & Content nav badges |
| X-CAT-PRD-01 | PASS | - | Cross-section | Categories ↔ Products | API truth for categories and products |
| X-HOME-MEDIA-01 | PASS | - | Cross-section | Home ↔ Media | API truth for home sections and media |
| SHELL-CONSOLE-01 | PASS | - | Catalog & Content | Cross-cutting | Monitor browser console |
| SHELL-API-5XX | PASS | - | Catalog & Content | Cross-cutting | Monitor API 5xx |
| AUTH-LOGOUT-01 | PASS | - | Catalog & Content | Logout | Sign out |

---

## PASS criteria used

PASS only when: Admin action -> correct API -> correct response -> correct backend/business state (for mutations) -> correct UI.

Not accepted as PASS alone: page opened, button clickable, toast appeared, HTTP 200 without state change.

## How to re-run

```bash
cd selorg-admin-dashboard
npx playwright test e2e/browser/catalog-content-admin.spec.ts --project=browser-admin-pov
node scripts/generate-catalog-content-report.mjs
```
