import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });
dotenv.config({
  path: path.join(
    process.env.USERPROFILE || "",
    "Desktop",
    "Selorg V1.3",
    "selorg-service",
    ".env",
  ),
});

function stripApiSuffix(raw: string): string {
  return raw
    .trim()
    .replace(/\/$/, "")
    .replace(/\/api\/v1$/i, "")
    .replace(/\/$/, "");
}

const rawApi =
  process.env.API_BASE_URL ||
  process.env.VITE_API_URL ||
  process.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:3333";

/** Server origin used by dashboard `apiClient` (VITE_API_URL default). */
export const API_BASE = stripApiSuffix(rawApi);

/** Frontend Vite origin (for browser E2E + CORS soft checks). */
export const FRONTEND_ORIGIN =
  process.env.ADMIN_FRONTEND_ORIGIN || "http://localhost:5174";

/**
 * Seeded super-admin from selorg-service/scripts/seed-superadmin.ts.
 * Override via ADMIN_TEST_EMAIL / ADMIN_TEST_PASSWORD.
 */
export const ADMIN_EMAIL =
  process.env.ADMIN_TEST_EMAIL || "hemanathc0112@gmail.com";
export const ADMIN_PASSWORD =
  process.env.ADMIN_TEST_PASSWORD || "Selorg@2024";
/** Role string sent by realAuthService after normalize. */
export const ADMIN_ROLE = process.env.ADMIN_TEST_ROLE || "admin";
/** UI role label shown on LoginPage Select. */
export const ADMIN_UI_ROLE =
  process.env.ADMIN_TEST_UI_ROLE || "Super Admin";

export function url(pathSuffix: string): string {
  const p = pathSuffix.startsWith("/") ? pathSuffix : `/${pathSuffix}`;
  return `${API_BASE}${p}`;
}
