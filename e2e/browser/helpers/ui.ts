import type { Page, Response } from "@playwright/test";
import { expect } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_UI_ROLE,
  API_BASE,
  FRONTEND_ORIGIN,
} from "../../helpers/env";

export { FRONTEND_ORIGIN, API_BASE, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_UI_ROLE };

export type CapturedRequest = {
  method: string;
  url: string;
  status: number;
  ok: boolean;
  bodySnippet?: string;
};

export function attachNetworkCapture(page: Page) {
  const apiCalls: CapturedRequest[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));
  page.on("requestfailed", (req) => {
    failedRequests.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText || "failed"}`);
  });
  page.on("response", async (res: Response) => {
    const url = res.url();
    if (!url.includes("/api/")) return;
    let bodySnippet = "";
    try {
      const text = await res.text();
      bodySnippet = text.slice(0, 500);
    } catch {
      bodySnippet = "";
    }
    apiCalls.push({
      method: res.request().method(),
      url,
      status: res.status(),
      ok: res.ok(),
      bodySnippet,
    });
  });

  return {
    apiCalls,
    consoleErrors,
    failedRequests,
    findApi(match: RegExp | string, method?: string) {
      return [...apiCalls]
        .reverse()
        .find((c) => {
          const urlOk = typeof match === "string" ? c.url.includes(match) : match.test(c.url);
          const methodOk = method ? c.method.toUpperCase() === method.toUpperCase() : true;
          return urlOk && methodOk;
        });
    },
  };
}

export async function uiLoginAsSuperAdmin(page: Page) {
  await page.goto(`${FRONTEND_ORIGIN}/login`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Sign in", { exact: false }).first()).toBeVisible({ timeout: 20_000 });

  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);

  // Radix Select — choose Super Admin (seeded account role)
  const roleTrigger = page.getByLabel("Sign in as");
  await roleTrigger.click();
  await page.getByRole("option", { name: ADMIN_UI_ROLE }).click();

  const loginResp = page.waitForResponse(
    (r) => r.url().includes("/api/v1/admin/auth/login") && r.request().method() === "POST",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: /Continue/i }).click();
  const resp = await loginResp;
  const json = await resp.json().catch(() => null);

  if (resp.status() !== 200 || !json?.success) {
    throw new Error(
      `UI login failed status=${resp.status()} body=${JSON.stringify(json)}`,
    );
  }

  await page.waitForURL(/\/(dashboard|orders|customers|account)/, { timeout: 30_000 });
  return { loginStatus: resp.status(), loginBody: json };
}

export async function openNavItem(page: Page, label: string) {
  const link = page.getByRole("link", { name: new RegExp(label, "i") }).first();
  if (await link.count()) {
    await link.click();
    return;
  }
  const btn = page.getByRole("button", { name: new RegExp(label, "i") }).first();
  if (await btn.count()) {
    await btn.click();
    return;
  }
  // Sidebar items may be plain buttons without roles
  await page.locator(`text=${label}`).first().click();
}

export async function uiLogout(page: Page) {
  await page.keyboard.press("Escape").catch(() => undefined);
  await page.waitForTimeout(300);

  // Prefer account initials/name button in the top banner
  const candidates = [
    page.locator("banner").getByRole("button").filter({ hasText: /Super Admin|HC|Hemanath/i }).first(),
    page.getByRole("button").filter({ hasText: /Super Admin/i }).first(),
    page.locator("button").filter({ hasText: /^HC$/ }).first(),
  ];
  let opened = await page.getByRole("menuitem", { name: /Sign out/i }).isVisible().catch(() => false);
  if (!opened) {
    for (const btn of candidates) {
      if (await btn.count()) {
        await btn.click({ timeout: 5_000 }).catch(() => undefined);
        opened = await page.getByRole("menuitem", { name: /Sign out/i }).isVisible().catch(() => false);
        if (opened) break;
      }
    }
  }
  const signOut = page.getByRole("menuitem", { name: /Sign out/i });
  await expect(signOut).toBeVisible({ timeout: 10_000 });
  await signOut.click();
  await page.waitForURL(/\/login/, { timeout: 25_000 });
}
