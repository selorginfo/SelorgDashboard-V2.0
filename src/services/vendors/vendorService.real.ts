import { api } from "@/lib/apiClient";
import type { Vendor } from "@/types/vendor";
import type { VendorService, CreateVendorInput, VendorPerformance } from "./vendorService";

function mapVendor(raw: Record<string, unknown>): Vendor {
  const statusRaw = String(raw["stage"] ?? raw["status"] ?? "Active");
  const tone =
    /hold|pending|review/i.test(statusRaw) ? ("amber" as const)
    : /offboard|inactive|archiv/i.test(statusRaw) ? ("grey" as const)
    : ("green" as const);
  return {
    id: String(raw["_id"] ?? raw["id"] ?? raw["vendorCode"] ?? ""),
    name: String(raw["name"] ?? raw["vendorName"] ?? "Vendor"),
    category: String(raw["category"] ?? raw["vendorCategory"] ?? "—"),
    contact: String(raw["contact"] ?? raw["email"] ?? raw["phone"] ?? "—"),
    skusSupplied: String(raw["skusSupplied"] ?? raw["skuCount"] ?? "—"),
    fillRate: String(raw["fillRate"] ?? "—"),
    rejectRate: String(raw["rejectRate"] ?? "—"),
    spendMtd: String(raw["spendMtd"] ?? "—"),
    status: { label: statusRaw, tone },
  };
}

function extractList(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  const r = res as Record<string, unknown>;
  const data = r["data"] ?? r;
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  const nested = data as Record<string, unknown>;
  return (nested["vendors"] ?? nested["list"] ?? []) as Record<string, unknown>[];
}

export const realVendorService: VendorService = {
  async list(): Promise<Vendor[]> {
    const res = await api.get<unknown>("/api/v1/admin/vendor/vendors");
    return extractList(res).map(mapVendor);
  },

  async setStatus(id: string, status: Vendor["status"]): Promise<Vendor> {
    const res = await api.patch<unknown>(`/api/v1/admin/vendor/vendors/${id}/stage`, {
      stage: status.label,
    });
    const root = res as Record<string, unknown>;
    const data = (root["data"] ?? root) as Record<string, unknown>;
    return mapVendor(data);
  },

  async create(input: CreateVendorInput): Promise<Vendor> {
    const res = await api.post<unknown>("/api/v1/admin/vendor/vendors", {
      name: input.name,
      vendorName: input.name,
      category: input.category,
      email: input.email,
      phone: input.phone ?? input.contact,
      contact: input.contact,
      stage: "pending",
      status: "pending",
    });
    const root = res as Record<string, unknown>;
    const data = (root["data"] ?? root) as Record<string, unknown>;
    return mapVendor(data);
  },

  async recordQualityIssue(id: string, notes: string): Promise<unknown> {
    return api.post(`/api/v1/admin/vendor/vendors/${id}/qc-checks`, {
      notes,
      status: "fail",
      productName: "Quality issue",
    });
  },

  async requestDocuments(id: string, note?: string): Promise<unknown> {
    return api.post("/api/v1/admin/vendor/vendors/send-doc-request-email", {
      vendorId: id,
      note,
    });
  },

  async getPerformance(id: string): Promise<VendorPerformance> {
    const res = await api.get<unknown>(`/api/v1/admin/vendor/vendors/${id}/performance`);
    const root = res as Record<string, unknown>;
    const data = (root["data"] ?? root) as VendorPerformance;
    return data;
  },
};
