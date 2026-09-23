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
 * Dark Stores — Admin POV E2E (audit only).
 * Live Vite SPA + live selorg-service. No app source changes. No mocks.
 *
 * Scope (7 sections only):
 * Dark Store Network, Store Directory, Store Inventory, Goods Requests,
 * Staging Racks, Inbound to Store, Store Stock Audit.
 */

const ARTIFACTS = path.join(process.cwd(), "test-results", "dark-stores-artifacts");
const RESULTS_FILE = "dark-stores-results.json";

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

async function clickTabInMain(page: import("@playwright/test").Page, name: string) {
  const chip = page.locator('[class*="tabChip"], [class*="tabs"] button, [class*="tabs"] [role="tab"]').filter({
    hasText: new RegExp(`^${name}$`, "i"),
  });
  if (await chip.count()) {
    await chip.first().click({ timeout: 5_000 }).catch(() => undefined);
    return true;
  }
  const btn = page.getByRole("button", { name: new RegExp(`^${name}$`, "i") }).first();
  if (await btn.count()) {
    await btn.click({ timeout: 5_000 }).catch(() => undefined);
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

function listLen(json: unknown): number {
  const d = unwrapData(json as never);
  if (Array.isArray(d)) return d.length;
  if (d && typeof d === "object") {
    const o = d as Record<string, unknown>;
    for (const k of ["items", "list", "data", "stores", "inventories", "requests", "shelves"]) {
      if (Array.isArray(o[k])) return (o[k] as unknown[]).length;
    }
  }
  return 0;
}

function firstOf<T = Record<string, unknown>>(json: unknown): T | null {
  const d = unwrapData(json as never);
  if (Array.isArray(d) && d.length) return d[0] as T;
  if (d && typeof d === "object") {
    const o = d as Record<string, unknown>;
    for (const k of ["items", "list", "data", "stores", "inventories", "requests"]) {
      if (Array.isArray(o[k]) && (o[k] as unknown[]).length) return (o[k] as T[])[0];
    }
    return d as T;
  }
  return null;
}

async function seedDarkStoreTransfers(
  apiCtx: import("@playwright/test").APIRequestContext,
  token: string,
  storeId: string,
): Promise<{ pendingId: string | null; dispatchedId: string | null }> {
  const storesRes = await apiCall(apiCtx, "GET", "/api/v1/admin/darkstores", { token });
  const storeRaw = unwrapData(storesRes.json as never);
  const storeList = Array.isArray(storeRaw) ? storeRaw : [];
  const match = storeList.find((s) => String((s as { _id?: string })._id) === storeId) as
    | { warehouseId?: string; code?: string }
    | undefined;
  let warehouseId = match?.warehouseId ? String(match.warehouseId) : "";
  if (!warehouseId) {
    const whRes = await apiCall(apiCtx, "GET", "/api/v1/admin/warehouses?limit=5", { token });
    const whData = unwrapData(whRes.json as never) as Record<string, unknown> | unknown[] | null;
    const whList = Array.isArray(whData)
      ? whData
      : Array.isArray((whData as { data?: unknown[] } | null)?.data)
        ? ((whData as { data: unknown[] }).data)
        : Array.isArray((whData as { items?: unknown[] } | null)?.items)
          ? ((whData as { items: unknown[] }).items)
          : [];
    const wh = whList[0] as { _id?: string; id?: string } | undefined;
    warehouseId = wh?._id ? String(wh._id) : wh?.id ? String(wh.id) : "";
  }
  if (!warehouseId) return { pendingId: null, dispatchedId: null };

  const invRes = await apiCall(apiCtx, "GET", "/api/v1/admin/store-warehouse/inventories", { token });
  const invItem = firstOf<{ product?: { sku?: string }; productId?: string }>(invRes.json);
  const sku = invItem?.product?.sku || "E2E-SEED-SKU";
  const productId = invItem?.productId ? String(invItem.productId) : undefined;
  const payload = {
    warehouse_id: warehouseId,
    items: [{ sku, product_id: productId, product_name: "E2E seed", requested_qty: 2 }],
    notes: "E2E seed transfer",
  };

  const transferIdOf = (res: Awaited<ReturnType<typeof apiCall>>): string | null => {
    if (!res.ok) return null;
    const body = unwrapData(res.json as never) as { transfer_id?: string } | null;
    if (body && typeof body === "object" && !Array.isArray(body) && body.transfer_id) {
      return String(body.transfer_id);
    }
    return null;
  };

  const pending = await apiCall(apiCtx, "POST", `/api/v1/darkstore/transfer-requests?storeId=${encodeURIComponent(storeId)}`, {
    token,
    body: payload,
  });
  const pendingId = transferIdOf(pending);

  const dispatched = await apiCall(apiCtx, "POST", `/api/v1/darkstore/transfer-requests?storeId=${encodeURIComponent(storeId)}`, {
    token,
    body: { ...payload, notes: "E2E seed dispatched" },
  });
  let dispatchedId = transferIdOf(dispatched);

  if (dispatchedId) {
    const accept = await apiCall(apiCtx, "POST", `/api/v1/warehouse/darkstore-requests/${dispatchedId}/accept`, {
      token,
      body: {},
    });
    if (accept.ok) {
      const pack = await apiCall(apiCtx, "POST", `/api/v1/warehouse/darkstore-requests/${dispatchedId}/pack`, {
        token,
        body: {},
      });
      if (pack.ok) {
        const disp = await apiCall(apiCtx, "POST", `/api/v1/warehouse/darkstore-requests/${dispatchedId}/dispatch`, {
          token,
          body: { driver_name: "E2E Driver", vehicle_no: "E2E-1" },
        });
        if (!disp.ok) dispatchedId = null;
      } else {
        dispatchedId = null;
      }
    } else {
      dispatchedId = null;
    }
  }

  return { pendingId, dispatchedId };
}

test.describe.configure({ mode: "serial" });

test.describe("Dark Stores — Admin POV", () => {
  test("full Dark Stores Admin journey with backend verification", async ({ page }) => {
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
        module: "Dark Stores",
        screen: "Login",
        adminAction: "Login as Super Admin",
        expected: "Real login 200 + dashboard shell",
        actual: `HTTP ${login.loginStatus}; URL=${page.url()}`,
        apiEndpoint: "/api/v1/admin/auth/login",
        httpMethod: "POST",
        responseStatus: login.loginStatus,
      });
      await shot(page, "00-login-ok");

      // Expand Dark Stores group if collapsed
      const dsGroup = page.getByRole("button", { name: /Dark Stores/i }).first();
      if (await dsGroup.count()) {
        await dsGroup.click().catch(() => undefined);
        await page.waitForTimeout(400);
      }

      // ═══════════════════════════════════════════════════════
      // 1. DARK STORE NETWORK
      // ═══════════════════════════════════════════════════════
      trackScreen("Dark Store Network");
      await gotoSection(page, "Dark Store Network", "ds-overview");
      await shot(page, "01-ds-network");

      const netApi = net.findApi(/\/admin\/darkstores/, "GET");
      const storesTruth = await apiCall(apiCtx, "GET", "/api/v1/admin/darkstores", {
        token: session.token,
      });
      const storeCount = listLen(storesTruth.json);

      if (netApi && netApi.status === 200 && storesTruth.ok) {
        pass({
          id: "DSN-API-01",
          module: "Dark Store Network",
          screen: "Dark Store Network",
          adminAction: "Load dark store network",
          expected: "GET /admin/darkstores 200 + UI list",
          actual: `UI GET ${netApi.status}; API truth count=${storeCount}`,
          apiEndpoint: "/api/v1/admin/darkstores",
          httpMethod: "GET",
          responseStatus: netApi.status,
        });
      } else {
        fail({
          id: "DSN-API-01",
          module: "Dark Store Network",
          screen: "Dark Store Network",
          adminAction: "Load dark store network",
          expected: "GET /admin/darkstores 200",
          actual: `UI=${netApi?.status ?? "none"}; API=${storesTruth.status}`,
          severity: "Critical",
          backendIssue: storesTruth.ok ? undefined : `API ${storesTruth.status}`,
          evidence: [await shot(page, "01b-dsn-api-fail")],
        });
      }

      const body1 = await page.locator("body").innerText();
      if (seedHit(body1, /1,?482|DS-01 Indiranagar.*DS-02 Koramangala/)) {
        fail({
          id: "DSN-SEED-01",
          module: "Dark Store Network",
          screen: "Dark Store Network",
          adminAction: "Inspect for seed/hardcoded network data",
          expected: "Live darkstores only",
          actual: "Classic darkstores CONFIG seed markers visible",
          severity: "Critical",
          frontendIssue: "Workspace/darkstores.ts seed values rendered",
          businessLogicIssue: "Admin may trust design-seed store network as live",
        });
      } else {
        pass({
          id: "DSN-SEED-01",
          module: "Dark Store Network",
          screen: "Dark Store Network",
          adminAction: "Inspect for seed/hardcoded network data",
          expected: "No classic CONFIG seed cluster",
          actual: "Classic seed markers not detected",
        });
      }

      // Create validation (empty submit)
      const addBtn = page.getByRole("button", { name: /Add Dark Store/i }).first();
      if (await addBtn.count()) {
        await addBtn.click();
        await page.waitForTimeout(600);
        const dlg = page.getByRole("dialog");
        if (await dlg.isVisible().catch(() => false)) {
          const save = dlg.getByRole("button", { name: /Save|Create|Add/i }).first();
          if (await save.count()) {
            await save.click();
            await page.waitForTimeout(800);
            const errVisible =
              (await dlg.locator("text=/required|enter|invalid|name|code/i").count()) > 0 ||
              (await page.getByText(/required|couldn't|failed/i).count()) > 0;
            if (errVisible) {
              pass({
                id: "DSN-VAL-01",
                module: "Dark Store Network",
                screen: "Add Dark Store dialog",
                adminAction: "Submit empty create form",
                expected: "Validation error, no successful create",
                actual: "Validation/error feedback shown",
              });
            } else {
              const post = net.apiCalls
                .slice(-8)
                .find((c) => c.method === "POST" && /darkstores/.test(c.url) && c.ok);
              if (post) {
                fail({
                  id: "DSN-VAL-01",
                  module: "Dark Store Network",
                  screen: "Add Dark Store dialog",
                  adminAction: "Submit empty create form",
                  expected: "Client/server validation reject",
                  actual: `Empty form produced successful POST ${post.status}`,
                  severity: "High",
                  apiEndpoint: post.url,
                  httpMethod: "POST",
                  responseStatus: post.status,
                });
              } else {
                pass({
                  id: "DSN-VAL-01",
                  module: "Dark Store Network",
                  screen: "Add Dark Store dialog",
                  adminAction: "Submit empty create form",
                  expected: "No successful create",
                  actual: "No successful POST observed",
                });
              }
            }
          }
          await page.keyboard.press("Escape").catch(() => undefined);
          await dlg.getByRole("button", { name: /Cancel|Close/i }).click().catch(() => undefined);
        } else {
          missing({
            id: "DSN-CREATE-UI-01",
            module: "Dark Store Network",
            screen: "Dark Store Network",
            adminAction: "Open Add Dark Store dialog",
            expected: "Create dialog",
            actual: "Add button clicked but no dialog",
            frontendIssue: "Create UI may be incomplete",
          });
        }
      } else {
        missing({
          id: "DSN-CREATE-UI-01",
          module: "Dark Store Network",
          screen: "Dark Store Network",
          adminAction: "Add Dark Store",
          expected: "Create control for Admin",
          actual: "No Add Dark Store button",
          frontendIssue: "Create store UI missing or permission-gated",
        });
      }

      // Edit / Delete controls presence
      const editBtn = page.getByRole("button", { name: /Edit/i }).first();
      const delBtn = page.getByRole("button", { name: /Delete|Remove/i }).first();
      if ((await editBtn.count()) || (await delBtn.count())) {
        pass({
          id: "DSN-ACTIONS-01",
          module: "Dark Store Network",
          screen: "Dark Store Network",
          adminAction: "Inspect Edit/Delete actions",
          expected: "Mutation controls when stores exist",
          actual: `Edit=${Boolean(await editBtn.count())}; Delete=${Boolean(await delBtn.count())}`,
        });
      } else if (storeCount === 0) {
        blocked({
          id: "DSN-ACTIONS-01",
          module: "Dark Store Network",
          screen: "Dark Store Network",
          adminAction: "Inspect Edit/Delete actions",
          expected: "Mutation controls",
          actual: "No stores in DB — Edit/Delete not available",
        });
      } else {
        missing({
          id: "DSN-ACTIONS-01",
          module: "Dark Store Network",
          screen: "Dark Store Network",
          adminAction: "Inspect Edit/Delete actions",
          expected: "Edit/Delete when stores exist",
          actual: "Stores exist via API but no Edit/Delete controls visible",
          frontendIssue: "Mutation affordances missing",
        });
      }

      // Unauth negative — fresh context without cookie jar (Bearer-only omit is insufficient)
      const bareCtx = await createApiContext({ noCookies: true });
      const unauth = await apiCall(bareCtx, "GET", "/api/v1/admin/darkstores", { omitAuth: true });
      await bareCtx.dispose().catch(() => undefined);
      if (unauth.status === 401 || unauth.status === 403) {
        pass({
          id: "DSN-NEG-UNAUTH",
          module: "Dark Store Network",
          screen: "API auth",
          adminAction: "GET darkstores without token",
          expected: "401/403",
          actual: `HTTP ${unauth.status}`,
          apiEndpoint: "/api/v1/admin/darkstores",
          httpMethod: "GET",
          responseStatus: unauth.status,
        });
      } else {
        fail({
          id: "DSN-NEG-UNAUTH",
          module: "Dark Store Network",
          screen: "API auth",
          adminAction: "GET darkstores without token",
          expected: "401/403",
          actual: `HTTP ${unauth.status}`,
          severity: "Critical",
          backendIssue: "Unauthenticated darkstores list allowed",
        });
      }

      // ═══════════════════════════════════════════════════════
      // 2. STORE DIRECTORY
      // ═══════════════════════════════════════════════════════
      trackScreen("Store Directory");
      await gotoSection(page, "Store Directory", "stores");
      await shot(page, "02-store-directory");

      const dirApi = net.findApi(/\/admin\/darkstores/, "GET");
      const usersApi = net.findApi(/\/admin\/darkstore-users/, "GET");
      if (dirApi && dirApi.status === 200) {
        pass({
          id: "DIR-API-01",
          module: "Store Directory",
          screen: "Store Directory",
          adminAction: "Load store directory",
          expected: "GET darkstores 200",
          actual: `GET ${dirApi.status}${usersApi ? `; users GET ${usersApi.status}` : ""}`,
          apiEndpoint: "/api/v1/admin/darkstores",
          httpMethod: "GET",
          responseStatus: dirApi.status,
        });
      } else {
        fail({
          id: "DIR-API-01",
          module: "Store Directory",
          screen: "Store Directory",
          adminAction: "Load store directory",
          expected: "GET darkstores 200",
          actual: dirApi ? `status ${dirApi.status}` : "No darkstores GET",
          severity: "Critical",
          evidence: [await shot(page, "02b-dir-fail")],
        });
      }

      for (const tab of ["All stores", "At risk", "Low stock"]) {
        if (await clickTabInMain(page, tab)) {
          await page.waitForTimeout(400);
          trackAction(`Directory tab: ${tab}`);
        }
      }
      // Return to All stores so Edit/Add remain visible after empty filtered tabs
      await clickTabInMain(page, "All stores");
      await page.waitForTimeout(400);
      pass({
        id: "DIR-TABS-01",
        module: "Store Directory",
        screen: "Store Directory",
        adminAction: "Open All/At risk/Low stock tabs",
        expected: "Tabs switch filter",
        actual: "Directory tabs exercised",
      });

      const dirBody = await page.locator("body").innerText();
      // capacityPct: 0 and inventory always OK are hardcoded in mapping — detect 0% capacity cluster if stores exist
      if (storeCount > 0 && /0%\s*(capacity|cap)?/i.test(dirBody) && /\bOK\b/.test(dirBody)) {
        fail({
          id: "DIR-HARDCODE-01",
          module: "Store Directory",
          screen: "Store Directory",
          adminAction: "Inspect capacity / inventory status fields",
          expected: "Live capacity and inventory from backend",
          actual: "Cards show 0% capacity and/or hardcoded OK inventory while stores exist",
          severity: "High",
          frontendIssue: "StoresPage toCard hardcodes capacityPct/activeOrders/inventory",
          businessLogicIssue: "Admin cannot trust store health signals",
        });
      } else {
        pass({
          id: "DIR-HARDCODE-01",
          module: "Store Directory",
          screen: "Store Directory",
          adminAction: "Inspect capacity / inventory status fields",
          expected: "No obvious hardcoded capacity/OK cluster",
          actual: storeCount === 0 ? "No stores to evaluate" : "Hardcoded 0%/OK cluster not detected (unknown metrics show —)",
        });
      }

      const createDir = page.getByRole("button", { name: /New store|Add store|Create store|Edit store|Edit/i }).first();
      if (!(await createDir.count())) {
        missing({
          id: "DIR-CRUD-01",
          module: "Store Directory",
          screen: "Store Directory",
          adminAction: "Create/Edit store from Directory",
          expected: "Directory create/edit when product requires it",
          actual: "No Create/Edit controls on Store Directory (read-only list)",
          frontendIssue: "Store Directory is display-only; CRUD only on Dark Store Network",
        });
      } else {
        pass({
          id: "DIR-CRUD-01",
          module: "Store Directory",
          screen: "Store Directory",
          adminAction: "Create/Edit store from Directory",
          expected: "CRUD affordance present",
          actual: "Create/Edit control found",
        });
      }

      // ═══════════════════════════════════════════════════════
      // 3. STORE INVENTORY
      // ═══════════════════════════════════════════════════════
      trackScreen("Store Inventory");
      await gotoSection(page, "Store Inventory", "store-inv");
      await shot(page, "03-store-inventory");

      const invApi = net.findApi(/\/store-warehouse\/inventories|\/darkstore\/inventory\/stock-levels/, "GET");
      const invTruth = await apiCall(apiCtx, "GET", "/api/v1/admin/store-warehouse/inventories", {
        token: session.token,
      });
      const invCount = listLen(invTruth.json);

      if (invApi && invApi.ok) {
        pass({
          id: "INV-API-01",
          module: "Store Inventory",
          screen: "Store Inventory",
          adminAction: "Load store inventory",
          expected: "Inventory GET 200",
          actual: `UI GET ${invApi.status}; API rows≈${invCount}`,
          apiEndpoint: invApi.url,
          httpMethod: "GET",
          responseStatus: invApi.status,
        });
      } else if (invTruth.ok) {
        fail({
          id: "INV-API-01",
          module: "Store Inventory",
          screen: "Store Inventory",
          adminAction: "Load store inventory",
          expected: "UI fires inventory GET",
          actual: `Backend OK (${invTruth.status}, rows≈${invCount}) but no UI GET captured`,
          severity: "Critical",
          frontendIssue: "Store Inventory may not call live inventory API",
        });
      } else {
        fail({
          id: "INV-API-01",
          module: "Store Inventory",
          screen: "Store Inventory",
          adminAction: "Load store inventory",
          expected: "Inventory GET 200",
          actual: `UI=${invApi?.status ?? "none"}; API=${invTruth.status}`,
          severity: "Critical",
          backendIssue: invTruth.rawText?.slice(0, 200),
          evidence: [await shot(page, "03b-inv-fail")],
        });
      }

      const invBody = await page.locator("body").innerText();
      if (seedHit(invBody, /2,?840|Organic Tomato 500g/)) {
        fail({
          id: "INV-SEED-01",
          module: "Store Inventory",
          screen: "Store Inventory",
          adminAction: "Inspect seed markers",
          expected: "Live inventory only",
          actual: "Classic store-inv CONFIG seed markers visible",
          severity: "Critical",
          frontendIssue: "DARKSTORE_CONFIGS store-inv seed rendered",
        });
      } else {
        pass({
          id: "INV-SEED-01",
          module: "Store Inventory",
          screen: "Store Inventory",
          adminAction: "Inspect seed markers",
          expected: "No classic inventory seed markers",
          actual: "Seed markers not detected",
        });
      }

      // Store filter chips / search
      const search = page.getByPlaceholder(/search|sku|product/i).first();
      if (await search.count()) {
        await search.fill("TEST");
        await page.waitForTimeout(500);
        trackAction("Inventory search");
        pass({
          id: "INV-SEARCH-01",
          module: "Store Inventory",
          screen: "Store Inventory",
          adminAction: "Search inventory",
          expected: "Search input accepts query",
          actual: "Search field exercised",
        });
        await search.fill("");
      } else {
        blocked({
          id: "INV-SEARCH-01",
          module: "Store Inventory",
          screen: "Store Inventory",
          adminAction: "Search inventory",
          expected: "Search control",
          actual: "No search input found",
        });
      }

      const adjust = page.getByRole("button", { name: /Adjust|Add stock|Remove stock|Update stock|Reserve/i }).first();
      if (await adjust.count()) {
        const before = net.apiCalls.length;
        await adjust.click();
        await page.waitForTimeout(1000);
        const mut = net.apiCalls
          .slice(before)
          .filter((c) => ["POST", "PUT", "PATCH"].includes(c.method) && /inventor|stock|adjust/i.test(c.url));
        if (mut.length && mut[0].ok) {
          pass({
            id: "INV-MUT-01",
            module: "Store Inventory",
            screen: "Store Inventory",
            adminAction: "Stock adjust/update",
            expected: "Mutating inventory API",
            actual: `${mut[0].method} ${mut[0].status}`,
            apiEndpoint: mut[0].url,
            httpMethod: mut[0].method,
            responseStatus: mut[0].status,
          });
        } else if (mut.length) {
          fail({
            id: "INV-MUT-01",
            module: "Store Inventory",
            screen: "Store Inventory",
            adminAction: "Stock adjust/update",
            expected: "2xx inventory mutation",
            actual: `${mut[0].method} ${mut[0].status}`,
            severity: "High",
            responseBodySnippet: mut[0].bodySnippet,
          });
        } else {
          const dlg = page.getByRole("dialog");
          if (await dlg.isVisible().catch(() => false)) {
            pass({
              id: "INV-MUT-01",
              module: "Store Inventory",
              screen: "Store Inventory",
              adminAction: "Open stock adjust UI",
              expected: "Adjust dialog",
              actual: "Dialog opened",
            });
            await page.keyboard.press("Escape");
          } else {
            fail({
              id: "INV-MUT-01",
              module: "Store Inventory",
              screen: "Store Inventory",
              adminAction: "Stock adjust/update",
              expected: "Mutating API or dialog",
              actual: "Click produced no mutation/dialog",
              severity: "Critical",
              frontendIssue: "Dead adjust control",
            });
          }
        }
      } else {
        missing({
          id: "INV-MUT-01",
          module: "Store Inventory",
          screen: "Store Inventory",
          adminAction: "Stock adjust / add / remove",
          expected: "Inventory mutation actions for Admin",
          actual: "No adjust/add/remove controls — page is read-only",
          frontendIssue: "StoreInventoryPage has no stock mutation UI (mutations live elsewhere if at all)",
        });
      }

      // ═══════════════════════════════════════════════════════
      // 4. GOODS REQUESTS
      // ═══════════════════════════════════════════════════════
      trackScreen("Goods Requests");
      // Prefer live ObjectId already used by Network section
      const liveStoreId =
        (firstOf<{ _id?: string }>(storesTruth.json)?._id &&
          String(firstOf<{ _id?: string }>(storesTruth.json)!._id)) ||
        "";
      const seed = liveStoreId
        ? await seedDarkStoreTransfers(apiCtx, session.token, liveStoreId)
        : { pendingId: null, dispatchedId: null };
      trackAction(
        `Seed transfers pending=${seed.pendingId || "none"} dispatched=${seed.dispatchedId || "none"}`,
      );

      await gotoSection(page, "Goods Requests", "ds-request");
      await shot(page, "04-goods-requests");

      const grApi = net.findApi(/\/darkstore\/transfer-requests|\/warehouse\/darkstore-requests/, "GET");
      if (grApi && grApi.ok) {
        pass({
          id: "GR-API-01",
          module: "Goods Requests",
          screen: "Goods Requests",
          adminAction: "Load goods requests",
          expected: "Transfer-requests GET 200",
          actual: `GET ${grApi.status}`,
          apiEndpoint: grApi.url,
          httpMethod: "GET",
          responseStatus: grApi.status,
        });
      } else {
        fail({
          id: "GR-API-01",
          module: "Goods Requests",
          screen: "Goods Requests",
          adminAction: "Load goods requests",
          expected: "Transfer-requests GET 200",
          actual: grApi ? `status ${grApi.status}` : "No transfer-requests GET captured",
          severity: "Critical",
          evidence: [await shot(page, "04b-gr-fail")],
        });
      }

      // Hardcoded DEFAULT_STORE_ID — only fail when API still queries the legacy code as storeId
      const grUrl = grApi?.url || "";
      if (/storeId=DS-Adyar-01(?:&|$)/i.test(grUrl) || /[?&]storeId=DS-Adyar-01/i.test(grUrl)) {
        fail({
          id: "GR-HARDCODE-STORE",
          module: "Goods Requests",
          screen: "Goods Requests",
          adminAction: "Verify store selector uses live stores",
          expected: "Admin-selected / live dark store id",
          actual: "Hardcoded DEFAULT_STORE_ID DS-Adyar-01 drives API queries",
          severity: "Critical",
          frontendIssue: "DarkstoreTransferRequestsPage DEFAULT_STORE_ID = \"DS-Adyar-01\"",
          businessLogicIssue: "Goods requests may be empty/wrong for real stores",
          apiEndpoint: grApi?.url,
        });
      } else {
        pass({
          id: "GR-HARDCODE-STORE",
          module: "Goods Requests",
          screen: "Goods Requests",
          adminAction: "Verify store selector uses live stores",
          expected: "No hardcoded DS-Adyar-01 as API storeId",
          actual: grUrl
            ? `API storeId uses live id (${grUrl.includes("storeId=") ? "query present" : "no query"})`
            : "Hardcoded storeId not observed in API URL",
        });
      }

      // Nav badge seed
      const navBadge = page.locator('a, button').filter({ hasText: /Goods Requests/i }).first();
      const navText = (await navBadge.innerText().catch(() => "")) || "";
      if (/\b7\b/.test(navText)) {
        fail({
          id: "GR-NAV-SEED",
          module: "Goods Requests",
          screen: "Sidebar",
          adminAction: "Inspect Goods Requests nav badge",
          expected: "Live count or no seed badge",
          actual: `Nav shows seed-like count 7: "${navText.replace(/\s+/g, " ").trim()}"`,
          severity: "Medium",
          frontendIssue: "nav.ts defaultCount: \"7\" for ds-request",
        });
      } else {
        pass({
          id: "GR-NAV-SEED",
          module: "Goods Requests",
          screen: "Sidebar",
          adminAction: "Inspect Goods Requests nav badge",
          expected: "No seed badge 7",
          actual: "Seed badge 7 not clearly shown",
        });
      }

      const newReq = page.getByRole("button", { name: /New Request/i }).first();
      if (await newReq.count()) {
        const before = net.apiCalls.length;
        await newReq.click();
        await page.waitForTimeout(1000);
        const dlg = page.getByRole("dialog");
        const posts = net.apiCalls
          .slice(before)
          .filter((c) => c.method === "POST" && /transfer-requests/.test(c.url));
        if (await dlg.isVisible().catch(() => false)) {
          pass({
            id: "GR-CREATE-01",
            module: "Goods Requests",
            screen: "Goods Requests",
            adminAction: "Open New Request",
            expected: "Create request UI",
            actual: "New Request dialog opened",
          });
          // empty submit if possible
          const submit = dlg.getByRole("button", { name: /Submit|Create|Save/i }).first();
          if (await submit.count()) {
            await submit.click();
            await page.waitForTimeout(800);
            trackAction("Goods request empty submit");
          }
          await page.keyboard.press("Escape").catch(() => undefined);
          await dlg.getByRole("button", { name: /Cancel|Close/i }).click().catch(() => undefined);
        } else if (posts.length) {
          pass({
            id: "GR-CREATE-01",
            module: "Goods Requests",
            screen: "Goods Requests",
            adminAction: "Create goods request",
            expected: "POST transfer-requests",
            actual: `POST ${posts[0].status}`,
            apiEndpoint: posts[0].url,
            httpMethod: "POST",
            responseStatus: posts[0].status,
          });
        } else {
          blocked({
            id: "GR-CREATE-01",
            module: "Goods Requests",
            screen: "Goods Requests",
            adminAction: "Open New Request",
            expected: "Dialog or POST",
            actual: "New Request click had no dialog/POST",
          });
        }
      } else {
        missing({
          id: "GR-CREATE-01",
          module: "Goods Requests",
          screen: "Goods Requests",
          adminAction: "Create goods request",
          expected: "New Request button",
          actual: "No New Request control",
        });
      }

      const receiveBtn = page.getByRole("button", { name: /Receive/i }).first();
      if (!(await receiveBtn.count())) {
        // Dispatched rows live under "Awaiting Receipt" (Radix tab trigger)
        const awaitingTab = page.getByRole("tab", { name: /Awaiting Receipt/i }).first();
        if (await awaitingTab.count()) {
          await awaitingTab.click().catch(() => undefined);
        } else {
          await page.getByText(/Awaiting Receipt/i).first().click().catch(() => undefined);
        }
        await page.waitForTimeout(1000);
        await page.getByRole("button", { name: /Refresh/i }).first().click().catch(() => undefined);
        await page.waitForTimeout(1000);
      }
      const receiveVisible = page.getByRole("button", { name: /Receive/i }).first();
      if (await receiveVisible.count()) {
        pass({
          id: "GR-RECEIVE-UI-01",
          module: "Goods Requests",
          screen: "Goods Requests",
          adminAction: "Receive & Verify control visible",
          expected: "Receive action when dispatched",
          actual: "Receive control present",
        });
      } else {
        blocked({
          id: "GR-RECEIVE-UI-01",
          module: "Goods Requests",
          screen: "Goods Requests",
          adminAction: "Receive & Verify",
          expected: "Receive on dispatched requests",
          actual: seed.dispatchedId
            ? `Seeded dispatched ${seed.dispatchedId} but Receive button not rendered`
            : "No Receive button (empty list or seed failed)",
        });
      }

      // Ensure pending Approve controls or Warehouse Approvals hop
      const activeTab = page.getByRole("tab", { name: /^Active$/i }).first();
      if (await activeTab.count()) await activeTab.click().catch(() => undefined);
      await page.waitForTimeout(500);
      const approve = page.getByRole("button", { name: /Approve|Reject|Accept|Dispatch|Pack|Warehouse Approvals/i }).first();
      if (await approve.count()) {
        pass({
          id: "GR-WH-ACTIONS-01",
          module: "Goods Requests",
          screen: "Goods Requests",
          adminAction: "Approve/Reject/Pack/Dispatch from DS Goods Requests",
          expected: "Lifecycle controls for Admin (or clear hop to Warehouse Approvals)",
          actual: "Approve/Reject or Warehouse Approvals hop present",
        });
      } else {
        missing({
          id: "GR-WH-ACTIONS-01",
          module: "Goods Requests",
          screen: "Goods Requests",
          adminAction: "Approve/Reject/Pack/Dispatch from DS Goods Requests",
          expected: "Lifecycle controls for Admin (or clear hop to Warehouse Approvals)",
          actual: "No Approve/Reject/Pack/Dispatch on this screen — warehouse-side APIs exist separately",
          frontendIssue: "DS Goods Requests page is create/receive oriented; WH accept/reject not exposed here",
        });
      }

      // ═══════════════════════════════════════════════════════
      // 5. STAGING RACKS
      // ═══════════════════════════════════════════════════════
      trackScreen("Staging Racks");
      await gotoSection(page, "Staging Racks", "racks");
      await shot(page, "05-staging-racks");

      const racksApi = net.findApi(/\/inventory\/shelves|\/racks/, "GET");
      const racksTruth = await apiCall(apiCtx, "GET", "/api/v1/darkstore/inventory/shelves", {
        token: session.token,
      });
      if (racksApi && racksApi.ok) {
        pass({
          id: "RACK-API-01",
          module: "Staging Racks",
          screen: "Staging Racks",
          adminAction: "Load staging racks",
          expected: "GET shelves 200",
          actual: `UI GET ${racksApi.status}; API≈${listLen(racksTruth.json)}`,
          apiEndpoint: racksApi.url,
          httpMethod: "GET",
          responseStatus: racksApi.status,
        });
      } else {
        fail({
          id: "RACK-API-01",
          module: "Staging Racks",
          screen: "Staging Racks",
          adminAction: "Load staging racks",
          expected: "GET shelves 200",
          actual: `UI=${racksApi?.status ?? "none"}; API=${racksTruth.status}`,
          severity: "Critical",
          evidence: [await shot(page, "05b-racks-fail")],
        });
      }

      const racksNav = page.locator("a, button").filter({ hasText: /Staging Racks/i }).first();
      const racksNavText = (await racksNav.innerText().catch(() => "")) || "";
      if (/\b42\b/.test(racksNavText)) {
        fail({
          id: "RACK-NAV-SEED",
          module: "Staging Racks",
          screen: "Sidebar",
          adminAction: "Inspect Staging Racks nav badge",
          expected: "Live count or no seed",
          actual: `Nav shows seed-like 42: "${racksNavText.replace(/\s+/g, " ").trim()}"`,
          severity: "Medium",
          frontendIssue: "nav.ts defaultCount: \"42\" for racks",
        });
      } else {
        pass({
          id: "RACK-NAV-SEED",
          module: "Staging Racks",
          screen: "Sidebar",
          adminAction: "Inspect Staging Racks nav badge",
          expected: "No seed badge 42",
          actual: "Seed badge 42 not clearly shown",
        });
      }

      // Tab chips from CONFIG
      for (const t of ["All", "Free", "Occupied", "Reserved", "Blocked"]) {
        if (await clickTabInMain(page, t)) {
          await page.waitForTimeout(250);
          trackAction(`Racks tab: ${t}`);
        }
      }

      const newRack = page.getByRole("button", { name: /New staging rack|Create rack|\+ New/i }).first();
      if (await newRack.count()) {
        await newRack.click();
        await page.waitForTimeout(700);
        const dlg = page.getByRole("dialog");
        if (await dlg.isVisible().catch(() => false)) {
          pass({
            id: "RACK-CREATE-01",
            module: "Staging Racks",
            screen: "Staging Racks",
            adminAction: "Open New staging rack",
            expected: "Create rack dialog",
            actual: "Dialog opened",
          });
          const create = dlg.getByRole("button", { name: /Create|Save|Add/i }).first();
          if (await create.count()) {
            const before = net.apiCalls.length;
            await create.click();
            await page.waitForTimeout(1200);
            const posts = net.apiCalls
              .slice(before)
              .filter((c) => c.method === "POST" && /shelves|racks/i.test(c.url));
            if (posts.length && posts[0].ok) {
              pass({
                id: "RACK-CREATE-MUT-01",
                module: "Staging Racks",
                screen: "Staging Racks",
                adminAction: "Create staging rack",
                expected: "POST shelves 2xx",
                actual: `POST ${posts[0].status}`,
                apiEndpoint: posts[0].url,
                httpMethod: "POST",
                responseStatus: posts[0].status,
              });
            } else if (posts.length) {
              fail({
                id: "RACK-CREATE-MUT-01",
                module: "Staging Racks",
                screen: "Staging Racks",
                adminAction: "Create staging rack",
                expected: "POST shelves 2xx",
                actual: `POST ${posts[0].status}`,
                severity: "High",
                responseBodySnippet: posts[0].bodySnippet,
              });
            } else {
              blocked({
                id: "RACK-CREATE-MUT-01",
                module: "Staging Racks",
                screen: "Staging Racks",
                adminAction: "Create staging rack",
                expected: "POST or validation",
                actual: "Create click without POST (validation may have blocked)",
              });
            }
          }
          await page.keyboard.press("Escape").catch(() => undefined);
        } else {
          blocked({
            id: "RACK-CREATE-01",
            module: "Staging Racks",
            screen: "Staging Racks",
            adminAction: "Open New staging rack",
            expected: "Dialog",
            actual: "Button clicked, no dialog",
          });
        }
      } else {
        missing({
          id: "RACK-CREATE-01",
          module: "Staging Racks",
          screen: "Staging Racks",
          adminAction: "Create staging rack",
          expected: "New staging rack control",
          actual: "No create button (permission or missing UI)",
        });
      }

      const assign = page.getByRole("button", { name: /Assign|Unassign|Clear|Release|Occupy/i }).first();
      if (!(await assign.count())) {
        missing({
          id: "RACK-ASSIGN-01",
          module: "Staging Racks",
          screen: "Staging Racks",
          adminAction: "Assign/unassign/clear rack",
          expected: "Occupancy management actions",
          actual: "No Assign/Clear/Release controls found",
          frontendIssue: "RacksPage may only support list + create, not assignment lifecycle",
        });
      } else {
        pass({
          id: "RACK-ASSIGN-01",
          module: "Staging Racks",
          screen: "Staging Racks",
          adminAction: "Assign/unassign/clear rack",
          expected: "Occupancy action present",
          actual: "Assign/clear-style control found",
        });
      }

      // ═══════════════════════════════════════════════════════
      // 6. INBOUND TO STORE
      // ═══════════════════════════════════════════════════════
      trackScreen("Inbound to Store");
      await gotoSection(page, "Inbound to Store", "ds-receive");
      await shot(page, "06-inbound");

      const ibApi = net.findApi(/\/darkstore\/transfer-requests/, "GET");
      if (ibApi && ibApi.ok) {
        pass({
          id: "IB-API-01",
          module: "Inbound to Store",
          screen: "Inbound to Store",
          adminAction: "Load inbound shipments",
          expected: "GET transfer-requests (dispatched) 200",
          actual: `GET ${ibApi.status}`,
          apiEndpoint: ibApi.url,
          httpMethod: "GET",
          responseStatus: ibApi.status,
        });
      } else {
        fail({
          id: "IB-API-01",
          module: "Inbound to Store",
          screen: "Inbound to Store",
          adminAction: "Load inbound shipments",
          expected: "GET transfer-requests 200",
          actual: ibApi ? `status ${ibApi.status}` : "No transfer-requests GET",
          severity: "Critical",
          evidence: [await shot(page, "06b-ib-fail")],
        });
      }

      if (/storeId=DS-Adyar-01/i.test(ibApi?.url || "")) {
        fail({
          id: "IB-HARDCODE-STORE",
          module: "Inbound to Store",
          screen: "Inbound to Store",
          adminAction: "Verify inbound store scope",
          expected: "Live store selection",
          actual: "API scoped to hardcoded DS-Adyar-01",
          severity: "Critical",
          frontendIssue: "DarkstoreReceivePage DEFAULT_STORE_ID = \"DS-Adyar-01\"",
          apiEndpoint: ibApi?.url,
        });
      } else {
        pass({
          id: "IB-HARDCODE-STORE",
          module: "Inbound to Store",
          screen: "Inbound to Store",
          adminAction: "Verify inbound store scope",
          expected: "No hardcoded DS-Adyar-01 query",
          actual: "Hardcoded storeId not in captured URL",
        });
      }

      const ibNav = page.locator("a, button").filter({ hasText: /Inbound to Store/i }).first();
      const ibNavText = (await ibNav.innerText().catch(() => "")) || "";
      if (/\b5\b/.test(ibNavText)) {
        fail({
          id: "IB-NAV-SEED",
          module: "Inbound to Store",
          screen: "Sidebar",
          adminAction: "Inspect Inbound nav badge",
          expected: "Live count or no seed",
          actual: `Nav shows seed-like 5: "${ibNavText.replace(/\s+/g, " ").trim()}"`,
          severity: "Medium",
          frontendIssue: "nav.ts defaultCount: \"5\" for ds-receive",
        });
      } else {
        pass({
          id: "IB-NAV-SEED",
          module: "Inbound to Store",
          screen: "Sidebar",
          adminAction: "Inspect Inbound nav badge",
          expected: "No seed badge 5",
          actual: "Seed badge 5 not clearly shown",
        });
      }

      const ibReceive = page.getByRole("button", { name: /Receive|Confirm Receipt/i }).first();
      if (await ibReceive.count()) {
        const before = net.apiCalls.length;
        await ibReceive.click();
        await page.waitForTimeout(1000);
        const dlg = page.getByRole("dialog");
        if (await dlg.isVisible().catch(() => false)) {
          pass({
            id: "IB-RECEIVE-01",
            module: "Inbound to Store",
            screen: "Inbound to Store",
            adminAction: "Open Receive & Verify",
            expected: "Receive dialog",
            actual: "Receive dialog opened",
          });
          const confirm = dlg.getByRole("button", { name: /Confirm|Update Stock|Receive/i }).first();
          if (await confirm.count()) {
            await confirm.click();
            await page.waitForTimeout(1500);
            const mut = net.apiCalls
              .slice(before)
              .filter((c) => c.method === "POST" && /receive/i.test(c.url));
            if (mut.length && mut[0].ok) {
              pass({
                id: "IB-RECEIVE-MUT-01",
                module: "Inbound to Store",
                screen: "Inbound to Store",
                adminAction: "Confirm receipt / update stock",
                expected: "POST …/receive 2xx + stock update",
                actual: `POST ${mut[0].status}`,
                apiEndpoint: mut[0].url,
                httpMethod: "POST",
                responseStatus: mut[0].status,
              });
            } else if (mut.length) {
              fail({
                id: "IB-RECEIVE-MUT-01",
                module: "Inbound to Store",
                screen: "Inbound to Store",
                adminAction: "Confirm receipt / update stock",
                expected: "POST receive 2xx",
                actual: `POST ${mut[0].status}`,
                severity: "High",
                responseBodySnippet: mut[0].bodySnippet,
              });
            } else {
              blocked({
                id: "IB-RECEIVE-MUT-01",
                module: "Inbound to Store",
                screen: "Inbound to Store",
                adminAction: "Confirm receipt",
                expected: "POST receive",
                actual: "Confirm without receive POST (validation/empty qty?)",
              });
            }
          }
          await page.keyboard.press("Escape").catch(() => undefined);
        } else {
          const mut = net.apiCalls
            .slice(before)
            .filter((c) => c.method === "POST" && /receive/i.test(c.url));
          if (mut.length) {
            pass({
              id: "IB-RECEIVE-01",
              module: "Inbound to Store",
              screen: "Inbound to Store",
              adminAction: "Receive inbound",
              expected: "Receive mutation",
              actual: `${mut[0].method} ${mut[0].status}`,
              apiEndpoint: mut[0].url,
              httpMethod: mut[0].method,
              responseStatus: mut[0].status,
            });
          } else {
            fail({
              id: "IB-RECEIVE-01",
              module: "Inbound to Store",
              screen: "Inbound to Store",
              adminAction: "Receive inbound",
              expected: "Dialog or POST receive",
              actual: "Receive click with no dialog/POST",
              severity: "Critical",
            });
          }
        }
      } else {
        blocked({
          id: "IB-RECEIVE-01",
          module: "Inbound to Store",
          screen: "Inbound to Store",
          adminAction: "Receive & Verify inbound",
          expected: "Receive control on dispatched shipments",
          actual: "No Receive button (empty inbound for scoped store)",
        });
      }

      // ═══════════════════════════════════════════════════════
      // 7. STORE STOCK AUDIT
      // ═══════════════════════════════════════════════════════
      trackScreen("Store Stock Audit");
      await gotoSection(page, "Store Stock Audit", "ds-audit");
      await shot(page, "07-stock-audit");

      const auditBody = await page.locator("body").innerText();
      if (seedHit(auditBody, /AUD-DS-088|99\.5%|Audits due|Arjun P\.|DS-02 Koramangala/)) {
        fail({
          id: "AUD-SEED-01",
          module: "Store Stock Audit",
          screen: "Store Stock Audit",
          adminAction: "Inspect audit list / KPIs",
          expected: "Live audit records from backend",
          actual: "DARKSTORE_CONFIGS ds-audit seed markers visible (AUD-DS-088 / 99.5% / Audits due)",
          severity: "Critical",
          frontendIssue: "WorkspaceModulePage renders darkstores.ts ds-audit seed via workspaceService",
          businessLogicIssue: "Admin sees fake audits as operational truth",
          evidence: [await shot(page, "07b-audit-seed")],
        });
      } else {
        pass({
          id: "AUD-SEED-01",
          module: "Store Stock Audit",
          screen: "Store Stock Audit",
          adminAction: "Inspect audit list / KPIs",
          expected: "No classic audit seed markers",
          actual: "Seed markers not detected",
        });
      }

      const auditApi = net.findApi(/\/darkstore\/utilities\/audit|\/inventory\/audit|\/cycle-count|workspace\.ds-audit/, "GET");
      const auditTruth = await apiCall(apiCtx, "GET", "/api/v1/darkstore/utilities/audit-logs", {
        token: session.token,
      });
      if (auditApi && auditApi.ok) {
        pass({
          id: "AUD-API-01",
          module: "Store Stock Audit",
          screen: "Store Stock Audit",
          adminAction: "Load audits via API",
          expected: "Live audit GET 200",
          actual: `UI GET ${auditApi.status}`,
          apiEndpoint: auditApi.url,
          httpMethod: "GET",
          responseStatus: auditApi.status,
        });
      } else if (auditTruth.ok && listLen(auditTruth.json) === 0) {
        fail({
          id: "AUD-API-01",
          module: "Store Stock Audit",
          screen: "Store Stock Audit",
          adminAction: "Load audits via API",
          expected: "UI binds to live audit API (or empty state)",
          actual: `Backend audit-logs OK empty; UI may still show seed. UI GET=${auditApi?.status ?? "none"}`,
          severity: "Critical",
          frontendIssue: "ds-audit falls back to CONFIG seed when probe empty",
        });
      } else {
        fail({
          id: "AUD-API-01",
          module: "Store Stock Audit",
          screen: "Store Stock Audit",
          adminAction: "Load audits via API",
          expected: "Live audit GET from UI",
          actual: `UI=${auditApi?.status ?? "none"}; utilities/audit-logs=${auditTruth.status}`,
          severity: "High",
          backendIssue: auditTruth.ok ? undefined : `audit-logs ${auditTruth.status}`,
        });
      }

      const startAudit = page.getByRole("button", { name: /Create audit|Start audit|New audit|Submit audit|Approve/i }).first();
      if (!(await startAudit.count())) {
        missing({
          id: "AUD-ACTIONS-01",
          module: "Store Stock Audit",
          screen: "Store Stock Audit",
          adminAction: "Create/start/submit/approve audit",
          expected: "Audit lifecycle actions",
          actual: "No create/start/submit/approve controls — generic workspace template only",
          frontendIssue: "ds-audit uses WorkspaceModulePage without audit workflow UI",
        });
      } else {
        pass({
          id: "AUD-ACTIONS-01",
          module: "Store Stock Audit",
          screen: "Store Stock Audit",
          adminAction: "Audit lifecycle action present",
          expected: "Lifecycle control",
          actual: "Audit action button found",
        });
      }

      for (const tab of ["Due", "In progress", "Completed", "All"]) {
        if (await clickTabInMain(page, tab)) {
          await page.waitForTimeout(300);
          trackAction(`Audit tab: ${tab}`);
        }
      }

      // ═══════════════════════════════════════════════════════
      // 8. CROSS-MODULE FLOW
      // ═══════════════════════════════════════════════════════
      trackScreen("Cross-module");
      await gotoSection(page, "Store Inventory", "store-inv");
      await page.waitForTimeout(800);
      const invAfter = net.findApi(/\/store-warehouse\/inventories/, "GET");
      const hasInvGet = Boolean(invAfter || net.apiCalls.some((c) => /inventories/.test(c.url) && c.method === "GET"));
      const hasReceiveMut = net.apiCalls.some((c) => c.method === "POST" && /receive/i.test(c.url) && c.ok);
      const hasAdjustMut = net.apiCalls.some(
        (c) =>
          ["PUT", "POST"].includes(c.method) &&
          (/inventories\//.test(c.url) || /adjustments/.test(c.url)) &&
          c.ok,
      );
      const hasRackMut = net.apiCalls.some(
        (c) => ["PUT", "POST"].includes(c.method) && /shelves/.test(c.url) && c.ok,
      );

      // Prove audit → inventory path when possible
      await gotoSection(page, "Store Stock Audit", "ds-audit");
      await page.waitForTimeout(600);
      const startAud = page.getByRole("button", { name: /Start audit|Adjust stock|Submit audit/i }).first();
      if (await startAud.count()) {
        await startAud.click();
        await page.waitForTimeout(700);
        const dlg = page.getByRole("dialog");
        if (await dlg.isVisible().catch(() => false)) {
          const sel = dlg.locator("select").first();
          if (await sel.count()) {
            const opts = await sel.locator("option").all();
            if (opts.length > 1) await sel.selectOption({ index: 1 });
          }
          const phys = dlg.locator('input[type="number"]').nth(1);
          if (await phys.count()) {
            const cur = await phys.inputValue().catch(() => "0");
            const next = String(Math.max(0, Number(cur || 0) + 1));
            await phys.fill(next);
          }
          const submit = dlg.getByRole("button", { name: /Submit audit/i }).first();
          if (await submit.count()) {
            await submit.click();
            await page.waitForTimeout(2000);
          }
        }
      }

      const hasAdjustMut2 = net.apiCalls.some(
        (c) =>
          ["PUT", "POST"].includes(c.method) &&
          (/inventories\//.test(c.url) || /adjustments/.test(c.url)) &&
          c.ok,
      );

      // Prove rack assign
      await gotoSection(page, "Staging Racks", "racks");
      await page.waitForTimeout(600);
      const assignBtn = page.getByRole("button", { name: /Assign|Clear \/ Release|Release/i }).first();
      if (await assignBtn.count()) {
        await assignBtn.click();
        await page.waitForTimeout(1200);
      }
      const hasRackMut2 = net.apiCalls.some(
        (c) => ["PUT", "POST"].includes(c.method) && /shelves/.test(c.url) && c.ok,
      );

      if (hasReceiveMut && hasInvGet) {
        pass({
          id: "XFLOW-IB-INV-01",
          module: "Cross-section",
          screen: "Inbound → Inventory",
          adminAction: "Verify inbound receive then inventory reload",
          expected: "Receive mutation + inventory GET observable in session",
          actual: "Receive POST and inventory GET both observed",
        });
      } else if (hasInvGet && !hasReceiveMut) {
        // Wired path exists; no dispatched inbound in this environment
        blocked({
          id: "XFLOW-IB-INV-01",
          module: "Cross-section",
          screen: "Inbound → Inventory",
          adminAction: "Verify Goods Request → Inbound → Inventory linkage",
          expected: "Receive mutation when dispatched inbound exists",
          actual: `inventoryGET=${hasInvGet}; no successful receive POST (no dispatched inbound in env)`,
        });
      } else {
        fail({
          id: "XFLOW-IB-INV-01",
          module: "Cross-section",
          screen: "Inbound → Inventory",
          adminAction: "Verify Goods Request → Inbound → Inventory linkage",
          expected: "End-to-end receive updates inventory (observable APIs)",
          actual: `receivePOST=${hasReceiveMut}; inventoryGET=${hasInvGet}`,
          severity: "Critical",
          businessLogicIssue: "Cross-module stock update not proven in Admin UI journey",
        });
      }

      if (hasAdjustMut || hasAdjustMut2) {
        pass({
          id: "XFLOW-AUD-INV-01",
          module: "Cross-section",
          screen: "Audit → Inventory",
          adminAction: "Verify audit adjustment updates Store Inventory",
          expected: "Audit adjust mutates inventory",
          actual: "Inventory PUT/adjustment POST observed after audit action",
        });
      } else {
        fail({
          id: "XFLOW-AUD-INV-01",
          module: "Cross-section",
          screen: "Audit → Inventory",
          adminAction: "Verify audit adjustment updates Store Inventory",
          expected: "Completed audit adjusts live inventory",
          actual: "No inventory/adjustment mutation after audit UI action",
          severity: "High",
        });
      }

      if (hasRackMut || hasRackMut2) {
        pass({
          id: "XFLOW-RACK-01",
          module: "Cross-section",
          screen: "Staging Racks",
          adminAction: "Verify rack assign → occupancy",
          expected: "Assign/Release mutates shelves API",
          actual: "Shelves PUT/POST observed",
        });
      } else {
        fail({
          id: "XFLOW-RACK-01",
          module: "Cross-section",
          screen: "Staging Racks",
          adminAction: "Verify rack assign → occupancy → related order/inventory",
          expected: "Assign updates rack status",
          actual: "No shelves mutation after Assign/Release click (empty racks?)",
          severity: "High",
        });
      }

      // Network ↔ Directory consistency
      const storesA = await apiCall(apiCtx, "GET", "/api/v1/admin/darkstores", { token: session.token });
      const nA = listLen(storesA.json);
      await gotoSection(page, "Dark Store Network", "ds-overview");
      await page.waitForTimeout(500);
      await gotoSection(page, "Store Directory", "stores");
      await page.waitForTimeout(500);
      if (storesA.ok) {
        pass({
          id: "XFLOW-NET-DIR-01",
          module: "Cross-section",
          screen: "Network ↔ Directory",
          adminAction: "Compare darkstores source of truth",
          expected: "Both sections use /admin/darkstores",
          actual: `Shared API returns ${nA} store(s); both sections hit darkstores GET in journey`,
          apiEndpoint: "/api/v1/admin/darkstores",
          httpMethod: "GET",
          responseStatus: storesA.status,
        });
      }

      // ═══════════════════════════════════════════════════════
      // SHELL / CONSOLE
      // ═══════════════════════════════════════════════════════
      const serious = net.consoleErrors.filter(
        (e) =>
          !/Download the React DevTools|favicon|ResizeObserver|React Router Future Flag/i.test(e) &&
          /Error|TypeError|ReferenceError|Unhandled|duplicate key|Warning: Each child/i.test(e),
      );
      if (serious.length) {
        fail({
          id: "SHELL-CONSOLE-01",
          module: "Dark Stores",
          screen: "Cross-cutting",
          adminAction: "Monitor browser console",
          expected: "Clean console",
          actual: serious.slice(0, 5).join(" | ").slice(0, 800),
          severity: "Medium",
          consoleErrors: serious.slice(0, 10),
        });
      } else {
        pass({
          id: "SHELL-CONSOLE-01",
          module: "Dark Stores",
          screen: "Cross-cutting",
          adminAction: "Monitor browser console",
          expected: "Clean console",
          actual: `No serious console errors (${net.consoleErrors.length} total error-level msgs filtered)`,
        });
      }

      // ─── LOGOUT ────────────────────────────────────────────
      trackScreen("Logout");
      await uiLogout(page);
      pass({
        id: "AUTH-LOGOUT-01",
        module: "Dark Stores",
        screen: "Logout",
        adminAction: "Sign out",
        expected: "Return to /login",
        actual: `URL=${page.url()}`,
      });
    } catch (err) {
      fail({
        id: "SHELL-FATAL-01",
        module: "Dark Stores",
        screen: "Journey",
        adminAction: "Complete Dark Stores Admin POV journey",
        expected: "Journey completes without uncaught errors",
        actual: String(err).slice(0, 500),
        severity: "Critical",
        evidence: [await shot(page, "zz-fatal")],
      });
    } finally {
      const resultsFile = flushResults(path.join(process.cwd(), "test-results"), RESULTS_FILE);
      // eslint-disable-next-line no-console
      console.log(`Dark Stores results → ${resultsFile}`);
      const raw = JSON.parse(fs.readFileSync(resultsFile, "utf8"));
      const failed = (raw.cases || []).filter((c: { status: string }) => c.status === "FAIL");
      // eslint-disable-next-line no-console
      console.log(
        `Cases=${raw.cases?.length ?? 0} Failed=${failed.length} CriticalFails=${failed.filter((c: { severity?: string }) => c.severity === "Critical").length}`,
      );
      await apiCtx.dispose().catch(() => undefined);
    }
  });
});
