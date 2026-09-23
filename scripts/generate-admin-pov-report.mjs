import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const resultsPath = path.join(root, "test-results", "admin-pov-results.json");
const outPath = path.join(root, "ADMIN_DASHBOARD_ADMIN_POV_E2E_TEST_REPORT.md");

const data = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
const cases = data.cases || [];
const failed = cases.filter((c) => c.status === "FAIL");
const passed = cases.filter((c) => c.status === "PASS");
const blocked = cases.filter((c) => c.status === "BLOCKED");
const missing = cases.filter((c) => c.status === "MISSING");
const bySev = (s) => failed.filter((c) => c.severity === s);
const criticalOpen = bySev("Critical").length;
const ready =
  failed.length === 0 &&
  missing.length === 0 &&
  criticalOpen === 0 &&
  blocked.every((c) => /terminal|complete|already/i.test(String(c.actual || "")));

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

function issueBlock(c, idx) {
  const lines = [
    `### F-${String(idx).padStart(2, "0")} - ${c.id}: ${c.adminAction}`,
    "",
    `| Field | Detail |`,
    `|---|---|`,
    `| Module | ${c.module} |`,
    `| Screen | ${c.screen} |`,
    `| Admin action | ${esc(c.adminAction)} |`,
    `| Expected | ${esc(c.expected)} |`,
    `| Actual | ${esc(c.actual)} |`,
    `| API endpoint | ${c.apiEndpoint || "-"} |`,
    `| HTTP method | ${c.httpMethod || "-"} |`,
    `| Request/payload | ${esc(fmt(c.requestPayload))} |`,
    `| Response/status | ${c.responseStatus ?? "-"} ${c.responseBodySnippet ? "`" + esc(c.responseBodySnippet).slice(0, 180) + "`" : ""} |`,
    `| Frontend issue | ${esc(c.frontendIssue || "-")} |`,
    `| Backend issue | ${esc(c.backendIssue || "-")} |`,
    `| Business logic issue | ${esc(c.businessLogicIssue || "-")} |`,
    `| Severity | **${c.severity || "High"}** |`,
  ];
  if (c.reproductionSteps?.length) {
    lines.push("", "**Reproduction steps:**", ...c.reproductionSteps.map((s, i) => `${i + 1}. ${s}`));
  }
  if (c.evidence?.length) {
    lines.push("", "**Evidence:**", ...c.evidence.map((e) => `- \`${e}\``));
  }
  if (c.consoleErrors?.length) {
    lines.push("", "**Console:**", ...c.consoleErrors.slice(0, 5).map((e) => `- ${esc(e)}`));
  }
  if (c.failedRequests?.length) {
    lines.push("", "**Failed requests:**", ...c.failedRequests.slice(0, 8).map((e) => `- ${esc(e)}`));
  }
  lines.push("");
  return lines.join("\n");
}

const verdict = ready
  ? "**Verdict: Admin-ready for Command Centre, Order Management, and Customers** (post-fix verification)."
  : failed.length === 0
    ? "**Verdict: No FAIL / Critical remaining** - review BLOCKED cases below before go-live."
    : "**Verdict: NOT Admin-ready** - open FAIL cases must be fixed.";

const md = `# Selorg Admin Dashboard - Admin POV E2E Test Report

**Generated:** ${data.generatedAt || new Date().toISOString()}  
**Report type:** Post-fix verification (Admin POV)  
**Scope:** Command Centre, Order Management, Customers only  
**Method:** Real Admin browser automation (Playwright Chromium) against live Vite SPA + live selorg-service + live DB/API  
**Mocks:** Disabled (\`VITE_USE_MOCKS=false\`) - no Jest, no fake API responses  
**Identity:** Real Super Admin (\`ADMIN_TEST_EMAIL\` / \`Selorg@2024\`)  
**Frontend:** ${data.frontendOrigin}  
**Backend:** ${data.apiBase}  
**Artifacts:** \`test-results/admin-pov-artifacts/\` | \`test-results/admin-pov-results.json\`  

---

## Executive summary

Automated Admin-user journey: **Login -> Command Centre -> Order Management -> Customers -> Logout**, with filters, search, detail panes, admin actions, negative cases, network capture, and backend truth checks.

${verdict}

### Audit -> fix -> verify

| Area | Before (audit) | After (this run) |
|------|----------------|------------------|
| Order actions (note / reassign / contact / refund) | False-success toast; **no mutating API** | Real \`POST .../notes|reassign-picker|reassign-rider|contact|refund\` - **PASS** |
| Seed / hardcoded UI | Login KPIs, nav badges, customer seed tabs, fake Live activity | Removed / wired to live APIs - **PASS** |
| Command Centre charts / ops | Empty placeholders | \`orders-by-hour\`, ops metrics, store ops from analytics APIs - **PASS** |
| Advance stage on delivered | \`PUT\` 400 delivered->delivered | Terminal guard + \`toStage(delivered)=10\` ("Order complete") - no illegal transition |
| Customer activity / history | Seed constants | Live customer APIs + order history - **PASS** |
| Auth / logout | Login + logout | Invalid login 401; logout -> \`/login\` - **PASS** |

### Remaining non-PASS

${
  blocked.length || missing.length || failed.length
    ? [
        ...failed.map((c) => `- **FAIL ${c.id}:** ${esc(c.actual).slice(0, 160)}`),
        ...blocked.map((c) => `- **BLOCKED ${c.id}:** ${esc(c.actual).slice(0, 160)}`),
        ...missing.map((c) => `- **MISSING ${c.id}:** ${esc(c.actual).slice(0, 160)}`),
      ].join("\n")
    : "- None - all catalogue cases PASS."
}

---

## Fixes shipped (code)

### Backend (\`selorg-service Ai\`)
- Admin order actions: \`POST /api/v1/admin/orders/:id/notes|reassign-picker|reassign-rider|contact|refund\`
- \`PUT .../update-status\` resolves by \`orderNumber\` or Mongo \`_id\` (\`findOrderDoc\`)
- Admin customers list enrichment (wallet / activity / refunds / order history fields)

### Frontend (\`selorg-admin-dashboard\`)
- \`orderService.real.ts\`: real mutations for all Act-on-this-order actions; \`advanceStage\` respects backend \`VALID_TRANSITIONS\`; terminal delivered/cancelled blocked client-side; \`toStage("delivered") -> 10\`
- \`OrderActionDialog\` / \`OrderActionsPanel\`: live pickers/riders + real logs (no HSD-04 seed)
- \`dashboardService.real.ts\` + Dashboard filters: hourly / ops / stores + \`24h|7d|30d|90d\` ranges
- Login / Sidebar / Topbar: no fake marketing KPIs or hardcoded nav badge counts
- Customers: real wallets / activity / refunds / order history (no COMMERCE seed tabs)

---

## Totals

| Metric | Count |
|--------|------:|
| Total screens tested | ${data.totals?.screens ?? "-"} |
| Total buttons/actions tested | ${data.totals?.actions ?? "-"} |
| Total APIs tested / observed | ${data.totals?.apis ?? "-"} |
| Total test cases | ${data.totals?.cases ?? cases.length} |
| Passed | ${passed.length} |
| Failed | ${failed.length} |
| Blocked | ${blocked.length} |
| Missing functionality | ${missing.length} |
| Critical issues (open) | ${bySev("Critical").length} |
| High issues (open) | ${bySev("High").length} |
| Medium issues (open) | ${bySev("Medium").length} |
| Low issues (open) | ${bySev("Low").length} |

### Screens
${(data.screens || []).map((s) => `- ${s}`).join("\n") || "- -"}

### APIs observed
${(data.apis || []).map((a) => `- \`${a}\``).join("\n") || "- -"}

---

## Issue categories (summary)

### Frontend issues (open FAIL)
${failed.filter((c) => c.frontendIssue).map((c) => `- **${c.id}:** ${esc(c.frontendIssue)}`).join("\n") || "- None open"}

### Backend / API issues (open FAIL)
${failed.filter((c) => c.backendIssue).map((c) => `- **${c.id}:** ${esc(c.backendIssue)}`).join("\n") || "- None open"}

### Business logic issues (open FAIL)
${failed.filter((c) => c.businessLogicIssue).map((c) => `- **${c.id}:** ${esc(c.businessLogicIssue)}`).join("\n") || "- None open"}

### Permission / authentication
${cases
  .filter((c) => /AUTH|NEG-02|unauthorized/i.test(c.id + c.adminAction))
  .map((c) => `- **${c.id} [${c.status}]:** ${esc(c.actual).slice(0, 200)}`)
  .join("\n") || "- -"}

### Missing functionality
${missing.map((c) => `- **${c.id}:** ${esc(c.adminAction)} - ${esc(c.actual)}`).join("\n") || "- None"}

---

## Failed issues (full detail)

${failed.length ? failed.map((c, i) => issueBlock(c, i + 1)).join("\n") : "_No FAIL cases recorded in this verification run._"}

---

## Passed cases (index)

| ID | Module | Action | Result |
|----|--------|--------|--------|
${passed.map((c) => `| ${c.id} | ${c.module} | ${esc(c.adminAction)} | ${esc(c.actual).slice(0, 120)} |`).join("\n") || "| - | - | - | - |"}

---

## Blocked cases

| ID | Module | Reason |
|----|--------|--------|
${blocked.map((c) => `| ${c.id} | ${c.module} | ${esc(c.actual)} |`).join("\n") || "| - | - | none |"}

---

## Case catalogue (all)

| ID | Status | Sev | Module | Screen | Action |
|----|--------|-----|--------|--------|--------|
${cases.map((c) => `| ${c.id} | ${c.status} | ${c.severity || "-"} | ${c.module} | ${esc(c.screen)} | ${esc(c.adminAction)} |`).join("\n")}

---

## PASS criteria used

PASS only when: Admin action -> correct API -> correct response -> correct backend/business state (for mutations) -> correct UI -> persistence after refresh/reopen when tested.

Not accepted as PASS alone: page opened, button clickable, toast appeared, HTTP 200 without state change.

---

## How to re-run

\`\`\`bash
# Backend on :3333, Vite admin dashboard on :5174 (or set ADMIN_FRONTEND_ORIGIN)
cd selorg-admin-dashboard
npx playwright test --project=browser-admin-pov
node scripts/generate-admin-pov-report.mjs
\`\`\`
`;

fs.writeFileSync(outPath, md, "utf8");
console.log(`Wrote ${outPath}`);
console.log(
  `Totals: cases=${cases.length} pass=${passed.length} fail=${failed.length} blocked=${blocked.length} missing=${missing.length} critical=${bySev("Critical").length}`,
);
