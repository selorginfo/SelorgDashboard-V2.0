import { api } from "@/lib/apiClient";
import type { Badge } from "@/types/common";
import type { Grn } from "@/types/warehouse";
import type { GrnService } from "./grnService";

// Warehouse inbound GRN endpoint (mounted at /api/v1/warehouse)
const BASE = "/api/v1/warehouse/inbound/grns";

type RawGrn = {
  id?: string;
  _id?: string;
  poNumber?: string;
  vendor?: string;
  supplier?: string;
  items?: number;
  expected?: number | string;
  received?: number | string;
  accepted?: number | string;
  rejected?: number | string;
  sku?: string;
  status?: string | Badge;
};

function statusBadge(raw: string | Badge | undefined): Badge {
  if (raw && typeof raw === "object" && "label" in raw) return raw as Badge;
  const s = String(raw || "pending").toLowerCase();
  switch (s) {
    case "pending":
    case "expected":
      return { label: "Expected", tone: "amber" };
    case "in-progress":
    case "receiving":
      return { label: "Receiving", tone: "blue" };
    case "discrepancy":
      return { label: "Discrepancy", tone: "red" };
    case "completed":
    case "accepted":
    case "closed":
      return { label: "Accepted", tone: "green" };
    case "qc":
      return { label: "QC", tone: "blue" };
    case "rejected":
      return { label: "Rejected", tone: "red" };
    default:
      return { label: String(raw || "Pending"), tone: "grey" };
  }
}

function mapGrn(raw: RawGrn, index: number): Grn {
  const qty = raw.items ?? raw.expected ?? 0;
  return {
    id: String(raw.id ?? raw._id ?? `GRN-${index}`),
    supplier: String(raw.vendor ?? raw.supplier ?? "—"),
    sku: String(raw.sku ?? raw.poNumber ?? "—"),
    expected: String(qty),
    received: String(raw.received ?? 0),
    accepted: String(raw.accepted ?? 0),
    rejected: String(raw.rejected ?? 0),
    status: statusBadge(raw.status),
  };
}

function extractList(res: unknown): RawGrn[] {
  if (Array.isArray(res)) return res as RawGrn[];
  if (!res || typeof res !== "object") return [];
  const r = res as Record<string, unknown>;
  for (const k of ["data", "list", "items", "grns"]) {
    if (Array.isArray(r[k])) return r[k] as RawGrn[];
  }
  return [];
}

export const realGrnService: GrnService = {
  async list(): Promise<Grn[]> {
    const res = await api.get<unknown>(BASE);
    return extractList(res).map(mapGrn);
  },

  async startReceiving(id: string): Promise<Grn> {
    const res = await api.post<RawGrn>(`${BASE}/${id}/start`);
    return mapGrn(res, 0);
  },

  async verifyQuantity(id: string): Promise<Grn> {
    // No dedicated verify-quantity endpoint — log a discrepancy note
    const res = await api.post<RawGrn>(`${BASE}/${id}/discrepancy`, { action: "verify" });
    return mapGrn(res, 0);
  },

  async sendToQc(id: string): Promise<Grn> {
    // Route to QC inspection creation for this GRN
    const res = await api.post<RawGrn>(`/api/v1/warehouse/qc/inspections`, { grnId: id });
    return mapGrn(res, 0);
  },

  async accept(id: string): Promise<Grn> {
    const res = await api.post<RawGrn>(`${BASE}/${id}/complete`);
    return mapGrn(res, 0);
  },

  async reject(id: string): Promise<Grn> {
    const res = await api.post<RawGrn>(`${BASE}/${id}/discrepancy`, { action: "reject" });
    return mapGrn(res, 0);
  },

  async raiseDebitNote(id: string): Promise<Grn> {
    const res = await api.post<RawGrn>(`${BASE}/${id}/discrepancy`, { action: "debit_note" });
    return mapGrn(res, 0);
  },

  async generateGrn(id: string): Promise<Grn> {
    const res = await api.post<RawGrn>(`${BASE}/${id}/complete`);
    return mapGrn(res, 0);
  },
};
