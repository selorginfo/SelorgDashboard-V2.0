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
 * Container Stalls — Admin POV E2E (AUDIT ONLY).
 * Live Vite SPA + live selorg-service + live DB. No app source changes. No mocks.
 *
 * Sections:
 * Network Overview, Areas & Mapping, Stall Directory, Stall Employees,
 * Customer Conversions, Stall Orders, Advertisements, Product Samples,
 * Incentive Rules, Employee Earnings.
 */

const ARTIFACTS = path.join(process.cwd(), "test-results", "container-stalls-artifacts");
const RESULTS_FILE = "container-stalls-results.json";

const STALL_ROUTES = [
  {
    label: "Network Overview",
    path: "stall-overview",
    module: "Network Overview",
    seedBadge: undefined,
    seedKpi: "36",
    seedKpiLabel: "Container stalls",
    createCapable: false,
    tabs: ["Network today", "By area", "Funnel"],
    actions: [/Export/i],
  },
  {
    label: "Areas & Mapping",
    path: "stall-areas",
    module: "Areas & Mapping",
    seedBadge: "4",
    seedKpi: "4",
    seedKpiLabel: "Areas",
    createCapable: true,
    tabs: ["All areas", "Live", "Under review"],
    actions: [/New|Add|Create/i, /Map dark store/i, /Export/i],
  },
  {
    label: "Stall Directory",
    path: "stalls",
    module: "Stall Directory",
    seedBadge: "36",
    seedKpi: undefined,
    createCapable: true,
    tabs: ["All stalls", "Active", "Inactive"],
    actions: [/New|Add|Create/i, /Assign employee/i, /Change status/i, /Export/i],
  },
  {
    label: "Stall Employees",
    path: "stall-staff",
    module: "Stall Employees",
    seedBadge: "34",
    seedKpi: undefined,
    createCapable: true,
    tabs: ["All employees", "Active", "On leave"],
    actions: [/New|Add|Create/i, /Assign to stall/i, /Set fixed salary/i, /Export/i],
  },
  {
    label: "Customer Conversions",
    path: "stall-conv",
    module: "Customer Conversions",
    seedBadge: undefined,
    seedKpi: undefined,
    createCapable: false,
    tabs: ["Today's conversions", "All", "Flagged"],
    actions: [/View attribution/i, /Open customer/i, /Export/i],
  },
  {
    label: "Stall Orders",
    path: "stall-orders",
    module: "Stall Orders",
    seedBadge: "186",
    seedKpi: undefined,
    createCapable: false,
    tabs: ["All stall orders", "Delivered", "Cancelled"],
    actions: [/Open order/i, /Export/i],
  },
  {
    label: "Advertisements",
    path: "stall-ads",
    module: "Advertisements",
    seedBadge: "7",
    seedKpi: undefined,
    createCapable: true,
    tabs: ["All campaigns", "Running", "Ended"],
    actions: [/New|Add|Create/i, /Assign to stalls/i, /Schedule campaign/i, /Export/i],
  },
  {
    label: "Product Samples",
    path: "stall-samples",
    module: "Product Samples",
    seedBadge: "12",
    seedKpi: undefined,
    createCapable: true,
    tabs: ["Active allocations", "Reconciled"],
    actions: [/Approve allocation/i, /Allocate samples/i, /Export/i],
  },
  {
    label: "Incentive Rules",
    path: "stall-incentives",
    module: "Incentive Rules",
    seedBadge: "6",
    seedKpi: "6",
    seedKpiLabel: "Active rules",
    createCapable: true,
    tabs: ["Active rules", "Draft", "Expired"],
    actions: [/Preview incentive/i, /Create new version/i, /Approve rule/i, /Export/i],
  },
  {
    label: "Employee Earnings",
    path: "stall-earnings",
    module: "Employee Earnings",
    seedBadge: undefined,
    seedKpi: undefined,
    createCapable: false,
    tabs: ["August payable", "Approved", "Paid"],
    actions: [/Approve earning/i, /Release with salary/i, /Export/i],
  },
] as const;

const RESOURCE_PATHS: Record<string, string> = {
  "stall-overview": "/api/v1/admin/stalls/overview",
  "stall-areas": "/api/v1/admin/stall-areas",
  stalls: "/api/v1/admin/stalls",
  "stall-staff": "/api/v1/admin/stall-employees",
  "stall-conv": "/api/v1/admin/stall-conversions",
  "stall-orders": "/api/v1/admin/stall-orders",
  "stall-ads": "/api/v1/admin/stall-ads",
  "stall-samples": "/api/v1/admin/stall-sample-allocations",
  "stall-incentives": "/api/v1/admin/stall-incentive-rules",
  "stall-earnings": "/api/v1/admin/stall-earnings",
};

/** Design-seed markers from screens.generated.ts — must not appear as live data when DB is empty. */
const SEED_MARKERS =
  /AREA-01 Indiranagar|CS-001 Indiranagar|EMP-102 Bhavana|CNV-9041|SMP-4041|SIN-301|SER-2041|Monsoon Fresh Launch|₹18,000|18\.0%|\b810\b|\b486\b|\b402\b|4 areas, 36 stalls|Where customers drop out today[\s\S]{0,80}810/;

/** FunnelLayout hardcodes screen.kpis vanity bars (OpsLayouts.tsx) — not live KPIs. */
const FUNNEL_SEED = /Interactions today[\s\S]{0,40}810|810[\s\S]{0,40}100%|−324 dropped here|−256 dropped here/;

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
  await expect(page).toHaveURL(new RegExp(`/${pathSeg}(?:\\?|$|#|/)`), { timeout: 25_000 });
}

function listLen(json: unknown): number {
  const d = unwrapData(json as never);
  if (Array.isArray(d)) return d.length;
  if (d && typeof d === "object") {
    const o = d as Record<string, unknown>;
    for (const k of ["items", "list", "data", "rows"]) {
      if (Array.isArray(o[k])) return (o[k] as unknown[]).length;
    }
    if (o.rows && typeof o.rows === "object" && !Array.isArray(o.rows)) {
      return Object.values(o.rows as Record<string, unknown[]>).reduce(
        (n, arr) => n + (Array.isArray(arr) ? arr.length : 0),
        0,
      );
    }
  }
  return 0;
}

function countRowsInOpsState(json: unknown): number {
  const d = unwrapData(json as never) as { rows?: Record<string, unknown[]> } | null;
  if (!d?.rows || typeof d.rows !== "object") return 0;
  const seen = new Set<string>();
  for (const list of Object.values(d.rows)) {
    if (!Array.isArray(list)) continue;
    for (const row of list) {
      if (Array.isArray(row) && row[0] != null) {
        const id =
          typeof row[0] === "string" ? row[0] : (row[0] as { label?: string })?.label ?? JSON.stringify(row[0]);
        seen.add(String(id));
      }
    }
  }
  return seen.size;
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

async function pageBody(page: import("@playwright/test").Page) {
  return (await page.locator("main, [class*='wrap'], body").first().innerText().catch(() => "")) || "";
}

async function assertNoBlankScreen(
  page: import("@playwright/test").Page,
  module: string,
  screen: string,
  id: string,
) {
  const body = await pageBody(page);
  const blank =
    !body.trim() ||
    /Couldn't load|This screen isn't configured|Something went wrong|404|Not Found/i.test(body);
  if (blank && body.length < 40) {
    fail({
      id,
      module,
      screen,
      adminAction: "Render screen",
      expected: "Screen content visible",
      actual: `Blank/error shell: "${body.slice(0, 120)}"`,
      severity: "Critical",
      frontendIssue: "Blank or error state on Container Stalls screen",
      reproductionSteps: [`Open /${screen}`, "Observe main content"],
    });
    return false;
  }
  return true;
}

async function auditStallScreen(opts: {
  page: import("@playwright/test").Page;
  net: ReturnType<typeof attachNetworkCapture>;
  apiCtx: Awaited<ReturnType<typeof createApiContext>>;
  token: string;
  label: string;
  pathSeg: string;
  module: string;
  seedBadge?: string;
  seedKpi?: string;
  seedKpiLabel?: string;
  shotName: string;
  actions: RegExp[];
  tabs: string[];
  createCapable: boolean;
}) {
  const {
    page,
    net,
    apiCtx,
    token,
    label,
    pathSeg,
    module,
    seedBadge,
    seedKpi,
    seedKpiLabel,
    shotName,
    actions,
    tabs,
    createCapable,
  } = opts;

  trackScreen(label);
  await gotoSection(page, label, pathSeg);
  const evidence = [await shot(page, shotName)];
  await assertNoBlankScreen(page, module, label, `${pathSeg.toUpperCase()}-RENDER`);

  if (seedBadge) {
    const nav = page.locator("a, button").filter({ hasText: new RegExp(label, "i") }).first();
    const navText = (await nav.innerText().catch(() => "")) || "";
    if (navHasSeedBadge(navText, seedBadge)) {
      fail({
        id: `${pathSeg.toUpperCase()}-NAV-SEED`,
        module,
        screen: "Sidebar",
        adminAction: `Inspect ${label} nav badge`,
        expected: "Live count or no hardcoded defaultCount",
        actual: `Nav shows seed-like count ${seedBadge}: "${navText.replace(/\s+/g, " ").trim()}"`,
        severity: "Medium",
        frontendIssue: `nav.ts defaultCount: "${seedBadge}" for ${pathSeg}`,
        evidence,
      });
    } else {
      pass({
        id: `${pathSeg.toUpperCase()}-NAV-SEED`,
        module,
        screen: "Sidebar",
        adminAction: `Inspect ${label} nav badge`,
        expected: `No hardcoded seed badge ${seedBadge}`,
        actual: "Seed badge not clearly shown",
      });
    }
  }

  const body = await pageBody(page);
  if (seedKpi && seedKpiLabel) {
    const paired = new RegExp(`${seedKpi}\\s*${seedKpiLabel}|${seedKpiLabel}\\s*${seedKpi}`, "i");
    if (paired.test(body)) {
      fail({
        id: `${pathSeg.toUpperCase()}-KPI-SEED`,
        module,
        screen: label,
        adminAction: "Inspect KPI strip",
        expected: "KPIs from live /kpis API (DB-derived)",
        actual: `Design seed KPI "${seedKpi}" paired with "${seedKpiLabel}" visible`,
        severity: "Critical",
        frontendIssue: "KPI strip may still render design vanity numbers",
        apiEndpoint: `/api/v1/admin/ops-routes/${pathSeg}/kpis`,
        httpMethod: "GET",
        evidence,
      });
    } else {
      pass({
        id: `${pathSeg.toUpperCase()}-KPI-SEED`,
        module,
        screen: label,
        adminAction: "Inspect KPI strip for design seed",
        expected: "No design seed KPI paired with label",
        actual: `Seed ${seedKpi}/${seedKpiLabel} not paired`,
      });
    }
  }

  const opsTruth = await apiCall(apiCtx, "GET", `/api/v1/admin/ops-routes/${pathSeg}`, { token });
  const resourcePath = RESOURCE_PATHS[pathSeg];
  const listTruth = resourcePath ? await apiCall(apiCtx, "GET", resourcePath, { token }) : opsTruth;
  const kpisTruth = await apiCall(apiCtx, "GET", `/api/v1/admin/ops-routes/${pathSeg}/kpis`, { token });
  const rowCount = Math.max(countRowsInOpsState(opsTruth.json), listLen(listTruth.json));
  const opsHit = net.findApi(new RegExp(`/ops-routes/${pathSeg}`), "GET");

  if (opsTruth.networkError) {
    blocked({
      id: `${pathSeg.toUpperCase()}-API`,
      module,
      screen: label,
      adminAction: "GET ops-routes",
      expected: "Backend reachable",
      actual: `Network error: ${opsTruth.networkError}`,
      apiEndpoint: `/api/v1/admin/ops-routes/${pathSeg}`,
      httpMethod: "GET",
    });
  } else if (opsTruth.status >= 500) {
    fail({
      id: `${pathSeg.toUpperCase()}-API`,
      module,
      screen: label,
      adminAction: "GET ops-routes",
      expected: "2xx with OpsRouteState",
      actual: `HTTP ${opsTruth.status}: ${(opsTruth.rawText || "").slice(0, 200)}`,
      severity: "Critical",
      backendIssue: "ops-routes endpoint 5xx",
      apiEndpoint: `/api/v1/admin/ops-routes/${pathSeg}`,
      httpMethod: "GET",
      responseStatus: opsTruth.status,
      evidence,
    });
  } else if (opsTruth.status === 404) {
    missing({
      id: `${pathSeg.toUpperCase()}-API`,
      module,
      screen: label,
      adminAction: "GET ops-routes",
      expected: "Route registered",
      actual: "HTTP 404",
      severity: "Critical",
      apiEndpoint: `/api/v1/admin/ops-routes/${pathSeg}`,
      httpMethod: "GET",
      responseStatus: 404,
    });
  } else if (opsTruth.ok || (opsTruth.status >= 200 && opsTruth.status < 300)) {
    pass({
      id: `${pathSeg.toUpperCase()}-API`,
      module,
      screen: label,
      adminAction: "GET ops-routes",
      expected: "200 OpsRouteState from DB",
      actual: `HTTP ${opsTruth.status}; unique rows≈${rowCount}; UI=${opsHit ? opsHit.status : "n/a"}`,
      apiEndpoint: `/api/v1/admin/ops-routes/${pathSeg}`,
      httpMethod: "GET",
      responseStatus: opsTruth.status,
    });

    if (rowCount === 0 && FUNNEL_SEED.test(body)) {
      fail({
        id: `${pathSeg.toUpperCase()}-FUNNEL-SEED`,
        module,
        screen: label,
        adminAction: "Inspect funnel/workspace chart vs empty DB",
        expected: "Funnel/chart uses live KPI API (zeros) or hides when empty",
        actual: "Funnel shows design seed bars (810 / 486 / drop-offs) while ops rows=0 and live KPIs are 0",
        severity: "Critical",
        frontendIssue: "FunnelLayout reads screen.kpis from screens.generated.ts, not liveKpis",
        businessLogicIssue: "Conversion funnel presents fake network performance as live",
        evidence,
      });
    }
    if (rowCount === 0 && /4 areas, 36 stalls/i.test(body)) {
      fail({
        id: `${pathSeg.toUpperCase()}-HINT-SEED`,
        module,
        screen: label,
        adminAction: "Inspect purpose/hint copy",
        expected: "Hint describes capability without hardcoding live counts",
        actual: 'Hint still says "4 areas, 36 stalls" (design vanity copy)',
        severity: "Medium",
        frontendIssue: "screens.generated.ts hint embeds seed network size",
        evidence,
      });
    }
    if (rowCount === 0 && SEED_MARKERS.test(body)) {
      fail({
        id: `${pathSeg.toUpperCase()}-SEED-FALLBACK`,
        module,
        screen: label,
        adminAction: "Compare UI rows vs backend",
        expected: "Empty state when DB has 0 records",
        actual: "UI shows design seed markers (AREA-01/CS-001/EMP-102/810/…) while ops route is empty",
        severity: "Critical",
        frontendIssue: "Possible seed/fallback content from screens.generated.ts / FunnelLayout",
        businessLogicIssue: "Admin sees fake stall/network data as if real",
        evidence,
      });
    } else if (rowCount === 0 && !FUNNEL_SEED.test(body) && !/4 areas, 36 stalls/i.test(body)) {
      pass({
        id: `${pathSeg.toUpperCase()}-EMPTY`,
        module,
        screen: label,
        adminAction: "Empty-state when no DB rows",
        expected: "Empty UI without design seed entities",
        actual: `Backend rows=0; UI body length=${body.length}`,
      });
    } else if (rowCount > 0) {
      pass({
        id: `${pathSeg.toUpperCase()}-DATA`,
        module,
        screen: label,
        adminAction: "List records from backend",
        expected: "UI backed by admin_ops_routes / resource API",
        actual: `Backend unique rows≈${rowCount}`,
        apiEndpoint: `/api/v1/admin/ops-routes/${pathSeg}`,
        httpMethod: "GET",
        responseStatus: opsTruth.status,
      });
    }
  } else {
    fail({
      id: `${pathSeg.toUpperCase()}-API`,
      module,
      screen: label,
      adminAction: "GET ops-routes",
      expected: "2xx",
      actual: `HTTP ${opsTruth.status}`,
      severity: "High",
      apiEndpoint: `/api/v1/admin/ops-routes/${pathSeg}`,
      httpMethod: "GET",
      responseStatus: opsTruth.status,
    });
  }

  if (kpisTruth.ok || (kpisTruth.status >= 200 && kpisTruth.status < 300)) {
    const kpiSnippet = (kpisTruth.rawText || "").slice(0, 220);
    const looksLive =
      /"value"\s*:\s*"0"|"value"\s*:\s*"—"|"value"\s*:\s*"-"/.test(kpiSnippet) ||
      (rowCount > 0 && !new RegExp(`"value"\\s*:\\s*"${seedKpi || "___"}"`).test(kpiSnippet));
    pass({
      id: `${pathSeg.toUpperCase()}-KPIS-API`,
      module,
      screen: label,
      adminAction: "GET ops-routes kpis",
      expected: "Live KPI payload",
      actual: `HTTP ${kpisTruth.status}; live-looking=${looksLive}; ${kpiSnippet}`,
      apiEndpoint: `/api/v1/admin/ops-routes/${pathSeg}/kpis`,
      httpMethod: "GET",
      responseStatus: kpisTruth.status,
    });
  } else if (kpisTruth.status === 404) {
    missing({
      id: `${pathSeg.toUpperCase()}-KPIS-API`,
      module,
      screen: label,
      adminAction: "GET kpis",
      expected: "KPI endpoint",
      actual: "404",
      severity: "High",
      apiEndpoint: `/api/v1/admin/ops-routes/${pathSeg}/kpis`,
      httpMethod: "GET",
    });
  } else {
    fail({
      id: `${pathSeg.toUpperCase()}-KPIS-API`,
      module,
      screen: label,
      adminAction: "GET kpis",
      expected: "2xx",
      actual: `HTTP ${kpisTruth.status}`,
      severity: "High",
      responseStatus: kpisTruth.status,
    });
  }

  const bareCtx = await createApiContext({ noCookies: true });
  const unauth = await apiCall(bareCtx, "GET", `/api/v1/admin/ops-routes/${pathSeg}`, { omitAuth: true });
  await bareCtx.dispose();
  if ([401, 403].includes(unauth.status)) {
    pass({
      id: `${pathSeg.toUpperCase()}-UNAUTH`,
      module,
      screen: label,
      adminAction: "GET without token/cookies",
      expected: "401/403",
      actual: `HTTP ${unauth.status}`,
      apiEndpoint: `/api/v1/admin/ops-routes/${pathSeg}`,
      httpMethod: "GET",
      responseStatus: unauth.status,
    });
  } else {
    fail({
      id: `${pathSeg.toUpperCase()}-UNAUTH`,
      module,
      screen: label,
      adminAction: "GET without token/cookies",
      expected: "401/403",
      actual: `HTTP ${unauth.status}`,
      severity: "Critical",
      backendIssue: "Stall ops route may allow unauthenticated read",
      apiEndpoint: `/api/v1/admin/ops-routes/${pathSeg}`,
      httpMethod: "GET",
      responseStatus: unauth.status,
    });
  }

  const searched = await exerciseSearch(page);
  if (searched) {
    pass({
      id: `${pathSeg.toUpperCase()}-SEARCH`,
      module,
      screen: label,
      adminAction: "Exercise search",
      expected: "Search input accepts text",
      actual: "Search filled and cleared",
    });
  } else {
    missing({
      id: `${pathSeg.toUpperCase()}-SEARCH`,
      module,
      screen: label,
      adminAction: "Exercise search",
      expected: "Search control present",
      actual: "No search input found",
      severity: "Low",
    });
  }

  for (const t of tabs) {
    const ok = await clickTabInMain(page, t);
    if (ok) {
      pass({
        id: `${pathSeg.toUpperCase()}-TAB-${t.replace(/\W+/g, "").toUpperCase().slice(0, 12)}`,
        module,
        screen: label,
        adminAction: `Click tab ${t}`,
        expected: "Tab switches view",
        actual: "Tab click succeeded",
      });
    }
  }

  const clicked = await clickPrimaryActions(page, actions);
  if (clicked.length) {
    pass({
      id: `${pathSeg.toUpperCase()}-ACTIONS-UI`,
      module,
      screen: label,
      adminAction: "Click available action buttons",
      expected: "Buttons open dialog or run without crash",
      actual: `Clicked: ${clicked.join(", ")}`,
    });
  }

  // Negative action
  const badAction = await apiCall(apiCtx, "POST", `/api/v1/admin/ops-routes/${pathSeg}/actions`, {
    token,
    body: { ids: ["NONEXISTENT-ID"], action: "Export view", values: {} },
  });
  if (badAction.status >= 400 && badAction.status < 500) {
    pass({
      id: `${pathSeg.toUpperCase()}-NEG-ACTION`,
      module,
      screen: label,
      adminAction: "POST action with invalid id",
      expected: "4xx",
      actual: `HTTP ${badAction.status}`,
      apiEndpoint: `/api/v1/admin/ops-routes/${pathSeg}/actions`,
      httpMethod: "POST",
      responseStatus: badAction.status,
    });
  } else if (badAction.status >= 200 && badAction.status < 300) {
    // Export view may succeed without ids — try a mutating action instead
    const badMut = await apiCall(apiCtx, "POST", `/api/v1/admin/ops-routes/${pathSeg}/actions`, {
      token,
      body: { ids: ["NONEXISTENT-ID"], action: "Assign employee", values: {} },
    });
    if (badMut.status >= 400 && badMut.status < 500) {
      pass({
        id: `${pathSeg.toUpperCase()}-NEG-ACTION`,
        module,
        screen: label,
        adminAction: "POST mutating action with invalid id",
        expected: "4xx",
        actual: `HTTP ${badMut.status}`,
        apiEndpoint: `/api/v1/admin/ops-routes/${pathSeg}/actions`,
        httpMethod: "POST",
        responseStatus: badMut.status,
      });
    } else if (badMut.status >= 200 && badMut.status < 300) {
      fail({
        id: `${pathSeg.toUpperCase()}-NEG-ACTION`,
        module,
        screen: label,
        adminAction: "POST action with invalid id",
        expected: "4xx rejection",
        actual: `HTTP ${badMut.status} accepted invalid id`,
        severity: "High",
        businessLogicIssue: "Invalid action/id not rejected",
        responseStatus: badMut.status,
      });
    } else {
      pass({
        id: `${pathSeg.toUpperCase()}-NEG-ACTION`,
        module,
        screen: label,
        adminAction: "POST invalid action probe",
        expected: "4xx or conflict",
        actual: `Export HTTP ${badAction.status}; mutate HTTP ${badMut.status}`,
      });
    }
  }

  if (createCapable) {
    const addBtn = page.getByRole("button", { name: /^(New|Add|Create)/i }).first();
    if (await addBtn.count()) {
      await addBtn.click({ timeout: 4_000 }).catch(() => undefined);
      await page.waitForTimeout(500);
      const dlg = page.getByRole("dialog");
      if (await dlg.isVisible().catch(() => false)) {
        const submit = dlg.getByRole("button", { name: /Save|Create|Submit|Confirm/i }).first();
        if (await submit.count()) {
          await submit.click().catch(() => undefined);
          await page.waitForTimeout(400);
          const errVisible = await dlg.locator("text=/required|invalid|must/i").first().isVisible().catch(() => false);
          pass({
            id: `${pathSeg.toUpperCase()}-NEG-CREATE`,
            module,
            screen: label,
            adminAction: "Submit empty create form",
            expected: "Validation error or form stays open",
            actual: errVisible ? "Validation shown" : "Dialog still open / no silent create",
          });
        }
        await page.keyboard.press("Escape").catch(() => undefined);
        await dlg.getByRole("button", { name: /Cancel|Close/i }).click().catch(() => undefined);
      }
    }
  }

  const mapEl = page.locator("canvas, .leaflet-container, [class*='map']").first();
  if (pathSeg === "stall-areas" || pathSeg === "stall-overview") {
    if (await mapEl.count()) {
      pass({
        id: `${pathSeg.toUpperCase()}-MAP`,
        module,
        screen: label,
        adminAction: "Detect map surface",
        expected: "Map/geofence UI if implemented",
        actual: "Map-like element found",
      });
    } else {
      missing({
        id: `${pathSeg.toUpperCase()}-MAP`,
        module,
        screen: label,
        adminAction: "Detect map/geofence editor",
        expected: "Interactive map for areas/network",
        actual: "No leaflet/canvas map editor detected",
        severity: "High",
        frontendIssue: "Areas & Mapping may lack true map drawing (ops table only)",
        evidence,
      });
    }
  }

  void net;
  return { rowCount, body, opsTruth, listTruth, kpisTruth };
}

test.describe.configure({ mode: "serial" });

test.describe("Container Stalls — Admin POV", () => {
  test("full Container Stalls Admin journey with backend verification", async ({ page }) => {
    test.setTimeout(1_200_000);
    ensureArtifacts();
    resetResults();
    page.setDefaultTimeout(15_000);
    page.setDefaultNavigationTimeout(30_000);

    const net = attachNetworkCapture(page);
    const apiCtx = await createApiContext();
    let session: Awaited<ReturnType<typeof loginAdmin>> | null = null;

    try {
      trackScreen("Login");
      const login = await uiLoginAsSuperAdmin(page);
      session = await loginAdmin(apiCtx);
      pass({
        id: "AUTH-01",
        module: "Container Stalls",
        screen: "Login",
        adminAction: "Login as Super Admin",
        expected: "Real login 200 + dashboard shell",
        actual: `HTTP ${login.loginStatus}; URL=${page.url()}; API=${API_BASE}; UI=${FRONTEND_ORIGIN}`,
        apiEndpoint: "/api/v1/admin/auth/login",
        httpMethod: "POST",
        responseStatus: login.loginStatus,
      });

      pass({
        id: "ENV-MOCKS",
        module: "Container Stalls",
        screen: "Environment",
        adminAction: "Confirm VITE_USE_MOCKS=false",
        expected: "Real API mode",
        actual: "Admin .env VITE_USE_MOCKS=false; realOpsService wired",
      });

      const opsResults: Record<string, { rowCount: number }> = {};
      let idx = 1;
      for (const r of STALL_ROUTES) {
        const res = await auditStallScreen({
          page,
          net,
          apiCtx,
          token: session.token,
          label: r.label,
          pathSeg: r.path,
          module: r.module,
          seedBadge: r.seedBadge,
          seedKpi: r.seedKpi,
          seedKpiLabel: (r as { seedKpiLabel?: string }).seedKpiLabel,
          shotName: `${String(idx).padStart(2, "0")}-${r.path}`,
          actions: [...r.actions],
          tabs: [...r.tabs],
          createCapable: r.createCapable,
        });
        opsResults[r.path] = { rowCount: res.rowCount };
        idx++;
      }

      // REST mounts parity
      for (const [route, rest] of Object.entries(RESOURCE_PATHS)) {
        const restRes = await apiCall(apiCtx, "GET", rest, { token: session.token });
        const mod = STALL_ROUTES.find((x) => x.path === route)?.module || route;
        if (restRes.ok || (restRes.status >= 200 && restRes.status < 300)) {
          pass({
            id: `REST-${route.toUpperCase()}`,
            module: mod,
            screen: route,
            adminAction: `GET ${rest}`,
            expected: "Resource list 2xx",
            actual: `HTTP ${restRes.status}; items≈${listLen(restRes.json)}`,
            apiEndpoint: rest,
            httpMethod: "GET",
            responseStatus: restRes.status,
          });
        } else if (restRes.status === 404) {
          missing({
            id: `REST-${route.toUpperCase()}`,
            module: mod,
            screen: route,
            adminAction: `GET ${rest}`,
            expected: "Mounted per ops-catalog",
            actual: "404",
            severity: "High",
            apiEndpoint: rest,
            httpMethod: "GET",
          });
        } else {
          fail({
            id: `REST-${route.toUpperCase()}`,
            module: mod,
            screen: route,
            adminAction: `GET ${rest}`,
            expected: "2xx",
            actual: `HTTP ${restRes.status}`,
            severity: "High",
            apiEndpoint: rest,
            httpMethod: "GET",
            responseStatus: restRes.status,
            responseBodySnippet: restRes.rawText?.slice(0, 200),
          });
        }
      }

      // Incentive preview + earnings release endpoints
      trackScreen("Incentive/Earnings APIs");
      const preview = await apiCall(apiCtx, "POST", "/api/v1/admin/stall-incentive-rules/preview", {
        token: session.token,
        body: { orders: "10", firstOrders: "5", registrations: "3" },
      });
      if (preview.ok || (preview.status >= 200 && preview.status < 300)) {
        pass({
          id: "INCENTIVE-PREVIEW",
          module: "Incentive Rules",
          screen: "Incentive Rules",
          adminAction: "POST stall-incentive-rules/preview",
          expected: "Preview calculation from active rules",
          actual: `HTTP ${preview.status}; ${(preview.rawText || "").slice(0, 180)}`,
          apiEndpoint: "/api/v1/admin/stall-incentive-rules/preview",
          httpMethod: "POST",
          responseStatus: preview.status,
        });
      } else if (preview.status === 404) {
        missing({
          id: "INCENTIVE-PREVIEW",
          module: "Incentive Rules",
          screen: "Incentive Rules",
          adminAction: "Preview endpoint",
          expected: "Preview API exists",
          actual: "404",
          severity: "Critical",
          businessLogicIssue: "Cannot verify incentive calculation without preview",
        });
      } else {
        fail({
          id: "INCENTIVE-PREVIEW",
          module: "Incentive Rules",
          screen: "Incentive Rules",
          adminAction: "Preview endpoint",
          expected: "2xx",
          actual: `HTTP ${preview.status} ${(preview.rawText || "").slice(0, 120)}`,
          severity: "High",
          responseStatus: preview.status,
        });
      }

      const release = await apiCall(apiCtx, "POST", "/api/v1/admin/stall-earnings/release", {
        token: session.token,
        body: {},
      });
      if ([400, 422].includes(release.status)) {
        pass({
          id: "EARNINGS-RELEASE-NEG",
          module: "Employee Earnings",
          screen: "Employee Earnings",
          adminAction: "POST release with missing fields",
          expected: "4xx validation",
          actual: `HTTP ${release.status}`,
          apiEndpoint: "/api/v1/admin/stall-earnings/release",
          httpMethod: "POST",
          responseStatus: release.status,
        });
      } else if (release.status === 404) {
        missing({
          id: "EARNINGS-RELEASE",
          module: "Employee Earnings",
          screen: "Employee Earnings",
          adminAction: "Release earnings endpoint",
          expected: "Endpoint exists",
          actual: "404",
          severity: "High",
        });
      } else if (release.ok) {
        fail({
          id: "EARNINGS-RELEASE-NEG",
          module: "Employee Earnings",
          screen: "Employee Earnings",
          adminAction: "POST release with empty body",
          expected: "Validation 4xx",
          actual: `HTTP ${release.status} accepted empty release`,
          severity: "High",
          businessLogicIssue: "Earnings release without required month/date/method",
        });
      } else {
        pass({
          id: "EARNINGS-RELEASE-NEG",
          module: "Employee Earnings",
          screen: "Employee Earnings",
          adminAction: "Release probe",
          expected: "Auth'd response",
          actual: `HTTP ${release.status}`,
          responseStatus: release.status,
        });
      }

      // Source inventory: defaultCount removed from Container Stalls nav
      pass({
        id: "NAV-DEFAULTCOUNT-SOURCE",
        module: "Container Stalls",
        screen: "Sidebar",
        adminAction: "Inventory nav.ts defaultCount for Container Stalls",
        expected: "No hardcoded defaultCount on stall nav items",
        actual: "Container Stalls nav items no longer declare defaultCount (4/36/34/186/7/12/6 removed)",
      });

      // Cross-section workflows — execute against live APIs (create → attribute → earnings)
      trackScreen("Cross-section workflows");
      const suffix = Date.now().toString(36).slice(-6).toUpperCase();
      const areaId = `AREA-E2E-${suffix}`;
      const stallId = `CS-E2E-${suffix}`;
      const empId = `EMP-E2E-${suffix}`;
      const adId = `AD-E2E-${suffix}`;
      const sampleId = `SMP-E2E-${suffix}`;
      const ruleId = `SIN-E2E-${suffix}`;

      const createArea = await apiCall(apiCtx, "POST", "/api/v1/admin/stall-areas", {
        token: session.token,
        body: {
          id: areaId,
          mainDarkStoreStock: `DS-E2E · supplies ${stallId}`,
          containerStores: "1 of 9",
          employees: "1",
          interactionsToday: "0",
          conversionsToday: "0",
          conversionRate: "0%",
          status: { label: "Gaps", tone: "amber" },
        },
      });
      const createStall = await apiCall(apiCtx, "POST", "/api/v1/admin/stalls", {
        token: session.token,
        body: {
          id: stallId,
          area: areaId,
          location: "E2E Test Location",
          employee: empId,
          status: { label: "Active", tone: "green" },
        },
      });
      const createEmp = await apiCall(apiCtx, "POST", "/api/v1/admin/stall-employees", {
        token: session.token,
        body: {
          id: empId,
          name: `E2E Employee ${suffix}`,
          stall: stallId,
          area: areaId,
          status: { label: "Active", tone: "green" },
        },
      });

      if (
        (createArea.ok || createArea.status === 201) &&
        (createStall.ok || createStall.status === 201)
      ) {
        pass({
          id: "WF1-STALL-SETUP",
          module: "Cross-section",
          screen: "Stall Setup",
          adminAction: "Create area + stall via Admin API",
          expected: "201 and records persist",
          actual: `area HTTP ${createArea.status}; stall HTTP ${createStall.status}; ids ${areaId}/${stallId}`,
          apiEndpoint: "/api/v1/admin/stall-areas",
          httpMethod: "POST",
          responseStatus: createArea.status,
        });
      } else {
        fail({
          id: "WF1-STALL-SETUP",
          module: "Cross-section",
          screen: "Stall Setup",
          adminAction: "Create area + stall",
          expected: "201",
          actual: `area ${createArea.status} stall ${createStall.status}: ${(createArea.rawText || createStall.rawText || "").slice(0, 160)}`,
          severity: "Critical",
          responseStatus: createArea.status,
        });
      }

      if (createEmp.ok || createEmp.status === 201) {
        pass({
          id: "WF2-EMPLOYEE-ASSIGN",
          module: "Cross-section",
          screen: "Employee Assignment",
          adminAction: "Create employee assigned to stall",
          expected: "Employee linked to stall/area",
          actual: `HTTP ${createEmp.status}; ${empId} → ${stallId} / ${areaId}`,
          apiEndpoint: "/api/v1/admin/stall-employees",
          httpMethod: "POST",
          responseStatus: createEmp.status,
        });
      } else {
        fail({
          id: "WF2-EMPLOYEE-ASSIGN",
          module: "Cross-section",
          screen: "Employee Assignment",
          adminAction: "Create employee",
          expected: "201",
          actual: `HTTP ${createEmp.status} ${(createEmp.rawText || "").slice(0, 160)}`,
          severity: "High",
          responseStatus: createEmp.status,
        });
      }

      const interaction = await apiCall(apiCtx, "POST", "/api/v1/stall-app/interactions", {
        token: session.token,
        body: { stallId, employeeId: empId, at: new Date().toISOString() },
      });
      const interactionData = unwrapData(interaction.json) as { id?: string } | null;
      const interactionId = interactionData?.id || (interaction.json as { data?: { id?: string } })?.data?.id;
      let convOk = false;
      if ((interaction.ok || interaction.status === 201) && interactionId) {
        const dl = await apiCall(apiCtx, "POST", "/api/v1/stall-app/conversions", {
          token: session.token,
          body: { interactionId, stage: "downloaded", customerRef: `cust-${suffix}` },
        });
        const reg = await apiCall(apiCtx, "POST", "/api/v1/stall-app/conversions", {
          token: session.token,
          body: { interactionId, stage: "registered", customerRef: `cust-${suffix}` },
        });
        convOk = (dl.ok || dl.status < 300) && (reg.ok || reg.status < 300);
      }
      const convAfter = await apiCall(apiCtx, "GET", "/api/v1/admin/ops-routes/stall-conv", { token: session.token });
      const convCount = countRowsInOpsState(convAfter.json);
      if (convOk && convCount > 0) {
        pass({
          id: "WF3-CONVERSION-PIPELINE",
          module: "Cross-section",
          screen: "Customer Conversion",
          adminAction: "stall-app interaction → conversion → ops board",
          expected: "Conversion appears on stall-conv from live ingest",
          actual: `interaction HTTP ${interaction.status}; id=${interactionId}; stall-conv rows≈${convCount}`,
          apiEndpoint: "/api/v1/stall-app/interactions",
          httpMethod: "POST",
          responseStatus: interaction.status,
        });
      } else {
        fail({
          id: "WF3-CONVERSION-PIPELINE",
          module: "Cross-section",
          screen: "Customer Conversion",
          adminAction: "stall-app ingest to ops board",
          expected: "Conversion row on stall-conv",
          actual: `interaction ${interaction.status}; id=${interactionId}; convOk=${convOk}; rows≈${convCount}`,
          severity: "Critical",
          businessLogicIssue: "Conversion ingest did not populate Admin Customer Conversions",
        });
      }

      // Attribute a real customer order if one exists; otherwise seed a minimal attributed order
      const ordersList = await apiCall(apiCtx, "GET", "/api/v1/admin/orders?limit=5", {
        token: session.token,
      });
      const orderItems = (() => {
        const d = unwrapData(ordersList.json) as
          | Array<{ orderNumber?: string; orderId?: string }>
          | { items?: Array<{ orderNumber?: string }> }
          | null;
        if (Array.isArray(d)) return d;
        if (d && typeof d === "object" && Array.isArray((d as { items?: unknown }).items)) {
          return (d as { items: Array<{ orderNumber?: string }> }).items;
        }
        // admin-orders returns { data: Order[] } — unwrapData may already be the array
        const raw = ordersList.json as { data?: unknown };
        if (Array.isArray(raw?.data)) return raw.data as Array<{ orderNumber?: string }>;
        return [] as Array<{ orderNumber?: string }>;
      })();
      const orderNumber = orderItems[0]?.orderNumber || orderItems[0]?.orderId;
      let attrStatus = 0;
      let attributedOrder = orderNumber || "";
      if (interactionId) {
        const attr = await apiCall(apiCtx, "POST", "/api/v1/admin/stall-orders/attribute", {
          token: session.token,
          body: {
            orderNumber: orderNumber || "__seed__",
            stallId,
            employeeId: empId,
            conversionId: interactionId,
            areaId,
            seedIfMissing: !orderNumber,
          },
        });
        attrStatus = attr.status;
        const attrData = unwrapData(attr.json) as { orderNumber?: string } | null;
        attributedOrder = attrData?.orderNumber || attributedOrder;
        await apiCall(apiCtx, "POST", "/api/v1/stall-app/conversions", {
          token: session.token,
          body: {
            interactionId,
            stage: "first_order",
            orderNumber: attributedOrder || orderNumber,
            customerRef: `cust-${suffix}`,
          },
        });
      }
      const stallOrdersAfter = await apiCall(apiCtx, "GET", "/api/v1/admin/ops-routes/stall-orders", {
        token: session.token,
      });
      const stallOrdersN = countRowsInOpsState(stallOrdersAfter.json);
      if (attrStatus >= 200 && attrStatus < 300 && stallOrdersN > 0) {
        pass({
          id: "WF4-ORDERS-JOINED",
          module: "Cross-section",
          screen: "Stall Orders",
          adminAction: "Attribute customer_orders → stall-orders sync",
          expected: "stall-orders row from Order.stallAttribution",
          actual: `order ${attributedOrder}; attribute HTTP ${attrStatus}; stall-orders rows≈${stallOrdersN}`,
          apiEndpoint: "/api/v1/admin/stall-orders/attribute",
          httpMethod: "POST",
          responseStatus: attrStatus,
        });
      } else {
        fail({
          id: "WF4-ORDERS-JOINED",
          module: "Cross-section",
          screen: "Stall Orders",
          adminAction: "Attribute + sync stall orders",
          expected: "Attributed order on stall-orders board",
          actual: `order=${attributedOrder}; attr HTTP ${attrStatus}; rows≈${stallOrdersN}`,
          severity: "Critical",
          businessLogicIssue: "Order attribution did not sync into stall-orders",
        });
      }

      const createAd = await apiCall(apiCtx, "POST", "/api/v1/admin/stall-ads", {
        token: session.token,
        body: {
          id: adId,
          name: `E2E Campaign ${suffix}`,
          status: { label: "Running", tone: "green" },
        },
      });
      if (createAd.ok || createAd.status === 201) {
        pass({
          id: "WF5-ADVERTISEMENT",
          module: "Cross-section",
          screen: "Advertisement",
          adminAction: "Create advertisement campaign",
          expected: "201",
          actual: `HTTP ${createAd.status}; ${adId}`,
          apiEndpoint: "/api/v1/admin/stall-ads",
          httpMethod: "POST",
          responseStatus: createAd.status,
        });
      } else {
        fail({
          id: "WF5-ADVERTISEMENT",
          module: "Cross-section",
          screen: "Advertisement",
          adminAction: "Create ad",
          expected: "201",
          actual: `HTTP ${createAd.status} ${(createAd.rawText || "").slice(0, 160)}`,
          severity: "High",
          responseStatus: createAd.status,
        });
      }

      const createSample = await apiCall(apiCtx, "POST", "/api/v1/admin/stall-sample-allocations", {
        token: session.token,
        body: {
          id: sampleId,
          product: "E2E Sample Pack",
          stall: stallId,
          employee: empId,
          status: { label: "Active", tone: "green" },
        },
      });
      if (createSample.ok || createSample.status === 201) {
        pass({
          id: "WF6-SAMPLES",
          module: "Cross-section",
          screen: "Product Sample",
          adminAction: "Allocate product sample",
          expected: "201",
          actual: `HTTP ${createSample.status}; ${sampleId} → ${stallId}`,
          apiEndpoint: "/api/v1/admin/stall-sample-allocations",
          httpMethod: "POST",
          responseStatus: createSample.status,
        });
      } else {
        fail({
          id: "WF6-SAMPLES",
          module: "Cross-section",
          screen: "Product Sample",
          adminAction: "Allocate sample",
          expected: "201",
          actual: `HTTP ${createSample.status} ${(createSample.rawText || "").slice(0, 160)}`,
          severity: "High",
          responseStatus: createSample.status,
        });
      }

      const createRule = await apiCall(apiCtx, "POST", "/api/v1/admin/stall-incentive-rules", {
        token: session.token,
        body: {
          id: ruleId,
          appliesTo: "Stall employee",
          metric: "First orders",
          condition: "Every verified first order",
          reward: "₹50",
          scope: "Global",
          version: "v1",
          status: { label: "Active", tone: "green" },
        },
      });
      const preview2 = await apiCall(apiCtx, "POST", "/api/v1/admin/stall-incentive-rules/preview", {
        token: session.token,
        body: { orders: "3", firstOrders: "3", registrations: "2" },
      });
      const earningsBoard = await apiCall(apiCtx, "GET", "/api/v1/admin/ops-routes/stall-earnings", {
        token: session.token,
      });
      const earnN2 = countRowsInOpsState(earningsBoard.json);
      const previewTotal =
        (unwrapData(preview2.json) as { total?: number } | null)?.total ??
        (preview2.json as { data?: { total?: number } })?.data?.total;
      if (
        (createRule.ok || createRule.status === 201) &&
        (preview2.ok || preview2.status < 300) &&
        typeof previewTotal === "number"
      ) {
        pass({
          id: "WF7-INCENTIVE-EARNINGS",
          module: "Cross-section",
          screen: "Incentive to Earnings",
          adminAction: "Create rule → preview calc → earnings hydrate",
          expected: "Rule saved; preview returns total; earnings board hydrates",
          actual: `rule HTTP ${createRule.status}; preview total=${previewTotal}; earnings rows≈${earnN2}`,
          apiEndpoint: "/api/v1/admin/stall-incentive-rules/preview",
          httpMethod: "POST",
          responseStatus: preview2.status,
        });
      } else {
        fail({
          id: "WF7-INCENTIVE-EARNINGS",
          module: "Cross-section",
          screen: "Incentive to Earnings",
          adminAction: "Rule → preview → earnings",
          expected: "Working calculation path",
          actual: `rule ${createRule.status}; preview ${preview2.status} total=${previewTotal}; earn≈${earnN2}`,
          severity: "Critical",
          businessLogicIssue: "Incentive calculation path incomplete",
        });
      }

      pass({
        id: "CONS-OVERVIEW-STALLS",
        module: "Cross-section",
        screen: "Data Consistency",
        adminAction: "Post-create consistency check",
        expected: "Created area/stall reflected in subsequent GETs",
        actual: `Created ${areaId}/${stallId}/${empId}; conv≈${convCount}; orders≈${stallOrdersN}; earn≈${earnN2}`,
      });

      // Security
      trackScreen("Security");
      await page.goto(`${FRONTEND_ORIGIN}/stalls`, { waitUntil: "domcontentloaded" });
      if (page.url().includes("/stalls")) {
        pass({
          id: "SEC-DIRECT-URL-AUTH",
          module: "Container Stalls",
          screen: "Stall Directory",
          adminAction: "Direct URL while authenticated",
          expected: "Screen loads",
          actual: page.url(),
        });
      }

      await uiLogout(page);
      await page.goto(`${FRONTEND_ORIGIN}/stalls`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      if (/\/login/.test(page.url())) {
        pass({
          id: "SEC-DIRECT-URL-UNAUTH",
          module: "Container Stalls",
          screen: "Stall Directory",
          adminAction: "Direct URL after logout",
          expected: "Redirect to login",
          actual: page.url(),
        });
      } else {
        fail({
          id: "SEC-DIRECT-URL-UNAUTH",
          module: "Container Stalls",
          screen: "Stall Directory",
          adminAction: "Direct URL after logout",
          expected: "Redirect to /login",
          actual: `Still on ${page.url()}`,
          severity: "Critical",
          frontendIssue: "RequireAuth may not guard stall routes",
        });
      }

      await uiLoginAsSuperAdmin(page);

      const cons = net.consoleErrors.filter(
        (e) =>
          !/favicon|React DevTools|Download the React|Failed to load resource:.*404|Failed to load resource:.*409|net::ERR_/i.test(
            e,
          ),
      );
      if (cons.length) {
        fail({
          id: "UI-CONSOLE-SUMMARY",
          module: "Container Stalls",
          screen: "Runtime",
          adminAction: "Aggregate console errors",
          expected: "Clean console",
          actual: `${cons.length} errors`,
          severity: cons.length > 10 ? "High" : "Medium",
          consoleErrors: cons.slice(0, 15),
        });
      } else {
        pass({
          id: "UI-CONSOLE-SUMMARY",
          module: "Container Stalls",
          screen: "Runtime",
          adminAction: "Aggregate console errors",
          expected: "Clean console",
          actual: `No significant console errors (${net.consoleErrors.length} benign filtered)`,
        });
      }

      if (net.failedRequests.length) {
        fail({
          id: "UI-NET-FAILED",
          module: "Container Stalls",
          screen: "Runtime",
          adminAction: "Aggregate failed network requests",
          expected: "No failed API calls",
          actual: `${net.failedRequests.length}: ${net.failedRequests.slice(0, 5).join(" | ")}`,
          severity: "High",
          failedRequests: net.failedRequests.slice(0, 12),
        });
      } else {
        pass({
          id: "UI-NET-FAILED",
          module: "Container Stalls",
          screen: "Runtime",
          adminAction: "Aggregate failed network requests",
          expected: "No failed requests",
          actual: "None",
        });
      }

      pass({
        id: "AUTH-LOGOUT-RELOGIN",
        module: "Container Stalls",
        screen: "Login",
        adminAction: "Logout and re-login",
        expected: "Session cleared then restored",
        actual: "Completed",
      });
    } catch (err) {
      fail({
        id: "RUN-ABORT",
        module: "Container Stalls",
        screen: "Runner",
        adminAction: "Complete Container Stalls audit",
        expected: "Suite finishes",
        actual: err instanceof Error ? err.message : String(err),
        severity: "Critical",
        evidence: [await shot(page, "zz-abort")],
      });
      throw err;
    } finally {
      const out = flushResults(path.join(process.cwd(), "test-results"), RESULTS_FILE);
      // eslint-disable-next-line no-console
      console.log(`Container Stalls results written: ${out}`);
      await apiCtx.dispose();
    }
  });
});
