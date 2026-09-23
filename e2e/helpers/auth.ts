import type { APIRequestContext } from "@playwright/test";
import { expect } from "@playwright/test";
import { apiCall } from "./api";
import { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_ROLE } from "./env";

export type AdminSession = {
  token: string;
  userId: string;
  email: string;
  role: string;
  setCookie?: string;
};

/** Real admin login matching `authService.real.ts` payload shape. */
export async function loginAdmin(
  ctx: APIRequestContext,
  opts?: { email?: string; password?: string; role?: string },
): Promise<AdminSession> {
  const email = opts?.email ?? ADMIN_EMAIL;
  const password = opts?.password ?? ADMIN_PASSWORD;
  const role = opts?.role ?? ADMIN_ROLE;

  const res = await apiCall<{
    token: string;
    user: { _id?: string; id?: string; email: string; role: string };
  }>(ctx, "POST", "/api/v1/admin/auth/login", {
    body: { email, password, role },
  });

  expect(
    res.networkError,
    `BLOCKED: admin login network error ${res.networkError}`,
  ).toBeFalsy();
  expect(
    res.status,
    `Admin login failed status=${res.status} body=${JSON.stringify(res.json)}`,
  ).toBe(200);
  expect(res.json?.success).toBe(true);

  const data = res.json?.data;
  expect(data?.token, "login missing token").toBeTruthy();
  const userId = String(data!.user._id ?? data!.user.id ?? "");
  expect(userId, "login missing user id").toBeTruthy();

  return {
    token: data!.token,
    userId,
    email: data!.user.email,
    role: data!.user.role,
    setCookie: res.headers["set-cookie"],
  };
}

export async function logoutAdmin(
  ctx: APIRequestContext,
  token: string,
): Promise<void> {
  const res = await apiCall(ctx, "POST", "/api/v1/admin/auth/logout", {
    token,
  });
  expect(res.networkError).toBeFalsy();
  expect(res.status).toBe(200);
}
