import fs from "node:fs";
import path from "node:path";

export type CaseStatus = "PASS" | "FAIL" | "BLOCKED" | "MISSING";

export type AdminPovCase = {
  id: string;
  module: string;
  screen: string;
  adminAction: string;
  expected: string;
  actual: string;
  status: CaseStatus;
  severity?: "Critical" | "High" | "Medium" | "Low";
  apiEndpoint?: string;
  httpMethod?: string;
  requestPayload?: unknown;
  responseStatus?: number | string;
  responseBodySnippet?: string;
  frontendIssue?: string;
  backendIssue?: string;
  businessLogicIssue?: string;
  reproductionSteps?: string[];
  evidence?: string[];
  consoleErrors?: string[];
  failedRequests?: string[];
};

const cases: AdminPovCase[] = [];
const meta: Record<string, unknown> = {
  startedAt: new Date().toISOString(),
  screens: new Set<string>(),
  actions: new Set<string>(),
  apis: new Set<string>(),
};

export function trackScreen(name: string) {
  (meta.screens as Set<string>).add(name);
}

export function trackAction(name: string) {
  (meta.actions as Set<string>).add(name);
}

export function trackApi(method: string, endpoint: string) {
  (meta.apis as Set<string>).add(`${method} ${endpoint}`);
}

export function recordCase(c: AdminPovCase) {
  cases.push(c);
  trackScreen(c.screen);
  trackAction(c.adminAction);
  if (c.apiEndpoint && c.httpMethod) trackApi(c.httpMethod, c.apiEndpoint);
}

export function pass(partial: Omit<AdminPovCase, "status" | "actual"> & { actual?: string }) {
  recordCase({
    ...partial,
    actual: partial.actual ?? "Matched expected Admin/backend result",
    status: "PASS",
  });
}

export function fail(
  partial: Omit<AdminPovCase, "status"> & {
    severity?: AdminPovCase["severity"];
  },
) {
  recordCase({
    severity: "High",
    ...partial,
    status: "FAIL",
  });
}

export function blocked(partial: Omit<AdminPovCase, "status">) {
  recordCase({ ...partial, status: "BLOCKED" });
}

export function missing(partial: Omit<AdminPovCase, "status">) {
  recordCase({ ...partial, status: "MISSING", severity: partial.severity ?? "Medium" });
}

export function resetResults() {
  cases.length = 0;
  meta.startedAt = new Date().toISOString();
  (meta.screens as Set<string>).clear();
  (meta.actions as Set<string>).clear();
  (meta.apis as Set<string>).clear();
}

export function flushResults(
  outDir = path.join(process.cwd(), "test-results"),
  fileName = "admin-pov-results.json",
) {
  fs.mkdirSync(outDir, { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    startedAt: meta.startedAt,
    frontendOrigin: process.env.ADMIN_FRONTEND_ORIGIN || "http://localhost:5174",
    apiBase: process.env.VITE_API_URL || process.env.API_BASE_URL || "http://127.0.0.1:3333",
    totals: {
      screens: (meta.screens as Set<string>).size,
      actions: (meta.actions as Set<string>).size,
      apis: (meta.apis as Set<string>).size,
      cases: cases.length,
      passed: cases.filter((c) => c.status === "PASS").length,
      failed: cases.filter((c) => c.status === "FAIL").length,
      blocked: cases.filter((c) => c.status === "BLOCKED").length,
      missing: cases.filter((c) => c.status === "MISSING").length,
    },
    screens: [...(meta.screens as Set<string>)],
    actions: [...(meta.actions as Set<string>)],
    apis: [...(meta.apis as Set<string>)],
    cases,
  };
  const file = path.join(outDir, fileName);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");
  return file;
}
