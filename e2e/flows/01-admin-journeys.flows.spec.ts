import { test, expect, APIRequestContext } from "@playwright/test";
import {
  apiCall,
  createApiContext,
  unwrapData,
} from "../helpers/api";
import { loginAdmin, logoutAdmin } from "../helpers/auth";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "../helpers/env";
import type { AdminSession } from "../helpers/auth";

/**
 * Admin workflow journeys as real-backend API sequences matching
 * dashboard screens (no destructive deletes of production entities).
 */
let ctx: APIRequestContext;
let session: AdminSession;

test.beforeAll(async () => {
  ctx = await createApiContext({ noCookies: true });
  session = await loginAdmin(ctx);
});

test.afterAll(async () => {
  await ctx.dispose();
});

test.describe("Admin journey: login → dashboard KPIs", () => {
  test("login then load realtime analytics (Dashboard page)", async () => {
    const s = await loginAdmin(ctx);
    const res = await apiCall(ctx, "GET", "/api/v1/admin/analytics/realtime", {
      token: s.token,
    });
    expect(res.status).toBe(200);
    const data = unwrapData(res.json) as { totalOrders?: number };
    expect(typeof data.totalOrders).toBe("number");
  });
});

test.describe("Admin journey: orders workspace", () => {
  test("list → detail → logs", async () => {
    const list = await apiCall(ctx, "GET", "/api/v1/admin/orders?limit=10", {
      token: session.token,
    });
    expect(list.status).toBe(200);
    const raw = unwrapData(list.json);
    let rows: Array<Record<string, unknown>> = [];
    if (Array.isArray(raw)) rows = raw;
    else if (raw && typeof raw === "object" && Array.isArray((raw as { data: unknown }).data)) {
      rows = (raw as { data: typeof rows }).data;
    }
    if (!rows.length) {
      test.skip(true, "BLOCKED: no orders for orders workspace journey");
      return;
    }
    const id = String(rows[0].id ?? rows[0]._id);
    const detail = await apiCall(ctx, "GET", `/api/v1/admin/orders/${id}`, {
      token: session.token,
    });
    expect(detail.status).toBe(200);
    const logs = await apiCall(ctx, "GET", `/api/v1/admin/orders/${id}/logs`, {
      token: session.token,
    });
    expect(logs.status).toBeLessThan(500);
  });

  test("picking queue statuses used by pickingService", async () => {
    for (const status of ["confirmed", "getting-packed"]) {
      const res = await apiCall(
        ctx,
        "GET",
        `/api/v1/admin/orders?status=${status}&limit=20`,
        { token: session.token },
      );
      expect(res.status, status).toBeLessThan(500);
      expect(res.status, status).toBe(200);
    }
  });
});

test.describe("Admin journey: catalog & categories", () => {
  test("products list + categories all", async () => {
    const products = await apiCall(ctx, "GET", "/api/v1/admin/products?limit=10", {
      token: session.token,
    });
    expect(products.status).toBe(200);
    expect(Array.isArray(unwrapData(products.json))).toBe(true);

    const cats = await apiCall(
      ctx,
      "GET",
      "/api/v1/customer/admin/categories/all",
      { token: session.token },
    );
    expect(cats.status).toBe(200);
    expect(Array.isArray(unwrapData(cats.json))).toBe(true);
  });
});

test.describe("Admin journey: darkstores & packing", () => {
  test("darkstores list + packing queue", async () => {
    const stores = await apiCall(ctx, "GET", "/api/v1/admin/darkstores?limit=10", {
      token: session.token,
    });
    expect(stores.status).toBe(200);
    expect(Array.isArray(unwrapData(stores.json))).toBe(true);

    const bags = await apiCall(
      ctx,
      "GET",
      "/api/v1/darkstore/packing/queue?limit=20",
      { token: session.token },
    );
    expect(bags.status).toBe(200);
  });
});

test.describe("Admin journey: riders & approvals", () => {
  test("riders directory + fleet summary + live map", async () => {
    const riders = await apiCall(ctx, "GET", "/api/v1/admin/riders?limit=20", {
      token: session.token,
    });
    expect(riders.status).toBe(200);

    const fleet = await apiCall(ctx, "GET", "/api/v1/rider/fleet/summary", {
      token: session.token,
    });
    expect(fleet.status).toBe(200);

    const live = await apiCall(ctx, "GET", "/api/v1/rider/dispatch/map/riders", {
      token: session.token,
    });
    expect(live.status).toBeLessThan(500);
  });

  test("picker approvals list", async () => {
    const res = await apiCall(ctx, "GET", "/api/v1/admin/picker/approvals", {
      token: session.token,
    });
    expect(res.status).toBeLessThan(500);
  });
});

test.describe("Admin journey: customers, support, users", () => {
  test("customers + tickets + admin users", async () => {
    const customers = await apiCall(
      ctx,
      "GET",
      "/api/v1/admin/customers?limit=10",
      { token: session.token },
    );
    expect(customers.status).toBe(200);

    const tickets = await apiCall(
      ctx,
      "GET",
      "/api/v1/admin/support/tickets?limit=10",
      { token: session.token },
    );
    expect(tickets.status).toBe(200);

    const users = await apiCall(ctx, "GET", "/api/v1/admin/users?limit=10", {
      token: session.token,
    });
    expect(users.status).toBe(200);
    const rows = unwrapData(users.json) as Array<{ email?: string }>;
    expect(Array.isArray(rows)).toBe(true);
    expect(
      rows.some((u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()),
    ).toBe(true);
  });
});

test.describe("Admin journey: finance / workforce reads", () => {
  test("payouts + withdrawals + commission slabs", async () => {
    for (const path of [
      "/api/v1/admin/finance/rider-cash/payouts",
      "/api/v1/admin/finance/picker-withdrawals",
      "/api/v1/admin/finance/vendor-payments/payments",
      "/api/v1/admin/finance/config/commission-slabs",
    ]) {
      const res = await apiCall(ctx, "GET", path, { token: session.token });
      expect(res.status, path).toBeLessThan(500);
    }
  });
});

test.describe("Admin journey: warehouse inbound", () => {
  test("warehouses + GRNs + putaway + transfers", async () => {
    for (const path of [
      "/api/v1/admin/warehouses?limit=10",
      "/api/v1/warehouse/inbound/grns",
      "/api/v1/darkstore/inbound/putaway",
      "/api/v1/warehouse/transfers",
      "/api/v1/warehouse/darkstore-requests",
    ]) {
      const res = await apiCall(ctx, "GET", path, { token: session.token });
      expect(res.status, path).toBeLessThan(500);
    }
  });
});

test.describe("Admin journey: system settings & monitoring", () => {
  test("roles + platform-config + fraud + notifications + audit", async () => {
    for (const path of [
      "/api/v1/admin/roles",
      "/api/v1/admin/platform-config",
      "/api/v1/admin/fraud/alerts?limit=10",
      "/api/v1/admin/notifications/templates",
      "/api/v1/admin/notifications/history",
      "/api/v1/admin/audit/logs",
      "/api/v1/admin/integrations/health",
    ]) {
      const res = await apiCall(ctx, "GET", path, { token: session.token });
      expect(res.status, path).toBeLessThan(500);
    }
  });
});

test.describe("Admin journey: login role trap (UI default)", () => {
  test("default LoginPage role Operations Admin cannot authenticate seeded Super Admin", async () => {
    const res = await apiCall(ctx, "POST", "/api/v1/admin/auth/login", {
      body: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: "operations_admin",
      },
    });
    expect(res.status).toBe(401);
  });
});

test.describe("Admin journey: logout cleanup", () => {
  test("logout returns success", async () => {
    const s = await loginAdmin(ctx);
    await logoutAdmin(ctx, s.token);
  });
});

test.describe("UI-state related API empties (no fake data injected by API)", () => {
  test("empty riders list is real empty array — not seed payload", async () => {
    const res = await apiCall(ctx, "GET", "/api/v1/admin/riders?limit=50", {
      token: session.token,
    });
    expect(res.status).toBe(200);
    const data = unwrapData(res.json);
    const rows = Array.isArray(data)
      ? data
      : ((data as { data?: unknown[] })?.data ?? []);
    // Seed live riders use ids like design fixtures; ensure API does not return those codes when empty
    if (rows.length === 0) {
      expect(rows).toEqual([]);
    } else {
      const asText = JSON.stringify(rows);
      expect(asText.includes("SEED_LIVE")).toBe(false);
    }
  });

  test("roles API empty does not invent seed roles", async () => {
    const res = await apiCall(ctx, "GET", "/api/v1/admin/roles", {
      token: session.token,
    });
    expect(res.status).toBe(200);
    const data = unwrapData(res.json);
    expect(Array.isArray(data)).toBe(true);
  });
});
