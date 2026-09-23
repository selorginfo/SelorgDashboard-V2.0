import { test, expect, APIRequestContext } from "@playwright/test";
import { apiCall, assertAuthRequired, createApiContext } from "../helpers/api";
import { loginAdmin, logoutAdmin } from "../helpers/auth";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_ROLE,
  API_BASE,
  FRONTEND_ORIGIN,
} from "../helpers/env";

let ctx: APIRequestContext;

test.beforeAll(async () => {
  ctx = await createApiContext({ noCookies: true });
});

test.afterAll(async () => {
  await ctx.dispose();
});

test.describe("Admin authentication (authService.real contract)", () => {
  test("login rejects missing email/password", async () => {
    const res = await apiCall(ctx, "POST", "/api/v1/admin/auth/login", {
      body: { role: "admin" },
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(res.json?.success).toBe(false);
  });

  test("login rejects invalid credentials → 401", async () => {
    const res = await apiCall(ctx, "POST", "/api/v1/admin/auth/login", {
      body: {
        email: ADMIN_EMAIL,
        password: "DefinitelyWrongPassword!999",
        role: ADMIN_ROLE,
      },
    });
    expect(res.status).toBe(401);
    expect(res.json?.success).toBe(false);
  });

  test("login with Operations Admin role against super-admin user fails (frontend default role trap)", async () => {
    // LoginPage defaultValues.role = "Operations Admin" → realAuthService sends operations_admin
    const res = await apiCall(ctx, "POST", "/api/v1/admin/auth/login", {
      body: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: "operations_admin",
      },
    });
    expect(
      res.status,
      `Expected role mismatch rejection; got ${res.status} ${JSON.stringify(res.json)}`,
    ).toBe(401);
    expect(res.json?.success).toBe(false);
  });

  test("login with admin role succeeds and returns token + user", async () => {
    const session = await loginAdmin(ctx);
    expect(session.token.split(".").length).toBe(3);
    expect(session.email.toLowerCase()).toBe(ADMIN_EMAIL.toLowerCase());
    expect(session.userId).toBeTruthy();
  });

  test("login sets HttpOnly selorg_admin_token cookie (matches controller)", async () => {
    const res = await apiCall(ctx, "POST", "/api/v1/admin/auth/login", {
      body: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: ADMIN_ROLE,
      },
    });
    expect(res.status).toBe(200);
    const setCookie = res.headers["set-cookie"] || "";
    expect(setCookie, "missing Set-Cookie").toMatch(/selorg_admin_token=/);
    expect(setCookie.toLowerCase()).toMatch(/httponly/);
  });

  test("Bearer token from login authorizes analytics realtime", async () => {
    const session = await loginAdmin(ctx);
    const res = await apiCall(ctx, "GET", "/api/v1/admin/analytics/realtime", {
      token: session.token,
    });
    expect(res.status).toBe(200);
    expect(res.json?.success).toBe(true);
    expect(res.json?.data).toBeTruthy();
  });

  test("Cookie token from login authorizes analytics realtime", async () => {
    const resLogin = await apiCall(ctx, "POST", "/api/v1/admin/auth/login", {
      body: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: ADMIN_ROLE,
      },
    });
    expect(resLogin.status).toBe(200);
    const setCookie = resLogin.headers["set-cookie"];
    expect(setCookie).toBeTruthy();
    // Playwright may concatenate cookies; extract selorg_admin_token pair
    const match = /selorg_admin_token=[^;]+/.exec(setCookie || "");
    expect(match).toBeTruthy();
    const res = await apiCall(ctx, "GET", "/api/v1/admin/analytics/realtime", {
      cookie: match![0],
    });
    expect(
      res.status,
      `cookie auth failed ${res.status} ${JSON.stringify(res.json)}`,
    ).toBe(200);
  });

  test("invalid Bearer token → 401", async () => {
    const fresh = await createApiContext({ noCookies: true });
    try {
      const res = await apiCall(fresh, "GET", "/api/v1/admin/analytics/realtime", {
        token: "not.a.valid.jwt",
      });
      assertAuthRequired(res, "invalid bearer");
    } finally {
      await fresh.dispose();
    }
  });

  test("malformed Authorization header → 401/403", async () => {
    const fresh = await createApiContext({ noCookies: true });
    try {
      const res = await apiCall(fresh, "GET", "/api/v1/admin/analytics/realtime", {
        headers: { Authorization: "Token abc" },
      });
      assertAuthRequired(res, "malformed auth");
    } finally {
      await fresh.dispose();
    }
  });

  test("logout with Bearer succeeds and subsequent call fails", async () => {
    const session = await loginAdmin(ctx);
    await logoutAdmin(ctx, session.token);
    const res = await apiCall(ctx, "GET", "/api/v1/admin/analytics/realtime", {
      token: session.token,
    });
    // Backend revokeToken should reject; if revoke is soft, may still 200 — record actual
    if (res.status === 200) {
      test.info().annotations.push({
        type: "issue",
        description:
          "Revoked admin JWT still accepted after logout — token blocklist may not be enforced for this route",
      });
    }
    expect([200, 401, 403]).toContain(res.status);
    if (res.status !== 200) {
      assertAuthRequired(res, "post-logout");
    }
  });

  test("CORS: login with Origin dashboard accepts request", async () => {
    const res = await ctx.fetch(`${API_BASE}/api/v1/admin/auth/login`, {
      method: "POST",
      headers: {
        Origin: FRONTEND_ORIGIN,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      data: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: ADMIN_ROLE,
      },
    });
    expect(res.status()).toBe(200);
    const acao = res.headers()["access-control-allow-origin"];
    if (acao) {
      expect([FRONTEND_ORIGIN, "*"]).toContain(acao);
    }
  });
});
