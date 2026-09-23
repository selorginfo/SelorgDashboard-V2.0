#!/usr/bin/env node
/**
 * Runs Playwright then always generates the markdown report.
 * Exit code mirrors Playwright (failures stay failed).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const pw = spawnSync("npx", ["playwright", "test"], {
  cwd,
  stdio: "inherit",
  shell: true,
});

spawnSync("node", ["scripts/generate-api-test-report.mjs"], {
  cwd,
  stdio: "inherit",
  shell: true,
});

process.exit(pw.status ?? 1);
