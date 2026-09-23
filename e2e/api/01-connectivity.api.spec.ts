import { test, expect, APIRequestContext } from "@playwright/test";
import {
  apiCall,
  assertOkOrEmpty,
  assertReachable,
  createApiContext,
} from "../helpers/api";
import { API_BASE, FRONTEND_ORIGIN } from "../helpers/env";

let ctx: APIRequestContext;

test.beforeAll(async () => {
  ctx = await createApiContext({ noCookies: true });
});

test.afterAll(async () => {
  await ctx.dispose();
});

test.describe("Environment & connectivity", () => {
  test("backend health is reachable on configured API_BASE", async () => {
    const res = await apiCall(ctx, "GET", "/health");
    assertReachable(res, "health");
    expect(res.status, `API_BASE=${API_BASE}`).toBe(200);
    expect(res.json?.success).toBe(true);
    const data = res.json?.data as { status?: string; service?: string } | undefined;
    expect(data?.status).toBe("healthy");
    expect(data?.service).toBe("selorg-service");
  });

  test("OPTIONS preflight on admin login (CORS soft check)", async () => {
    const res = await ctx.fetch(`${API_BASE}/api/v1/admin/auth/login`, {
      method: "OPTIONS",
      headers: {
        Origin: FRONTEND_ORIGIN,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type",
      },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("dashboard Vite origin responds when frontend is running", async () => {
    try {
      const res = await ctx.fetch(FRONTEND_ORIGIN, { method: "GET", timeout: 5000 });
      expect(
        res.status(),
        `BLOCKED: frontend not running at ${FRONTEND_ORIGIN}`,
      ).toBeLessThan(500);
    } catch (err) {
      test.info().annotations.push({
        type: "blocked",
        description: `Frontend unavailable at ${FRONTEND_ORIGIN}: ${err}`,
      });
      // Soft: API audit can proceed without Vite; mark as skipped not failed
      test.skip(true, `BLOCKED: frontend unavailable at ${FRONTEND_ORIGIN}`);
    }
  });
});

test.describe("Public / unauthenticated contract probes", () => {
  test("POST /api/v1/admin/auth/login empty body → 4xx", async () => {
    const res = await apiCall(ctx, "POST", "/api/v1/admin/auth/login", {
      body: {},
    });
    assertReachable(res, "login empty");
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(res.json?.success).toBe(false);
  });

  test("GET protected dashboard analytics without token → 401/403", async () => {
    const res = await apiCall(ctx, "GET", "/api/v1/admin/analytics/realtime");
    assertReachable(res, "realtime unauth");
    expect([401, 403]).toContain(res.status);
  });
});

test.describe("Smoke: known public-ish admin paths still require auth", () => {
  const gated: Array<{ name: string; path: string }> = [
    { name: "orders", path: "/api/v1/admin/orders?limit=1" },
    { name: "products", path: "/api/v1/admin/products?limit=1" },
    { name: "customers", path: "/api/v1/admin/customers?limit=1" },
    { name: "users", path: "/api/v1/admin/users?limit=1" },
    { name: "darkstores", path: "/api/v1/admin/darkstores?limit=1" },
  ];

  for (const ep of gated) {
    test(`GET ${ep.path} without auth → 401/403 (${ep.name})`, async () => {
      const res = await apiCall(ctx, "GET", ep.path);
      assertReachable(res, ep.name);
      expect([401, 403], `${ep.name} ${res.status}`).toContain(res.status);
    });
  }
});
