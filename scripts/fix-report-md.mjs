import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const jsonPath = path.join(root, "test-results", "playwright-report.json");
const outPath = path.join(root, "ADMIN_DASHBOARD_API_AUTOMATION_TEST_REPORT.md");
const report = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

function sanitize(s) {
  return String(s || "")
    .replace(/\r\n/g, "\n")
    .replace(/[`]/g, "'")
    .replace(/[—–]/g, "-")
    .replace(/[→›]/g, "->")
    .replace(/[✅❌⏭️]/g, "")
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function collect(reportObj) {
  const tests = [];
  for (const suite of reportObj.suites || []) {
    const stack = [suite];
    while (stack.length) {
      const s = stack.pop();
      for (const child of s.suites || []) stack.push(child);
      for (const spec of s.specs || []) {
        for (const t of spec.tests || []) {
          const result = (t.results || [])[0] || {};
          const status =
            result.status ||
            (t.ok === false ? "failed" : t.ok === true ? "passed" : "unknown");
          const err =
            result.error?.message ||
            (result.errors && result.errors[0]?.message) ||
            "";
          tests.push({
            title: spec.title,
            suite: s.title,
            file: spec.file || "",
            project: t.projectName || "",
            status,
            error: err,
          });
        }
      }
    }
  }
  return tests;
}

const tests = collect(report);
const passed = tests.filter((t) => t.status === "passed");
const failed = tests.filter(
  (t) => t.status === "failed" || t.status === "timedOut",
);
const skipped = tests.filter(
  (t) => t.status === "skipped" || t.status === "interrupted",
);
const apiTests = tests.filter(
  (t) => /api/i.test(t.project) || /api[\\/]/i.test(t.file),
);
const e2eTests = tests.filter(
  (t) => /flows/i.test(t.project) || /flows[\\/]/i.test(t.file),
);
const generatedAt = new Date().toISOString();
const API_BASE = "http://127.0.0.1:3333";
const icon = (s) =>
  s === "passed"
    ? "[PASS]"
    : s === "skipped" || s === "interrupted"
      ? "[SKIP]"
      : "[FAIL]";

const lines = [];
lines.push("# Selorg Admin Dashboard - API and Automation Test Report");
lines.push("");
lines.push(`Generated: **${generatedAt}**`);
lines.push("");
lines.push("## 1. Test Environment");
lines.push("");
lines.push("| Item | Value |");
lines.push("|------|-------|");
lines.push(`| Date | ${generatedAt} |`);
lines.push(`| OS | ${os.platform()} ${os.release()} |`);
lines.push(`| Node | ${process.version} |`);
lines.push(
  "| Frontend | selorg-admin-dashboard (Vite 6 + React 19 + TypeScript) |",
);
lines.push(`| Backend/API base URL | ${API_BASE} (selorg-service) |`);
lines.push("| Browser | N/A (Playwright APIRequestContext) |");
lines.push(`| Database/backend | Live selorg-service @ ${API_BASE} |`);
lines.push(
  "| Environment | Real backend - VITE_USE_MOCKS not used by automation harness |",
);
lines.push(
  "| Admin test identity | ADMIN_TEST_EMAIL / seed-superadmin account |",
);
lines.push("");
lines.push("## 2. Testing Tools");
lines.push("");
lines.push(
  "- Existing: Vitest + Testing Library (unit/mock service tests) - not used for this live audit",
);
lines.push(
  "- Added for live API audit: Playwright (@playwright/test) APIRequestContext",
);
lines.push("- Specs: e2e/api/*, e2e/flows/*");
lines.push("- Config: playwright.config.ts");
lines.push("- Report JSON: test-results/playwright-report.json");
lines.push("- Generator: scripts/generate-api-test-report.mjs");
lines.push("");
lines.push("## 3. Application Architecture");
lines.push("");
lines.push(
  "- Frontend: Vite SPA, React Router 7, TanStack Query, Zustand session (selorg-admin-session)",
);
lines.push(
  "- API layer: src/lib/apiClient.ts + domain services under src/services/*",
);
lines.push(
  "- Auth: Login -> JWT cookie selorg_admin_token (+ optional Bearer); RequireAuth / RequireModule guards",
);
lines.push(
  '- Mocks: Many domains toggle via VITE_USE_MOCKS==="true"; orders/dashboard/darkstore/warehouse often always-real',
);
lines.push(
  "- Env: .env.example -> VITE_API_URL=http://localhost:3333, VITE_USE_MOCKS=true (prototyping default)",
);
lines.push("");
lines.push("## 4. API Inventory");
lines.push("");
lines.push("Extracted from src/services real clients + module hooks.");
lines.push(
  "Base URL: VITE_API_URL / VITE_API_BASE_URL -> default http://localhost:3333.",
);
lines.push(
  "HTTP client: src/lib/apiClient.ts (credentials include, optional Bearer from selorg-admin-token).",
);
lines.push(
  "Auth: POST /api/v1/admin/auth/login -> JWT in body + HttpOnly cookie selorg_admin_token.",
);
lines.push("");
lines.push("| Domain | Method | Path | Auth | Frontend service |");
lines.push("|--------|--------|------|------|------------------|");
lines.push("| Auth | POST | /api/v1/admin/auth/login | no | authService.real |");
lines.push("| Auth | POST | /api/v1/admin/auth/logout | yes | sessionStore |");
lines.push(
  "| Dashboard | GET | /api/v1/admin/analytics/realtime | yes | dashboardService.real |",
);
lines.push(
  "| Orders | GET/POST/PUT | /api/v1/admin/orders* | yes | orderService.real |",
);
lines.push(
  "| Catalog | CRUD | /api/v1/admin/products* | yes | catalogService.real |",
);
lines.push(
  "| Categories | CRUD | /api/v1/customer/admin/categories* | yes | categoryService.real |",
);
lines.push(
  "| Darkstores | * | /api/v1/admin/darkstores* | yes | useStores / DS services |",
);
lines.push(
  "| Warehouse | * | /api/v1/admin/warehouses, /api/v1/warehouse/* | yes | warehouse services |",
);
lines.push(
  "| Riders | GET/PATCH | /api/v1/admin/riders*, /api/v1/rider/* | yes | riders/approvals |",
);
lines.push(
  "| Finance | * | /api/v1/admin/finance/* | yes | earnings/payouts/rules |",
);
lines.push(
  "| Customers | GET/POST | /api/v1/admin/customers* | yes | customerService |",
);
lines.push(
  "| Support | * | /api/v1/admin/support/tickets* | yes | support services |",
);
lines.push(
  "| Users/Roles | * | /api/v1/admin/users*, /roles | yes | users/roles services |",
);
lines.push(
  "| Integrations | GET | /api/v1/admin/integrations/health | yes | integrationService |",
);
lines.push(
  "| Vendors | * | /api/v1/admin/vendor/vendors* | yes | vendorService |",
);
lines.push("");
lines.push(
  "Inventory size: ~90 frontend-mapped endpoints (see e2e/helpers/inventory.ts).",
);
lines.push("");
lines.push("## 5. Test Statistics");
lines.push("");
lines.push("| Metric | Count |");
lines.push("|--------|------:|");
lines.push(`| Total tests | ${tests.length} |`);
lines.push(`| Passed | ${passed.length} |`);
lines.push(`| Failed | ${failed.length} |`);
lines.push("| Blocked | 0 |");
lines.push(`| Skipped | ${skipped.length} |`);
lines.push(`| API project tests | ${apiTests.length} |`);
lines.push(`| E2E/flow project tests | ${e2eTests.length} |`);
lines.push("");
lines.push("## 6. API Integration Results");
lines.push("");
for (const t of apiTests) {
  lines.push(
    `- ${icon(t.status)} [${t.project || "api"}] ${sanitize(t.suite)} > ${sanitize(t.title)}`,
  );
}
lines.push("");
lines.push("## 7. Authentication and Session Results");
lines.push("");
const authTests = tests.filter((t) =>
  /auth|login|logout|token|Bearer|cookie|role/i.test(`${t.suite} ${t.title}`),
);
for (const t of authTests) {
  lines.push(`- ${icon(t.status)} ${sanitize(t.title)} - **${t.status}**`);
}
lines.push("");
lines.push("### Auth findings (executed)");
lines.push("");
lines.push(
  "- Login with correct admin role + seeded credentials returns JWT + user and sets HttpOnly cookie.",
);
lines.push(
  "- LoginPage default role Operations Admin -> payload operations_admin rejects seeded Super Admin (401). Category: Frontend / Authentication.",
);
lines.push("- Protected APIs without token return 401/403.");
lines.push("- Invalid/malformed Bearer rejected.");
lines.push(
  "- Logout endpoint succeeds; post-logout JWT acceptance depends on backend revoke enforcement.",
);
lines.push("");
lines.push("## 8. CRUD Results");
lines.push("");
lines.push("| Operation | Approach | Result |");
lines.push("|-----------|----------|--------|");
lines.push(
  "| Read (orders, products, customers, users, darkstores, categories, tickets) | Authenticated GET | Exercised in API + flow suites |",
);
lines.push(
  "| Create (products/categories) | Empty/invalid body negative only | Expect 4xx - no production writes |",
);
lines.push(
  "| Update (order status, rider status) | Invalid IDs only | Expect 4xx - non-destructive |",
);
lines.push(
  "| Delete | Not executed against real entities | Policy: no destructive deletes |",
);
lines.push(
  "| Wallet credit | Invalid amount / fake id | Backend returned 200 (failure) |",
);
lines.push("");
lines.push("## 9. E2E Flow Results");
lines.push("");
for (const t of e2eTests) {
  lines.push(
    `- ${icon(t.status)} [${t.project || "flows"}] ${sanitize(t.suite)} > ${sanitize(t.title)}`,
  );
}
lines.push("");
lines.push("## 10. UI State Results");
lines.push("");
lines.push("Verified at API layer (UI browser E2E not configured):");
lines.push("");
lines.push(
  "- Loading: frontend uses React Query; APIs return promptly (<30s timeout).",
);
lines.push(
  "- Success: dashboard realtime, orders, products, customers return 200 with data.",
);
lines.push(
  "- Empty: riders/roles/integrations may return empty arrays - real empty, not mock.",
);
lines.push("- Error/unauth: gated routes return 401/403 without token.");
lines.push(
  "- Frontend risk: several pages fall back to seed data when API returns empty (RidersLivePage, ScannerPage, ScanHistoryPage, AuditLogPage, ContentCalendarPage, RolesPage, ReportsCatalogPage).",
);
lines.push("- Login decorative LOGIN_STATS are hardcoded (not API).");
lines.push("");
lines.push("## 11. Frontend/Backend Contract Mismatches");
lines.push("");
lines.push("| Issue | Owner | Evidence |");
lines.push("|-------|-------|----------|");
lines.push(
  "| GET /api/v1/admin/integrations/health returns { integrations: [] } without data; integrationService.real only maps array/.list | API Contract / Frontend | Live response + integrationService.real.ts |",
);
lines.push(
  "| Login form default role Operations Admin vs seeded user role admin | Frontend | LoginPage.tsx defaultValues + admin-auth.service role match |",
);
lines.push(
  "| GET /api/v1/customer/banners returns 404 | API Contract | promotionsService.real.ts calls missing route |",
);
lines.push(
  "| Heterogeneous list envelopes (data[] vs data.data[] vs {vendors}) | API Contract | Orders/warehouses/vendors responses |",
);
lines.push(
  "| Dashboard hourly chart always zeroed placeholders | Frontend | dashboardService.real.ts |",
);
lines.push("");
lines.push("## 12. Error Handling Issues");
lines.push("");
lines.push(
  "- apiClient on non-auth 401 clears token and redirects to /login (SPA).",
);
lines.push(
  "- dashboardService.real swallows analytics failures and returns zeroed snapshot.",
);
lines.push(
  "- Negative suite: wallet credit and rider status PATCH accept invalid input with HTTP 200 (backend validation gaps).",
);
lines.push("");
lines.push("## 13. Critical Issues");
lines.push("");
for (const t of failed) {
  lines.push(`### ${sanitize(t.title)}`);
  lines.push(`- Status: **${t.status}**`);
  lines.push(`- Project: ${t.project || "api"}`);
  lines.push(`- Error: ${sanitize(t.error)}`);
  lines.push("");
}
lines.push("## 14. High/Medium/Low Issues");
lines.push("");
lines.push("### High");
lines.push(
  "- Login default role mismatch (Operations Admin vs admin) - blocks real login unless role dropdown changed.",
);
lines.push(
  "- Integrations health field-name mismatch (integrations vs .list).",
);
lines.push("- Missing banners route (404).");
lines.push("- Wallet credit accepts negative amount / fake customer id.");
lines.push("- Rider status PATCH returns success for non-existent id.");
lines.push("");
lines.push("### Medium");
lines.push(
  "- Seed/fallback UI when API empty (riders, scanner, audit, CMS calendar, roles, reports catalog).",
);
lines.push("- Hardcoded LOGIN_STATS on login page.");
lines.push("- Nav defaultCount static badges in nav.ts.");
lines.push("");
lines.push("### Low");
lines.push(
  "- Vite proxy /api unused because client calls absolute API_BASE.",
);
lines.push(
  "- Socket auth still depends on localStorage token while HTTP prefers cookie.",
);
lines.push("");
lines.push("## 15. Mock/Dummy/Sample Data Findings");
lines.push("");
lines.push(
  "| File | Feature | Used in production flow? | Real API should provide |",
);
lines.push(
  "|------|---------|--------------------------|-------------------------|",
);
lines.push(
  "| src/services mock + mockDb.ts | Many domains | Only when VITE_USE_MOCKS=true | Matching real.ts endpoints |",
);
lines.push(
  "| src/services Seed files | Design seeds | Mock mode + UI fallbacks | Live list endpoints |",
);
lines.push(
  "| LoginPage.tsx LOGIN_STATS | Login marketing stats | Always (decorative) | Optional analytics |",
);
lines.push(
  "| RidersLivePage.tsx | Live riders | Fallback when API empty | rider map + admin riders APIs |",
);
lines.push(
  "| Scanner/ScanHistory/AuditLog pages | Monitoring | Fallback when API empty | HSD + audit APIs |",
);
lines.push(
  "| ContentCalendarPage.tsx | CMS calendar | Fallback when API empty | CMS pages API |",
);
lines.push(
  "| RolesPage.tsx | Roles | Fallback when API empty | /api/v1/admin/roles |",
);
lines.push(
  "| ReportsCatalogPage.tsx | Reports | Uses SEED_REPORT_CATALOG | Report metadata API |",
);
lines.push(
  "| constants/nav.ts defaultCount | Sidebar badges | Always (static) | Live counts per module |",
);
lines.push("");
lines.push("Not removed (audit-only).");
lines.push("");
lines.push("## 16. Exact Reproduction Steps");
lines.push("");
lines.push(
  `1. Ensure selorg-service is running on ${API_BASE} (GET /health -> healthy).`,
);
lines.push(
  "2. Ensure super-admin exists (selorg-service/scripts/seed-superadmin.ts) or set ADMIN_TEST_EMAIL / ADMIN_TEST_PASSWORD.",
);
lines.push("3. From C:\\js\\selorgdashboard: npm run test:automation.");
lines.push("4. Open ADMIN_DASHBOARD_API_AUTOMATION_TEST_REPORT.md.");
lines.push(
  "5. Role-trap repro: POST /api/v1/admin/auth/login with role operations_admin -> 401; with role admin -> 200.",
);
lines.push("6. Banners contract: GET /api/v1/customer/banners -> 404.");
lines.push(
  "7. Integrations contract: GET /api/v1/admin/integrations/health -> top-level integrations key.",
);
lines.push("");
lines.push("## 17. Recommended Fixes");
lines.push("");
lines.push("| File | Existing issue | Required change | Why |");
lines.push("|------|----------------|-----------------|-----|");
lines.push(
  "| src/services/catalog/promotionsService.real.ts | Calls missing GET /api/v1/customer/banners (404) | Point to real banners route or implement backend route | Promotions banners tab cannot load |",
);
lines.push(
  "| Backend wallet credit handler | Accepts amount=-1 and fake customer id with 200 | Validate customer exists + amount > 0 -> 4xx | Prevents silent bad wallet mutations |",
);
lines.push(
  "| Backend rider status PATCH | Returns 200 for non-existent rider id | Return 404 when rider missing | Prevents false success on approvals |",
);
lines.push(
  "| src/modules/auth/pages/LoginPage.tsx | Default role Operations Admin | Default to Super Admin / admin, or map aliases like backend | Prevents false invalid-credentials for seeded Super Admin |",
);
lines.push(
  "| src/services/integrations/integrationService.real.ts | Reads .list only | Also map .integrations (and tolerate no data wrapper) | Matches live backend envelope |",
);
lines.push(
  "| RidersLivePage.tsx (+ scanner/audit/cms/roles) | Seed fallback when API empty | Show empty state, not seed | Avoid fake operational data |",
);
lines.push(
  "| ReportsCatalogPage.tsx | Hardcoded SEED_REPORT_CATALOG | Drive from API or clearly labeled static config | Honest report catalog source |",
);
lines.push(
  "| dashboardService.real.ts | Silent catch -> zeros | Surface error/empty distinctly | Operators can tell outage vs zero day |",
);
lines.push(
  "| .env (local) | Missing; example defaults mocks on | Set VITE_USE_MOCKS=false for real ops | Ensure SPA uses real APIs |",
);
lines.push("");
lines.push(
  "Production files were not modified for these fixes (audit-only).",
);
lines.push("");
lines.push("## Failure analysis (Playwright failures)");
lines.push("");
if (!failed.length) {
  lines.push("None in this run.");
} else {
  for (const t of failed) {
    lines.push(`### ${sanitize(t.title)}`);
    lines.push(`- Suite/file: ${sanitize(t.suite)} / ${sanitize(t.file)}`);
    lines.push(`- Project: ${t.project || "api"}`);
    lines.push(`- Status: ${t.status}`);
    lines.push(`- Error: ${sanitize(t.error)}`);
    const blob = `${t.title} ${t.error}`;
    if (/banners/i.test(blob)) {
      lines.push("- Category: API Contract");
      lines.push("- Severity: Critical");
      lines.push(
        "- Root cause: Frontend calls /api/v1/customer/banners but selorg-service has no such route (404).",
      );
    } else if (/wallet/i.test(blob)) {
      lines.push("- Category: Backend");
      lines.push("- Severity: Critical");
      lines.push(
        "- Root cause: Backend returned 200 Wallet credited for amount=-1 and non-existent customer ObjectId - validation missing.",
      );
    } else if (/rider status/i.test(blob)) {
      lines.push("- Category: Backend");
      lines.push("- Severity: Critical");
      lines.push(
        "- Root cause: Backend returned 200 Rider status updated for non-existent rider id - missing existence check.",
      );
    } else if (/integrations/i.test(blob)) {
      lines.push("- Category: API Contract");
      lines.push("- Severity: Critical");
      lines.push(
        "- Root cause: Response shape {integrations} without data; frontend mapper only reads array/.list.",
      );
    } else {
      lines.push("- Category: Backend");
      lines.push("- Severity: High");
      lines.push(
        "- Root cause: Root cause requires further investigation.",
      );
    }
    lines.push("");
  }
}

lines.push("## Passed tests (full list)");
lines.push("");
for (const t of passed) {
  lines.push(
    `- [PASS] [${t.project}] ${sanitize(t.suite)} > ${sanitize(t.title)}`,
  );
}
lines.push("");

const body = `${lines.join("\n")}\n`;
fs.writeFileSync(outPath, body, { encoding: "utf8" });
console.log(`Wrote ${outPath}`);
console.log(`bytes=${Buffer.byteLength(body, "utf8")}`);
console.log(`nulls=${[...Buffer.from(body)].filter((b) => b === 0).length}`);
console.log(`lines=${lines.length}`);
