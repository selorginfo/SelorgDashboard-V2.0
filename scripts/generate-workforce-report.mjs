import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const resultsPath = path.join(root, "test-results", "workforce-results.json");
const outPath = path.join(root, "WORKFORCE_ADMIN_E2E_TEST_REPORT.md");

const data = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
const cases = data.cases || [];
const failed = cases.filter((c) => c.status === "FAIL");
const passed = cases.filter((c) => c.status === "PASS");
const blocked = cases.filter((c) => c.status === "BLOCKED");
const missing = cases.filter((c) => c.status === "MISSING");
const bySev = (s) => failed.filter((c) => c.severity === s);
const critical = bySev("Critical").length;

const SECTIONS = [
  "Rider Approvals",
  "Picker Approvals",
  "Rider Directory",
  "Picker Directory",
  "Rider Earnings",
  "Picker Earnings",
  "Earning Rules",
  "Shift Templates",
  "Roster & Assignment",
  "Rider Support",
  "Picker Support",
  "Cross-section",
  "Workforce",
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
      (name === "Workforce" && /Auth|Login|Logout|Sidebar|Runtime/i.test(c.module + c.screen)),
  );
}

function sectionBlock(name) {
  const sc = sectionCases(name);
  const p = sc.filter((c) => c.status === "PASS");
  const f = sc.filter((c) => c.status === "FAIL");
  const b = sc.filter((c) => c.status === "BLOCKED");
  const m = sc.filter((c) => c.status === "MISSING");
  const screens = [...new Set(sc.map((c) => c.screen))];
  const actions = [...new Set(sc.map((c) => c.adminAction))];
  const apis = [
    ...new Set(sc.filter((c) => c.apiEndpoint).map((c) => `${c.httpMethod || "?"} ${c.apiEndpoint}`)),
  ];
  const issues = [...f, ...m].map((c) => `- **${c.id} [${c.status}]:** ${esc(c.actual).slice(0, 200)}`);
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
    `| Business logic issue | ${esc(c.businessLogicIssue || "-")} |`,
    `| Severity | **${c.severity || "High"}** |`,
  ];
  if (c.reproductionSteps?.length) {
    lines.push("", "**Reproduction steps:**", ...c.reproductionSteps.map((s, i) => `${i + 1}. ${s}`));
  }
  if (c.evidence?.length) {
    lines.push("", "**Evidence:**", ...c.evidence.map((e) => `- \`${e}\``));
  }
  lines.push("");
  return lines.join("\n");
}

const ready = failed.length === 0 && missing.length === 0 && critical === 0;
const isPostFix = ready && blocked.length === 0;

const verdict = isPostFix
  ? "**Verdict: Admin-ready for Workforce** (post-fix verification - all cases PASS)."
  : ready
    ? "**Verdict: Admin-ready for Workforce** (initial audit)."
    : failed.length === 0
      ? "**Verdict: No FAIL / Critical remaining** - review BLOCKED/MISSING below."
      : "**Verdict: NOT Admin-ready for Workforce.** Critical/High defects remain.";

const cross = cases.filter((c) => c.module === "Cross-section");
const earnCases = cases.filter((c) => /EARN|CALC|RULES-EARN|Rider Earnings|Picker Earnings|Earning Rules/i.test(c.id + c.module));
const assignCases = cases.filter((c) => /ASSIGN|SH-|RO-|CONS-ASSIGN|Shift Templates|Roster/i.test(c.id + c.module));

const md = `# Workforce - Admin E2E Test Report

**Generated:** ${data.generatedAt || new Date().toISOString()}  
**Report type:** ${isPostFix ? "Post-fix verification (application + API fixes applied)" : "Initial audit (no application fixes applied)"}  
**Scope:** Workforce only (Rider Approvals, Picker Approvals, Rider Directory, Picker Directory, Rider Earnings, Picker Earnings, Earning Rules, Shift Templates, Roster & Assignment, Rider Support, Picker Support)  
**Method:** Real Admin browser automation (Playwright) against live Vite SPA + live selorg-service + live DB  
**Mocks:** Disabled (\`VITE_USE_MOCKS=false\`) - no Jest, no fake API responses  
**Identity:** Real Super Admin  
**Frontend:** ${data.frontendOrigin}  
**Backend:** ${data.apiBase}  
**Artifacts:** \`test-results/workforce-artifacts/\` | \`test-results/workforce-results.json\`  

---

# Executive Summary

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

### Frontend issues
${failed.filter((c) => c.frontendIssue).map((c) => `- **${c.id}:** ${esc(c.frontendIssue)}`).join("\n") || "- -"}

### Backend / API issues
${failed.filter((c) => c.backendIssue).map((c) => `- **${c.id}:** ${esc(c.backendIssue)}`).join("\n") || "- -"}

### Database issues
- Inferred via live API responses (no direct DB client in harness). Failures with backendIssue / empty live lists indicate persistence gaps.

### Workforce / business logic issues
${failed.filter((c) => c.businessLogicIssue).map((c) => `- **${c.id}:** ${esc(c.businessLogicIssue)}`).join("\n") || "- -"}

### Earnings / calculation issues
${earnCases
  .filter((c) => c.status === "FAIL")
  .map((c) => `- **${c.id}:** ${esc(c.actual).slice(0, 200)}`)
  .join("\n") || "- -"}

### Assignment / shift issues
${assignCases
  .filter((c) => c.status === "FAIL")
  .map((c) => `- **${c.id}:** ${esc(c.actual).slice(0, 200)}`)
  .join("\n") || "- -"}

### Missing functionality
${missing.map((c) => `- **${c.id} [${c.module}]:** ${esc(c.actual)}`).join("\n") || "- -"}

### Authentication / permission
${cases
  .filter((c) => /AUTH|UNAUTH|permission/i.test(c.id + c.adminAction))
  .map((c) => `- **${c.id} [${c.status}]:** ${esc(c.actual).slice(0, 180)}`)
  .join("\n") || "- -"}

---

# Section-wise Results

${SECTIONS.map(sectionBlock).join("\n")}

---

# End-to-End Workforce Flow Results

${
  cross.length
    ? cross
        .map(
          (c) =>
            `- **${c.id} [${c.status}${c.severity ? "/" + c.severity : ""}]:** ${esc(c.adminAction)} — ${esc(c.actual).slice(0, 220)}`,
        )
        .join("\n")
    : "_No cross-module cases recorded._"
}

Documented flows under test:

1. **Rider Approval → Rider Directory → Shift Template → Roster → Rider Earnings**
2. **Picker Approval → Picker Directory → Shift Template → Roster → Picker Earnings**
3. **Earning Rules → Workforce Activity → Earnings Calculation → Rider/Picker Earnings**
4. **Rider Directory → Rider Support → Ticket → Resolution**
5. **Picker Directory → Picker Support → Ticket → Resolution**

---

# Earnings Validation Report

| Check | Status | Detail |
|-------|--------|--------|
${earnCases
  .map(
    (c) =>
      `| ${c.id} | ${c.status} | ${esc(c.adminAction).slice(0, 50)} — ${esc(c.actual).slice(0, 120)} |`,
  )
  .join("\n") || "| - | - | none |"}

Validation rule used: displayed amounts alone are **not** sufficient. PASS requires live finance API binding without \`WORKFORCE_CONFIGS\` / \`ERN-*\` / \`RUL-*\` seed clusters, then backend list/status cross-check.

---

# Assignment Validation Report

| Check | Status | Detail |
|-------|--------|--------|
${assignCases
  .map(
    (c) =>
      `| ${c.id} | ${c.status} | ${esc(c.adminAction).slice(0, 50)} — ${esc(c.actual).slice(0, 120)} |`,
  )
  .join("\n") || "| - | - | none |"}

Validation rule used: Shift Templates ↔ Roster must share live APIs and must not publish static seed KPIs (\`6 Templates\`, \`164 Rostered\`) as live fleet state.

---

# Failed Test Cases

${failed.length ? failed.map((c, i) => issueBlock(c, i + 1)).join("\n") : "_No FAIL cases._"}

---

# Missing Functionality

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

# API Integration Report

| UI Action | API | Method | Status | UI Result |
|-----------|-----|--------|--------|-----------|
${cases
  .filter((c) => c.apiEndpoint)
  .map(
    (c) =>
      `| ${esc(c.adminAction).slice(0, 60)} | \`${esc(c.apiEndpoint).slice(0, 80)}\` | ${c.httpMethod || "-"} | ${c.responseStatus ?? "-"} | ${c.status} |`,
  )
  .join("\n") || "| - | - | - | - | - |"}

---

# Passed cases (index)

| ID | Section | Action | Result |
|----|---------|--------|--------|
${passed.map((c) => `| ${c.id} | ${esc(c.module)} | ${esc(c.adminAction).slice(0, 50)} | ${esc(c.actual).slice(0, 100)} |`).join("\n")}

---

# Blocked cases

| ID | Section | Reason |
|----|---------|--------|
${blocked.map((c) => `| ${c.id} | ${esc(c.module)} | ${esc(c.actual).slice(0, 140)} |`).join("\n") || "| - | - | none |"}

---

# Case catalogue (all)

| ID | Status | Sev | Section | Screen | Action |
|----|--------|-----|---------|--------|--------|
${cases.map((c) => `| ${c.id} | ${c.status} | ${c.severity || "-"} | ${esc(c.module)} | ${esc(c.screen)} | ${esc(c.adminAction).slice(0, 50)} |`).join("\n")}

---

## PASS criteria used

PASS only when: Admin action → correct API → correct response → correct backend/business state (for mutations) → correct UI.

Not accepted as PASS alone: page opened, button clickable, toast appeared, HTTP 200 without state change.

## How to re-run

\`\`\`bash
cd selorg-admin-dashboard
npx playwright test e2e/browser/workforce-admin.spec.ts --project=browser-admin-pov
node scripts/generate-workforce-report.mjs
\`\`\`
`;

fs.writeFileSync(outPath, md, "utf8");
console.log(`Wrote ${outPath}`);
console.log(
  `Totals: cases=${cases.length} pass=${passed.length} fail=${failed.length} blocked=${blocked.length} missing=${missing.length} critical=${critical}`,
);
