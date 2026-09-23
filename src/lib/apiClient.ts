const API_BASE = import.meta.env["VITE_API_BASE_URL"] || import.meta.env["VITE_API_URL"] || "http://localhost:3333";
const TOKEN_KEY = "selorg-admin-token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function handleResponse<T>(res: Response, isAuthEndpoint = false): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // On the login endpoint itself, always surface the real server message so the
    // UI can show "Invalid credentials" rather than a generic redirect message.
    if (res.status === 401 && !isAuthEndpoint) {
      removeToken();
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
      throw new Error("Authentication required. Please login.");
    }
    const msg = (data as { message?: string }).message || res.statusText || "Request failed";
    throw new Error(msg);
  }
  const body = data as { success?: boolean; data?: T };
  return (body.data !== undefined ? body.data : data) as T;
}

export const api = {
  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) url.searchParams.set(k, String(v));
      });
    }
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: authHeaders(),
      credentials: "include",
      cache: "no-store",
    });
    return handleResponse<T>(res);
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: authHeaders(),
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const isAuthEndpoint = path.includes("/auth/login") || path.includes("/auth/logout");
    return handleResponse<T>(res, isAuthEndpoint);
  },

  async put<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PUT",
      headers: authHeaders(),
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    return handleResponse<T>(res);
  },

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PATCH",
      headers: authHeaders(),
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    return handleResponse<T>(res);
  },

  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "DELETE",
      headers: authHeaders(),
      credentials: "include",
      cache: "no-store",
    });
    return handleResponse<T>(res);
  },

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const verb = method.toUpperCase();
    if (verb === "GET") return this.get<T>(path);
    if (verb === "DELETE") return this.delete<T>(path);
    if (verb === "PUT") return this.put<T>(path, body ?? {});
    if (verb === "PATCH") return this.patch<T>(path, body ?? {});
    return this.post<T>(path, body ?? {});
  },
};
