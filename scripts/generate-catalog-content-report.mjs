import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const resultsPath = path.join(root, "test-results", "catalog-content-results.json");
const outPath = path.join(root, "CATALOG_CONTENT_ADMIN_E2E_TEST_REPORT.md");

const data = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
const cases = data.cases || [];
const failed = cases.filter((c) => c.status === "FAIL");
const passed = cases.filter((c) => c.status === "PASS");
const blocked = cases.filter((c) => c.status === "BLOCKED");
const missing = cases.filter((c) => c.status === "MISSING");
const bySev = (s) => failed.filter((c) => c.severity === s);

const SECTIONS = [
  "Products",
  "Categories",
  "Promotions",
  "Content Pipeline",
  "Home Page Builder",
  "Media Library",
  "Content Calendar",
  "Master Sheet",
  "Cross-section",
  "Catalog & Content",
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
      (name === "Catalog & Content" && /Auth|Login|Logout|Sidebar|Cross-cutting/i.test(c.module + c.screen)),
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
  const apis = [...new Set(sc.filter((c) => c.apiEndpoint).map((c) => `${c.httpMethod || "?"} ${c.apiEndpoint}`))];
  const issues = f.map((c) => `- **${c.id}:** ${esc(c.actual).slice(0, 160)}`);
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

const critical = bySev("Critical").length;
const ready = failed.length === 0 && missing.length === 0 && critical === 0;

const verdict = ready
  ? "**Verdict: Admin-ready for Catalog & Content** (post-fix verification)."
  : failed.length === 0
    ? "**Verdict: No FAIL / Critical remaining** - review BLOCKED/MISSING below."
    : "**Verdict: NOT Admin-ready for Catalog & Content.** Critical/High defects remain.";

const md = `# Catalog & Content - Admin E2E Test Report

**Generated:** ${data.generatedAt || new Date().toISOString()}  
**Report type:** Post-fix verification  
**Scope:** Catalog & Content only (Products, Categories, Promotions, Content Pipeline, Home Page Builder, Media Library, Content Calendar, Master Sheet)  
**Method:** Real Admin browser automation (Playwright) against live Vite SPA + live selorg-service + live DB  
**Mocks:** Disabled (\`VITE_USE_MOCKS=false\`) - no Jest, no fake API responses  
**Identity:** Real Super Admin  
**Frontend:** ${data.frontendOrigin}  
**Backend:** ${data.apiBase}  
**Artifacts:** \`test-results/catalog-content-artifacts/\` | \`test-results/catalog-content-results.json\`  

---

# Summary

${verdict}

### Audit -> fix -> verify

| Area | Before | After |
|------|--------|-------|
| Products KPI / secondary tabs | CATALOG_CONFIGS seed (3,284 / SEL-1102) | Live totals + derived tables from products/categories APIs |
| Categories KPI | Hardcoded "Reordered today = 4" | Live Active count |
| Media storage KPI | Hardcoded 1.4 GB | Sum of \`sizeBytes\` from cms/media |
| Media upload | Missing UI + stub API | Upload button + \`POST /cms/media\` (S3 + CmsMedia) |
| Calendar actors | "Catalog Mgr" etc. | Empty actors (no fake roles) |
| Console duplicate keys | Home preview \`section.id\` collisions | Unique preview keys + stable section ids |

| Metric | Count |
|--------|------:|
| Total test cases | ${cases.length} |
| Passed | ${passed.length} |
| Failed | ${failed.length} |
| Blocked | ${blocked.length} |
| Missing functionality | ${missing.length} |
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

### Business logic issues
${failed.filter((c) => c.businessLogicIssue).map((c) => `- **${c.id}:** ${esc(c.businessLogicIssue)}`).join("\n") || "- -"}

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
            `| ${c.id} | ${esc(c.module)} | ${c.frontendIssue ? "UI/FE" : c.backendIssue ? "API/BE" : "Integration"} | ${esc(c.actual).slice(0, 140)} |`,
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

PASS only when: Admin action -> correct API -> correct response -> correct backend/business state (for mutations) -> correct UI.

Not accepted as PASS alone: page opened, button clickable, toast appeared, HTTP 200 without state change.

## How to re-run

\`\`\`bash
cd selorg-admin-dashboard
npx playwright test e2e/browser/catalog-content-admin.spec.ts --project=browser-admin-pov
node scripts/generate-catalog-content-report.mjs
\`\`\`
`;

fs.writeFileSync(outPath, md, "utf8");
console.log(`Wrote ${outPath}`);
console.log(
  `Totals: cases=${cases.length} pass=${passed.length} fail=${failed.length} blocked=${blocked.length} missing=${missing.length} critical=${critical}`,
);
