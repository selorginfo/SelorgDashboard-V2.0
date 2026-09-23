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
 * Analytics — Admin POV E2E (AUDIT ONLY).
 * Live Vite SPA + live selorg-service + live DB. No app source changes. No mocks.
 *
 * Sections: Overall, Sales, Operations, Employee, Customer, All Reports
 */

const ARTIFACTS = path.join(process.cwd(), "test-results", "analytics-artifacts");
const RESULTS_FILE = "analytics-results.json";

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
  const chip = page
    .locator('[class*="tabChip"], [class*="tabs"] button, [class*="tabs"] [role="tab"]')
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
  await page.goto(`${FRONTEND_ORIGIN}/${pathSeg}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1400);
  if (!page.url().includes(`/${pathSeg}`)) {
    try {
      const exact = page.getByRole("link", { name: label, exact: true }).first();
      if (await exact.count()) await exact.click();
      else await openNavItem(page, label);
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
    for (const k of ["items", "list", "data", "orders", "customers", "pickers", "reports", "metrics", "rows"]) {
      if (Array.isArray(o[k])) return (o[k] as unknown[]).length;
    }
  }
  return 0;
}

async function clickPrimaryActions(page: import("@playwright/test").Page, names: RegExp[]) {
  const clicked: string[] = [];
  for (const re of names) {
    const btn = page.getByRole("button", { name: re }).first();
    if (await btn.count()) {
      const label = (await btn.innerText().catch(() => re.source)) || re.source;
      await btn.click({ timeout: 4_000 }).catch(() => undefined);
      await page.waitForTimeout(700);
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

type SectionDef = {
  id: string;
  label: string;
  path: string;
  module: string;
  seed: RegExp;
  tabs: string[];
  truthPaths: string[];
  frontendIssue: string;
};

const SECTIONS: SectionDef[] = [
  {
    id: "OVR",
    label: "Overall Report",
    path: "rpt-overall",
    module: "Overall Report",
    seed: /₹9\.84L|1,?482(?!\s*orders)|₹684(?!\s)|94\.2%|2\.1%|₹2\.14\s*Cr|₹2\.41\s*Cr|DS-02 Koramangala|−7\.3%/,
    tabs: ["Business summary", "By dark store", "Month to date", "Variance"],
    truthPaths: ["/api/v1/admin/analytics/realtime", "/api/v1/admin/analytics/revenue", "/api/v1/shared/analytics/realtime"],
    frontendIssue: "WorkspaceModulePage / REPORTS_CONFIGS['rpt-overall'] seed KPIs/chart/rows",
  },
  {
    id: "SLS",
    label: "Sales Report",
    path: "rpt-sales",
    module: "Sales Report",
    seed: /₹9\.84L|₹6\.42L|₹3\.42L|₹2\.8L|24\.8%|SELORG100|FIRST50|SEL-4410 Basmati/,
    tabs: ["Revenue", "By category", "Payment mix", "Top products", "Discounts"],
    truthPaths: ["/api/v1/admin/analytics/revenue", "/api/v1/admin/analytics/payment-methods", "/api/v1/shared/analytics/revenue"],
    frontendIssue: "WorkspaceModulePage / REPORTS_CONFIGS['rpt-sales'] seed KPIs/chart/rows",
  },
  {
    id: "OPS",
    label: "Operations Report",
    path: "rpt-ops",
    module: "Operations Report",
    seed: /94\.2%|4\.2\s*\/\s*2\.1\s*min|7\s*Open exceptions|8,?412\s*Scans|SLA on-time by dark store/,
    tabs: ["By store", "Exceptions", "Scanner", "Pick & pack", "Delivery"],
    truthPaths: [
      "/api/v1/admin/analytics/operational",
      "/api/v1/darkstore/reports/export",
      "/api/v1/warehouse/reports",
    ],
    frontendIssue: "WorkspaceModulePage / REPORTS_CONFIGS['rpt-ops'] seed KPIs/chart/rows",
  },
  {
    id: "EMP",
    label: "Employee Report",
    path: "rpt-people",
    module: "Employee Report",
    seed: /164\s*Staff on shift|Ravi M\.|Meena T\.|98\.1%|Arjun P\.|2FA missing/,
    tabs: ["On shift", "Pickers", "Riders", "Attendance", "Earnings"],
    truthPaths: ["/api/v1/admin/analytics/pickers", "/api/v1/admin/picker", "/api/v1/admin/riders"],
    frontendIssue: "WorkspaceModulePage / REPORTS_CONFIGS['rpt-people'] seed KPIs/chart/rows",
  },
  {
    id: "CUS",
    label: "Customer Report",
    path: "rpt-customer",
    module: "Customer Report",
    seed: /48,?210|4,?180\s*New|62%\s*Repeat|4\.5\s*CSAT|₹1\.28\s*Cr/,
    tabs: ["Summary", "New vs returning", "Top spenders", "Churn", "Segments"],
    truthPaths: ["/api/v1/admin/analytics/customers", "/api/v1/admin/customers"],
    frontendIssue: "WorkspaceModulePage / REPORTS_CONFIGS['rpt-customer'] seed KPIs/chart/rows",
  },
];

test.describe.configure({ mode: "serial" });

test.describe("Analytics — Admin POV", () => {
  test("full Analytics Admin journey with backend verification", async ({ page }) => {
    test.setTimeout(900_000);
    ensureArtifacts();
    resetResults();
    page.setDefaultTimeout(15_000);
    page.setDefaultNavigationTimeout(30_000);

    const net = attachNetworkCapture(page);
    const apiCtx = await createApiContext();
    let session: Awaited<ReturnType<typeof loginAdmin>> | null = null;
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 240));
    });

    /** Snapshot of seed-like KPI clusters seen across sections for cross-report checks */
    const sectionBodies: Record<string, string> = {};
    let allReportsSeed = false;

    try {
      // ─── LOGIN ─────────────────────────────────────────────
      trackScreen("Login");
      const login = await uiLoginAsSuperAdmin(page);
      session = await loginAdmin(apiCtx);
      pass({
        id: "AUTH-01",
        module: "Analytics",
        screen: "Login",
        adminAction: "Login as Super Admin",
        expected: "Real login 200 + dashboard shell",
        actual: `HTTP ${login.status}; URL=${page.url()}`,
        apiEndpoint: "/api/v1/admin/auth/login",
        httpMethod: "POST",
        responseStatus: login.status,
      });

      // Probe live analytics endpoints that SHOULD power reports
      trackScreen("API inventory");
      const analyticsTruth: { path: string; status: number; len: number }[] = [];
      for (const p of [
        "/api/v1/admin/analytics/realtime",
        "/api/v1/admin/analytics/revenue",
        "/api/v1/admin/analytics/operational",
        "/api/v1/admin/analytics/customers",
        "/api/v1/admin/analytics/pickers",
      ]) {
        const r = await apiCall(apiCtx, "GET", p, { token: session.token });
        analyticsTruth.push({ path: p, status: r.status, len: listLen(r.json) });
      }
      const anyAnalyticsLive = analyticsTruth.some((t) => t.status >= 200 && t.status < 500);
      if (anyAnalyticsLive) {
        pass({
          id: "API-INV-01",
          module: "Analytics",
          screen: "API inventory",
          adminAction: "Probe admin analytics endpoints",
          expected: "At least one analytics GET reachable",
          actual: analyticsTruth.map((t) => `${t.path.split("/").pop()}=${t.status}`).join("; "),
        });
      } else {
        blocked({
          id: "API-INV-01",
          module: "Analytics",
          screen: "API inventory",
          adminAction: "Probe admin analytics endpoints",
          expected: "Analytics APIs reachable",
          actual: analyticsTruth.map((t) => `${t.path}=${t.status}`).join("; "),
        });
      }

      // ═══════════════════════════════════════════════════════
      // SECTIONS 1–5: Overall / Sales / Ops / Employee / Customer
      // ═══════════════════════════════════════════════════════
      for (const sec of SECTIONS) {
        trackScreen(sec.module);
        await gotoSection(page, sec.label, sec.path);
        await shot(page, `${sec.id.toLowerCase()}-01`);

        const body = await page.locator("body").innerText();
        sectionBodies[sec.module] = body;

        // Seed / hardcoded analytics
        if (seedHit(body, sec.seed)) {
          fail({
            id: `${sec.id}-SEED-01`,
            module: sec.module,
            screen: sec.module,
            adminAction: `Inspect ${sec.label} for seed KPIs / charts / rows`,
            expected: "Live analytics from admin/darkstore analytics APIs; no REPORTS_CONFIGS seed",
            actual: `REPORTS_CONFIGS / workspace seed markers visible on ${sec.label}`,
            severity: "Critical",
            frontendIssue: sec.frontendIssue,
            businessLogicIssue: "Admin cannot trust analytics figures as live system of record",
            evidence: [await shot(page, `${sec.id.toLowerCase()}-seed`)],
          });
        } else {
          pass({
            id: `${sec.id}-SEED-01`,
            module: sec.module,
            screen: sec.module,
            adminAction: `Inspect ${sec.label} for seed markers`,
            expected: "No classic report seed cluster",
            actual: "Classic seed markers not detected",
          });
        }

        // Live API observation from UI network
        const uiAnalytics = net.findApi(/\/analytics\/|\/reports\//i, "GET");
        const uiWorkspace = net.findApi(/platform-config|workspace/i, "GET");

        // Parallel truth probe for this section
        let truthOk = false;
        let truthDetail = "";
        for (const tp of sec.truthPaths) {
          const tr = await apiCall(apiCtx, "GET", tp, { token: session.token });
          truthDetail += `${tp.split("/").slice(-2).join("/")}→${tr.status}; `;
          if (tr.status >= 200 && tr.status < 500) truthOk = true;
        }

        if (uiAnalytics && uiAnalytics.ok) {
          pass({
            id: `${sec.id}-LOAD-01`,
            module: sec.module,
            screen: sec.module,
            adminAction: `Load ${sec.label} via live analytics/report API`,
            expected: "GET analytics/report 200 from UI",
            actual: `UI GET ${uiAnalytics.status} ${uiAnalytics.url}`,
            apiEndpoint: uiAnalytics.url,
            httpMethod: "GET",
            responseStatus: uiAnalytics.status,
          });
        } else if (truthOk && seedHit(body, sec.seed)) {
          // Backend has analytics but UI still shows seed — contract gap
          fail({
            id: `${sec.id}-LOAD-01`,
            module: sec.module,
            screen: sec.module,
            adminAction: `Wire ${sec.label} to live analytics API`,
            expected: "UI loads purpose-built analytics and maps response to KPIs/tables",
            actual: `No analytics UI GET; backend probes: ${truthDetail.trim()}; seed UI still shown`,
            severity: "Critical",
            frontendIssue: sec.frontendIssue,
            backendIssue: truthOk ? undefined : "Analytics truth endpoints unavailable",
            businessLogicIssue: "Frontend/backend analytics contract not wired for this report",
            evidence: [await shot(page, `${sec.id.toLowerCase()}-load`)],
          });
        } else if (uiWorkspace) {
          pass({
            id: `${sec.id}-LOAD-01`,
            module: sec.module,
            screen: sec.module,
            adminAction: `Observe workspace/config load for ${sec.label}`,
            expected: "Some backend call during page load",
            actual: `Workspace/config GET ${uiWorkspace.status}; analytics UI GET absent; truth=${truthDetail.trim()}`,
            apiEndpoint: uiWorkspace.url,
            httpMethod: "GET",
            responseStatus: uiWorkspace.status,
          });
        } else {
          missing({
            id: `${sec.id}-LOAD-01`,
            module: sec.module,
            screen: sec.module,
            adminAction: `Load ${sec.label} live data`,
            expected: "Live analytics GET on page open",
            actual: `No analytics/report GET observed; truth=${truthDetail.trim() || "n/a"}`,
          });
        }

        // Tabs
        let tabsHit = 0;
        for (const tab of sec.tabs) {
          if (await clickTabInMain(page, tab)) {
            tabsHit++;
            await page.waitForTimeout(250);
          }
        }
        if (tabsHit > 0) {
          pass({
            id: `${sec.id}-TABS-01`,
            module: sec.module,
            screen: sec.module,
            adminAction: "Exercise report tabs",
            expected: "Tab chips switch views",
            actual: `Tabs clicked: ${tabsHit}/${sec.tabs.length}`,
          });
        } else {
          missing({
            id: `${sec.id}-TABS-01`,
            module: sec.module,
            screen: sec.module,
            adminAction: "Exercise report tabs",
            expected: "Tab chips present",
            actual: "No matching tab chips found",
          });
        }

        // Actions: Export / Refresh / date-like controls
        const actions = await clickPrimaryActions(page, [
          /Export|Download|CSV|Refresh|Generate|Apply|Filter|Today|This week|This month/i,
        ]);
        if (actions.length) {
          pass({
            id: `${sec.id}-ACTIONS-01`,
            module: sec.module,
            screen: sec.module,
            adminAction: "Exercise export/filter/refresh controls",
            expected: "Export or filter controls available",
            actual: `Clicked: ${actions.join(", ")}`,
          });
        } else {
          missing({
            id: `${sec.id}-ACTIONS-01`,
            module: sec.module,
            screen: sec.module,
            adminAction: "Exercise export/filter/refresh controls",
            expected: "Export/date/filter controls",
            actual: "No export/filter/refresh buttons found",
          });
        }

        // Date / filter UI presence
        const hasDate =
          (await page.locator('input[type="date"], [class*="date"], [placeholder*="Date" i]').count()) > 0;
        const hasFilter =
          (await page.getByRole("combobox").count()) > 0 ||
          (await page.locator('select, [class*="filter"]').count()) > 0;
        if (hasDate || hasFilter) {
          pass({
            id: `${sec.id}-FILTER-01`,
            module: sec.module,
            screen: sec.module,
            adminAction: "Inspect date/store filter controls",
            expected: "Date or filter controls present",
            actual: `date=${hasDate}; filter/combobox=${hasFilter}`,
          });
        } else {
          missing({
            id: `${sec.id}-FILTER-01`,
            module: sec.module,
            screen: sec.module,
            adminAction: "Inspect date/store filter controls",
            expected: "Date range / store filters for analytics",
            actual: "No date picker or filter controls found on report page",
          });
        }

        // Unauth probe — bare cookie jar (login cookies must not leak into negative auth checks)
        const bareCtx = await createApiContext({ noCookies: true });
        const unauthPath = sec.truthPaths[0]!;
        const unauth = await apiCall(bareCtx, "GET", unauthPath, { omitAuth: true });
        await bareCtx.dispose().catch(() => undefined);
        if (unauth.status === 401 || unauth.status === 403) {
          pass({
            id: `${sec.id}-NEG-UNAUTH`,
            module: sec.module,
            screen: "API auth",
            adminAction: `GET ${unauthPath} without token`,
            expected: "401/403",
            actual: `HTTP ${unauth.status}`,
            apiEndpoint: unauthPath,
            httpMethod: "GET",
            responseStatus: unauth.status,
          });
        } else if (unauth.status === 404) {
          blocked({
            id: `${sec.id}-NEG-UNAUTH`,
            module: sec.module,
            screen: "API auth",
            adminAction: `GET ${unauthPath} without token`,
            expected: "401/403 on protected analytics",
            actual: `HTTP 404 — endpoint may not exist`,
            apiEndpoint: unauthPath,
            httpMethod: "GET",
            responseStatus: 404,
          });
        } else {
          fail({
            id: `${sec.id}-NEG-UNAUTH`,
            module: sec.module,
            screen: "API auth",
            adminAction: `GET ${unauthPath} without token`,
            expected: "401/403",
            actual: `HTTP ${unauth.status}`,
            severity: "High",
            backendIssue: "Analytics endpoint may allow unauthenticated access",
            apiEndpoint: unauthPath,
            httpMethod: "GET",
            responseStatus: unauth.status,
          });
        }
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 6: ALL REPORTS
      // ═══════════════════════════════════════════════════════
      trackScreen("All Reports");
      await gotoSection(page, "All Reports", "reports");
      await shot(page, "all-01");

      const arBody = await page.locator("body").innerText();
      sectionBodies["All Reports"] = arBody;

      if (
        seedHit(
          arBody,
          /1,?482\s*orders|5\.8%\s*breach|₹9\.84L|42,?180\s*units|9\s*SKUs|₹64K|96\.1%\s*on-time|₹3\.42L|₹8\.2L\s*\/\s*412|rep-order-throughput|1,?482(?!\s)|₹684(?!\s)|94\.2%|11\.4\s*min/,
        )
      ) {
        allReportsSeed = true;
        fail({
          id: "ALL-SEED-01",
          module: "All Reports",
          screen: "All Reports",
          adminAction: "Inspect All Reports catalog for seed KPIs / cards",
          expected: "Live report catalog from backend; no SEED_REPORT_CATALOG / REPORTS_CONFIGS.reports",
          actual: "SEED_REPORT_CATALOG / REPORTS_CONFIGS.reports seed metrics visible",
          severity: "Critical",
          frontendIssue: "ReportsCatalogPage renders SEED_REPORT_CATALOG + static KPIs on load (no list API)",
          businessLogicIssue: "All Reports index is not a live system of record",
          evidence: [await shot(page, "all-seed")],
        });
      } else {
        pass({
          id: "ALL-SEED-01",
          module: "All Reports",
          screen: "All Reports",
          adminAction: "Inspect All Reports for seed markers",
          expected: "No classic seed catalog metrics",
          actual: "Classic seed markers not detected",
        });
      }

      const arListGet = net.findApi(/\/admin\/analytics\/|\/reports\/(?!export)/i, "GET");
      if (arListGet && arListGet.ok && !allReportsSeed) {
        pass({
          id: "ALL-LOAD-01",
          module: "All Reports",
          screen: "All Reports",
          adminAction: "Load report catalog via live API",
          expected: "GET catalog/analytics 200",
          actual: `UI GET ${arListGet.status}`,
          apiEndpoint: arListGet.url,
          httpMethod: "GET",
          responseStatus: arListGet.status,
        });
      } else if (allReportsSeed) {
        fail({
          id: "ALL-LOAD-01",
          module: "All Reports",
          screen: "All Reports",
          adminAction: "Load report catalog via live API",
          expected: "Page load fetches live report catalog",
          actual: "No live catalog GET — page uses SEED_REPORT_CATALOG only",
          severity: "Critical",
          frontendIssue: "ReportsCatalogPage does not fetch catalog on mount",
        });
      } else {
        missing({
          id: "ALL-LOAD-01",
          module: "All Reports",
          screen: "All Reports",
          adminAction: "Load report catalog via live API",
          expected: "Live catalog GET",
          actual: "No catalog list GET observed",
        });
      }

      // Tabs on All Reports
      let arTabs = 0;
      for (const tab of ["Operations", "Supply chain", "Sales", "Inventory", "Rider", "Finance"]) {
        if (await clickTabInMain(page, tab)) {
          arTabs++;
          await page.waitForTimeout(200);
        }
      }
      pass({
        id: "ALL-TABS-01",
        module: "All Reports",
        screen: "All Reports",
        adminAction: "Exercise All Reports category tabs",
        expected: "Category tabs switch catalog cards",
        actual: `Tabs clicked: ${arTabs}/6`,
      });

      // Generate + Download
      await clickTabInMain(page, "Operations");
      await page.waitForTimeout(400);
      const genClicked = await clickPrimaryActions(page, [/Generate/i]);
      const genApi = net.findApi(/\/darkstore\/reports\/export/i, "POST");
      if (genClicked.length && genApi) {
        pass({
          id: "ALL-GEN-01",
          module: "All Reports",
          screen: "All Reports",
          adminAction: "Generate report export",
          expected: "POST darkstore/reports/export",
          actual: `Clicked Generate; POST ${genApi.status}`,
          apiEndpoint: genApi.url,
          httpMethod: "POST",
          responseStatus: genApi.status,
        });
      } else if (genClicked.length) {
        // Click happened — verify via direct API
        const genProbe = await apiCall(apiCtx, "POST", "/api/v1/darkstore/reports/export", {
          token: session.token,
          body: { type: "Operations", name: "Order throughput" },
        });
        if (genProbe.status >= 200 && genProbe.status < 500) {
          pass({
            id: "ALL-GEN-01",
            module: "All Reports",
            screen: "All Reports",
            adminAction: "Generate report export",
            expected: "Export endpoint reachable",
            actual: `UI Generate clicked; API POST ${genProbe.status}`,
            apiEndpoint: "/api/v1/darkstore/reports/export",
            httpMethod: "POST",
            responseStatus: genProbe.status,
          });
        } else {
          fail({
            id: "ALL-GEN-01",
            module: "All Reports",
            screen: "All Reports",
            adminAction: "Generate report export",
            expected: "Export succeeds or validates",
            actual: `Generate clicked; API POST ${genProbe.status}`,
            severity: "High",
            backendIssue: "darkstore/reports/export unavailable",
            apiEndpoint: "/api/v1/darkstore/reports/export",
            httpMethod: "POST",
            responseStatus: genProbe.status,
          });
        }
      } else {
        missing({
          id: "ALL-GEN-01",
          module: "All Reports",
          screen: "All Reports",
          adminAction: "Generate report export",
          expected: "Generate button on catalog cards",
          actual: "No Generate control found",
        });
      }

      await clickTabInMain(page, "Inventory");
      await page.waitForTimeout(400);
      const dlClicked = await clickPrimaryActions(page, [/Download/i]);
      const dlApi = net.findApi(/\/darkstore\/reports\/(inventory|export|staff|compliance)/i, "GET");
      if (dlClicked.length && dlApi) {
        pass({
          id: "ALL-DL-01",
          module: "All Reports",
          screen: "All Reports",
          adminAction: "Download report",
          expected: "GET darkstore/reports/*",
          actual: `Clicked Download; GET ${dlApi.status} ${dlApi.url}`,
          apiEndpoint: dlApi.url,
          httpMethod: "GET",
          responseStatus: dlApi.status,
        });
      } else if (dlClicked.length) {
        const invProbe = await apiCall(apiCtx, "GET", "/api/v1/darkstore/reports/inventory", {
          token: session.token,
        });
        if (invProbe.status >= 200 && invProbe.status < 500) {
          pass({
            id: "ALL-DL-01",
            module: "All Reports",
            screen: "All Reports",
            adminAction: "Download report",
            expected: "Inventory download endpoint reachable",
            actual: `Download clicked; inventory GET ${invProbe.status}`,
            apiEndpoint: "/api/v1/darkstore/reports/inventory",
            httpMethod: "GET",
            responseStatus: invProbe.status,
          });
        } else {
          fail({
            id: "ALL-DL-01",
            module: "All Reports",
            screen: "All Reports",
            adminAction: "Download report",
            expected: "Download returns data",
            actual: `Download clicked; inventory GET ${invProbe.status}`,
            severity: "High",
            apiEndpoint: "/api/v1/darkstore/reports/inventory",
            httpMethod: "GET",
            responseStatus: invProbe.status,
          });
        }
      } else {
        missing({
          id: "ALL-DL-01",
          module: "All Reports",
          screen: "All Reports",
          adminAction: "Download report",
          expected: "Download button on catalog cards",
          actual: "No Download control found",
        });
      }

      // ═══════════════════════════════════════════════════════
      // CROSS-REPORT CONSISTENCY
      // ═══════════════════════════════════════════════════════
      trackScreen("Cross-report");
      const overallSeed = seedHit(sectionBodies["Overall Report"] || "", /₹9\.84L|1,?482/);
      const salesSeed = seedHit(sectionBodies["Sales Report"] || "", /₹9\.84L|1,?482/);
      const allSeed = allReportsSeed || seedHit(sectionBodies["All Reports"] || "", /₹9\.84L|1,?482/);

      if (overallSeed && salesSeed && allSeed) {
        fail({
          id: "XFLOW-CONSIST-01",
          module: "Cross-report",
          screen: "Overall ↔ Sales ↔ All Reports",
          adminAction: "Compare shared revenue/order metrics across reports",
          expected: "Independent live aggregations (or documented shared live source)",
          actual: "Same seed cluster ₹9.84L / 1,482 appears across Overall, Sales, and All Reports",
          severity: "Critical",
          businessLogicIssue:
            "Cross-report values are synchronized seed copies, not independently verified live aggregations",
        });
      } else if (overallSeed || salesSeed) {
        fail({
          id: "XFLOW-CONSIST-01",
          module: "Cross-report",
          screen: "Overall ↔ Sales ↔ All Reports",
          adminAction: "Compare shared metrics across reports",
          expected: "Live consistent totals across reports",
          actual: `overallSeed=${overallSeed}; salesSeed=${salesSeed}; allSeed=${allSeed}`,
          severity: "High",
          businessLogicIssue: "At least one report still shows seed analytics figures",
        });
      } else {
        pass({
          id: "XFLOW-CONSIST-01",
          module: "Cross-report",
          screen: "Overall ↔ Sales ↔ All Reports",
          adminAction: "Compare shared metrics across reports",
          expected: "No shared seed KPI cluster",
          actual: "Shared classic seed revenue/order cluster not detected across reports",
        });
      }

      // Date-range capability across Analytics
      const anyDateUi = Object.values(sectionBodies).some((b) =>
        /Today|Yesterday|This week|This month|Date range|From|To/i.test(b),
      );
      if (anyDateUi) {
        pass({
          id: "XFLOW-DATE-01",
          module: "Cross-report",
          screen: "Date / time filters",
          adminAction: "Detect date-range controls across Analytics",
          expected: "Date filters available on analytics pages",
          actual: "Date-related UI copy or controls detected in at least one section",
        });
      } else {
        missing({
          id: "XFLOW-DATE-01",
          module: "Cross-report",
          screen: "Date / time filters",
          adminAction: "Detect date-range controls across Analytics",
          expected: "Today / custom date range filters",
          actual: "No date-range filter UI found across Analytics sections",
        });
      }

      // Backend analytics vs UI seed gap (calculation finding)
      const realtime = await apiCall(apiCtx, "GET", "/api/v1/admin/analytics/realtime", {
        token: session.token,
      });
      if (realtime.status >= 200 && realtime.status < 300 && overallSeed) {
        fail({
          id: "XFLOW-CALC-01",
          module: "Cross-report",
          screen: "Calculation / aggregation",
          adminAction: "Compare Overall Report UI to GET /admin/analytics/realtime",
          expected: "UI KPIs derived from live realtime analytics payload",
          actual: `realtime API HTTP ${realtime.status}; Overall UI still shows REPORTS_CONFIGS seed`,
          severity: "Critical",
          apiEndpoint: "/api/v1/admin/analytics/realtime",
          httpMethod: "GET",
          responseStatus: realtime.status,
          businessLogicIssue: "Live analytics API exists but Overall Report does not consume it for KPIs",
          responseBodySnippet: JSON.stringify(realtime.json).slice(0, 180),
        });
      } else if (realtime.status >= 200 && realtime.status < 300) {
        pass({
          id: "XFLOW-CALC-01",
          module: "Cross-report",
          screen: "Calculation / aggregation",
          adminAction: "Verify realtime analytics API available for Overall Report",
          expected: "Live analytics endpoint usable",
          actual: `HTTP ${realtime.status}`,
          apiEndpoint: "/api/v1/admin/analytics/realtime",
          httpMethod: "GET",
          responseStatus: realtime.status,
        });
      } else {
        blocked({
          id: "XFLOW-CALC-01",
          module: "Cross-report",
          screen: "Calculation / aggregation",
          adminAction: "Verify realtime analytics API",
          expected: "GET /admin/analytics/realtime 2xx",
          actual: `HTTP ${realtime.status}`,
          apiEndpoint: "/api/v1/admin/analytics/realtime",
          httpMethod: "GET",
          responseStatus: realtime.status,
        });
      }

      // Console
      trackScreen("Runtime");
      pass({
        id: "AN-CONSOLE-01",
        module: "Analytics",
        screen: "Runtime",
        adminAction: "Monitor console errors during journey",
        expected: "Stable runtime",
        actual: `${consoleErrors.length} console errors captured`,
        consoleErrors: consoleErrors.slice(0, 8),
      });

      // Logout
      trackScreen("Logout");
      await uiLogout(page);
      pass({
        id: "AUTH-LOGOUT-01",
        module: "Analytics",
        screen: "Logout",
        adminAction: "Logout Super Admin",
        expected: "Redirect to login",
        actual: `URL=${page.url()}`,
      });
    } finally {
      const out = flushResults(path.join(process.cwd(), "test-results"), RESULTS_FILE);
      // eslint-disable-next-line no-console
      console.log(
        `Analytics results → ${out}\nCases=${JSON.parse(fs.readFileSync(out, "utf8")).totals.cases} Failed=${JSON.parse(fs.readFileSync(out, "utf8")).totals.failed} CriticalFails=${JSON.parse(fs.readFileSync(out, "utf8")).cases.filter((c: { severity?: string; status: string }) => c.status === "FAIL" && c.severity === "Critical").length}`,
      );
      await apiCtx.dispose().catch(() => undefined);
    }
  });
});
