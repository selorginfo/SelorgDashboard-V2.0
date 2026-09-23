import { test, expect, APIRequestContext } from "@playwright/test";
import {
  apiCall,
  assertOkOrEmpty,
  assertReachable,
  createApiContext,
  unwrapData,
} from "../helpers/api";
import { loginAdmin } from "../helpers/auth";
import { SAFE_AUTH_GETS } from "../helpers/inventory";
import type { AdminSession } from "../helpers/auth";

let ctx: APIRequestContext;
let session: AdminSession;

test.beforeAll(async () => {
  ctx = await createApiContext({ noCookies: true });
  session = await loginAdmin(ctx);
});

test.afterAll(async () => {
  await ctx.dispose();
});

test.describe("Authenticated safe GET sweep (frontend inventory)", () => {
  for (const ep of SAFE_AUTH_GETS) {
    test(`${ep.method} ${ep.path} — ${ep.feature}`, async () => {
      const finalPath = ep.path.includes("?")
        ? ep.path
        : ep.path.endsWith("/all") ||
            ep.path.includes("realtime") ||
            ep.path.includes("health") ||
            ep.path.includes("summary") ||
            ep.path.includes("template") ||
            ep.path.includes("history") ||
            ep.path.includes("sections") ||
            ep.path.includes("roles") ||
            ep.path.includes("platform-config") ||
            ep.path.includes("app-settings") ||
            ep.path.includes("commission") ||
            ep.path.includes("zones") ||
            ep.path.includes("live-positions") ||
            ep.path.includes("map/riders") ||
            ep.path.includes("banners")
          ? ep.path
          : `${ep.path}?limit=5`;

      const res = await apiCall(ctx, "GET", finalPath, {
        token: session.token,
      });
      assertReachable(res, ep.feature);
      if (res.status === 404) {
        expect(
          res.status,
          `CONTRACT: ${ep.path} not found — frontend calls missing backend route. body=${res.rawText}`,
        ).not.toBe(404);
      }
      expect(
        res.status,
        `${ep.feature} ${finalPath} → ${res.status} ${res.rawText}`,
      ).toBeLessThan(500);
      // File/binary endpoints (template download) may return non-JSON bodies
      if (
        res.status >= 200 &&
        res.status < 300 &&
        !ep.path.includes("/template")
      ) {
        expect(res.json, `${ep.feature}: expected JSON body`).toBeTruthy();
      }
    });
  }
});

test.describe("Core admin list endpoints — response shape", () => {
  test("GET /api/v1/admin/analytics/realtime matches dashboardService fields", async () => {
    const res = await apiCall(ctx, "GET", "/api/v1/admin/analytics/realtime", {
      token: session.token,
    });
    assertOkOrEmpty(res, "realtime");
    expect(res.status).toBe(200);
    const data = unwrapData(res.json) as Record<string, unknown>;
    for (const key of [
      "totalRevenue",
      "totalOrders",
      "activeUsers",
      "averageOrderValue",
      "revenueGrowth",
      "ordersGrowth",
      "usersGrowth",
      "conversionRate",
    ]) {
      expect(data, `missing ${key}`).toHaveProperty(key);
      expect(typeof data[key], key).toBe("number");
    }
  });

  test("GET /api/v1/admin/orders returns listable payload", async () => {
    const res = await apiCall(ctx, "GET", "/api/v1/admin/orders?limit=5", {
      token: session.token,
    });
    expect(res.status).toBe(200);
    const data = unwrapData(res.json);
    // Frontend orderService accepts array or nested { data: [] }
    const ok =
      Array.isArray(data) ||
      (data &&
        typeof data === "object" &&
        (Array.isArray((data as { data?: unknown }).data) ||
          Array.isArray((data as { orders?: unknown }).orders)));
    expect(ok, `unexpected orders shape ${JSON.stringify(data).slice(0, 300)}`).toBe(
      true,
    );
  });

  test("GET /api/v1/admin/products returns array", async () => {
    const res = await apiCall(ctx, "GET", "/api/v1/admin/products?limit=5", {
      token: session.token,
    });
    expect(res.status).toBe(200);
    const data = unwrapData(res.json);
    expect(Array.isArray(data), `products not array: ${typeof data}`).toBe(true);
  });

  test("GET /api/v1/admin/customers returns array", async () => {
    const res = await apiCall(ctx, "GET", "/api/v1/admin/customers?limit=5", {
      token: session.token,
    });
    expect(res.status).toBe(200);
    const data = unwrapData(res.json);
    expect(Array.isArray(data)).toBe(true);
  });

  test("GET /api/v1/admin/users returns array", async () => {
    const res = await apiCall(ctx, "GET", "/api/v1/admin/users?limit=5", {
      token: session.token,
    });
    expect(res.status).toBe(200);
    const data = unwrapData(res.json);
    expect(Array.isArray(data)).toBe(true);
    if (Array.isArray(data) && data.length > 0) {
      expect(data[0]).toHaveProperty("email");
    }
  });

  test("GET /api/v1/admin/darkstores returns array", async () => {
    const res = await apiCall(ctx, "GET", "/api/v1/admin/darkstores?limit=5", {
      token: session.token,
    });
    expect(res.status).toBe(200);
    const data = unwrapData(res.json);
    expect(Array.isArray(data)).toBe(true);
  });

  test("GET /api/v1/customer/admin/categories/all returns array", async () => {
    const res = await apiCall(
      ctx,
      "GET",
      "/api/v1/customer/admin/categories/all",
      { token: session.token },
    );
    expect(res.status).toBe(200);
    const data = unwrapData(res.json);
    expect(Array.isArray(data)).toBe(true);
  });

  test("GET /api/v1/admin/riders returns list (may be empty)", async () => {
    const res = await apiCall(ctx, "GET", "/api/v1/admin/riders?limit=5", {
      token: session.token,
    });
    expect(res.status).toBe(200);
    const data = unwrapData(res.json);
    expect(
      Array.isArray(data) ||
        (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)),
    ).toBe(true);
  });

  test("GET /api/v1/admin/support/tickets returns array", async () => {
    const res = await apiCall(
      ctx,
      "GET",
      "/api/v1/admin/support/tickets?limit=5",
      { token: session.token },
    );
    expect(res.status).toBe(200);
    const data = unwrapData(res.json);
    expect(Array.isArray(data)).toBe(true);
  });

  test("GET /api/v1/rider/fleet/summary returns totals object", async () => {
    const res = await apiCall(ctx, "GET", "/api/v1/rider/fleet/summary", {
      token: session.token,
    });
    expect(res.status).toBe(200);
    const data = unwrapData(res.json) as Record<string, unknown>;
    expect(data).toBeTruthy();
    expect(typeof data).toBe("object");
  });
});

test.describe("Order detail flow (read-only)", () => {
  test("list orders → get first order → get logs", async () => {
    const list = await apiCall(ctx, "GET", "/api/v1/admin/orders?limit=5", {
      token: session.token,
    });
    expect(list.status).toBe(200);
    const raw = unwrapData(list.json);
    let rows: Array<{ id?: string; _id?: string }> = [];
    if (Array.isArray(raw)) rows = raw as typeof rows;
    else if (raw && typeof raw === "object" && Array.isArray((raw as { data: unknown }).data)) {
      rows = (raw as { data: typeof rows }).data;
    }
    if (rows.length === 0) {
      test.skip(true, "BLOCKED: no orders in backend to exercise detail/logs");
      return;
    }
    const id = String(rows[0].id ?? rows[0]._id);
    expect(id).toBeTruthy();

    const detail = await apiCall(ctx, "GET", `/api/v1/admin/orders/${id}`, {
      token: session.token,
    });
    expect(detail.status).toBe(200);
    expect(unwrapData(detail.json)).toBeTruthy();

    const logs = await apiCall(ctx, "GET", `/api/v1/admin/orders/${id}/logs`, {
      token: session.token,
    });
    expect(logs.status).toBeLessThan(500);
    // logs may be empty array
    if (logs.status === 200) {
      const logData = unwrapData(logs.json);
      expect(
        Array.isArray(logData) || logData === null || typeof logData === "object",
      ).toBe(true);
    }
  });
});

test.describe("Product detail flow (read-only)", () => {
  test("list products → get first product", async () => {
    const list = await apiCall(ctx, "GET", "/api/v1/admin/products?limit=5", {
      token: session.token,
    });
    expect(list.status).toBe(200);
    const rows = unwrapData(list.json) as Array<{ _id?: string; id?: string }>;
    expect(Array.isArray(rows)).toBe(true);
    if (!rows.length) {
      test.skip(true, "BLOCKED: no products in backend");
      return;
    }
    const id = String(rows[0]._id ?? rows[0].id);
    const detail = await apiCall(ctx, "GET", `/api/v1/admin/products/${id}`, {
      token: session.token,
    });
    expect(detail.status).toBe(200);
    const product = unwrapData(detail.json) as Record<string, unknown>;
    expect(product).toBeTruthy();
  });
});
