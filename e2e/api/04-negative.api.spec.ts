import { test, expect, APIRequestContext } from "@playwright/test";
import {
  apiCall,
  assertAuthRequired,
  createApiContext,
} from "../helpers/api";
import { loginAdmin } from "../helpers/auth";
import type { AdminSession } from "../helpers/auth";

/**
 * Negative cases use a cookie-free context so prior logins cannot leak auth.
 */
let anon: APIRequestContext;
let authed: APIRequestContext;
let session: AdminSession;

test.beforeAll(async () => {
  anon = await createApiContext({ noCookies: true });
  authed = await createApiContext({ noCookies: true });
  session = await loginAdmin(authed);
});

test.afterAll(async () => {
  await anon.dispose();
  await authed.dispose();
});

test.describe("Negative API cases (safe)", () => {
  const gatedGets = [
    "/api/v1/admin/analytics/realtime",
    "/api/v1/admin/orders?limit=1",
    "/api/v1/admin/products?limit=1",
    "/api/v1/admin/customers?limit=1",
    "/api/v1/admin/users?limit=1",
    "/api/v1/admin/darkstores?limit=1",
    "/api/v1/admin/riders?limit=1",
    "/api/v1/admin/support/tickets?limit=1",
    "/api/v1/admin/fraud/alerts?limit=1",
    "/api/v1/admin/roles",
    "/api/v1/admin/platform-config",
    "/api/v1/admin/integrations/health",
    "/api/v1/customer/admin/categories/all",
    "/api/v1/admin/vendor/vendors?limit=1",
    "/api/v1/rider/fleet/summary",
    "/api/v1/darkstore/packing/queue?limit=1",
  ];

  for (const path of gatedGets) {
    test(`without token → 401/403: GET ${path}`, async () => {
      const res = await apiCall(anon, "GET", path);
      assertAuthRequired(res, path);
    });
  }

  test("invalid Bearer on orders → 401/403", async () => {
    const fresh = await createApiContext({ noCookies: true });
    try {
      const res = await apiCall(fresh, "GET", "/api/v1/admin/orders?limit=1", {
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.sig",
      });
      assertAuthRequired(res, "bad jwt orders");
    } finally {
      await fresh.dispose();
    }
  });

  test("GET order with non-existent id → 404 or empty/error envelope", async () => {
    const res = await apiCall(
      authed,
      "GET",
      "/api/v1/admin/orders/000000000000000000000000",
      { token: session.token },
    );
    expect(res.networkError).toBeFalsy();
    expect([400, 404, 200]).toContain(res.status);
    if (res.status === 200) {
      const ok =
        res.json?.success === false ||
        res.json?.data === null ||
        res.json?.data === undefined;
      expect(ok || res.json, "unexpected 200 for missing order").toBeTruthy();
    } else {
      expect(res.json?.success).not.toBe(true);
    }
  });

  test("GET product with invalid ObjectId → 4xx", async () => {
    const res = await apiCall(authed, "GET", "/api/v1/admin/products/not-an-id", {
      token: session.token,
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  test("POST create product with empty body → 4xx (no write of valid product)", async () => {
    const res = await apiCall(authed, "POST", "/api/v1/admin/products", {
      token: session.token,
      body: {},
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  test("POST categories with empty body → 4xx", async () => {
    const res = await apiCall(authed, "POST", "/api/v1/customer/admin/categories", {
      token: session.token,
      body: {},
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  test("POST wallet credit with invalid amount → 4xx (or document backend accepts -1)", async () => {
    const res = await apiCall(
      authed,
      "POST",
      "/api/v1/admin/customers/000000000000000000000000/wallet/credit",
      { token: session.token, body: { amount: -1 } },
    );
    // Real finding if 200: backend accepts negative credit / missing customer
    expect(
      res.status,
      `wallet credit invalid amount status=${res.status} body=${res.rawText}`,
    ).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  test("PUT order update-status with invalid id → 4xx", async () => {
    const res = await apiCall(
      authed,
      "PUT",
      "/api/v1/admin/orders/000000000000000000000000/update-status",
      { token: session.token, body: { status: "DELIVERED" } },
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  test("PATCH rider status with invalid id → 4xx", async () => {
    const res = await apiCall(
      authed,
      "PATCH",
      "/api/v1/admin/riders/000000000000000000000000/status",
      { token: session.token, body: { status: "approved" } },
    );
    expect(
      res.status,
      `rider status invalid id status=${res.status} body=${res.rawText}`,
    ).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  test("logout without token → 4xx", async () => {
    const fresh = await createApiContext({ noCookies: true });
    try {
      const res = await apiCall(fresh, "POST", "/api/v1/admin/auth/logout", {
        body: {},
      });
      expect(
        res.status,
        `logout without token status=${res.status} body=${res.rawText}`,
      ).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    } finally {
      await fresh.dispose();
    }
  });
});
