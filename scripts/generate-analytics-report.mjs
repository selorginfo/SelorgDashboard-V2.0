import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const resultsPath = path.join(root, "test-results", "analytics-results.json");
const outPath = path.join(root, "ANALYTICS_ADMIN_E2E_TEST_REPORT.md");

const data = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
const cases = data.cases || [];
const failed = cases.filter((c) => c.status === "FAIL");
const passed = cases.filter((c) => c.status === "PASS");
const blocked = cases.filter((c) => c.status === "BLOCKED");
const missing = cases.filter((c) => c.status === "MISSING");
const nonPass = cases.filter((c) => c.status !== "PASS");
const bySev = (s) => nonPass.filter((c) => c.severity === s);
const critical = bySev("Critical").length;

const SECTIONS = [
  "Overall Report",
  "Sales Report",
  "Operations Report",
  "Employee Report",
  "Customer Report",
  "All Reports",
  "Cross-report",
  "Analytics",
];

function esc(v) {
  if (v == null) return "-";
  return String(v)
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ");
}

function fmt(v) {
  if (v == null) return "-";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function sectionCases(name) {
  return cases.filter(
    (c) =>
      c.module === name ||
      (name === "Analytics" && /Auth|Login|Logout|Runtime|API inventory/i.test(c.module + c.screen)),
  );
}

function sectionBlock(name) {
  const sc = sectionCases(name);
  const p = sc.filter((c) => c.status === "PASS");
  const f = sc.filter((c) => c.status === "FAIL");
  const b = sc.filter((c) => c.status === "BLOCKED");
  const m = sc.filter((c) => c.status === "MISSING");
  const np = sc.filter((c) => c.status !== "PASS");
  const screens = [...new Set(sc.map((c) => c.screen))];
  const actions = [...new Set(sc.map((c) => c.adminAction))];
  const apis = [
    ...new Set(sc.filter((c) => c.apiEndpoint).map((c) => `${c.httpMethod || "?"} ${c.apiEndpoint}`)),
  ];
  const issues = [...f, ...m, ...b].map((c) => `- **${c.id} [${c.status}]:** ${esc(c.actual).slice(0, 200)}`);
  return [
    `## ${name}`,
    "",
    `| Metric | Count |`,
    `|--------|------:|`,
    `| Cases | ${sc.length} |`,
    `| Passed | ${p.length} |`,
    `| Failed | ${f.length} |`,
    `| Blocked | ${b.length} |`,
    `| Missing | ${m.length} |`,
    `| Critical | ${np.filter((c) => c.severity === "Critical").length} |`,
    `| High | ${np.filter((c) => c.severity === "High").length} |`,
    `| Medium | ${np.filter((c) => c.severity === "Medium").length} |`,
    `| Low | ${np.filter((c) => c.severity === "Low").length} |`,
    "",
    `**Screens:** ${screens.map(esc).join("; ") || "-"}`,
    "",
    `**Actions:** ${actions.map(esc).join("; ") || "-"}`,
    "",
    `**APIs:**`,
    ...(apis.length ? apis.map((a) => `- \`${esc(a)}\``) : ["- -"]),
    "",
    `**Issues:**`,
    ...(issues.length ? issues : ["- None"]),
    "",
  ].join("\n");
}

function issueBlock(c, idx) {
  const lines = [
    `### F-${String(idx).padStart(2, "0")} - ${c.id}: ${esc(c.adminAction)}`,
    "",
    `| Field | Detail |`,
    `|---|---|`,
    `| Section | ${esc(c.module)} |`,
    `| Screen | ${esc(c.screen)} |`,
    `| Admin action | ${esc(c.adminAction)} |`,
    `| Expected | ${esc(c.expected)} |`,
    `| Actual | ${esc(c.actual)} |`,
    `| API endpoint | ${esc(c.apiEndpoint || "-")} |`,
    `| HTTP method | ${esc(c.httpMethod || "-")} |`,
    `| Request/payload | ${esc(fmt(c.requestPayload))} |`,
    `| Response/status | ${c.responseStatus ?? "-"} ${c.responseBodySnippet ? "`" + esc(c.responseBodySnippet).slice(0, 180) + "`" : ""} |`,
    `| Frontend issue | ${esc(c.frontendIssue || "-")} |`,
    `| Backend issue | ${esc(c.backendIssue || "-")} |`,
    `| Business / calculation issue | ${esc(c.businessLogicIssue || "-")} |`,
    `| Severity | **${c.severity || "High"}** |`,
  ];
  lines.push(
    "",
    "**Reproduction steps:**",
    `1. Login as Super Admin at ${data.frontendOrigin}/login`,
    `2. Navigate to Analytics → ${esc(c.module)} → ${esc(c.screen)}`,
    `3. Perform: ${esc(c.adminAction)}`,
    `4. Observe: ${esc(c.actual).slice(0, 160)}`,
  );
  if (c.evidence?.length) {
    lines.push("", "**Evidence:**", ...c.evidence.map((e) => `- \`${e}\``));
  }
  if (c.consoleErrors?.length) {
    lines.push("", "**Console errors:**", ...c.consoleErrors.slice(0, 5).map((e) => `- ${esc(e).slice(0, 160)}`));
  }
  lines.push("");
  return lines.join("\n");
}

function summaryRow(name) {
  const sc = sectionCases(name);
  const f = sc.filter((c) => c.status === "FAIL");
  const np = sc.filter((c) => c.status !== "PASS");
  return `| ${name} | ${sc.length} | ${sc.filter((c) => c.status === "PASS").length} | ${f.length} | ${sc.filter((c) => c.status === "BLOCKED").length} | ${sc.filter((c) => c.status === "MISSING").length} | ${np.filter((c) => c.severity === "Critical").length} | ${np.filter((c) => c.severity === "High").length} | ${np.filter((c) => c.severity === "Medium").length} | ${np.filter((c) => c.severity === "Low").length} |`;
}

const ready = failed.length === 0 && missing.length === 0 && critical === 0;
const isPostFix = ready && blocked.length === 0;

const verdict = isPostFix
  ? "**Verdict: Admin-ready for Analytics** (post-fix verification - all cases PASS)."
  : ready
    ? "**Verdict: Admin-ready for Analytics** (initial audit)."
    : failed.length === 0
      ? "**Verdict: No FAIL / Critical remaining** - review BLOCKED/MISSING below."
      : "**Verdict: NOT Admin-ready for Analytics.** Critical/High defects remain.";

const cross = cases.filter((c) => c.module === "Cross-report");
const tableSections = [
  "Overall Report",
  "Sales Report",
  "Operations Report",
  "Employee Report",
  "Customer Report",
  "All Reports",
];

const md = `# Analytics - Admin E2E Test Report

**Generated:** ${data.generatedAt || new Date().toISOString()}  
**Report type:** ${isPostFix ? "Post-fix verification (application + API fixes applied)" : "Initial audit (no application fixes applied)"}  
**Scope:** Analytics — Overall Report, Sales Report, Operations Report, Employee Report, Customer Report, All Reports  
**Method:** Real Admin browser automation (Playwright) against live Vite SPA + live selorg-service + live DB  
**Mocks:** Disabled (\`VITE_USE_MOCKS=false\`) - no Jest, no fake API responses  
**Identity:** Real Super Admin  
**Frontend:** ${data.frontendOrigin}  
**Backend:** ${data.apiBase}  
**Artifacts:** \`test-results/analytics-artifacts/\` | \`test-results/analytics-results.json\`  
**Existing E2E framework:** Playwright \`browser-admin-pov\` project + shared helpers (\`e2e/browser/helpers/ui.ts\`, \`results.ts\`, \`e2e/helpers/api.ts\`, \`auth.ts\`) — same harness as Monitoring / Warehouse / Workforce audits  

---

# 1. Executive Summary

${verdict}

| Metric | Count |
|--------|------:|
| Total test cases | ${cases.length} |
| Passed | ${passed.length} |
| Failed | ${failed.length} |
| Blocked | ${blocked.length} |
| Missing functionality | ${missing.length} |
| Broken functionality (FAIL) | ${failed.length} |
| Critical issues | ${bySev("Critical").length} |
| High issues | ${bySev("High").length} |
| Medium issues | ${bySev("Medium").length} |
| Low issues | ${bySev("Low").length} |
| Screens tested | ${data.totals?.screens ?? "-"} |
| Actions tested | ${data.totals?.actions ?? "-"} |
| APIs observed | ${data.totals?.apis ?? "-"} |

---

# 2. Environment Tested

| Item | Value |
|------|-------|
| Frontend | ${data.frontendOrigin} |
| Backend API | ${data.apiBase} |
| Mocks | \`VITE_USE_MOCKS=false\` |
| Browser project | \`browser-admin-pov\` |
| Spec | \`e2e/browser/analytics-admin.spec.ts\` |

---

# 3. Admin Login / Test Account

Real Super Admin UI login via \`/api/v1/admin/auth/login\` (credentials from env / existing harness). Parallel API session for backend truth checks against \`/api/v1/admin/analytics/*\` and darkstore report endpoints.

---

# 4. Existing E2E Framework Detected

Playwright config in \`playwright.config.ts\`; shared Admin POV helpers reused (no new testing framework). No prior Analytics-specific E2E existed — this audit added \`analytics-admin.spec.ts\` using the same pass/fail/blocked/missing recorder.

---

# 5. Analytics API Inventory

Observed / probed during this run:

${[...(data.apis || [])].map((a) => `- \`${esc(a)}\``).join("\n") || "- (see case catalogue)"}

Known backend analytics routes (service): \`GET /api/v1/admin/analytics/{realtime,revenue,operational,customers,pickers,...}\`  
Darkstore report routes: \`GET/POST /api/v1/darkstore/reports/{inventory,export,staff,compliance}\`

---

# 6. Database / Data Sources Identified

| UI surface | Intended source | Actual UI source (audit finding) |
|------------|-----------------|----------------------------------|
| rpt-overall … rpt-customer | Admin/shared analytics aggregations | \`REPORTS_CONFIGS\` seed in \`workspace/data/reports.ts\` via \`WorkspaceModulePage\` |
| All Reports | Report catalog / exports | \`SEED_REPORT_CATALOG\` + \`REPORTS_CONFIGS.reports\` KPIs; export only on Generate/Download |
| Charts | Live series | Seed \`chart\` objects always (workspace real service keeps seed chart) |

Harness has no direct Mongo client — DB truth inferred via live API responses.

---

# 7. Test Coverage

Overall, Sales, Operations, Employee, Customer reports + All Reports catalog.  
Plus API inventory, unauth probes, tab/export/filter presence, cross-report consistency, calculation gap vs live analytics, console monitoring, logout.

---

# Final Summary Table

| Section | Tests | Passed | Failed | Blocked | Missing | Critical | High | Medium | Low |
|---------|------:|-------:|-------:|--------:|--------:|---------:|-----:|-------:|----:|
${tableSections.map(summaryRow).join("\n")}
| **TOTAL** | **${cases.length}** | **${passed.length}** | **${failed.length}** | **${blocked.length}** | **${missing.length}** | **${bySev("Critical").length}** | **${bySev("High").length}** | **${bySev("Medium").length}** | **${bySev("Low").length}** |

---

# 8–13. Section-wise Results

${SECTIONS.map(sectionBlock).join("\n")}

---

# 14. Cross-Report Consistency Results

${
  cross.length
    ? cross
        .map(
          (c) =>
            `- **${c.id} [${c.status}${c.severity ? "/" + c.severity : ""}]:** ${esc(c.adminAction)} — ${esc(c.actual).slice(0, 220)}`,
        )
        .join("\n")
    : "_No cross-report cases recorded._"
}

---

# 15. Date / Time / Filter Results

${cases
  .filter((c) => /FILTER|DATE|XFLOW-DATE/i.test(c.id))
  .map((c) => `- **${c.id} [${c.status}]:** ${esc(c.actual).slice(0, 200)}`)
  .join("\n") || "- See FILTER-01 / XFLOW-DATE-01 cases."}

---

# 16. Chart / Table Validation Results

Charts on \`rpt-*\` pages are seeded (\`REPORTS_CONFIGS.*.chart\`). Tables use seed rows unless workspace probes return list-shaped live dumps (still hybrid with seed KPIs/charts). Failures under \`-SEED-01\` / \`-LOAD-01\` document this.

---

# 17. Export / Download Results

${cases
  .filter((c) => /GEN|DL|ACTIONS|Export|Download|Generate/i.test(c.id + c.adminAction))
  .map((c) => `- **${c.id} [${c.status}]:** ${esc(c.actual).slice(0, 200)}`)
  .join("\n") || "- -"}

Workspace \`rpt-*\` Export is client-side CSV of the (often seed) table. All Reports Generate/Download hit darkstore report APIs when clicked.

---

# 18. API / Network Findings

| UI Action | API | Method | Status | Result |
|-----------|-----|--------|--------|--------|
${cases
  .filter((c) => c.apiEndpoint)
  .map(
    (c) =>
      `| ${esc(c.adminAction).slice(0, 55)} | \`${esc(c.apiEndpoint).slice(0, 70)}\` | ${c.httpMethod || "-"} | ${c.responseStatus ?? "-"} | ${c.status} |`,
  )
  .join("\n") || "| - | - | - | - | - |"}

### API issues
${failed.filter((c) => c.backendIssue || /LOAD|API|NEG-UNAUTH|GEN|DL|CALC/i.test(c.id)).map((c) => `- **${c.id}:** ${esc(c.actual).slice(0, 180)}`).join("\n") || "- -"}

---

# 19. Backend Findings

${failed.filter((c) => c.backendIssue).map((c) => `- **${c.id}:** ${esc(c.backendIssue)}`).join("\n") || "- No dedicated backendIssue annotations; see FAIL cases and API inventory."}

---

# 20. Database Findings

Inferred via live API responses. Seed KPI UI with live analytics APIs existing indicates FE↔aggregation wiring gaps rather than empty DB alone.

---

# 21. Calculation / Aggregation Findings

${failed.filter((c) => c.businessLogicIssue || /CALC|CONSIST|SEED/i.test(c.id)).map((c) => `- **${c.id}:** ${esc(c.businessLogicIssue || c.actual).slice(0, 220)}`).join("\n") || "- -"}

---

# 22. Authentication / Authorization / RBAC Findings

${cases
  .filter((c) => /AUTH|UNAUTH/i.test(c.id + c.adminAction))
  .map((c) => `- **${c.id} [${c.status}]:** ${esc(c.actual).slice(0, 180)}`)
  .join("\n") || "- -"}

---

# 23. UI / UX Findings

${failed.filter((c) => c.frontendIssue).map((c) => `- **${c.id}:** ${esc(c.frontendIssue)}`).join("\n") || "- -"}

---

# 24. Negative Test Results

${cases
  .filter((c) => /NEG-|UNAUTH/i.test(c.id))
  .map((c) => `- **${c.id} [${c.status}]:** ${esc(c.actual).slice(0, 180)}`)
  .join("\n") || "- -"}

---

# 25. Failed Test Cases

${failed.length ? failed.map((c, i) => issueBlock(c, i + 1)).join("\n") : "_No FAIL cases._"}

---

# 26. Blocked Tests

| ID | Section | Reason |
|----|---------|--------|
${blocked.map((c) => `| ${c.id} | ${esc(c.module)} | ${esc(c.actual).slice(0, 140)} |`).join("\n") || "| - | - | none |"}

---

# 27. Missing Functionality

| ID | Section | Type | Detail |
|----|---------|------|--------|
${
  missing.length
    ? missing
        .map(
          (c) =>
            `| ${c.id} | ${esc(c.module)} | ${c.frontendIssue ? "UI/FE" : c.backendIssue ? "API/BE" : c.businessLogicIssue ? "Business logic" : "Integration"} | ${esc(c.actual).slice(0, 140)} |`,
        )
        .join("\n")
    : "| - | - | - | none |"
}

---

# 28. Broken Functionality

${failed.map((c) => `- **${c.id} [${c.severity || "High"}]:** ${esc(c.actual).slice(0, 180)}`).join("\n") || "- None"}

---

# 29. Frontend Issues

${failed.filter((c) => c.frontendIssue).map((c) => `- **${c.id}:** ${esc(c.frontendIssue)}`).join("\n") || "- -"}

---

# 30. Backend Issues

${failed.filter((c) => c.backendIssue).map((c) => `- **${c.id}:** ${esc(c.backendIssue)}`).join("\n") || "- -"}

---

# 31. API Contract Issues

See LOAD-* / CALC-* FAIL cases — live analytics endpoints exist but \`rpt-*\` / All Reports pages do not map them into KPIs/charts on load.

---

# 32. Database / Data Integrity Issues

${failed.filter((c) => /duplicate|integrity|missing records/i.test((c.businessLogicIssue || "") + (c.actual || ""))).map((c) => `- **${c.id}:** ${esc(c.actual).slice(0, 180)}`).join("\n") || "- Inferred via seed vs live API mismatch; see calculation findings."}

---

# 33. Calculation / Reporting Issues

${failed.filter((c) => /CALC|CONSIST|SEED|aggregation|seed/i.test(c.id + (c.businessLogicIssue || ""))).map((c) => `- **${c.id}:** ${esc(c.businessLogicIssue || c.actual).slice(0, 220)}`).join("\n") || "- -"}

---

# 34. Security / Permission Issues

${cases
  .filter((c) => /UNAUTH|SEC-|RBAC/i.test(c.id))
  .map((c) => `- **${c.id} [${c.status}]:** ${esc(c.actual).slice(0, 180)}`)
  .join("\n") || "- -"}

---

# 35. Console Errors

${cases
  .filter((c) => c.id === "AN-CONSOLE-01")
  .map((c) => `- **${c.id} [${c.status}]:** ${esc(c.actual)}`)
  .join("\n") || "- See AN-CONSOLE-01 in case catalogue."}

---

# 36–40. Evidence / Severity / Reproduction

All FAIL cases above include Expected vs Actual, API method/endpoint where applicable, severity, and reproduction steps. Screenshots under \`test-results/analytics-artifacts/\`.

---

# 41. Final PASS / FAIL / BLOCKED Summary

${verdict}

---

## Separated issue lists

### FAILED
${failed.map((c) => `- **${c.id} [${c.severity || "High"}]:** ${esc(c.actual).slice(0, 160)}`).join("\n") || "- None"}

### BLOCKED
${blocked.map((c) => `- **${c.id}:** ${esc(c.actual).slice(0, 160)}`).join("\n") || "- None"}

### MISSING
${missing.map((c) => `- **${c.id}:** ${esc(c.actual).slice(0, 160)}`).join("\n") || "- None"}

### BROKEN FUNCTIONALITY
${failed.map((c) => `- **${c.id}:** ${esc(c.actual).slice(0, 160)}`).join("\n") || "- None"}

### FRONTEND ISSUES
${failed.filter((c) => c.frontendIssue).map((c) => `- **${c.id}:** ${esc(c.frontendIssue)}`).join("\n") || "- None"}

### BACKEND ISSUES
${failed.filter((c) => c.backendIssue).map((c) => `- **${c.id}:** ${esc(c.backendIssue)}`).join("\n") || "- None"}

### API ISSUES
${failed.filter((c) => /LOAD|API|GEN|DL|CALC/i.test(c.id)).map((c) => `- **${c.id}:** ${esc(c.actual).slice(0, 160)}`).join("\n") || "- None"}

### DATABASE ISSUES
- See §20 / seed vs live API mismatch.

### CALCULATION / AGGREGATION ISSUES
${failed.filter((c) => c.businessLogicIssue).map((c) => `- **${c.id}:** ${esc(c.businessLogicIssue).slice(0, 200)}`).join("\n") || "- None"}

### DATA CONSISTENCY ISSUES
${failed.filter((c) => /CONSIST/i.test(c.id)).map((c) => `- **${c.id}:** ${esc(c.actual).slice(0, 200)}`).join("\n") || "- None"}

### SECURITY / RBAC ISSUES
${cases.filter((c) => /UNAUTH/i.test(c.id) && c.status === "FAIL").map((c) => `- **${c.id}:** ${esc(c.actual).slice(0, 160)}`).join("\n") || "- None (unauth probes documented in §34)"}

### UI / UX ISSUES
${missing.filter((c) => /FILTER|TABS|ACTIONS/i.test(c.id)).map((c) => `- **${c.id}:** ${esc(c.actual).slice(0, 160)}`).join("\n") || "- See MISSING filter/tab/action cases."}

---

## Passed cases (index)

| ID | Section | Action | Result |
|----|---------|--------|--------|
${passed.map((c) => `| ${c.id} | ${esc(c.module)} | ${esc(c.adminAction).slice(0, 50)} | ${esc(c.actual).slice(0, 100)} |`).join("\n")}

---

## Case catalogue (all)

| ID | Status | Sev | Section | Screen | Action |
|----|--------|-----|---------|--------|--------|
${cases.map((c) => `| ${c.id} | ${c.status} | ${c.severity || "-"} | ${esc(c.module)} | ${esc(c.screen)} | ${esc(c.adminAction).slice(0, 50)} |`).join("\n")}

---

## PASS criteria used

PASS only when: Admin action → correct API → correct response → correct backend/business state → correct UI.  
Not accepted as PASS alone: page opened, button clickable, toast appeared, HTTP 200 without verifying analytics values against live aggregations.

## How to re-run

\`\`\`bash
cd selorg-admin-dashboard
npx playwright test e2e/browser/analytics-admin.spec.ts --project=browser-admin-pov
node scripts/generate-analytics-report.mjs
\`\`\`
`;

fs.writeFileSync(outPath, md, "utf8");
console.log(`Wrote ${outPath}`);
console.log(
  `Totals: cases=${cases.length} pass=${passed.length} fail=${failed.length} blocked=${blocked.length} missing=${missing.length} critical=${critical}`,
);
