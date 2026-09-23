import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({
  path: path.join(__dirname, "..", "Selorg V1.3", "selorg-service", ".env"),
});
dotenv.config({
  path: path.join(
    process.env.USERPROFILE || "",
    "Desktop",
    "Selorg V1.3",
    "selorg-service",
    ".env",
  ),
});

const API_BASE = (process.env.API_BASE_URL || process.env.VITE_API_URL || "http://127.0.0.1:3333")
  .replace(/\/$/, "")
  .replace(/\/api\/v1$/i, "")
  .replace(/\/$/, "");

const FRONTEND_ORIGIN =
  process.env.ADMIN_FRONTEND_ORIGIN || "http://localhost:5174";

/**
 * Selorg Admin Dashboard automation — hits real selorg-service APIs used by the SPA.
 * Does not start servers; expects backend already running on API_BASE and Vite on FRONTEND_ORIGIN.
 * Existing Vitest suite remains for unit/mock service tests.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 600_000,
  expect: { timeout: 20_000 },
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/playwright-report.json" }],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  outputDir: "test-results/artifacts",
  use: {
    baseURL: API_BASE,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    extraHTTPHeaders: {
      Accept: "application/json",
    },
  },
  projects: [
    {
      name: "api",
      testMatch: /api\/.*\.spec\.ts/,
    },
    {
      name: "flows",
      testMatch: /flows\/.*\.spec\.ts/,
    },
    {
      name: "browser-admin-pov",
      testMatch: /browser\/.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: FRONTEND_ORIGIN,
        headless: true,
      },
    },
  ],
  metadata: {
    apiBaseUrl: API_BASE,
    frontendOrigin: FRONTEND_ORIGIN,
    app: "selorg-admin-dashboard",
  },
});
