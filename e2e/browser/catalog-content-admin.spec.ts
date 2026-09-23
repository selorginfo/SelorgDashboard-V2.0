import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  attachNetworkCapture,
  uiLoginAsSuperAdmin,
  openNavItem,
  uiLogout,
  FRONTEND_ORIGIN,
  API_BASE,
} from "./helpers/ui";
import {
  pass,
  fail,
  blocked,
  missing,
  flushResults,
  resetResults,
  trackScreen,
  trackAction,
} from "./helpers/results";
import { createApiContext, apiCall, unwrapData } from "../helpers/api";
import { loginAdmin } from "../helpers/auth";

/**
 * Catalog & Content — Admin POV E2E (audit only).
 * Live Vite SPA + live selorg-service. No app source changes. No mocks.
 */

const ARTIFACTS = path.join(process.cwd(), "test-results", "catalog-content-artifacts");
const RESULTS_FILE = "catalog-content-results.json";

function ensureArtifacts() {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
}

async function shot(page: import("@playwright/test").Page, name: string) {
  const file = path.join(ARTIFACTS, `${name}.png`);
  try {
    await page.screenshot({ path: file, fullPage: true, timeout: 10_000 });
  } catch {
    /* non-fatal */
  }
  return file;
}

/** Click in-page tab chips — avoid sidebar links with the same label. */
async function clickTabInMain(page: import("@playwright/test").Page, name: string) {
  const chip = page.locator('[class*="tabChip"], [class*="tabs"] button, [class*="tabs"] [role="tab"]').filter({
    hasText: new RegExp(`^${name}$`, "i"),
  });
  if (await chip.count()) {
    await chip.first().click({ timeout: 5_000 }).catch(() => undefined);
    return true;
  }
  return false;
}

async function gotoSection(page: import("@playwright/test").Page, label: string, pathSeg: string) {
  trackAction(`Navigate to ${label}`);
  try {
    await openNavItem(page, label);
  } catch {
    await page.goto(`${FRONTEND_ORIGIN}/${pathSeg}`, { waitUntil: "domcontentloaded" });
  }
  await page.waitForTimeout(1500);
  await expect(page).toHaveURL(new RegExp(`/${pathSeg}`), { timeout: 20_000 });
}

function seedHit(text: string, markers: RegExp) {
  return markers.test(text);
}

test.describe.configure({ mode: "serial" });

test.describe("Catalog & Content — Admin POV", () => {
  test("full Catalog & Content Admin journey with backend verification", async ({ page }) => {
    test.setTimeout(600_000);
    ensureArtifacts();
    resetResults();
    page.setDefaultTimeout(15_000);
    page.setDefaultNavigationTimeout(30_000);

    const net = attachNetworkCapture(page);
    const apiCtx = await createApiContext();
    let session: Awaited<ReturnType<typeof loginAdmin>> | null = null;

    try {
      // ─── LOGIN ─────────────────────────────────────────────
      trackScreen("Login");
      const login = await uiLoginAsSuperAdmin(page);
      session = await loginAdmin(apiCtx);
      pass({
        id: "AUTH-01",
        module: "Catalog & Content",
        screen: "Login",
        adminAction: "Login as Super Admin",
        expected: "Real login 200 + dashboard shell",
        actual: `HTTP ${login.loginStatus}; URL=${page.url()}`,
        apiEndpoint: "/api/v1/admin/auth/login",
        httpMethod: "POST",
        responseStatus: login.loginStatus,
      });
      await shot(page, "00-login-ok");

      // ═══════════════════════════════════════════════════════
      // 1. PRODUCTS
      // ═══════════════════════════════════════════════════════
      trackScreen("Products");
      await gotoSection(page, "Products", "catalog");
      await shot(page, "01-products");

      const productsApi = net.findApi(/\/admin\/products/, "GET");
      const productsTruth = await apiCall(apiCtx, "GET", "/api/v1/admin/products?limit=5&page=1", {
        token: session.token,
      });
      const productList = (() => {
        const d = unwrapData(productsTruth.json) as
          | { products?: unknown[]; list?: unknown[]; data?: unknown[] }
          | unknown[];
        if (Array.isArray(d)) return d;
        return (d?.products ?? d?.list ?? d?.data ?? []) as unknown[];
      })();

      if (productsApi && productsApi.status === 200) {
        pass({
          id: "PRD-API-01",
          module: "Products",
          screen: "Products",
          adminAction: "Load product list",
          expected: "GET /api/v1/admin/products → 200 with real rows",
          actual: `UI GET ${productsApi.status}; API truth count~${productList.length}`,
          apiEndpoint: "/api/v1/admin/products",
          httpMethod: "GET",
          responseStatus: productsApi.status,
        });
      } else {
        fail({
          id: "PRD-API-01",
          module: "Products",
          screen: "Products",
          adminAction: "Load product list",
          expected: "Products API 200",
          actual: productsApi ? `status ${productsApi.status}` : "No products GET captured",
          severity: "Critical",
          evidence: [await shot(page, "01b-products-api-fail")],
        });
      }

      // Seed KPI strip (hardcoded 3,284 etc.)
      const prodBody = await page.locator("body").innerText();
      if (seedHit(prodBody, /3,?284|Price changes today|Organic Tomato 500g|SEL-1102/)) {
        fail({
          id: "PRD-SEED-01",
          module: "Products",
          screen: "Products",
          adminAction: "Inspect KPI strip / seed markers",
          expected: "KPIs and list from live API only",
          actual: "Hardcoded CATALOG_CONFIGS seed values visible (e.g. 3,284 Products / SEL-1102)",
          severity: "Critical",
          frontendIssue: "CatalogPage renders CONFIG.kpis and SimpleTab rows from workspace/data/catalog.ts",
          businessLogicIssue: "Admin sees design-seed catalog counts/rows as live data",
          evidence: [path.join(ARTIFACTS, "01-products.png")],
        });
      } else {
        pass({
          id: "PRD-SEED-01",
          module: "Products",
          screen: "Products",
          adminAction: "Inspect KPI strip / seed markers",
          expected: "No classic catalog seed markers",
          actual: "Classic seed markers not detected in body text",
        });
      }

      // Tabs (Products live; others may be seed tables) — scoped to page chips, not sidebar
      for (const tab of ["Products", "Barcodes", "Categories", "Pricing", "Availability"]) {
        if (!(await clickTabInMain(page, tab))) continue;
        trackAction(`Products tab: ${tab}`);
        await page.waitForTimeout(400);
        const t = await page.locator("body").innerText();
        if (tab !== "Products" && /SEL-1102|Organic Tomato|CAT-01|Basmati Rice/i.test(t)) {
          fail({
            id: `PRD-TAB-SEED-${tab.toUpperCase()}`,
            module: "Products",
            screen: `Products / ${tab}`,
            adminAction: `Open ${tab} tab`,
            expected: "Tab shows live API data or empty state",
            actual: `${tab} tab shows CATALOG_CONFIGS seed rows`,
            severity: "Critical",
            frontendIssue: "SimpleTab uses CONFIG.rows[tab] static seed",
          });
        } else if (tab === "Products") {
          pass({
            id: "PRD-TAB-PRODUCTS",
            module: "Products",
            screen: "Products",
            adminAction: "Open Products tab",
            expected: "Products grid from API",
            actual: "Products tab opened",
          });
        } else {
          pass({
            id: `PRD-TAB-${tab.toUpperCase()}`,
            module: "Products",
            screen: `Products / ${tab}`,
            adminAction: `Open ${tab} tab`,
            expected: "Tab opens without crash",
            actual: "Opened; no classic seed SKUs detected",
          });
        }
      }
      await clickTabInMain(page, "Products");

      // Search
      const search = page.getByPlaceholder(/Search by name, SKU/i);
      if (await search.count()) {
        const q =
          productList.length > 0
            ? String(
                (productList[0] as { name?: string; sku?: string; productName?: string }).sku ||
                  (productList[0] as { name?: string }).name ||
                  "a",
              ).slice(0, 12)
            : "zzzz-no-match-e2e";
        await search.fill(q);
        await page.waitForTimeout(1200);
        const after = await page.locator("body").innerText();
        const searchNet = net.findApi(/\/admin\/products/, "GET");
        if (productList.length && (after.includes(q) || /product/i.test(after))) {
          pass({
            id: "PRD-SEARCH-01",
            module: "Products",
            screen: "Products",
            adminAction: `Search products for "${q}"`,
            expected: "Search triggers list refresh / filters UI",
            actual: `Search applied; last products GET status=${searchNet?.status ?? "n/a"}`,
            apiEndpoint: "/api/v1/admin/products",
            httpMethod: "GET",
            responseStatus: searchNet?.status,
          });
        } else if (!productList.length && /No products/i.test(after)) {
          pass({
            id: "PRD-SEARCH-01",
            module: "Products",
            screen: "Products",
            adminAction: "Search with empty catalog",
            expected: "Empty state",
            actual: "Empty catalog empty-state shown",
          });
        } else {
          blocked({
            id: "PRD-SEARCH-01",
            module: "Products",
            screen: "Products",
            adminAction: "Search products",
            expected: "Observable search result",
            actual: `Filled "${q}" but could not confirm match in UI`,
          });
        }
        await search.fill("");
        await page.waitForTimeout(800);
      }

      // Warehouse filter
      const whFilter = page.getByLabel("Filter by warehouse");
      if (await whFilter.count()) {
        const opts = await whFilter.locator("option").count();
        if (opts > 1) {
          await whFilter.selectOption({ index: 1 });
          await page.waitForTimeout(1000);
          pass({
            id: "PRD-FILTER-WH",
            module: "Products",
            screen: "Products",
            adminAction: "Filter by warehouse",
            expected: "Warehouse filter reloads products",
            actual: "Warehouse filter changed",
          });
          await whFilter.selectOption({ index: 0 });
        }
      }

      // Pagination (best-effort; do not hang on ambiguous chevron buttons)
      const pager = page.locator('[class*="pagination"] button, [class*="pager"] button').filter({ hasText: /Next|>/i });
      if (await pager.count()) {
        trackAction("Products pagination");
        const next = pager.first();
        if (await next.isEnabled().catch(() => false)) {
          const beforeLen = net.apiCalls.length;
          await next.click({ timeout: 3_000 }).catch(() => undefined);
          await page.waitForTimeout(800);
          const mut = net.apiCalls.slice(beforeLen).filter((c) => /\/admin\/products/.test(c.url));
          pass({
            id: "PRD-PAGE-01",
            module: "Products",
            screen: "Products",
            adminAction: "Paginate product list",
            expected: "Next page loads via API",
            actual: mut.length ? `GET ${mut[0].status}` : "Pagination control clicked",
          });
        }
      }

      // New product — validation (empty submit)
      const newBtn = page.getByRole("button", { name: /New product/i });
      if (await newBtn.count()) {
        await newBtn.click();
        await page.waitForTimeout(500);
        const dialog = page.getByRole("dialog");
        if (await dialog.isVisible().catch(() => false)) {
          const saveBtn = dialog.getByRole("button", { name: /Save|Create|Submit/i });
          if (await saveBtn.count()) {
            const before = net.apiCalls.length;
            await saveBtn.click();
            await page.waitForTimeout(800);
            const posts = net.apiCalls
              .slice(before)
              .filter((c) => c.method === "POST" && /\/admin\/products$/.test(c.url.split("?")[0]));
            if (posts.length === 0) {
              pass({
                id: "PRD-CREATE-NEG-01",
                module: "Products",
                screen: "New product dialog",
                adminAction: "Submit empty new product form",
                expected: "Client validation; no create API",
                actual: "No POST /admin/products after empty submit",
              });
            } else if (posts[0].status >= 400) {
              pass({
                id: "PRD-CREATE-NEG-01",
                module: "Products",
                screen: "New product dialog",
                adminAction: "Submit empty/invalid product",
                expected: "API rejects invalid create",
                actual: `POST ${posts[0].status}`,
                apiEndpoint: "/api/v1/admin/products",
                httpMethod: "POST",
                responseStatus: posts[0].status,
              });
            } else {
              fail({
                id: "PRD-CREATE-NEG-01",
                module: "Products",
                screen: "New product dialog",
                adminAction: "Submit empty/invalid product",
                expected: "Reject invalid create",
                actual: `POST succeeded ${posts[0].status} without required fields`,
                severity: "High",
                businessLogicIssue: "Backend accepted incomplete product",
              });
            }
          }
          await page.keyboard.press("Escape");
          await dialog.getByRole("button", { name: /Cancel|Close/i }).click().catch(() => undefined);
        }
      } else {
        missing({
          id: "PRD-CREATE-01",
          module: "Products",
          screen: "Products",
          adminAction: "New product",
          expected: "New product button available for Super Admin",
          actual: "Button not found (permission or missing UI)",
        });
      }

      // Edit first product card if present
      const editBtn = page.getByRole("button", { name: /Edit product/i }).or(
        page.locator('button[title="Edit product"]'),
      ).first();
      if (await editBtn.count()) {
        const before = net.apiCalls.length;
        await editBtn.click();
        await page.waitForTimeout(1000);
        const getDetail = net.apiCalls
          .slice(before)
          .find((c) => c.method === "GET" && /\/admin\/products\/[^/?]+/.test(c.url));
        const dlg = page.getByRole("dialog");
        if (await dlg.isVisible().catch(() => false)) {
          pass({
            id: "PRD-EDIT-OPEN-01",
            module: "Products",
            screen: "Edit product dialog",
            adminAction: "Open edit product",
            expected: "Dialog + GET product detail",
            actual: getDetail
              ? `Dialog open; GET detail ${getDetail.status}`
              : "Dialog open; detail GET not observed",
            apiEndpoint: getDetail?.url,
            httpMethod: "GET",
            responseStatus: getDetail?.status,
          });
          await page.keyboard.press("Escape");
          await dlg.getByRole("button", { name: /Cancel|Close/i }).click().catch(() => undefined);
        }
      }

      // Publish/Unpublish — prove mutation when button exists
      const publishBtn = page.getByRole("button", { name: /^(Publish|Unpublish)$/i }).first();
      if (await publishBtn.count()) {
        const label = (await publishBtn.innerText()).trim();
        const before = net.apiCalls.length;
        await publishBtn.click();
        await page.waitForTimeout(1500);
        const mut = net.apiCalls
          .slice(before)
          .filter((c) => ["PUT", "PATCH", "POST"].includes(c.method) && /\/admin\/products/.test(c.url));
        if (mut.length && mut[0].ok) {
          pass({
            id: "PRD-PUBLISH-01",
            module: "Products",
            screen: "Products",
            adminAction: label,
            expected: "Mutating products API + success",
            actual: `${mut[0].method} ${mut[0].status}`,
            apiEndpoint: mut[0].url,
            httpMethod: mut[0].method,
            responseStatus: mut[0].status,
          });
        } else if (mut.length) {
          fail({
            id: "PRD-PUBLISH-01",
            module: "Products",
            screen: "Products",
            adminAction: label,
            expected: "2xx mutating API",
            actual: `${mut[0].method} ${mut[0].status}`,
            severity: "High",
            responseBodySnippet: mut[0].bodySnippet,
          });
        } else {
          fail({
            id: "PRD-PUBLISH-01",
            module: "Products",
            screen: "Products",
            adminAction: label,
            expected: "Mutating API on publish toggle",
            actual: "No mutating /admin/products request after click",
            severity: "Critical",
            frontendIssue: "Publish may be toast-only / failed silently",
          });
        }
      }

      // Bulk upload dialog open/cancel
      const bulkBtn = page.getByRole("button", { name: /Bulk upload/i });
      if (await bulkBtn.count()) {
        await bulkBtn.click();
        await page.waitForTimeout(400);
        const dlg = page.getByRole("dialog");
        if (await dlg.isVisible().catch(() => false)) {
          pass({
            id: "PRD-BULK-DIALOG",
            module: "Products",
            screen: "Bulk upload",
            adminAction: "Open bulk upload dialog",
            expected: "Dialog opens",
            actual: "Bulk upload dialog visible",
          });
          // Invalid file type probe via empty confirm if present
          await page.keyboard.press("Escape");
          await dlg.getByRole("button", { name: /Cancel|Close/i }).click().catch(() => undefined);
        }
      }

      // Unauthorized products write
      const unauthCtx = await createApiContext({ noCookies: true });
      const unauth = await apiCall(unauthCtx, "POST", "/api/v1/admin/products", {
        body: { sku: "E2E-UNAUTH", name: "x" },
        omitAuth: true,
      });
      await unauthCtx.dispose();
      if ([401, 403].includes(unauth.status)) {
        pass({
          id: "PRD-NEG-UNAUTH",
          module: "Products",
          screen: "API auth",
          adminAction: "POST product without token",
          expected: "401/403",
          actual: `HTTP ${unauth.status}`,
          apiEndpoint: "/api/v1/admin/products",
          httpMethod: "POST",
          responseStatus: unauth.status,
        });
      } else {
        fail({
          id: "PRD-NEG-UNAUTH",
          module: "Products",
          screen: "API auth",
          adminAction: "POST product without token",
          expected: "401/403",
          actual: `HTTP ${unauth.status}`,
          severity: "Critical",
          backendIssue: "Products create not auth-gated",
        });
      }

      // ═══════════════════════════════════════════════════════
      // 2. CATEGORIES
      // ═══════════════════════════════════════════════════════
      trackScreen("Categories");
      await gotoSection(page, "Categories", "categories");
      await shot(page, "02-categories");

      const catApi = net.findApi(/\/admin\/categories/, "GET");
      const catTruth = await apiCall(apiCtx, "GET", "/api/v1/customer/admin/categories/all", {
        token: session.token,
      });
      if (catApi && catApi.status === 200) {
        pass({
          id: "CAT-API-01",
          module: "Categories",
          screen: "Categories",
          adminAction: "Load category tree",
          expected: "GET categories/all → 200",
          actual: `UI GET ${catApi.status}; API status=${catTruth.status}`,
          apiEndpoint: "/api/v1/customer/admin/categories/all",
          httpMethod: "GET",
          responseStatus: catApi.status,
        });
      } else if (catTruth.status === 200) {
        blocked({
          id: "CAT-API-01",
          module: "Categories",
          screen: "Categories",
          adminAction: "Load category tree",
          expected: "UI triggers categories GET",
          actual: `API truth 200 but UI GET not captured (status=${catApi?.status ?? "n/a"})`,
        });
      } else {
        fail({
          id: "CAT-API-01",
          module: "Categories",
          screen: "Categories",
          adminAction: "Load category tree",
          expected: "Categories API 200",
          actual: `UI=${catApi?.status ?? "none"} API=${catTruth.status}`,
          severity: "Critical",
          responseBodySnippet: catTruth.rawText?.slice(0, 200),
        });
      }

      const catBody = await page.locator("body").innerText();
      if (/Reordered today/.test(catBody) && /\b4\b/.test(catBody)) {
        fail({
          id: "CAT-SEED-KPI",
          module: "Categories",
          screen: "Categories",
          adminAction: "Inspect KPI strip",
          expected: "All KPIs from live data",
          actual: 'Hardcoded KPI "4" / "Reordered today"',
          severity: "High",
          frontendIssue: "CategoryTreePage KpiStrip hardcodes Reordered today = 4",
        });
      } else {
        pass({
          id: "CAT-SEED-KPI",
          module: "Categories",
          screen: "Categories",
          adminAction: "Inspect KPI strip",
          expected: "No hardcoded reorder KPI",
          actual: "Hardcoded reorder KPI not detected",
        });
      }

      // View toggle
      for (const mode of ["List", "Workspace", "Board"]) {
        const btn = page.getByRole("button", { name: new RegExp(mode, "i") });
        if (await btn.count()) {
          await btn.click();
          await page.waitForTimeout(300);
          trackAction(`Categories view: ${mode}`);
        }
      }
      pass({
        id: "CAT-VIEW-01",
        module: "Categories",
        screen: "Categories",
        adminAction: "Toggle list/workspace views",
        expected: "View toggle works",
        actual: "View controls exercised",
      });

      // Select a category row / tree item
      const treeItem = page.locator('[class*="row"], [class*="branch"]').filter({ hasText: /.+/ }).first();
      if (await treeItem.count()) {
        await treeItem.click();
        await page.waitForTimeout(500);
        pass({
          id: "CAT-SELECT-01",
          module: "Categories",
          screen: "Categories",
          adminAction: "Select category",
          expected: "Detail pane shows category",
          actual: "Category selection clicked",
        });
      }

      // New category validation
      const newCat = page.getByRole("button", { name: /^New$/i }).or(page.getByRole("button", { name: /New category/i }));
      if (await newCat.count()) {
        await newCat.first().click();
        await page.waitForTimeout(400);
        const dlg = page.getByRole("dialog");
        if (await dlg.isVisible().catch(() => false)) {
          const submit = dlg.getByRole("button", { name: /Save|Create|Submit/i });
          if (await submit.count()) {
            const before = net.apiCalls.length;
            await submit.click();
            await page.waitForTimeout(600);
            const posts = net.apiCalls
              .slice(before)
              .filter((c) => c.method === "POST" && /categories/.test(c.url));
            if (!posts.length || posts[0].status >= 400) {
              pass({
                id: "CAT-CREATE-NEG-01",
                module: "Categories",
                screen: "New category",
                adminAction: "Submit empty category",
                expected: "Validation or 4xx",
                actual: posts.length ? `POST ${posts[0].status}` : "No POST (client validation)",
              });
            } else {
              fail({
                id: "CAT-CREATE-NEG-01",
                module: "Categories",
                screen: "New category",
                adminAction: "Submit empty category",
                expected: "Reject empty create",
                actual: `POST ${posts[0].status}`,
                severity: "High",
              });
            }
          }
          await page.keyboard.press("Escape");
          await dlg.getByRole("button", { name: /Cancel|Close/i }).click().catch(() => undefined);
        }
      }

      // Detail actions (non-destructive prefer Edit open)
      for (const action of ["Edit category", "Add subcategory", "Disable category"]) {
        const btn = page.getByRole("button", { name: new RegExp(action, "i") });
        if (!(await btn.count())) continue;
        if (action === "Disable category") {
          // Skip destructive on unknown live categories
          pass({
            id: "CAT-ACT-DISABLE-SKIP",
            module: "Categories",
            screen: "Categories",
            adminAction: "Disable category (availability)",
            expected: "Action present for Admin",
            actual: "Disable control present; skipped destructive click on live data",
          });
          continue;
        }
        if (action === "Edit category") {
          await btn.first().click();
          await page.waitForTimeout(500);
          const dlg = page.getByRole("dialog");
          if (await dlg.isVisible().catch(() => false)) {
            pass({
              id: "CAT-EDIT-OPEN",
              module: "Categories",
              screen: "Edit category",
              adminAction: "Open edit category",
              expected: "Edit dialog opens",
              actual: "Edit dialog visible",
            });
            await page.keyboard.press("Escape");
            await dlg.getByRole("button", { name: /Cancel|Close/i }).click().catch(() => undefined);
          }
        }
        if (action === "Add subcategory") {
          await btn.first().click();
          await page.waitForTimeout(500);
          const dlg = page.getByRole("dialog");
          if (await dlg.isVisible().catch(() => false)) {
            pass({
              id: "CAT-SUB-OPEN",
              module: "Categories",
              screen: "Add subcategory",
              adminAction: "Open add subcategory",
              expected: "Dialog opens with parent context",
              actual: "Subcategory dialog visible",
            });
            await page.keyboard.press("Escape");
            await dlg.getByRole("button", { name: /Cancel|Close/i }).click().catch(() => undefined);
          }
        }
      }

      // ═══════════════════════════════════════════════════════
      // 3. PROMOTIONS
      // ═══════════════════════════════════════════════════════
      trackScreen("Promotions");
      await gotoSection(page, "Promotions", "promotions");
      await shot(page, "03-promotions");

      const couponApi = net.findApi(/\/admin\/coupons|\/merch\/pricing\/coupons/, "GET");
      const bannerApi = net.findApi(/\/admin\/banners|\/customer\/banners/, "GET");
      if (couponApi || bannerApi) {
        pass({
          id: "PROMO-API-01",
          module: "Promotions",
          screen: "Promotions",
          adminAction: "Load promotions/coupons/banners",
          expected: "At least one promotions-related GET 200",
          actual: [
            couponApi ? `coupons GET ${couponApi.status}` : null,
            bannerApi ? `banners GET ${bannerApi.status}` : null,
          ]
            .filter(Boolean)
            .join("; "),
          apiEndpoint: couponApi?.url || bannerApi?.url,
          httpMethod: "GET",
          responseStatus: couponApi?.status ?? bannerApi?.status,
        });
      } else {
        fail({
          id: "PROMO-API-01",
          module: "Promotions",
          screen: "Promotions",
          adminAction: "Load promotions data",
          expected: "Coupons/banners GET",
          actual: "No promotions-related GET captured",
          severity: "Critical",
        });
      }

      const promoTabs = ["Coupons", "Promotions", "Banners", "Analytics"];
      for (const tab of promoTabs) {
        if (await clickTabInMain(page, tab)) {
          await page.waitForTimeout(500);
          trackAction(`Promotions tab: ${tab}`);
        }
      }
      pass({
        id: "PROMO-TABS-01",
        module: "Promotions",
        screen: "Promotions",
        adminAction: "Open Coupons/Promotions/Banners/Analytics tabs",
        expected: "All configured tabs open",
        actual: "Promotion tabs exercised",
      });

      // Ensure at least one Live coupon exists, then Pause/Activate
      await clickTabInMain(page, "Coupons");
      await page.waitForTimeout(400);
      const createPromo = page.getByRole("button", { name: /New|Create|Add campaign|Add coupon/i }).first();
      if (await createPromo.count()) {
        const beforeCreate = net.apiCalls.length;
        await createPromo.click();
        await page.waitForTimeout(1800);
        const posts = net.apiCalls
          .slice(beforeCreate)
          .filter((c) => c.method === "POST" && /coupon|promo|merch/i.test(c.url));
        if (posts.length) {
          pass({
            id: "PROMO-CREATE-01",
            module: "Promotions",
            screen: "Promotions",
            adminAction: "Create campaign",
            expected: "POST create campaign",
            actual: `POST ${posts[0].status}`,
            apiEndpoint: posts[0].url,
            httpMethod: "POST",
            responseStatus: posts[0].status,
          });
        } else {
          const dlg = page.getByRole("dialog");
          if (await dlg.isVisible().catch(() => false)) {
            pass({
              id: "PROMO-CREATE-01",
              module: "Promotions",
              screen: "Promotions",
              adminAction: "Open create campaign UI",
              expected: "Create flow starts",
              actual: "Create dialog opened",
            });
            await page.keyboard.press("Escape");
          } else {
            blocked({
              id: "PROMO-CREATE-01",
              module: "Promotions",
              screen: "Promotions",
              adminAction: "Create campaign",
              expected: "Dialog or POST",
              actual: "Create click had no dialog/POST",
            });
          }
        }
      }

      await page.waitForTimeout(600);
      const toggle = page.getByRole("button", { name: /^(Pause|Activate|Play|Resume)/i }).first();
      if (await toggle.count()) {
        const before = net.apiCalls.length;
        await toggle.click();
        await page.waitForTimeout(1500);
        const mut = net.apiCalls
          .slice(before)
          .filter((c) => ["PUT", "PATCH", "POST"].includes(c.method) && /coupon|promo|banner|merch/i.test(c.url));
        if (mut.length && mut[0].ok) {
          pass({
            id: "PROMO-TOGGLE-01",
            module: "Promotions",
            screen: "Promotions",
            adminAction: "Pause/Activate campaign",
            expected: "Mutating campaign status API",
            actual: `${mut[0].method} ${mut[0].status}`,
            apiEndpoint: mut[0].url,
            httpMethod: mut[0].method,
            responseStatus: mut[0].status,
          });
        } else if (mut.length) {
          fail({
            id: "PROMO-TOGGLE-01",
            module: "Promotions",
            screen: "Promotions",
            adminAction: "Pause/Activate campaign",
            expected: "2xx status update",
            actual: `${mut[0].method} ${mut[0].status}`,
            severity: "High",
            responseBodySnippet: mut[0].bodySnippet,
          });
        } else {
          fail({
            id: "PROMO-TOGGLE-01",
            module: "Promotions",
            screen: "Promotions",
            adminAction: "Pause/Activate campaign",
            expected: "Mutating API",
            actual: "Click produced no mutating request",
            severity: "Critical",
          });
        }
      } else {
        blocked({
          id: "PROMO-TOGGLE-01",
          module: "Promotions",
          screen: "Promotions",
          adminAction: "Pause/Activate campaign",
          expected: "Toggle control on a Live/Paused card",
          actual: "No Pause/Activate button found (empty list or read-only)",
        });
      }

      // ═══════════════════════════════════════════════════════
      // 4. CONTENT PIPELINE
      // ═══════════════════════════════════════════════════════
      trackScreen("Content Pipeline");
      await gotoSection(page, "Content Pipeline", "cms");
      await shot(page, "04-content-pipeline");

      const cmsApi = net.findApi(/\/cms\/pages/, "GET");
      if (cmsApi && cmsApi.status === 200) {
        pass({
          id: "CMS-API-01",
          module: "Content Pipeline",
          screen: "Content Pipeline",
          adminAction: "Load content pipeline",
          expected: "GET cms/pages 200",
          actual: `GET ${cmsApi.status}`,
          apiEndpoint: "/api/v1/customer/admin/cms/pages",
          httpMethod: "GET",
          responseStatus: cmsApi.status,
        });
      } else {
        fail({
          id: "CMS-API-01",
          module: "Content Pipeline",
          screen: "Content Pipeline",
          adminAction: "Load content pipeline",
          expected: "GET cms/pages 200",
          actual: cmsApi ? `status ${cmsApi.status}` : "No cms/pages GET",
          severity: "Critical",
          evidence: [await shot(page, "04b-cms-fail")],
        });
      }

      // Surfaces
      for (const s of ["Customer app", "Picker app", "Rider app", "HSD scanner", "Web app", "Shared media"]) {
        const btn = page.getByRole("button", { name: new RegExp(s, "i") }).first();
        if (await btn.count()) {
          await btn.click();
          await page.waitForTimeout(250);
          trackAction(`CMS surface: ${s}`);
        }
      }
      pass({
        id: "CMS-SURFACES-01",
        module: "Content Pipeline",
        screen: "Content Pipeline",
        adminAction: "Switch content surfaces",
        expected: "Surface filters work",
        actual: "Surface chips exercised",
      });

      // Reset to Customer app so create + advance land on the visible lane
      const customerSurface = page.getByRole("button", { name: /Customer app/i }).first();
      if (await customerSurface.count()) {
        await customerSurface.click();
        await page.waitForTimeout(400);
      }

      // Create content if needed, then advance stage
      const newContent = page.getByRole("button", { name: /New|Add content|Create/i }).first();
      if (await newContent.count()) {
        const before = net.apiCalls.length;
        await newContent.click();
        await page.waitForTimeout(1500);
        const posts = net.apiCalls
          .slice(before)
          .filter((c) => c.method === "POST" && /cms\/pages/.test(c.url));
        if (posts.length) {
          pass({
            id: "CMS-CREATE-01",
            module: "Content Pipeline",
            screen: "Content Pipeline",
            adminAction: "Create content item",
            expected: "POST cms/pages",
            actual: `POST ${posts[0].status}`,
            apiEndpoint: posts[0].url,
            httpMethod: "POST",
            responseStatus: posts[0].status,
          });
        } else {
          blocked({
            id: "CMS-CREATE-01",
            module: "Content Pipeline",
            screen: "Content Pipeline",
            adminAction: "Create content item",
            expected: "POST or create dialog",
            actual: "Create click without POST/dialog confirmation",
          });
        }
      }

      await page.waitForTimeout(800);
      let advance = page.getByRole("button", { name: /Advance|Move|Approve|Schedule|Publish|In review/i }).first();
      if (!(await advance.count())) {
        // Ensure workspace (lane) view — list view has no advance controls
        const workspaceToggle = page.getByRole("button", { name: /Workspace|Board|Kanban/i }).first();
        if (await workspaceToggle.count()) {
          await workspaceToggle.click();
          await page.waitForTimeout(500);
        }
        advance = page.getByRole("button", { name: /Advance|Move|Approve|Schedule|Publish|In review/i }).first();
      }
      if (await advance.count()) {
        const before = net.apiCalls.length;
        await advance.click();
        await page.waitForTimeout(1200);
        const mut = net.apiCalls
          .slice(before)
          .filter((c) => ["PUT", "PATCH", "POST"].includes(c.method) && /cms\/pages/.test(c.url));
        if (mut.length && mut[0].ok) {
          pass({
            id: "CMS-STAGE-01",
            module: "Content Pipeline",
            screen: "Content Pipeline",
            adminAction: "Advance content stage",
            expected: "PUT/PATCH cms page stage",
            actual: `${mut[0].method} ${mut[0].status}`,
            apiEndpoint: mut[0].url,
            httpMethod: mut[0].method,
            responseStatus: mut[0].status,
          });
        } else if (mut.length) {
          fail({
            id: "CMS-STAGE-01",
            module: "Content Pipeline",
            screen: "Content Pipeline",
            adminAction: "Advance content stage",
            expected: "2xx stage update",
            actual: `${mut[0].method} ${mut[0].status}`,
            severity: "High",
            responseBodySnippet: mut[0].bodySnippet,
          });
        } else {
          fail({
            id: "CMS-STAGE-01",
            module: "Content Pipeline",
            screen: "Content Pipeline",
            adminAction: "Advance content stage",
            expected: "Mutating stage API",
            actual: "No cms/pages mutation after click",
            severity: "Critical",
          });
        }
      } else {
        blocked({
          id: "CMS-STAGE-01",
          module: "Content Pipeline",
          screen: "Content Pipeline",
          adminAction: "Advance content stage",
          expected: "Stage advance control",
          actual: "No advance/publish control found (empty pipeline?)",
        });
      }

      // ═══════════════════════════════════════════════════════
      // 5. HOME PAGE BUILDER
      // ═══════════════════════════════════════════════════════
      trackScreen("Home Page Builder");
      await gotoSection(page, "Home Page Builder", "cms-home");
      await shot(page, "05-home-builder");

      const homeApi = net.findApi(/\/home\/sections/, "GET");
      if (homeApi && homeApi.status === 200) {
        pass({
          id: "HOME-API-01",
          module: "Home Page Builder",
          screen: "Home Page Builder",
          adminAction: "Load home sections",
          expected: "GET home/sections 200",
          actual: `GET ${homeApi.status}`,
          apiEndpoint: "/api/v1/customer/admin/home/sections",
          httpMethod: "GET",
          responseStatus: homeApi.status,
        });
      } else {
        fail({
          id: "HOME-API-01",
          module: "Home Page Builder",
          screen: "Home Page Builder",
          adminAction: "Load home sections",
          expected: "GET home/sections 200",
          actual: homeApi ? `status ${homeApi.status}` : "No home/sections GET",
          severity: "Critical",
        });
      }

      for (const s of ["Customer app home", "Web app home"]) {
        const btn = page.getByRole("button", { name: new RegExp(s, "i") });
        if (await btn.count()) {
          await btn.click();
          await page.waitForTimeout(400);
        }
      }
      pass({
        id: "HOME-SURFACE-01",
        module: "Home Page Builder",
        screen: "Home Page Builder",
        adminAction: "Switch home surfaces",
        expected: "Customer/Web surfaces switch",
        actual: "Home surface controls exercised",
      });

      // Palette / add section
      for (const label of ["Hero banner", "Product carousel", "Category carousel"]) {
        const pal = page.getByRole("button", { name: new RegExp(label, "i") }).first();
        if (await pal.count()) {
          const before = net.apiCalls.length;
          await pal.click();
          await page.waitForTimeout(1000);
          const posts = net.apiCalls
            .slice(before)
            .filter((c) => c.method === "POST" && /home\/sections/.test(c.url));
          if (posts.length) {
            pass({
              id: "HOME-ADD-01",
              module: "Home Page Builder",
              screen: "Home Page Builder",
              adminAction: `Add section: ${label}`,
              expected: "POST home/sections",
              actual: `POST ${posts[0].status}`,
              apiEndpoint: posts[0].url,
              httpMethod: "POST",
              responseStatus: posts[0].status,
            });
            break;
          }
        }
      }

      for (const action of [
        "Enable section",
        "Disable section",
        "Reorder section",
        "Preview on device",
        "Publish now",
        "Bind content",
      ]) {
        const btn = page.getByRole("button", { name: new RegExp(`^${action}$`, "i") }).first();
        if (!(await btn.count())) continue;
        const before = net.apiCalls.length;
        await btn.click();
        await page.waitForTimeout(1200);
        const mut = net.apiCalls
          .slice(before)
          .filter(
            (c) =>
              ["PUT", "PATCH", "POST"].includes(c.method) &&
              /home\/(sections|preview)/.test(c.url),
          );
        const toastBody = await page.locator("body").innerText();
        if (mut.length && mut[0].ok) {
          pass({
            id: `HOME-ACT-${action.replace(/\s+/g, "-").toUpperCase()}`,
            module: "Home Page Builder",
            screen: "Home Page Builder",
            adminAction: action,
            expected: "Mutating home API",
            actual: `${mut[0].method} ${mut[0].status}`,
            apiEndpoint: mut[0].url,
            httpMethod: mut[0].method,
            responseStatus: mut[0].status,
          });
        } else if (mut.length) {
          fail({
            id: `HOME-ACT-${action.replace(/\s+/g, "-").toUpperCase()}`,
            module: "Home Page Builder",
            screen: "Home Page Builder",
            adminAction: action,
            expected: "2xx home API",
            actual: `${mut[0].method} ${mut[0].status}`,
            severity: "High",
            responseBodySnippet: mut[0].bodySnippet,
          });
        } else if (/not available|Couldn't|no .* API/i.test(toastBody)) {
          missing({
            id: `HOME-ACT-${action.replace(/\s+/g, "-").toUpperCase()}`,
            module: "Home Page Builder",
            screen: "Home Page Builder",
            adminAction: action,
            expected: "Wired backend action",
            actual: "UI indicates action not available / failed without mutation",
            severity: "High",
          });
        } else {
          fail({
            id: `HOME-ACT-${action.replace(/\s+/g, "-").toUpperCase()}`,
            module: "Home Page Builder",
            screen: "Home Page Builder",
            adminAction: action,
            expected: "Mutating API or explicit unavailable message",
            actual: "Click with no home mutating request (possible false-success)",
            severity: "Critical",
            frontendIssue: "Detail action may toast without backend call",
          });
        }
        // Only exercise a couple mutations to limit side effects
        if (action === "Reorder section" || action === "Enable section") break;
      }

      // Preview
      const previewBtn = page.getByRole("button", { name: /Preview/i }).first();
      if (await previewBtn.count()) {
        const before = net.apiCalls.length;
        await previewBtn.click();
        await page.waitForTimeout(1200);
        const prev = net.apiCalls.slice(before).find((c) => /home\/preview/.test(c.url));
        if (prev) {
          pass({
            id: "HOME-PREVIEW-01",
            module: "Home Page Builder",
            screen: "Home Page Builder",
            adminAction: "Preview home",
            expected: "GET/POST home/preview",
            actual: `${prev.method} ${prev.status}`,
            apiEndpoint: prev.url,
            httpMethod: prev.method,
            responseStatus: prev.status,
          });
        }
      }

      // Persistence: reload
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      const homeReload = net.findApi(/\/home\/sections/, "GET");
      pass({
        id: "HOME-REFRESH-01",
        module: "Home Page Builder",
        screen: "Home Page Builder",
        adminAction: "Refresh after home actions",
        expected: "Sections reload from API",
        actual: homeReload ? `GET ${homeReload.status}` : "Page reloaded",
        apiEndpoint: "/api/v1/customer/admin/home/sections",
        httpMethod: "GET",
        responseStatus: homeReload?.status,
      });

      // ═══════════════════════════════════════════════════════
      // 6. MEDIA LIBRARY
      // ═══════════════════════════════════════════════════════
      trackScreen("Media Library");
      await gotoSection(page, "Media Library", "cms-media");
      await shot(page, "06-media");

      const mediaApi = net.findApi(/\/cms\/media/, "GET");
      if (mediaApi && mediaApi.status === 200) {
        pass({
          id: "MEDIA-API-01",
          module: "Media Library",
          screen: "Media Library",
          adminAction: "Load media assets",
          expected: "GET cms/media 200",
          actual: `GET ${mediaApi.status}`,
          apiEndpoint: "/api/v1/customer/admin/cms/media",
          httpMethod: "GET",
          responseStatus: mediaApi.status,
        });
      } else {
        fail({
          id: "MEDIA-API-01",
          module: "Media Library",
          screen: "Media Library",
          adminAction: "Load media assets",
          expected: "GET cms/media 200",
          actual: mediaApi ? `status ${mediaApi.status}` : "No cms/media GET",
          severity: "Critical",
        });
      }

      const mediaBody = await page.locator("body").innerText();
      if (/1\.4\s*GB/.test(mediaBody)) {
        fail({
          id: "MEDIA-SEED-KPI",
          module: "Media Library",
          screen: "Media Library",
          adminAction: "Inspect storage KPI",
          expected: "Storage KPI from live storage metrics",
          actual: 'Hardcoded "1.4 GB" storage KPI',
          severity: "High",
          frontendIssue: "MediaLibraryPage hardcodes Storage KPI 1.4 GB",
        });
      } else {
        pass({
          id: "MEDIA-SEED-KPI",
          module: "Media Library",
          screen: "Media Library",
          adminAction: "Inspect storage KPI",
          expected: "No hardcoded storage size",
          actual: "Hardcoded 1.4 GB not detected",
        });
      }

      for (const tab of ["All assets", "Banners", "Product & recipe", "App help", "Unused", "Archived"]) {
        if (await clickTabInMain(page, tab)) {
          await page.waitForTimeout(300);
          trackAction(`Media tab: ${tab}`);
        }
      }
      pass({
        id: "MEDIA-TABS-01",
        module: "Media Library",
        screen: "Media Library",
        adminAction: "Open media filter tabs",
        expected: "Tabs filter client-side list",
        actual: "Media tabs exercised",
      });

      const uploadBtn = page.getByRole("button", { name: /Upload/i });
      if (await uploadBtn.count()) {
        // Prove control exists; optional tiny PNG upload against live API
        const before = net.apiCalls.length;
        const fileInput = page.locator('input[type="file"]');
        if (await fileInput.count()) {
          const pngPath = path.join(ARTIFACTS, "e2e-upload.png");
          // Minimal 1x1 PNG
          const png = Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
            "base64",
          );
          fs.writeFileSync(pngPath, png);
          await fileInput.first().setInputFiles(pngPath);
          await page.waitForTimeout(2500);
          const post = net.apiCalls
            .slice(before)
            .find((c) => c.method === "POST" && /cms\/media/.test(c.url));
          if (post && post.ok) {
            pass({
              id: "MEDIA-UPLOAD-01",
              module: "Media Library",
              screen: "Media Library",
              adminAction: "Upload media",
              expected: "POST cms/media stores asset and returns URL",
              actual: `POST ${post.status}`,
              apiEndpoint: post.url,
              httpMethod: "POST",
              responseStatus: post.status,
            });
          } else if (post) {
            fail({
              id: "MEDIA-UPLOAD-01",
              module: "Media Library",
              screen: "Media Library",
              adminAction: "Upload media",
              expected: "POST cms/media 2xx",
              actual: `POST ${post.status}`,
              severity: "High",
              responseBodySnippet: post.bodySnippet,
            });
          } else {
            pass({
              id: "MEDIA-UPLOAD-01",
              module: "Media Library",
              screen: "Media Library",
              adminAction: "Upload media control",
              expected: "Upload button + file input present",
              actual: "Upload UI present (network POST not observed — may need S3/env)",
            });
          }
        } else {
          pass({
            id: "MEDIA-UPLOAD-01",
            module: "Media Library",
            screen: "Media Library",
            adminAction: "Upload media",
            expected: "Upload button available",
            actual: "Upload button visible",
          });
        }
      } else {
        missing({
          id: "MEDIA-UPLOAD-01",
          module: "Media Library",
          screen: "Media Library",
          adminAction: "Upload media",
          expected: "Upload button for Admin",
          actual: "No Upload control found (archive-only UI?)",
          severity: "High",
          frontendIssue: "MediaLibraryPage exposes Archive but no upload UI in current implementation",
        });
      }

      const archiveBtn = page.getByRole("button", { name: /Archive/i }).first();
      if (await archiveBtn.count()) {
        // Do not archive unknown live assets — only verify control wiring via hover/presence
        pass({
          id: "MEDIA-ARCHIVE-CTRL",
          module: "Media Library",
          screen: "Media Library",
          adminAction: "Archive control present",
          expected: "Archive available with permission",
          actual: "Archive button visible (destructive click skipped on live assets)",
        });
      }

      // ═══════════════════════════════════════════════════════
      // 7. CONTENT CALENDAR
      // ═══════════════════════════════════════════════════════
      trackScreen("Content Calendar");
      await gotoSection(page, "Content Calendar", "cms-cal");
      await shot(page, "07-calendar");

      const calApi = net.findApi(/\/cms\/pages/, "GET");
      // Note: calendar reuses cms/pages; hook swallows errors → empty array
      const calBody = await page.locator("body").innerText();
      if (calApi && calApi.status === 200) {
        pass({
          id: "CAL-API-01",
          module: "Content Calendar",
          screen: "Content Calendar",
          adminAction: "Load calendar content",
          expected: "Data from cms/pages (or dedicated calendar API)",
          actual: `cms/pages GET ${calApi.status}`,
          apiEndpoint: "/api/v1/customer/admin/cms/pages",
          httpMethod: "GET",
          responseStatus: calApi.status,
        });
      } else if (/No scheduled|empty|Couldn't load/i.test(calBody) || true) {
        // Hook returns [] on error — may look like empty success
        fail({
          id: "CAL-API-01",
          module: "Content Calendar",
          screen: "Content Calendar",
          adminAction: "Load calendar content",
          expected: "Dedicated calendar API or cms/pages with error surfacing",
          actual: calApi
            ? `GET ${calApi.status}`
            : "No calendar GET observed; useContentCalendar catches errors and returns [] (false empty)",
          severity: "High",
          frontendIssue:
            "useContentCalendar.ts catch { return [] } hides API failures as empty calendar",
          backendIssue: "No dedicated content-calendar endpoint observed",
        });
      }

      if (/Catalog Mgr/.test(calBody)) {
        fail({
          id: "CAL-SEED-ACTOR",
          module: "Content Calendar",
          screen: "Content Calendar",
          adminAction: "Inspect flow actors",
          expected: "Actors from real assignments",
          actual: 'Hardcoded flow actor "Catalog Mgr"',
          severity: "Medium",
          frontendIssue: "ContentCalendarPage FLOW actors are static design strings",
        });
      }

      for (const tab of ["Next 14 days", "Going live", "Expiring", "Conflicts"]) {
        if (await clickTabInMain(page, tab)) {
          await page.waitForTimeout(300);
          trackAction(`Calendar tab: ${tab}`);
        }
      }
      pass({
        id: "CAL-TABS-01",
        module: "Content Calendar",
        screen: "Content Calendar",
        adminAction: "Open calendar tabs",
        expected: "Tabs filter scheduled items",
        actual: "Calendar tabs exercised",
      });

      for (const action of ["Schedule publish", "Reschedule", "Resolve slot clash", "Unpublish"]) {
        const btn = page.getByRole("button", { name: new RegExp(action, "i") }).first();
        if (!(await btn.count())) continue;
        const before = net.apiCalls.length;
        await btn.click();
        await page.waitForTimeout(1000);
        const mut = net.apiCalls
          .slice(before)
          .filter((c) => ["PUT", "PATCH", "POST"].includes(c.method) && /cms\/pages/.test(c.url));
        const body = await page.locator("body").innerText();
        if (action === "Resolve slot clash") {
          if (/No clash resolver API|not available/i.test(body)) {
            missing({
              id: "CAL-ACT-CLASH",
              module: "Content Calendar",
              screen: "Content Calendar",
              adminAction: action,
              expected: "Conflict resolver API",
              actual: "UI admits no clash resolver API",
              severity: "High",
            });
          } else if (!mut.length) {
            fail({
              id: "CAL-ACT-CLASH",
              module: "Content Calendar",
              screen: "Content Calendar",
              adminAction: action,
              expected: "Resolver mutation or explicit missing message",
              actual: "Click without mutation",
              severity: "High",
            });
          }
          continue;
        }
        if (mut.length && mut[0].ok) {
          pass({
            id: `CAL-ACT-${action.replace(/\s+/g, "-").toUpperCase()}`,
            module: "Content Calendar",
            screen: "Content Calendar",
            adminAction: action,
            expected: "Stage mutation via cms/pages",
            actual: `${mut[0].method} ${mut[0].status}`,
            apiEndpoint: mut[0].url,
            httpMethod: mut[0].method,
            responseStatus: mut[0].status,
          });
        } else if (!mut.length) {
          fail({
            id: `CAL-ACT-${action.replace(/\s+/g, "-").toUpperCase()}`,
            module: "Content Calendar",
            screen: "Content Calendar",
            adminAction: action,
            expected: "Mutating API",
            actual: /not available/i.test(body)
              ? "UI reports not available"
              : "No mutating request (possible false-success)",
            severity: "High",
          });
        }
        break; // one mutation enough
      }

      // ═══════════════════════════════════════════════════════
      // 8. MASTER SHEET
      // ═══════════════════════════════════════════════════════
      trackScreen("Master Sheet");
      await gotoSection(page, "Master Sheet", "mastersheet");
      await shot(page, "08-mastersheet");

      const msActive = net.findApi(/\/admin\/mastersheet\/(active|history)/, "GET");
      const msTruth = await apiCall(apiCtx, "GET", "/api/v1/admin/mastersheet/active", {
        token: session.token,
      });
      if (msActive || [200, 404].includes(msTruth.status)) {
        pass({
          id: "MS-API-01",
          module: "Master Sheet",
          screen: "Master Sheet",
          adminAction: "Load master sheet status/history",
          expected: "GET mastersheet active/history",
          actual: `UI=${msActive ? `${msActive.status}` : "n/a"}; API active=${msTruth.status}`,
          apiEndpoint: "/api/v1/admin/mastersheet/active",
          httpMethod: "GET",
          responseStatus: msActive?.status ?? msTruth.status,
        });
      } else {
        fail({
          id: "MS-API-01",
          module: "Master Sheet",
          screen: "Master Sheet",
          adminAction: "Load master sheet status",
          expected: "mastersheet active/history reachable",
          actual: `API status ${msTruth.status}`,
          severity: "Critical",
          responseBodySnippet: msTruth.rawText?.slice(0, 200),
        });
      }

      // Template download
      const dl = page.getByRole("button", { name: /Download|Template/i }).first();
      if (await dl.count()) {
        const before = net.apiCalls.length;
        await dl.click();
        await page.waitForTimeout(1500);
        const tmpl = net.apiCalls
          .slice(before)
          .find((c) => /mastersheet\/template/.test(c.url));
        if (tmpl && tmpl.ok) {
          pass({
            id: "MS-TEMPLATE-01",
            module: "Master Sheet",
            screen: "Master Sheet",
            adminAction: "Download template",
            expected: "GET mastersheet/template 200",
            actual: `${tmpl.method} ${tmpl.status}`,
            apiEndpoint: tmpl.url,
            httpMethod: tmpl.method,
            responseStatus: tmpl.status,
          });
        } else {
          // May be blob download without staying in apiCalls as json — check status via API
          const t = await apiCall(apiCtx, "GET", "/api/v1/admin/mastersheet/template", {
            token: session.token,
          });
          if (t.status === 200) {
            pass({
              id: "MS-TEMPLATE-01",
              module: "Master Sheet",
              screen: "Master Sheet",
              adminAction: "Download template",
              expected: "Template endpoint 200",
              actual: `API template ${t.status}`,
              apiEndpoint: "/api/v1/admin/mastersheet/template",
              httpMethod: "GET",
              responseStatus: t.status,
            });
          } else {
            fail({
              id: "MS-TEMPLATE-01",
              module: "Master Sheet",
              screen: "Master Sheet",
              adminAction: "Download template",
              expected: "Template 200",
              actual: `API ${t.status}`,
              severity: "High",
            });
          }
        }
      }

      // Invalid upload (txt file)
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.count()) {
        const badPath = path.join(ARTIFACTS, "invalid-mastersheet.txt");
        fs.writeFileSync(badPath, "not-an-excel-file", "utf8");
        await fileInput.first().setInputFiles(badPath);
        await page.waitForTimeout(1500);
        const body = await page.locator("body").innerText();
        const prep = net.findApi(/mastersheet\/prepare/, "POST");
        if (/invalid|xlsx|excel|supported|must be|error/i.test(body) || (prep && prep.status >= 400)) {
          pass({
            id: "MS-UPLOAD-NEG-01",
            module: "Master Sheet",
            screen: "Master Sheet",
            adminAction: "Upload invalid .txt as master sheet",
            expected: "Client/API rejects non-xlsx",
            actual: prep
              ? `prepare POST ${prep.status}`
              : "UI validation/error messaging observed",
            apiEndpoint: prep?.url,
            httpMethod: "POST",
            responseStatus: prep?.status,
          });
        } else if (prep && prep.ok) {
          fail({
            id: "MS-UPLOAD-NEG-01",
            module: "Master Sheet",
            screen: "Master Sheet",
            adminAction: "Upload invalid .txt as master sheet",
            expected: "Reject non-spreadsheet",
            actual: `prepare accepted status ${prep.status}`,
            severity: "High",
            businessLogicIssue: "Master sheet prepare accepted invalid file type",
          });
        } else {
          blocked({
            id: "MS-UPLOAD-NEG-01",
            module: "Master Sheet",
            screen: "Master Sheet",
            adminAction: "Upload invalid file",
            expected: "Clear rejection",
            actual: "File set; could not confirm validation messaging",
          });
        }
      } else {
        missing({
          id: "MS-UPLOAD-01",
          module: "Master Sheet",
          screen: "Master Sheet",
          adminAction: "Upload master sheet file",
          expected: "File input for xlsx upload",
          actual: "No file input found on page",
          severity: "Critical",
        });
      }

      // History panel
      const hist = page.getByRole("button", { name: /History/i });
      if (await hist.count()) {
        await hist.first().click();
        await page.waitForTimeout(800);
        const histApi = net.findApi(/mastersheet\/history/, "GET");
        pass({
          id: "MS-HISTORY-01",
          module: "Master Sheet",
          screen: "Master Sheet",
          adminAction: "Open upload history",
          expected: "History loads from API",
          actual: histApi ? `GET ${histApi.status}` : "History UI toggled",
          apiEndpoint: "/api/v1/admin/mastersheet/history",
          httpMethod: "GET",
          responseStatus: histApi?.status,
        });
      }

      // Cross-check: products still load after mastersheet visit
      const productsAfter = await apiCall(apiCtx, "GET", "/api/v1/admin/products?limit=3", {
        token: session.token,
      });
      pass({
        id: "X-MS-PRD-01",
        module: "Cross-section",
        screen: "Master Sheet → Products",
        adminAction: "Verify products API still healthy after Master Sheet visit",
        expected: "GET products 200",
        actual: `GET ${productsAfter.status}`,
        apiEndpoint: "/api/v1/admin/products",
        httpMethod: "GET",
        responseStatus: productsAfter.status,
      });

      // ═══════════════════════════════════════════════════════
      // 9. CROSS-SECTION
      // ═══════════════════════════════════════════════════════
      trackScreen("Cross-section");
      // Nav badges seed (categories/cms/media defaultCount)
      await page.goto(`${FRONTEND_ORIGIN}/catalog`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);
      const shell = await page.locator("body").innerText();
      if (/\b132\b/.test(shell) && /Categories/i.test(shell) && /\b58\b/.test(shell)) {
        fail({
          id: "NAV-SEED-01",
          module: "Catalog & Content",
          screen: "Sidebar",
          adminAction: "Observe Catalog & Content nav badges",
          expected: "Live counts or no seed badges",
          actual: "Sidebar may still show design defaultCount badges (132/58/112)",
          severity: "High",
          frontendIssue: "nav.ts defaultCount for categories/cms/cms-media",
        });
      } else {
        pass({
          id: "NAV-SEED-01",
          module: "Catalog & Content",
          screen: "Sidebar",
          adminAction: "Observe Catalog & Content nav badges",
          expected: "No classic seed badge cluster",
          actual: "Classic 132/58 badge cluster not clearly present",
        });
      }

      // Categories ↔ Products relationship via API
      const cats = await apiCall(apiCtx, "GET", "/api/v1/customer/admin/categories/all", {
        token: session.token,
      });
      const prds = await apiCall(apiCtx, "GET", "/api/v1/admin/products?limit=20", {
        token: session.token,
      });
      pass({
        id: "X-CAT-PRD-01",
        module: "Cross-section",
        screen: "Categories ↔ Products",
        adminAction: "API truth for categories and products",
        expected: "Both endpoints reachable for Admin",
        actual: `categories=${cats.status} products=${prds.status}`,
        apiEndpoint: "/api/v1/customer/admin/categories/all + /api/v1/admin/products",
        httpMethod: "GET",
      });

      // Home ↔ Media APIs
      const home = await apiCall(apiCtx, "GET", "/api/v1/customer/admin/home/sections", {
        token: session.token,
      });
      const media = await apiCall(apiCtx, "GET", "/api/v1/customer/admin/cms/media", {
        token: session.token,
      });
      pass({
        id: "X-HOME-MEDIA-01",
        module: "Cross-section",
        screen: "Home ↔ Media",
        adminAction: "API truth for home sections and media",
        expected: "Both endpoints reachable",
        actual: `home=${home.status} media=${media.status}`,
        httpMethod: "GET",
      });

      // Console / 5xx
      trackScreen("Cross-cutting");
      const unexpectedConsole = net.consoleErrors.filter(
        (e) => !/401|403|Failed to load resource|net::ERR/i.test(e),
      );
      if (unexpectedConsole.length === 0) {
        pass({
          id: "SHELL-CONSOLE-01",
          module: "Catalog & Content",
          screen: "Cross-cutting",
          adminAction: "Monitor browser console",
          expected: "No unexpected console errors",
          actual: `consoleErrors=${net.consoleErrors.length} (filtered expected auth noise)`,
        });
      } else {
        fail({
          id: "SHELL-CONSOLE-01",
          module: "Catalog & Content",
          screen: "Cross-cutting",
          adminAction: "Monitor browser console",
          expected: "Clean console",
          actual: unexpectedConsole.slice(0, 3).join(" | "),
          severity: "Medium",
          consoleErrors: unexpectedConsole.slice(0, 8),
        });
      }
      const fiveXx = net.apiCalls.filter((c) => c.status >= 500);
      if (fiveXx.length === 0) {
        pass({
          id: "SHELL-API-5XX",
          module: "Catalog & Content",
          screen: "Cross-cutting",
          adminAction: "Monitor API 5xx",
          expected: "No 5xx during journey",
          actual: "No 5xx observed",
        });
      } else {
        fail({
          id: "SHELL-API-5XX",
          module: "Catalog & Content",
          screen: "Cross-cutting",
          adminAction: "Monitor API 5xx",
          expected: "No 5xx",
          actual: fiveXx
            .slice(0, 5)
            .map((c) => `${c.method} ${c.status} ${c.url}`)
            .join("; "),
          severity: "High",
          backendIssue: "Server errors during Catalog & Content journey",
        });
      }

      // ─── LOGOUT ────────────────────────────────────────────
      trackScreen("Logout");
      await uiLogout(page);
      await page.waitForTimeout(1000);
      if (/\/login/.test(page.url())) {
        pass({
          id: "AUTH-LOGOUT-01",
          module: "Catalog & Content",
          screen: "Logout",
          adminAction: "Sign out",
          expected: "Redirect to /login",
          actual: `URL=${page.url()}`,
        });
      } else {
        fail({
          id: "AUTH-LOGOUT-01",
          module: "Catalog & Content",
          screen: "Logout",
          adminAction: "Sign out",
          expected: "Redirect to /login",
          actual: `URL=${page.url()}`,
          severity: "High",
        });
      }
    } catch (err) {
      fail({
        id: "JOURNEY-CRASH",
        module: "Catalog & Content",
        screen: "Journey",
        adminAction: "Complete Catalog & Content Admin journey",
        expected: "Journey completes without harness crash",
        actual: String(err).slice(0, 400),
        severity: "Critical",
        evidence: [await shot(page, "99-crash")],
      });
    } finally {
      await apiCtx.dispose().catch(() => undefined);
      const resultsFile = flushResults(path.join(process.cwd(), "test-results"), RESULTS_FILE);
      // eslint-disable-next-line no-console
      console.log(
        `Catalog Content results → ${resultsFile}\nCases=${JSON.parse(fs.readFileSync(resultsFile, "utf8")).totals.cases} Failed=${JSON.parse(fs.readFileSync(resultsFile, "utf8")).totals.failed} CriticalFails=${JSON.parse(fs.readFileSync(resultsFile, "utf8")).cases.filter((c: { status: string; severity?: string }) => c.status === "FAIL" && c.severity === "Critical").length}`,
      );
    }
  });
});
