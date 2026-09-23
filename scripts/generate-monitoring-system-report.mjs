import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const resultsPath = path.join(root, "test-results", "monitoring-system-results.json");
const outPath = path.join(root, "MONITORING_SYSTEM_ADMIN_E2E_TEST_REPORT.md");

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
  "Exception Centre",
  "Scanner Operations",
  "Barcode Registry",
  "Alerts",
  "Audit Logs",
  "Users",
  "Roles & Permissions",
  "Integrations",
  "Cross-section",
  "Monitoring + System",
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
      (name === "Monitoring + System" && /Auth|Login|Logout|Runtime|Sidebar/i.test(c.module + c.screen)),
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
    `| Critical | ${f.filter((c) => c.severity === "Critical").length} |`,
    `| High | ${f.filter((c) => c.severity === "High").length} |`,
    `| Medium | ${f.filter((c) => c.severity === "Medium").length} |`,
    `| Low | ${f.filter((c) => c.severity === "Low").length} |`,
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
  } else {
    lines.push(
      "",
      "**Reproduction steps:**",
      `1. Login as Super Admin at ${data.frontendOrigin}/login`,
      `2. Navigate to ${esc(c.module)} → ${esc(c.screen)}`,
      `3. Perform: ${esc(c.adminAction)}`,
      `4. Observe: ${esc(c.actual).slice(0, 160)}`,
    );
  }
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
  return `| ${name.startsWith("Exception") || name.startsWith("Scanner") || name.startsWith("Barcode") || name === "Alerts" || name === "Audit Logs" ? "Monitoring" : name.startsWith("Cross") || name.startsWith("Monitoring") ? "Cross / Auth" : "System"} | ${name} | ${sc.length} | ${sc.filter((c) => c.status === "PASS").length} | ${f.length} | ${sc.filter((c) => c.status === "BLOCKED").length} | ${sc.filter((c) => c.status === "MISSING").length} | ${np.filter((c) => c.severity === "Critical").length} | ${np.filter((c) => c.severity === "High").length} | ${np.filter((c) => c.severity === "Medium").length} | ${np.filter((c) => c.severity === "Low").length} |`;
}

const ready = failed.length === 0 && missing.length === 0 && critical === 0;
const isPostFix = ready && blocked.length === 0;

const verdict = isPostFix
  ? "**Verdict: Admin-ready for Monitoring + System** (post-fix verification - all cases PASS)."
  : ready
    ? "**Verdict: Admin-ready for Monitoring + System** (initial audit)."
    : failed.length === 0
      ? "**Verdict: No FAIL / Critical remaining** - review BLOCKED/MISSING below."
      : "**Verdict: NOT Admin-ready for Monitoring + System.** Critical/High defects remain.";

const cross = cases.filter((c) => c.module === "Cross-section");

const md = `# Monitoring + System - Admin E2E Test Report

**Generated:** ${data.generatedAt || new Date().toISOString()}  
**Report type:** ${isPostFix ? "Post-fix verification (application + API fixes applied)" : "Initial audit (no application fixes applied)"}  
**Scope:** Monitoring (Exception Centre, Scanner Operations, Barcode Registry, Alerts, Audit Logs) + System (Users, Roles & Permissions, Integrations)  
**Method:** Real Admin browser automation (Playwright) against live Vite SPA + live selorg-service + live DB  
**Mocks:** Disabled (\`VITE_USE_MOCKS=false\`) - no Jest, no fake API responses  
**Identity:** Real Super Admin  
**Frontend:** ${data.frontendOrigin}  
**Backend:** ${data.apiBase}  
**Artifacts:** \`test-results/monitoring-system-artifacts/\` | \`test-results/monitoring-system-results.json\`  
**Existing E2E framework:** Playwright \`browser-admin-pov\` project + shared helpers (\`e2e/browser/helpers/ui.ts\`, \`results.ts\`, \`e2e/helpers/api.ts\`, \`auth.ts\`) — same harness as Warehouse / Dark Stores / Workforce audits  

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
| Spec | \`e2e/browser/monitoring-system-admin.spec.ts\` |

---

# 3. Admin Login / Test Account

Real Super Admin UI login via \`/api/v1/admin/auth/login\` (credentials from env / existing harness). Parallel API session for backend truth checks.

---

# 4. Existing E2E Framework Detected

Playwright config in \`playwright.config.ts\`; shared Admin POV helpers reused (no new testing framework).

---

# 5. Test Coverage

Monitoring: Exception Centre, Scanner Operations, Barcode Registry, Alerts (\`notifications\`), Audit Logs.  
System: Users, Roles & Permissions, Integrations.  
Plus cross-module flows, unauth negative probes, console monitoring, logout.

---

# Final Summary Table

| Module | Section | Tests | Passed | Failed | Blocked | Missing | Critical | High | Medium | Low |
|--------|---------|-------|--------|--------|---------|---------|----------|------|--------|-----|
${SECTIONS.filter((s) => !s.startsWith("Monitoring +")).map(summaryRow).join("\n")}
| **TOTAL** | — | **${cases.length}** | **${passed.length}** | **${failed.length}** | **${blocked.length}** | **${missing.length}** | **${bySev("Critical").length}** | **${bySev("High").length}** | **${bySev("Medium").length}** | **${bySev("Low").length}** |

---

# 6–7. Section-wise Results

${SECTIONS.map(sectionBlock).join("\n")}

---

# 8. Cross-Module Workflow Results

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

1. **Users / Roles → Audit Logs**
2. **Exceptions / Alerts → Audit Logs**
3. **Scanner Operations ↔ Barcode Registry**
4. **Integrations → Monitoring trustworthiness**

---

# 9. API / Network Findings

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
${failed.filter((c) => c.backendIssue || /LOAD|API|NEG-UNAUTH|TEST-01/i.test(c.id)).map((c) => `- **${c.id}:** ${esc(c.actual).slice(0, 180)}`).join("\n") || "- -"}

---

# 10. Backend Findings

${failed.filter((c) => c.backendIssue).map((c) => `- **${c.id}:** ${esc(c.backendIssue)}`).join("\n") || "- No dedicated backendIssue annotations; see FAIL cases."}

---

# 11. Database Findings

Inferred via live API responses (harness has no direct DB client). Empty lists + seed KPI fallbacks indicate persistence/integration gaps where noted in FAIL/MISSING.

---

# 12. Authentication / Authorization / RBAC Findings

${cases
  .filter((c) => /AUTH|UNAUTH|permission|RBAC|ROL-/i.test(c.id + c.adminAction))
  .map((c) => `- **${c.id} [${c.status}]:** ${esc(c.actual).slice(0, 180)}`)
  .join("\n") || "- -"}

---

# 13. UI / UX Findings

${failed.filter((c) => c.frontendIssue).map((c) => `- **${c.id}:** ${esc(c.frontendIssue)}`).join("\n") || "- -"}

---

# 14. Negative Test Results

${cases
  .filter((c) => /NEG-|UNAUTH|SEC-/i.test(c.id))
  .map((c) => `- **${c.id} [${c.status}]:** ${esc(c.actual).slice(0, 180)}`)
  .join("\n") || "- -"}

---

# 15. Failed Test Cases

${failed.length ? failed.map((c, i) => issueBlock(c, i + 1)).join("\n") : "_No FAIL cases._"}

---

# 16. Blocked Tests

| ID | Section | Reason |
|----|---------|--------|
${blocked.map((c) => `| ${c.id} | ${esc(c.module)} | ${esc(c.actual).slice(0, 140)} |`).join("\n") || "| - | - | none |"}

---

# 17. Missing Functionality

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

# 18. Broken Functionality

${failed.map((c) => `- **${c.id} [${c.severity || "High"}]:** ${esc(c.actual).slice(0, 180)}`).join("\n") || "- None"}

---

# 19. Frontend Issues

${failed.filter((c) => c.frontendIssue).map((c) => `- **${c.id}:** ${esc(c.frontendIssue)}`).join("\n") || "- -"}

---

# 20. Backend Issues

${failed.filter((c) => c.backendIssue).map((c) => `- **${c.id}:** ${esc(c.backendIssue)}`).join("\n") || "- -"}

---

# 21. API Contract Issues

See API Integration table and LOAD-* / TEST-* FAIL cases.

---

# 22. Database / Data Integrity Issues

${failed.filter((c) => c.businessLogicIssue).map((c) => `- **${c.id}:** ${esc(c.businessLogicIssue)}`).join("\n") || "- -"}

---

# 23. Security / Permission Issues

${cases
  .filter((c) => /SEC-|UNAUTH|RBAC/i.test(c.id) || /secret|unauth|permission/i.test((c.backendIssue || "") + (c.actual || "")))
  .map((c) => `- **${c.id} [${c.status}]:** ${esc(c.actual).slice(0, 180)}`)
  .join("\n") || "- -"}

---

# 24. Console Errors

${cases
  .filter((c) => c.id === "MS-CONSOLE-01")
  .map((c) => `- **${c.id} [${c.status}]:** ${esc(c.actual)}`)
  .join("\n") || "- See MS-CONSOLE-01 in case catalogue."}

---

# 25–28. Evidence / Severity

All FAIL cases above include Expected vs Actual, API method/endpoint where applicable, severity, and reproduction steps. Screenshots under \`test-results/monitoring-system-artifacts/\`.

---

# 29. Passed cases (index)

| ID | Section | Action | Result |
|----|---------|--------|--------|
${passed.map((c) => `| ${c.id} | ${esc(c.module)} | ${esc(c.adminAction).slice(0, 50)} | ${esc(c.actual).slice(0, 100)} |`).join("\n")}

---

# 30. Case catalogue (all)

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
npx playwright test e2e/browser/monitoring-system-admin.spec.ts --project=browser-admin-pov
node scripts/generate-monitoring-system-report.mjs
\`\`\`
`;

fs.writeFileSync(outPath, md, "utf8");
console.log(`Wrote ${outPath}`);
console.log(
  `Totals: cases=${cases.length} pass=${passed.length} fail=${failed.length} blocked=${blocked.length} missing=${missing.length} critical=${critical}`,
);
