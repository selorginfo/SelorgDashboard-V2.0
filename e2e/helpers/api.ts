import { APIRequestContext, expect, request } from "@playwright/test";
import { API_BASE, url } from "./env";

export type Envelope<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: unknown;
  pagination?: unknown;
  timestamp?: string;
  [key: string]: unknown;
};

export type ApiCallResult<T = unknown> = {
  status: number;
  ok: boolean;
  json: Envelope<T> | null;
  headers: Record<string, string>;
  url: string;
  method: string;
  durationMs: number;
  networkError?: string;
  rawText?: string;
};

export async function createApiContext(opts?: {
  /** Start with empty cookie jar (required for unauthenticated negative tests). */
  noCookies?: boolean;
}): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: API_BASE,
    extraHTTPHeaders: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    timeout: 30_000,
    ...(opts?.noCookies ? { storageState: { cookies: [], origins: [] } } : {}),
  });
}

export async function apiCall<T = unknown>(
  ctx: APIRequestContext,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS",
  path: string,
  opts?: {
    body?: unknown;
    token?: string | null;
    headers?: Record<string, string>;
    cookie?: string;
    /** Do not send Authorization even if present in headers merge. */
    omitAuth?: boolean;
  },
): Promise<ApiCallResult<T>> {
  const fullUrl = path.startsWith("http") ? path : url(path);
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts?.body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(opts?.token && !opts?.omitAuth
      ? { Authorization: `Bearer ${opts.token}` }
      : {}),
    ...(opts?.cookie ? { Cookie: opts.cookie } : {}),
    ...opts?.headers,
  };
  if (opts?.omitAuth) {
    delete headers["Authorization"];
  }

  const started = Date.now();
  try {
    const res = await ctx.fetch(fullUrl, {
      method,
      headers,
      data: opts?.body !== undefined ? opts.body : undefined,
    });
    const text = await res.text();
    let json: Envelope<T> | null = null;
    try {
      json = text ? (JSON.parse(text) as Envelope<T>) : null;
    } catch {
      json = null;
    }
    const h: Record<string, string> = {};
    for (const [k, v] of Object.entries(res.headers())) h[k.toLowerCase()] = v;
    return {
      status: res.status(),
      ok: res.ok(),
      json,
      headers: h,
      url: fullUrl,
      method,
      durationMs: Date.now() - started,
      rawText: text.slice(0, 2000),
    };
  } catch (err) {
    return {
      status: 0,
      ok: false,
      json: null,
      headers: {},
      url: fullUrl,
      method,
      durationMs: Date.now() - started,
      networkError: err instanceof Error ? err.message : String(err),
    };
  }
}

export function assertReachable(result: ApiCallResult, label: string) {
  expect(
    result.networkError,
    `BLOCKED: ${label} — backend unavailable ${result.networkError}`,
  ).toBeFalsy();
  expect(result.status, `${label}: no HTTP status`).toBeGreaterThan(0);
}

export function assertOkOrEmpty(result: ApiCallResult, label: string) {
  assertReachable(result, label);
  expect(
    result.status,
    `${label}: unexpected ${result.status} ${JSON.stringify(result.json)}`,
  ).toBeLessThan(500);
  if (result.status >= 200 && result.status < 300) {
    expect(result.json, `${label}: non-JSON`).toBeTruthy();
    if (result.json && "success" in result.json) {
      expect(result.json.success, `${label}: success=false`).toBe(true);
    }
  }
}

export function assertAuthRequired(result: ApiCallResult, label: string) {
  assertReachable(result, label);
  expect(
    [401, 403],
    `${label}: expected 401/403 got ${result.status} ${JSON.stringify(result.json)}`,
  ).toContain(result.status);
}

/** Mimic dashboard apiClient unwrap: prefer `.data`, else whole body. */
export function unwrapData<T = unknown>(json: Envelope<T> | null): unknown {
  if (!json) return null;
  return json.data !== undefined ? json.data : json;
}

export { API_BASE, url };
