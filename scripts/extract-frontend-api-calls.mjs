/**
 * TEST INFRASTRUCTURE ONLY.
 *
 * Statically extracts every backend endpoint the dashboard SPA calls, by
 * scanning `api.<verb>("<path>")` / `apiUpload(...)` call sites in src/.
 * Template placeholders (`${id}`) are normalized to `:param` so the result can
 * be diffed against the backend route inventory.
 *
 * Usage:  node scripts/extract-frontend-api-calls.mjs
 * Output: test-output/frontend-api-calls.json  (+ .tsv)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");
const OUT_DIR = path.join(ROOT, "test-output");

const CODE_EXT = new Set([".ts", ".tsx"]);
/** Mock/seed/test modules never reach the network. */
const EXCLUDE = /\.(mock|seed|test|spec)\.tsx?$/;

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (CODE_EXT.has(path.extname(e.name)) && !EXCLUDE.test(e.name)) acc.push(p);
  }
  return acc;
}

/**
 * `/api/v1/admin/orders/${id}/items` -> `/api/v1/admin/orders/:param/items`
 *
 * Placeholders may contain one level of nested braces (`${(x as T)._id ?? y}`),
 * and a trailing placeholder glued straight onto a segment is a query-string
 * builder (`/orders${qs}`), not a path parameter — so it is truncated instead.
 */
const PLACEHOLDER = /\$\{(?:[^{}]|\{[^{}]*\})*\}/g;

function normalize(raw) {
  let p = raw.replace(PLACEHOLDER, ":param").trim();
  const q = p.indexOf("?");
  if (q >= 0) p = p.slice(0, q);
  p = p.replace(/(?<=[A-Za-z0-9)\]]):param$/, "");
  return p.replace(/\/+$/, "") || "/";
}

// api.get<T>("/x"), api.post(`/y`), apiUpload("/z"), api.del('/w')
const CALL = /\b(?:api|apiClient)\s*\.\s*(get|post|put|patch|delete|del)\s*(?:<[^()]*?>)?\s*\(\s*([`'"])([^`'"]*?)\2/gs;
const UPLOAD = /\bapiUpload\s*(?:<[^()]*?>)?\s*\(\s*([`'"])([^`'"]*?)\1/gs;
// Raw fetch(`${API_BASE}/api/v1/...`, { method: "POST" }) — used for multipart uploads.
const RAW_FETCH = /\bfetch\s*\(\s*`\$\{(?:API_BASE|BASE|API_URL|base)\}([^`]*)`\s*(?:,\s*\{([\s\S]{0,260}?)\})?/g;

const VERB = { get: "GET", post: "POST", put: "PUT", patch: "PATCH", delete: "DELETE", del: "DELETE" };

const found = new Map(); // "METHOD path" -> { method, path, files:Set }
function record(method, rawPath, file) {
  const p = normalize(rawPath);
  if (!p.startsWith("/api")) return;
  const key = `${method} ${p}`;
  if (!found.has(key)) found.set(key, { method, path: p, files: new Set() });
  found.get(key).files.add(path.relative(ROOT, file).replace(/\\/g, "/"));
}

const files = walk(SRC);
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(CALL)) record(VERB[m[1]], m[3], file);
  for (const m of text.matchAll(UPLOAD)) record("POST", m[2], file);
  for (const m of text.matchAll(RAW_FETCH)) {
    const verb = /method\s*:\s*["'`](\w+)/.exec(m[2] || "");
    record(verb ? verb[1].toUpperCase() : "GET", m[1], file);
  }
}

const catalogPath = path.join(SRC, "data", "dashboardApiCatalog.json");
if (fs.existsSync(catalogPath)) {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const catalogRel = "src/data/dashboardApiCatalog.json";
  for (const ep of catalog) {
    if (ep?.method && ep?.path) record(String(ep.method).toUpperCase(), ep.path, catalogPath);
    const rec = found.get(`${String(ep.method).toUpperCase()} ${normalize(ep.path)}`);
    if (rec) rec.files.add(catalogRel);
  }
}

const calls = [...found.values()]
  .map((c) => ({ method: c.method, path: c.path, files: [...c.files].sort() }))
  .sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "frontend-api-calls.json"), JSON.stringify({
  generatedAt: new Date().toISOString(),
  scannedFiles: files.length,
  totalCalls: calls.length,
  calls,
}, null, 2));
fs.writeFileSync(path.join(OUT_DIR, "frontend-api-calls.tsv"),
  "METHOD\tPATH\tFILES\n" + calls.map((c) => `${c.method}\t${c.path}\t${c.files.join(";")}`).join("\n"));

const byNs = {};
for (const c of calls) {
  const seg = c.path.split("/").filter(Boolean);
  const ns = c.path.startsWith("/api/v1/customer/admin") ? "/api/v1/customer/admin" : "/api/v1/" + (seg[2] || "");
  byNs[ns] = (byNs[ns] || 0) + 1;
}
console.log(`scanned ${files.length} source files`);
console.log(`distinct dashboard API calls: ${calls.length}`);
console.log("--- by namespace ---");
Object.entries(byNs).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(String(v).padStart(5), k));
const byVerb = calls.reduce((a, c) => (a[c.method] = (a[c.method] || 0) + 1, a), {});
console.log("--- by method ---", JSON.stringify(byVerb));
