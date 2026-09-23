import { api, getToken, removeToken } from "@/lib/apiClient";
import type { CatalogProduct, AdminProductInput } from "@/types/catalog";
import type { CatalogService, BulkUploadResult, ProductsPage, FullProduct } from "./catalogService";

const API_BASE = import.meta.env["VITE_API_BASE_URL"] || import.meta.env["VITE_API_URL"] || "http://localhost:3333";

type RawProduct = {
  _id?: string;
  id?: string;
  sku?: string;
  name?: string;
  price?: number;
  mrp?: number;
  quantity?: string;
  size?: string;
  status?: string | { label?: string; tone?: string };
  isActive?: boolean;
  brand?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  cardImageUrl?: string;
  images?: string[];
  stockQuantity?: number;
};

function normalizeProduct(raw: RawProduct): CatalogProduct {
  const statusStr = typeof raw.status === "string" ? raw.status.toLowerCase() : "";
  let label = "Active";
  let tone: "green" | "amber" | "grey" = "green";
  if (statusStr === "draft") { label = "Draft"; tone = "amber"; }
  else if (statusStr === "inactive" || raw.isActive === false) { label = "Inactive"; tone = "grey"; }
  else if (typeof raw.status === "object" && raw.status?.label) {
    label = raw.status.label;
    tone = (raw.status.tone as "green" | "amber" | "grey") ?? "green";
  }

  const img = raw.imageUrl || (raw.images?.[0]) || raw.cardImageUrl || raw.thumbnailUrl || "";

  return {
    _id: raw._id ?? raw.id ?? "",
    sku: raw.sku ?? "",
    name: raw.name ?? "",
    category: raw.brand || "—",
    unit: raw.quantity || raw.size || "—",
    mrp: raw.mrp != null ? `₹${raw.mrp}` : "—",
    selling: raw.price != null ? `₹${raw.price}` : "—",
    storesLive: raw.stockQuantity != null ? String(raw.stockQuantity) : "—",
    status: { label, tone },
    imageUrl: img,
  };
}

export const realCatalogService: CatalogService = {
  async listProducts(): Promise<CatalogProduct[]> {
    const res = await api.get<{ list?: RawProduct[]; data?: RawProduct[] } | RawProduct[]>("/api/v1/admin/products");
    const raw = Array.isArray(res) ? res : ((res as { list?: RawProduct[] }).list ?? (res as { data?: RawProduct[] }).data ?? []);
    return raw.map(normalizeProduct);
  },

  async listProductsPaged({ page, limit, q, warehouseId }): Promise<ProductsPage> {
    const token = getToken();
    const url = new URL(`${API_BASE}/api/v1/admin/products`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(limit));
    if (q) url.searchParams.set("q", q);
    if (warehouseId) url.searchParams.set("warehouseId", warehouseId);
    const res = await fetch(url.toString(), {
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      if (res.status === 401) {
        removeToken();
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
        throw new Error("Authentication required. Please login.");
      }
      const err = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(err.message ?? "Failed to load products");
    }
    const json = await res.json().catch(() => ({})) as { data?: RawProduct[]; meta?: { total: number; totalPages: number; page: number } };
    const raw = json.data ?? [];
    return {
      products: raw.map(normalizeProduct),
      total: json.meta?.total ?? raw.length,
      totalPages: json.meta?.totalPages ?? 1,
      page: json.meta?.page ?? page,
    };
  },

  async getProduct(id: string): Promise<FullProduct> {
    const res = await api.get<{ data: FullProduct } | FullProduct>(`/api/v1/admin/products/${id}`);
    return (res as { data: FullProduct }).data ?? (res as FullProduct);
  },

  async setPublished(sku: string, published: boolean, id?: string): Promise<CatalogProduct> {
    let productId = (id && id.trim()) || "";
    if (!productId) {
      const res = await api.get<unknown>("/api/v1/admin/products", { limit: 200 });
      const raw = Array.isArray(res)
        ? (res as RawProduct[])
        : ((res as { list?: RawProduct[]; data?: RawProduct[]; items?: RawProduct[] }).list ??
          (res as { data?: RawProduct[] }).data ??
          (res as { items?: RawProduct[] }).items ??
          []);
      const found = raw.find((p) => String(p.sku ?? "").toUpperCase() === sku.toUpperCase());
      productId = String(found?._id ?? found?.id ?? "").trim();
    }
    if (!productId) throw new Error(`Product ${sku} not found`);
    const updated = await api.put<RawProduct>(`/api/v1/admin/products/${productId}`, {
      status: published ? "active" : "draft",
      isActive: published,
    });
    return normalizeProduct(updated);
  },

  async createProduct(input: AdminProductInput): Promise<CatalogProduct> {
    return api.post<CatalogProduct>("/api/v1/admin/products", input);
  },

  async updateProduct(id: string, input: Partial<AdminProductInput>): Promise<CatalogProduct> {
    return api.put<CatalogProduct>(`/api/v1/admin/products/${id}`, input);
  },

  async deleteProduct(id: string): Promise<void> {
    await api.delete(`/api/v1/admin/products/${id}`);
  },

  async bulkUpload(file: File): Promise<BulkUploadResult> {
    const form = new FormData();
    form.append("file", file);
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/v1/admin/products/bulk-upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { message?: string }).message ?? "Upload failed");
    return (data as { data: BulkUploadResult }).data;
  },
};
