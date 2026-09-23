import { test, expect, APIRequestContext } from "@playwright/test";
import {
  apiCall,
  createApiContext,
  unwrapData,
} from "../helpers/api";
import { loginAdmin } from "../helpers/auth";
import type { AdminSession } from "../helpers/auth";

/**
 * Frontend/backend contract checks derived from real service mappers.
 * Failures here are classified as API CONTRACT mismatches.
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

test.describe("Frontend/backend contract validation", () => {
  test("integrations/health: backend `integrations` vs frontend `.list` mapping", async () => {
    const res = await apiCall(ctx, "GET", "/api/v1/admin/integrations/health", {
      token: session.token,
    });
    expect(res.status).toBe(200);
    expect(res.json?.success).toBe(true);

    const raw = res.json as {
      data?: unknown;
      integrations?: unknown[];
      list?: unknown[];
    };
    const hasTopLevelIntegrations = Array.isArray(raw.integrations);
    const hasDataWrapper = raw.data !== undefined;

    expect(
      hasTopLevelIntegrations || hasDataWrapper || Array.isArray(raw.list),
      `unexpected integrations shape: ${res.rawText}`,
    ).toBe(true);

    const unwrapped = unwrapData(res.json) as Record<string, unknown> | unknown[];
    // Mirrors integrationService.real.ts (array OR `.list` only — not `.integrations`)
    const frontendMapped: unknown[] = Array.isArray(unwrapped)
      ? unwrapped
      : ((unwrapped as { list?: unknown[] }).list ?? []);

    if (hasTopLevelIntegrations && !hasDataWrapper) {
      expect(
        "list" in (unwrapped as object) || Array.isArray(unwrapped),
        "API CONTRACT: backend returns top-level `integrations` (no `data`); integrationService.real only reads array/`.list` → UI always empty",
      ).toBe(true);
    }
    expect(Array.isArray(frontendMapped)).toBe(true);
  });

  test("login response includes token + user fields mapped by authService.real", async () => {
    const res = await apiCall(ctx, "POST", "/api/v1/admin/auth/login", {
      body: {
        email: process.env.ADMIN_TEST_EMAIL || "hemanathc0112@gmail.com",
        password: process.env.ADMIN_TEST_PASSWORD || "Selorg@2024",
        role: "admin",
      },
    });
    expect(res.status).toBe(200);
    const data = res.json?.data as {
      token?: string;
      user?: {
        _id?: string;
        id?: string;
        email?: string;
        role?: string;
        name?: string;
      };
    };
    expect(data.token).toBeTruthy();
    expect(data.user?.email).toBeTruthy();
    expect(data.user?._id || data.user?.id).toBeTruthy();
    expect(data.user?.role).toBeTruthy();
  });

  test("orders list nested data.data is handled by orderService mapper", async () => {
    const res = await apiCall(ctx, "GET", "/api/v1/admin/orders?limit=3", {
      token: session.token,
    });
    expect(res.status).toBe(200);
    const envelope = res.json;
    if (
      envelope?.data &&
      typeof envelope.data === "object" &&
      Array.isArray((envelope.data as { data?: unknown }).data)
    ) {
      const inner = (envelope.data as { data: unknown[] }).data;
      expect(inner.length).toBeGreaterThanOrEqual(0);
      if (inner[0]) {
        const row = inner[0] as Record<string, unknown>;
        expect(
          row.id || row._id || row.orderNumber || row.order_id,
          "order row missing identifiable id fields",
        ).toBeTruthy();
      }
    }
  });

  test("customers wallet field encoding (currency symbol corruption check)", async () => {
    const res = await apiCall(ctx, "GET", "/api/v1/admin/customers?limit=5", {
      token: session.token,
    });
    expect(res.status).toBe(200);
    const rows = unwrapData(res.json) as Array<Record<string, unknown>>;
    if (!Array.isArray(rows) || rows.length === 0) {
      test.skip(true, "BLOCKED: no customers");
      return;
    }
    const sample = rows.find((r) => r.totalSpend != null || r.wallet != null);
    if (!sample) return;
    const spend = String(sample.totalSpend ?? sample.wallet ?? "");
    if (spend.includes("?")) {
      expect(
        spend.includes("?"),
        `CONTRACT/BACKEND: currency encoding corrupted in customer list (value=${spend})`,
      ).toBe(false);
    }
  });

  test("warehouses pagination nested under data.data", async () => {
    const res = await apiCall(ctx, "GET", "/api/v1/admin/warehouses?limit=5", {
      token: session.token,
    });
    expect(res.status).toBe(200);
    const data = unwrapData(res.json) as {
      data?: unknown[];
      pagination?: unknown;
    };
    if (data && typeof data === "object" && "data" in data) {
      expect(Array.isArray(data.data)).toBe(true);
    } else {
      expect(Array.isArray(data)).toBe(true);
    }
  });

  test("vendor list uses { vendors, total } nested payload", async () => {
    const res = await apiCall(ctx, "GET", "/api/v1/admin/vendor/vendors?limit=5", {
      token: session.token,
    });
    expect(res.status).toBe(200);
    const data = unwrapData(res.json) as {
      vendors?: unknown[];
      total?: number;
    };
    expect(data).toBeTruthy();
    if (data && typeof data === "object" && "vendors" in data) {
      expect(Array.isArray(data.vendors)).toBe(true);
    } else {
      expect(Array.isArray(data)).toBe(true);
    }
  });
});
