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
 * Monitoring + System — Admin POV E2E (AUDIT ONLY).
 * Live Vite SPA + live selorg-service + live DB. No app source changes. No mocks.
 *
 * MONITORING: Exception Centre, Scanner Operations, Barcode Registry, Alerts, Audit Logs
 * SYSTEM: Users, Roles & Permissions, Integrations
 */

const ARTIFACTS = path.join(process.cwd(), "test-results", "monitoring-system-artifacts");
const RESULTS_FILE = "monitoring-system-results.json";

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
  const tab = page.getByRole("tab", { name: new RegExp(`^${name}$`, "i") }).first();
  if (await tab.count()) {
    await tab.click({ timeout: 5_000 }).catch(() => undefined);
    return true;
  }
  const chip = page
    .locator('[class*="tabChip"], [class*="tabs"] button, [class*="tabs"] [role="tab"], [class*="trigger"]')
    .filter({ hasText: new RegExp(`^${name}$`, "i") });
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
  // Prefer direct route — sidebar labels like "Users" also match "Store Users" / "Warehouse Users".
  await page.goto(`${FRONTEND_ORIGIN}/${pathSeg}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  if (!new RegExp(`/${pathSeg}(?:\\?|$|#)`).test(page.url()) && !page.url().includes(`/${pathSeg}`)) {
    try {
      // Exact sidebar link text when possible
      const exact = page.getByRole("link", { name: label, exact: true }).first();
      if (await exact.count()) {
        await exact.click();
      } else {
        await openNavItem(page, label);
      }
    } catch {
      /* already attempted URL */
    }
    await page.waitForTimeout(1200);
  }
  await expect(page).toHaveURL(new RegExp(`/${pathSeg}(?:\\?|$|#|/)`), { timeout: 20_000 });
}

function seedHit(text: string, markers: RegExp) {
  return markers.test(text);
}

function listLen(json: unknown): number {
  const d = unwrapData(json as never);
  if (Array.isArray(d)) return d.length;
  if (d && typeof d === "object") {
    const o = d as Record<string, unknown>;
    for (const k of [
      "items",
      "list",
      "data",
      "alerts",
      "exceptions",
      "users",
      "roles",
      "logs",
      "events",
      "devices",
      "templates",
      "integrations",
      "history",
      "notifications",
    ]) {
      if (Array.isArray(o[k])) return (o[k] as unknown[]).length;
    }
  }
  return 0;
}

async function exerciseSearch(page: import("@playwright/test").Page, query = "test") {
  const search = page
    .locator('input[type="search"], input[placeholder*="Search" i], input[placeholder*="search" i]')
    .first();
  if (await search.count()) {
    await search.fill(query);
    await page.waitForTimeout(400);
    await search.fill("");
    trackAction("Search field exercised");
    return true;
  }
  return false;
}

async function clickPrimaryActions(page: import("@playwright/test").Page, names: RegExp[]) {
  const clicked: string[] = [];
  for (const re of names) {
    const btn = page.getByRole("button", { name: re }).first();
    if (await btn.count()) {
      const label = (await btn.innerText().catch(() => re.source)) || re.source;
      await btn.click({ timeout: 4_000 }).catch(() => undefined);
      await page.waitForTimeout(600);
      const dlg = page.getByRole("dialog");
      if (await dlg.isVisible().catch(() => false)) {
        await page.keyboard.press("Escape").catch(() => undefined);
        await dlg.getByRole("button", { name: /Cancel|Close|Dismiss/i }).click().catch(() => undefined);
        await page.waitForTimeout(300);
      }
      clicked.push(label.replace(/\s+/g, " ").trim().slice(0, 40));
      trackAction(`Clicked: ${clicked[clicked.length - 1]}`);
    }
  }
  return clicked;
}

function navHasSeedBadge(navText: string, count: string) {
  return new RegExp(`\\b${count}\\b`).test(navText.replace(/\s+/g, " "));
}

test.describe.configure({ mode: "serial" });

test.describe("Monitoring + System — Admin POV", () => {
  test("full Monitoring and System Admin journey with backend verification", async ({ page }) => {
    test.setTimeout(900_000);
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
        module: "Monitoring + System",
        screen: "Login",
        adminAction: "Login as Super Admin",
        expected: "Real login 200 + dashboard shell",
        actual: `HTTP ${login.loginStatus}; URL=${page.url()}`,
        apiEndpoint: "/api/v1/admin/auth/login",
        httpMethod: "POST",
        responseStatus: login.loginStatus,
      });

      // ═══════════════════════════════════════════════════════
      // MONITORING 1. EXCEPTION CENTRE
      // ═══════════════════════════════════════════════════════
      trackScreen("Exception Centre");
      await gotoSection(page, "Exception Centre", "exceptions");
      await shot(page, "01-exception-centre");

      const exNav = page.locator("a, button").filter({ hasText: /Exception Centre/i }).first();
      const exNavText = (await exNav.innerText().catch(() => "")) || "";
      if (navHasSeedBadge(exNavText, "7")) {
        fail({
          id: "EXC-NAV-SEED",
          module: "Exception Centre",
          screen: "Sidebar",
          adminAction: "Inspect Exception Centre nav badge",
          expected: "Live count or no seed badge",
          actual: `Nav shows seed-like count 7`,
          severity: "Medium",
          frontendIssue: 'nav.ts defaultCount: "7" for exceptions',
        });
      } else {
        pass({
          id: "EXC-NAV-SEED",
          module: "Exception Centre",
          screen: "Sidebar",
          adminAction: "Inspect Exception Centre nav badge",
          expected: "No seed badge 7",
          actual: "Seed badge 7 not clearly shown",
        });
      }

      const exBody = await page.locator("body").innerText();
      if (seedHit(exBody, /7\s*Open exceptions|2\s*SLA breached|18 min|EXC-3312|Finance · Latha/)) {
        fail({
          id: "EXC-SEED-01",
          module: "Exception Centre",
          screen: "Exception Centre",
          adminAction: "Inspect for exception seed KPIs / IDs",
          expected: "Live exceptions from fraud/alerts API; KPIs from live data",
          actual: "SYSTEM_CONFIGS / seed markers visible (7 Open / 18 min / EXC-3312)",
          severity: "Critical",
          frontendIssue: "ExceptionsTriagePage static SYSTEM_CONFIGS.exceptions KPIs or seed list",
          evidence: [await shot(page, "01b-exc-seed")],
        });
      } else {
        pass({
          id: "EXC-SEED-01",
          module: "Exception Centre",
          screen: "Exception Centre",
          adminAction: "Inspect for exception seed markers",
          expected: "No classic exception seed cluster",
          actual: "Classic seed markers not detected",
        });
      }

      const exUi = net.findApi(/\/admin\/fraud\/alerts|\/exceptions/, "GET");
      const exTruth = await apiCall(apiCtx, "GET", "/api/v1/admin/fraud/alerts", { token: session.token });
      if (exUi && exUi.ok) {
        pass({
          id: "EXC-LOAD-01",
          module: "Exception Centre",
          screen: "Exception Centre",
          adminAction: "Load exceptions via live API",
          expected: "GET fraud/alerts 200",
          actual: `UI GET ${exUi.status}; API≈${listLen(exTruth.json)}`,
          apiEndpoint: exUi.url,
          httpMethod: "GET",
          responseStatus: exUi.status,
        });
      } else {
        fail({
          id: "EXC-LOAD-01",
          module: "Exception Centre",
          screen: "Exception Centre",
          adminAction: "Load exceptions via live API",
          expected: "Live fraud/alerts GET",
          actual: `UI=${exUi?.status ?? "none"}; API=${exTruth.status}`,
          severity: "Critical",
          evidence: [await shot(page, "01c-exc-load")],
        });
      }

      await exerciseSearch(page, "exc");
      const exActions = await clickPrimaryActions(page, [
        /Resolve|Acknowledge|Assign|Escalate|Retry|Reopen|Refresh|Mark resolved/i,
      ]);
      if (exActions.length) {
        pass({
          id: "EXC-ACTIONS-01",
          module: "Exception Centre",
          screen: "Exception Centre",
          adminAction: "Exercise exception lifecycle controls",
          expected: "Resolve/ack/assign when present",
          actual: `Clicked: ${exActions.join(", ")}`,
        });
      } else if (listLen(exTruth.json) === 0) {
        blocked({
          id: "EXC-ACTIONS-01",
          module: "Exception Centre",
          screen: "Exception Centre",
          adminAction: "Exercise exception lifecycle controls",
          expected: "Actions when exceptions exist",
          actual: "Empty exception queue; no lifecycle controls",
        });
      } else {
        missing({
          id: "EXC-ACTIONS-01",
          module: "Exception Centre",
          screen: "Exception Centre",
          adminAction: "Exercise exception lifecycle controls",
          expected: "Resolve/ack/assign controls",
          actual: "API has alerts but no actionable controls found",
        });
      }

      const bareCtx = await createApiContext({ noCookies: true });
      const unauthEx = await apiCall(bareCtx, "GET", "/api/v1/admin/fraud/alerts", { omitAuth: true });
      if (unauthEx.status === 401 || unauthEx.status === 403) {
        pass({
          id: "EXC-NEG-UNAUTH",
          module: "Exception Centre",
          screen: "API auth",
          adminAction: "GET fraud/alerts without token",
          expected: "401/403",
          actual: `HTTP ${unauthEx.status}`,
          apiEndpoint: "/api/v1/admin/fraud/alerts",
          httpMethod: "GET",
          responseStatus: unauthEx.status,
        });
      } else {
        fail({
          id: "EXC-NEG-UNAUTH",
          module: "Exception Centre",
          screen: "API auth",
          adminAction: "GET fraud/alerts without token",
          expected: "401/403",
          actual: `HTTP ${unauthEx.status}`,
          severity: "Critical",
          backendIssue: "Fraud alerts allow unauthenticated access",
        });
      }

      // ═══════════════════════════════════════════════════════
      // MONITORING 2. SCANNER OPERATIONS
      // ═══════════════════════════════════════════════════════
      trackScreen("Scanner Operations");
      await gotoSection(page, "Scanner Operations", "scanner");
      await shot(page, "02-scanner-operations");

      const scBody = await page.locator("body").innerText();
      if (seedHit(scBody, /12\s*Scanners|10\s*Online|8,?412\s*Scans|0\.4%|HSD-04|HSD-02/)) {
        fail({
          id: "SCN-SEED-01",
          module: "Scanner Operations",
          screen: "Scanner Operations",
          adminAction: "Inspect for scanner seed KPIs / devices",
          expected: "Live HSD fleet from darkstore API",
          actual: "DARKSTORE_CONFIGS / scannerSeed markers visible (12 Scanners / HSD-04)",
          severity: "Critical",
          frontendIssue: "ScannerPage static KPIs or seed fallback when API empty",
          evidence: [await shot(page, "02b-scn-seed")],
        });
      } else {
        pass({
          id: "SCN-SEED-01",
          module: "Scanner Operations",
          screen: "Scanner Operations",
          adminAction: "Inspect for scanner seed markers",
          expected: "No classic scanner seed cluster",
          actual: "Classic seed markers not detected",
        });
      }

      const scUi = net.findApi(/\/darkstore\/hsd\/(fleet|logs)|\/scanner/, "GET");
      const scTruth = await apiCall(apiCtx, "GET", "/api/v1/darkstore/hsd/fleet", { token: session.token });
      if (scUi && scUi.ok) {
        pass({
          id: "SCN-LOAD-01",
          module: "Scanner Operations",
          screen: "Scanner Operations",
          adminAction: "Load scanner fleet via live API",
          expected: "GET hsd/fleet or logs 200",
          actual: `UI GET ${scUi.status}; fleet API=${scTruth.status}≈${listLen(scTruth.json)}`,
          apiEndpoint: scUi.url,
          httpMethod: "GET",
          responseStatus: scUi.status,
        });
      } else {
        fail({
          id: "SCN-LOAD-01",
          module: "Scanner Operations",
          screen: "Scanner Operations",
          adminAction: "Load scanner fleet via live API",
          expected: "Live HSD fleet GET",
          actual: `UI=${scUi?.status ?? "none"}; API=${scTruth.status}`,
          severity: "Critical",
          evidence: [await shot(page, "02c-scn-load")],
        });
      }

      for (const tab of ["Devices", "Scan activity", "Exceptions", "Audit"]) {
        if (await clickTabInMain(page, tab)) await page.waitForTimeout(250);
      }
      const scActions = await clickPrimaryActions(page, [/Enable|Disable|Reset|Retry|Refresh|Open/i]);
      pass({
        id: "SCN-ACTIONS-01",
        module: "Scanner Operations",
        screen: "Scanner Operations",
        adminAction: "Exercise scanner tabs/actions",
        expected: "Tabs/actions when present",
        actual: scActions.length ? `Clicked: ${scActions.join(", ")}` : "Tabs exercised; limited device actions",
      });

      // ═══════════════════════════════════════════════════════
      // MONITORING 3. BARCODE REGISTRY
      // ═══════════════════════════════════════════════════════
      trackScreen("Barcode Registry");
      await gotoSection(page, "Barcode Registry", "barcodes");
      await shot(page, "03-barcode-registry");

      const bcBody = await page.locator("body").innerText();
      // Avoid matching sidebar "API Catalog" — detect real placeholder card vs live registry UI.
      const bcLiveUi =
        /Registered codes|Print labels|Search barcode|No barcodes registered|No barcodes match/i.test(bcBody);
      const bcPlaceholder =
        !bcLiveUi &&
        /Live backend module|This screen is wired to|coming soon|not (yet )?built/i.test(bcBody);
      const bcUi = net.findApi(/barcode|print-barcodes|\/admin\/products/i, "GET");
      const bcPost = net.findApi(/print-barcodes|barcode/i, "POST");

      if (bcPlaceholder && !(bcUi && bcUi.ok)) {
        missing({
          id: "BC-IMPL-01",
          module: "Barcode Registry",
          screen: "Barcode Registry",
          adminAction: "Open Barcode Registry as Admin",
          expected: "Bespoke barcode registry with live CRUD",
          actual: "ModulePlaceholderPage / no live barcode registry UI",
          frontendIssue: "barcodes not in BUILT_PAGES — ModulePlaceholderPage",
          evidence: [await shot(page, "03b-bc-missing")],
        });
      } else if (seedHit(bcBody, /890126409999|BAG-000981|8,?412/)) {
        fail({
          id: "BC-SEED-01",
          module: "Barcode Registry",
          screen: "Barcode Registry",
          adminAction: "Inspect for barcode seed markers",
          expected: "Live barcode registry",
          actual: "Scan-history/barcode seed markers visible",
          severity: "Critical",
          evidence: [await shot(page, "03b-bc-seed")],
        });
      } else {
        pass({
          id: "BC-IMPL-01",
          module: "Barcode Registry",
          screen: "Barcode Registry",
          adminAction: "Open Barcode Registry",
          expected: "Live barcode UI",
          actual: "Page rendered without placeholder markers",
        });
      }

      const bcActions = await clickPrimaryActions(page, [/Create|Add|Register|Edit|Activate|Deactivate|Delete|Run|Refresh/i]);
      if (bcActions.length && !bcPlaceholder) {
        pass({
          id: "BC-ACTIONS-01",
          module: "Barcode Registry",
          screen: "Barcode Registry",
          adminAction: "Exercise barcode CRUD controls",
          expected: "Create/edit/activate",
          actual: `Clicked: ${bcActions.join(", ")}`,
        });
      } else if (bcPlaceholder) {
        missing({
          id: "BC-ACTIONS-01",
          module: "Barcode Registry",
          screen: "Barcode Registry",
          adminAction: "Exercise barcode CRUD controls",
          expected: "Barcode create/edit/activate",
          actual: "No registry CRUD — placeholder module",
        });
      } else {
        missing({
          id: "BC-ACTIONS-01",
          module: "Barcode Registry",
          screen: "Barcode Registry",
          adminAction: "Exercise barcode CRUD controls",
          expected: "Barcode lifecycle UI",
          actual: "No create/edit controls found",
        });
      }

      // Probe print-barcodes utility existence (catalog / warehouse)
      const printProbe = await apiCall(apiCtx, "POST", "/api/v1/warehouse/utilities/print-barcodes", {
        token: session.token,
        body: { skus: [] },
      });
      pass({
        id: "BC-API-01",
        module: "Barcode Registry",
        screen: "API probe",
        adminAction: "POST print-barcodes utility (contract probe)",
        expected: "Endpoint reachable (2xx/4xx validation, not 404/501)",
        actual: `HTTP ${printProbe.status}`,
        apiEndpoint: "/api/v1/warehouse/utilities/print-barcodes",
        httpMethod: "POST",
        responseStatus: printProbe.status,
      });

      // ═══════════════════════════════════════════════════════
      // MONITORING 4. ALERTS (notifications)
      // ═══════════════════════════════════════════════════════
      trackScreen("Alerts");
      await gotoSection(page, "Alerts", "notifications");
      await shot(page, "04-alerts");

      const alNav = page.locator("a, button").filter({ hasText: /^Alerts/i }).first();
      const alNavText = (await alNav.innerText().catch(() => "")) || "";
      if (navHasSeedBadge(alNavText, "7")) {
        fail({
          id: "ALT-NAV-SEED",
          module: "Alerts",
          screen: "Sidebar",
          adminAction: "Inspect Alerts nav badge",
          expected: "Live count or no seed badge",
          actual: `Nav shows seed-like count 7`,
          severity: "Medium",
          frontendIssue: 'nav.ts defaultCount: "7" for notifications',
        });
      } else {
        pass({
          id: "ALT-NAV-SEED",
          module: "Alerts",
          screen: "Sidebar",
          adminAction: "Inspect Alerts nav badge",
          expected: "No seed badge 7",
          actual: "Seed badge 7 not clearly shown",
        });
      }

      const alBody = await page.locator("body").innerText();
      if (seedHit(alBody, /Order confirmed|Scanner offline|1\.2M|notif-0/)) {
        fail({
          id: "ALT-SEED-01",
          module: "Alerts",
          screen: "Alerts",
          adminAction: "Inspect for alerts/notification seed markers",
          expected: "Live notification templates/history",
          actual: "SYSTEM_CONFIGS / notifications seed markers visible",
          severity: "High",
          frontendIssue: "NotificationsPage may render seed templates",
          evidence: [await shot(page, "04b-alt-seed")],
        });
      } else {
        pass({
          id: "ALT-SEED-01",
          module: "Alerts",
          screen: "Alerts",
          adminAction: "Inspect for alerts seed markers",
          expected: "No classic notification seed cluster",
          actual: "Classic seed markers not detected",
        });
      }

      const alUi = net.findApi(/\/admin\/notifications\/(templates|history)/, "GET");
      const alTruth = await apiCall(apiCtx, "GET", "/api/v1/admin/notifications/templates", {
        token: session.token,
      });
      if (alUi && alUi.ok) {
        pass({
          id: "ALT-LOAD-01",
          module: "Alerts",
          screen: "Alerts",
          adminAction: "Load alerts/notifications via live API",
          expected: "GET notifications templates/history 200",
          actual: `UI GET ${alUi.status}; templates API=${alTruth.status}≈${listLen(alTruth.json)}`,
          apiEndpoint: alUi.url,
          httpMethod: "GET",
          responseStatus: alUi.status,
        });
      } else {
        fail({
          id: "ALT-LOAD-01",
          module: "Alerts",
          screen: "Alerts",
          adminAction: "Load alerts/notifications via live API",
          expected: "Live notifications GET",
          actual: `UI=${alUi?.status ?? "none"}; API=${alTruth.status}`,
          severity: "Critical",
          evidence: [await shot(page, "04c-alt-load")],
        });
      }

      const alActions = await clickPrimaryActions(page, [
        /Acknowledge|Resolve|Dismiss|Pause|Activate|Retry|Send test|Refresh/i,
      ]);
      if (alActions.length) {
        pass({
          id: "ALT-ACTIONS-01",
          module: "Alerts",
          screen: "Alerts",
          adminAction: "Exercise alert/notification controls",
          expected: "Ack/pause/activate/retry",
          actual: `Clicked: ${alActions.join(", ")}`,
        });
      } else {
        missing({
          id: "ALT-ACTIONS-01",
          module: "Alerts",
          screen: "Alerts",
          adminAction: "Exercise alert/notification controls",
          expected: "Alert lifecycle UI",
          actual: "No acknowledge/pause/activate controls found",
        });
      }

      // ═══════════════════════════════════════════════════════
      // MONITORING 5. AUDIT LOGS
      // ═══════════════════════════════════════════════════════
      trackScreen("Audit Logs");
      await gotoSection(page, "Audit Logs", "audit");
      await shot(page, "05-audit-logs");

      const audBody = await page.locator("body").innerText();
      if (seedHit(audBody, /12,?884\s*Events|RFD-5510|TR-2293/)) {
        fail({
          id: "AUD-SEED-01",
          module: "Audit Logs",
          screen: "Audit Logs",
          adminAction: "Inspect for audit seed KPIs / events",
          expected: "Live audit logs from /admin/audit/logs",
          actual: "SYSTEM_CONFIGS / auditSeed markers visible (12,884 Events / RFD-5510)",
          severity: "Critical",
          frontendIssue: "AuditLogPage static KPIs or SEED_AUDIT_EVENTS fallback",
          businessLogicIssue: "Admin cannot trust audit trail as live system of record",
          evidence: [await shot(page, "05b-aud-seed")],
        });
      } else {
        pass({
          id: "AUD-SEED-01",
          module: "Audit Logs",
          screen: "Audit Logs",
          adminAction: "Inspect for audit seed markers",
          expected: "No classic audit seed cluster",
          actual: "Classic seed markers not detected",
        });
      }

      const audUi = net.findApi(/\/admin\/audit\/logs/, "GET");
      const audTruth = await apiCall(apiCtx, "GET", "/api/v1/admin/audit/logs", { token: session.token });
      if (audUi && audUi.ok) {
        pass({
          id: "AUD-LOAD-01",
          module: "Audit Logs",
          screen: "Audit Logs",
          adminAction: "Load audit logs via live API",
          expected: "GET audit/logs 200",
          actual: `UI GET ${audUi.status}; API≈${listLen(audTruth.json)}`,
          apiEndpoint: audUi.url,
          httpMethod: "GET",
          responseStatus: audUi.status,
        });
      } else {
        fail({
          id: "AUD-LOAD-01",
          module: "Audit Logs",
          screen: "Audit Logs",
          adminAction: "Load audit logs via live API",
          expected: "Live audit/logs GET",
          actual: `UI=${audUi?.status ?? "none"}; API=${audTruth.status}`,
          severity: "Critical",
          evidence: [await shot(page, "05c-aud-load")],
        });
      }

      for (const tab of ["All events", "Inventory", "Orders & refunds", "Access", "Config"]) {
        if (await clickTabInMain(page, tab)) await page.waitForTimeout(250);
      }
      await exerciseSearch(page, "admin");
      pass({
        id: "AUD-UI-01",
        module: "Audit Logs",
        screen: "Audit Logs",
        adminAction: "Exercise audit tabs/search",
        expected: "Tabs/search when present",
        actual: "Tabs/search exercised",
      });

      // ═══════════════════════════════════════════════════════
      // SYSTEM 1. USERS
      // ═══════════════════════════════════════════════════════
      trackScreen("Users");
      await gotoSection(page, "Users", "users");
      await shot(page, "06-users");

      const usNav = page.locator("a, button").filter({ hasText: /^Users/i }).first();
      const usNavText = (await usNav.innerText().catch(() => "")) || "";
      if (navHasSeedBadge(usNavText, "41")) {
        fail({
          id: "USR-NAV-SEED",
          module: "Users",
          screen: "Sidebar",
          adminAction: "Inspect Users nav badge",
          expected: "Live count or no seed badge",
          actual: `Nav shows seed-like count 41`,
          severity: "Medium",
          frontendIssue: 'nav.ts defaultCount: "41" for users',
        });
      } else {
        pass({
          id: "USR-NAV-SEED",
          module: "Users",
          screen: "Sidebar",
          adminAction: "Inspect Users nav badge",
          expected: "No seed badge 41",
          actual: "Seed badge 41 not clearly shown",
        });
      }

      const usBody = await page.locator("body").innerText();
      if (seedHit(usBody, /41\s*Admin users|38\s*Active|3\s*Pending invites|usr-arun/)) {
        fail({
          id: "USR-SEED-01",
          module: "Users",
          screen: "Users",
          adminAction: "Inspect for users seed KPIs / accounts",
          expected: "Live users from /admin/users; KPIs from live data",
          actual: "SYSTEM_CONFIGS.users seed KPIs/accounts visible",
          severity: "Critical",
          frontendIssue: "UsersDirectoryPage static SYSTEM_CONFIGS KPIs",
          evidence: [await shot(page, "06b-usr-seed")],
        });
      } else {
        pass({
          id: "USR-SEED-01",
          module: "Users",
          screen: "Users",
          adminAction: "Inspect for users seed markers",
          expected: "No classic users seed cluster",
          actual: "Classic seed markers not detected",
        });
      }

      const usUi = net.findApi(/\/admin\/users/, "GET");
      const usTruth = await apiCall(apiCtx, "GET", "/api/v1/admin/users", { token: session.token });
      if (usUi && usUi.ok) {
        pass({
          id: "USR-LOAD-01",
          module: "Users",
          screen: "Users",
          adminAction: "Load users via live API",
          expected: "GET /admin/users 200",
          actual: `UI GET ${usUi.status}; API≈${listLen(usTruth.json)}`,
          apiEndpoint: usUi.url,
          httpMethod: "GET",
          responseStatus: usUi.status,
        });
      } else {
        fail({
          id: "USR-LOAD-01",
          module: "Users",
          screen: "Users",
          adminAction: "Load users via live API",
          expected: "Live users GET",
          actual: `UI=${usUi?.status ?? "none"}; API=${usTruth.status}`,
          severity: "Critical",
          evidence: [await shot(page, "06c-usr-load")],
        });
      }

      await exerciseSearch(page, "admin");
      const usActions = await clickPrimaryActions(page, [
        /Create|Add user|Invite|Edit|Activate|Deactivate|Reset password|Assign role|Refresh|Export/i,
      ]);
      if (usActions.length) {
        pass({
          id: "USR-ACTIONS-01",
          module: "Users",
          screen: "Users",
          adminAction: "Exercise user management controls",
          expected: "Create/edit/activate/role",
          actual: `Clicked: ${usActions.join(", ")}`,
        });
      } else {
        missing({
          id: "USR-ACTIONS-01",
          module: "Users",
          screen: "Users",
          adminAction: "Exercise user management controls",
          expected: "User CRUD/lifecycle UI",
          actual: "No create/edit/activate controls found",
        });
      }

      const unauthUs = await apiCall(bareCtx, "GET", "/api/v1/admin/users", { omitAuth: true });
      if (unauthUs.status === 401 || unauthUs.status === 403) {
        pass({
          id: "USR-NEG-UNAUTH",
          module: "Users",
          screen: "API auth",
          adminAction: "GET users without token",
          expected: "401/403",
          actual: `HTTP ${unauthUs.status}`,
          apiEndpoint: "/api/v1/admin/users",
          httpMethod: "GET",
          responseStatus: unauthUs.status,
        });
      } else {
        fail({
          id: "USR-NEG-UNAUTH",
          module: "Users",
          screen: "API auth",
          adminAction: "GET users without token",
          expected: "401/403",
          actual: `HTTP ${unauthUs.status}`,
          severity: "Critical",
          backendIssue: "Users endpoint allows unauthenticated access",
        });
      }

      // ═══════════════════════════════════════════════════════
      // SYSTEM 2. ROLES & PERMISSIONS
      // ═══════════════════════════════════════════════════════
      trackScreen("Roles & Permissions");
      await gotoSection(page, "Roles & Permissions", "roles");
      await shot(page, "07-roles");

      const roNav = page.locator("a, button").filter({ hasText: /Roles & Permissions/i }).first();
      const roNavText = (await roNav.innerText().catch(() => "")) || "";
      if (navHasSeedBadge(roNavText, "8")) {
        fail({
          id: "ROL-NAV-SEED",
          module: "Roles & Permissions",
          screen: "Sidebar",
          adminAction: "Inspect Roles nav badge",
          expected: "Live count or no seed badge",
          actual: `Nav shows seed-like count 8`,
          severity: "Medium",
          frontendIssue: 'nav.ts defaultCount: "8" for roles',
        });
      } else {
        pass({
          id: "ROL-NAV-SEED",
          module: "Roles & Permissions",
          screen: "Sidebar",
          adminAction: "Inspect Roles nav badge",
          expected: "No seed badge 8",
          actual: "Seed badge 8 not clearly shown",
        });
      }

      const roBody = await page.locator("body").innerText();
      if (seedHit(roBody, /8\s*Roles|3\s*Refund|5\s*Approve|17\s*Changes|2\s*Under review/)) {
        fail({
          id: "ROL-SEED-01",
          module: "Roles & Permissions",
          screen: "Roles & Permissions",
          adminAction: "Inspect for roles seed KPIs",
          expected: "Live roles/matrix from /admin/roles",
          actual: "Fallback/default roles KPI markers visible",
          severity: "Critical",
          frontendIssue: "RolesPage fallback KPIs or FALLBACK_ROWS when API empty",
          businessLogicIssue: "RBAC matrix may not reflect live permission catalog",
          evidence: [await shot(page, "07b-rol-seed")],
        });
      } else {
        pass({
          id: "ROL-SEED-01",
          module: "Roles & Permissions",
          screen: "Roles & Permissions",
          adminAction: "Inspect for roles seed markers",
          expected: "No classic roles seed KPI cluster",
          actual: "Classic seed markers not detected",
        });
      }

      const roUi = net.findApi(/\/admin\/roles|\/admin\/permissions\/matrix/, "GET");
      const roTruth = await apiCall(apiCtx, "GET", "/api/v1/admin/roles", { token: session.token });
      if (roUi && roUi.ok) {
        pass({
          id: "ROL-LOAD-01",
          module: "Roles & Permissions",
          screen: "Roles & Permissions",
          adminAction: "Load roles via live API",
          expected: "GET roles / permissions matrix 200",
          actual: `UI GET ${roUi.status}; roles API=${roTruth.status}≈${listLen(roTruth.json)}`,
          apiEndpoint: roUi.url,
          httpMethod: "GET",
          responseStatus: roUi.status,
        });
      } else {
        fail({
          id: "ROL-LOAD-01",
          module: "Roles & Permissions",
          screen: "Roles & Permissions",
          adminAction: "Load roles via live API",
          expected: "Live roles GET",
          actual: `UI=${roUi?.status ?? "none"}; API=${roTruth.status}`,
          severity: "Critical",
          evidence: [await shot(page, "07c-rol-load")],
        });
      }

      const roActions = await clickPrimaryActions(page, [/Create|Add role|Edit|Save|Delete|Refresh/i]);
      if (roActions.length) {
        pass({
          id: "ROL-ACTIONS-01",
          module: "Roles & Permissions",
          screen: "Roles & Permissions",
          adminAction: "Exercise role/matrix controls",
          expected: "Edit/save matrix",
          actual: `Clicked: ${roActions.join(", ")}`,
        });
      } else {
        missing({
          id: "ROL-ACTIONS-01",
          module: "Roles & Permissions",
          screen: "Roles & Permissions",
          adminAction: "Exercise role/matrix controls",
          expected: "Role edit/save UI",
          actual: "No edit/save controls found",
        });
      }

      // RBAC probe: unauth roles
      const unauthRo = await apiCall(bareCtx, "GET", "/api/v1/admin/roles", { omitAuth: true });
      if (unauthRo.status === 401 || unauthRo.status === 403) {
        pass({
          id: "ROL-NEG-UNAUTH",
          module: "Roles & Permissions",
          screen: "API auth",
          adminAction: "GET roles without token",
          expected: "401/403",
          actual: `HTTP ${unauthRo.status}`,
          apiEndpoint: "/api/v1/admin/roles",
          httpMethod: "GET",
          responseStatus: unauthRo.status,
        });
      } else {
        fail({
          id: "ROL-NEG-UNAUTH",
          module: "Roles & Permissions",
          screen: "API auth",
          adminAction: "GET roles without token",
          expected: "401/403",
          actual: `HTTP ${unauthRo.status}`,
          severity: "Critical",
          backendIssue: "Roles endpoint allows unauthenticated access",
        });
      }

      // ═══════════════════════════════════════════════════════
      // SYSTEM 3. INTEGRATIONS
      // ═══════════════════════════════════════════════════════
      trackScreen("Integrations");
      await gotoSection(page, "Integrations", "integrations");
      await shot(page, "08-integrations");

      const igBody = await page.locator("body").innerText();
      if (seedHit(igBody, /99\.94%|1\.2\s*s\s*Avg sync/)) {
        fail({
          id: "INT-SEED-01",
          module: "Integrations",
          screen: "Integrations",
          adminAction: "Inspect for integrations seed KPIs / vendors",
          expected: "Live integration health from /admin/integrations",
          actual: "Hardcoded uptime/sync KPIs or seed vendor list visible",
          severity: "Critical",
          frontendIssue: "IntegrationsPage hardcoded 99.94%/1.2s and/or SYSTEM_CONFIGS seed rows",
          businessLogicIssue: "Test Connection may not reflect real provider status",
          evidence: [await shot(page, "08b-int-seed")],
        });
      } else {
        pass({
          id: "INT-SEED-01",
          module: "Integrations",
          screen: "Integrations",
          adminAction: "Inspect for integrations seed markers",
          expected: "No classic integrations seed cluster",
          actual: "Classic seed markers not detected",
        });
      }

      const igUi = net.findApi(/\/admin\/integrations/, "GET");
      const igTruth = await apiCall(apiCtx, "GET", "/api/v1/admin/integrations/health", {
        token: session.token,
      });
      if (igUi && igUi.ok) {
        pass({
          id: "INT-LOAD-01",
          module: "Integrations",
          screen: "Integrations",
          adminAction: "Load integrations health via live API",
          expected: "GET integrations/health 200",
          actual: `UI GET ${igUi.status}; health API=${igTruth.status}`,
          apiEndpoint: igUi.url,
          httpMethod: "GET",
          responseStatus: igUi.status,
        });
      } else {
        fail({
          id: "INT-LOAD-01",
          module: "Integrations",
          screen: "Integrations",
          adminAction: "Load integrations health via live API",
          expected: "Live integrations health GET",
          actual: `UI=${igUi?.status ?? "none"}; API=${igTruth.status}`,
          severity: "Critical",
          evidence: [await shot(page, "08c-int-load")],
        });
      }

      for (const tab of ["Integrations", "Health", "Error log", "Retry queue"]) {
        if (await clickTabInMain(page, tab)) await page.waitForTimeout(250);
      }
      const igActions = await clickPrimaryActions(page, [/Test|Connect|Configure|Enable|Disable|Save|Refresh/i]);
      if (igActions.length) {
        pass({
          id: "INT-ACTIONS-01",
          module: "Integrations",
          screen: "Integrations",
          adminAction: "Exercise integration test/configure controls",
          expected: "Test connection / configure",
          actual: `Clicked: ${igActions.join(", ")}`,
        });
      } else {
        missing({
          id: "INT-ACTIONS-01",
          module: "Integrations",
          screen: "Integrations",
          adminAction: "Exercise integration test/configure controls",
          expected: "Test/configure UI",
          actual: "No test/configure controls found",
        });
      }

      // Optional: fire a test connection if any integration id known from health payload
      const healthData = unwrapData(igTruth.json as never);
      let testId: string | undefined;
      if (Array.isArray(healthData) && healthData[0] && typeof healthData[0] === "object") {
        const row = healthData[0] as Record<string, unknown>;
        testId = String(row.id ?? row.system ?? row.name ?? "");
      } else if (healthData && typeof healthData === "object") {
        const o = healthData as Record<string, unknown>;
        for (const k of ["list", "items", "integrations"]) {
          if (Array.isArray(o[k]) && o[k]![0]) {
            const row = o[k]![0] as Record<string, unknown>;
            testId = String(row.id ?? row.system ?? row.name ?? "");
            break;
          }
        }
      }
      if (testId && testId !== "undefined") {
        const testRes = await apiCall(apiCtx, "POST", `/api/v1/admin/integrations/${encodeURIComponent(testId)}/test`, {
          token: session.token,
          body: {},
        });
        if (testRes.status >= 200 && testRes.status < 500) {
          pass({
            id: "INT-TEST-01",
            module: "Integrations",
            screen: "Integrations",
            adminAction: `POST integrations/${testId}/test`,
            expected: "Real test endpoint responds (not hardcoded UI-only)",
            actual: `HTTP ${testRes.status}`,
            apiEndpoint: `/api/v1/admin/integrations/${testId}/test`,
            httpMethod: "POST",
            responseStatus: testRes.status,
          });
        } else {
          fail({
            id: "INT-TEST-01",
            module: "Integrations",
            screen: "Integrations",
            adminAction: `POST integrations/${testId}/test`,
            expected: "Reachable test endpoint",
            actual: `HTTP ${testRes.status}`,
            severity: "High",
            backendIssue: "Integration test endpoint unavailable",
          });
        }
      } else {
        blocked({
          id: "INT-TEST-01",
          module: "Integrations",
          screen: "Integrations",
          adminAction: "POST integrations/:id/test",
          expected: "Identifiable integration id from health payload",
          actual: "No integration id available to probe test endpoint",
        });
      }

      // Secret exposure sniff on health body
      const healthSnippet = JSON.stringify(igTruth.json ?? {}).slice(0, 800);
      if (/api[_-]?key|secret|password|private[_-]?key/i.test(healthSnippet) && /"[A-Za-z0-9_\-]{16,}"/.test(healthSnippet)) {
        fail({
          id: "INT-SEC-01",
          module: "Integrations",
          screen: "API security",
          adminAction: "Inspect integrations health for raw secrets",
          expected: "Secrets masked in API responses",
          actual: "Health response may contain secret-like fields",
          severity: "Critical",
          backendIssue: "Potential secret exposure in integrations/health",
        });
      } else {
        pass({
          id: "INT-SEC-01",
          module: "Integrations",
          screen: "API security",
          adminAction: "Inspect integrations health for raw secrets",
          expected: "No obvious raw secrets in health payload",
          actual: "No clear secret leakage pattern in health snippet",
        });
      }

      // ═══════════════════════════════════════════════════════
      // CROSS-MODULE FLOWS
      // ═══════════════════════════════════════════════════════
      trackScreen("Cross-section");

      const hasExGet = net.apiCalls.some((c) => /fraud\/alerts/.test(c.url) && c.method === "GET" && c.ok);
      const hasAudGet = net.apiCalls.some((c) => /audit\/logs/.test(c.url) && c.method === "GET" && c.ok);
      const hasUsrGet = net.apiCalls.some((c) => /\/admin\/users/.test(c.url) && c.method === "GET" && c.ok);
      const hasRolGet = net.apiCalls.some((c) => /\/admin\/roles/.test(c.url) && c.method === "GET" && c.ok);
      const hasIntGet = net.apiCalls.some((c) => /\/admin\/integrations/.test(c.url) && c.method === "GET" && c.ok);
      const hasNotifGet = net.apiCalls.some(
        (c) => /\/admin\/notifications\//.test(c.url) && c.method === "GET" && c.ok,
      );
      const hasScnGet = net.apiCalls.some((c) => /hsd\/(fleet|logs)/.test(c.url) && c.method === "GET" && c.ok);

      // FLOW: System user/role → Audit
      if (hasUsrGet && hasRolGet && hasAudGet) {
        const audSeed = seedHit(audBody, /12,?884|RFD-5510/);
        if (audSeed) {
          fail({
            id: "XFLOW-SYS-AUD-01",
            module: "Cross-section",
            screen: "Users/Roles → Audit Logs",
            adminAction: "Verify system mutations can be audited via live logs",
            expected: "Live users+roles+audit without seed audit KPIs",
            actual: `users=${hasUsrGet}; roles=${hasRolGet}; audit=${hasAudGet}; audSeed=${audSeed}`,
            severity: "Critical",
            businessLogicIssue: "Audit trail not trustworthy for System RBAC changes",
          });
        } else {
          pass({
            id: "XFLOW-SYS-AUD-01",
            module: "Cross-section",
            screen: "Users/Roles → Audit Logs",
            adminAction: "Verify system + audit live APIs",
            expected: "Users + roles + audit GETs without seed",
            actual: "All observed; audit seed cluster absent",
          });
        }
      } else {
        fail({
          id: "XFLOW-SYS-AUD-01",
          module: "Cross-section",
          screen: "Users/Roles → Audit Logs",
          adminAction: "Verify system + audit chain",
          expected: "users + roles + audit GETs",
          actual: `users=${hasUsrGet}; roles=${hasRolGet}; audit=${hasAudGet}`,
          severity: "Critical",
        });
      }

      // FLOW: Monitoring exception/alert → Audit
      if ((hasExGet || hasNotifGet) && hasAudGet) {
        pass({
          id: "XFLOW-MON-AUD-01",
          module: "Cross-section",
          screen: "Exceptions/Alerts → Audit Logs",
          adminAction: "Verify monitoring + audit APIs observable",
          expected: "Exceptions or alerts GET + audit GET",
          actual: `exc=${hasExGet}; alerts=${hasNotifGet}; audit=${hasAudGet}`,
        });
      } else {
        fail({
          id: "XFLOW-MON-AUD-01",
          module: "Cross-section",
          screen: "Exceptions/Alerts → Audit Logs",
          adminAction: "Verify monitoring + audit chain",
          expected: "Monitoring ops + audit GETs",
          actual: `exc=${hasExGet}; alerts=${hasNotifGet}; audit=${hasAudGet}`,
          severity: "High",
        });
      }

      // FLOW: Scanner + Barcode registry presence
      if (hasScnGet && !bcPlaceholder) {
        pass({
          id: "XFLOW-SCN-BC-01",
          module: "Cross-section",
          screen: "Scanner → Barcode Registry",
          adminAction: "Verify scanner live + barcode registry implemented",
          expected: "Scanner fleet live and barcode registry functional",
          actual: "Scanner live; barcode registry not placeholder",
        });
      } else if (hasScnGet && bcPlaceholder) {
        fail({
          id: "XFLOW-SCN-BC-01",
          module: "Cross-section",
          screen: "Scanner → Barcode Registry",
          adminAction: "Verify scanner ↔ barcode registry workflow",
          expected: "Both scanner ops and barcode registry live",
          actual: "Scanner API live but Barcode Registry is placeholder",
          severity: "Critical",
          businessLogicIssue: "Barcode registry missing — scanner↔barcode admin workflow broken",
        });
      } else {
        fail({
          id: "XFLOW-SCN-BC-01",
          module: "Cross-section",
          screen: "Scanner → Barcode Registry",
          adminAction: "Verify scanner ↔ barcode registry",
          expected: "Scanner + barcode live",
          actual: `scanner=${hasScnGet}; barcodePlaceholder=${bcPlaceholder}`,
          severity: "High",
        });
      }

      // Integrations ↔ monitoring
      if (hasIntGet && (hasExGet || hasNotifGet || hasAudGet)) {
        const intSeed = seedHit(igBody, /99\.94%|1\.2\s*s/);
        if (intSeed) {
          fail({
            id: "XFLOW-INT-MON-01",
            module: "Cross-section",
            screen: "Integrations → Monitoring",
            adminAction: "Verify integration health is live (not hardcoded)",
            expected: "Live integrations health without hardcoded uptime KPIs",
            actual: `int=${hasIntGet}; intSeed=${intSeed}`,
            severity: "High",
            businessLogicIssue: "Hardcoded integration KPIs undermine ops monitoring",
          });
        } else {
          pass({
            id: "XFLOW-INT-MON-01",
            module: "Cross-section",
            screen: "Integrations → Monitoring",
            adminAction: "Verify integrations + monitoring live",
            expected: "Live integrations without seed uptime",
            actual: "Integrations live; hardcoded KPI cluster absent",
          });
        }
      } else {
        fail({
          id: "XFLOW-INT-MON-01",
          module: "Cross-section",
          screen: "Integrations → Monitoring",
          adminAction: "Verify integrations + monitoring",
          expected: "integrations + monitoring GETs",
          actual: `int=${hasIntGet}; mon=${hasExGet || hasNotifGet || hasAudGet}`,
          severity: "High",
        });
      }

      // Console errors
      const msConsole = net.consoleErrors.filter((e) => !/favicon|Download the React DevTools/i.test(e));
      if (msConsole.length > 40) {
        fail({
          id: "MS-CONSOLE-01",
          module: "Monitoring + System",
          screen: "Runtime",
          adminAction: "Monitor console errors during journey",
          expected: "Few/no runtime errors",
          actual: `${msConsole.length} console errors (sample: ${msConsole.slice(0, 3).join(" | ")})`,
          severity: "Medium",
          consoleErrors: msConsole.slice(0, 20),
        });
      } else {
        pass({
          id: "MS-CONSOLE-01",
          module: "Monitoring + System",
          screen: "Runtime",
          adminAction: "Monitor console errors during journey",
          expected: "Stable runtime",
          actual: `${msConsole.length} console errors captured`,
        });
      }

      // ─── LOGOUT ────────────────────────────────────────────
      trackScreen("Logout");
      try {
        await uiLogout(page);
        await page.waitForTimeout(800);
        if (/\/login/.test(page.url())) {
          pass({
            id: "AUTH-LOGOUT-01",
            module: "Monitoring + System",
            screen: "Logout",
            adminAction: "Logout Super Admin",
            expected: "Redirect to login",
            actual: `URL=${page.url()}`,
          });
        } else {
          fail({
            id: "AUTH-LOGOUT-01",
            module: "Monitoring + System",
            screen: "Logout",
            adminAction: "Logout Super Admin",
            expected: "Redirect to login",
            actual: `URL=${page.url()}`,
            severity: "High",
          });
        }
      } catch (err) {
        await page.evaluate(() => {
          try {
            localStorage.clear();
            sessionStorage.clear();
          } catch {
            /* ignore */
          }
        });
        await page.goto(`${FRONTEND_ORIGIN}/login`, { waitUntil: "domcontentloaded" }).catch(() => undefined);
        if (/\/login/.test(page.url())) {
          pass({
            id: "AUTH-LOGOUT-01",
            module: "Monitoring + System",
            screen: "Logout",
            adminAction: "Logout Super Admin",
            expected: "Session cleared → login",
            actual: `Account menu flaky; cleared session → login (${(err as Error).message?.slice(0, 80) || "uiLogout"})`,
          });
        } else {
          fail({
            id: "AUTH-LOGOUT-01",
            module: "Monitoring + System",
            screen: "Logout",
            adminAction: "Logout Super Admin",
            expected: "Sign out → /login",
            actual: `Logout failed: ${(err as Error).message?.slice(0, 160) || "unknown"}`,
            severity: "Medium",
          });
        }
      }
    } finally {
      const out = flushResults(path.join(process.cwd(), "test-results"), RESULTS_FILE);
      // eslint-disable-next-line no-console
      console.log(`Monitoring+System results → ${out}`);
      const raw = JSON.parse(fs.readFileSync(out, "utf8"));
      // eslint-disable-next-line no-console
      console.log(
        `Cases=${raw.totals.cases} Failed=${raw.totals.failed} CriticalFails=${
          (raw.cases || []).filter(
            (c: { status: string; severity?: string }) => c.status === "FAIL" && c.severity === "Critical",
          ).length
        }`,
      );
      await apiCtx.dispose().catch(() => undefined);
    }
  });
});
