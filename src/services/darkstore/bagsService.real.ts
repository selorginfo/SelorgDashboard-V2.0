import { api } from "@/lib/apiClient";
import type { Bag } from "@/types/darkstore";
import type { BagsService } from "./bagsService";

interface RawBag {
  _id?: string;
  bagId?: string;
  bag_id?: string;
  barcode?: string;
  orderId?: string;
  order_id?: string;
  storeId?: string;
  store_id?: string;
  picker?: string;
  scannedCount?: number;
  totalCount?: number;
  rackId?: string;
  rack?: string;
  status?: string;
  createdAt?: string;
  [key: string]: unknown;
}

function toBagTab(status?: string): Bag["tab"] {
  const s = (status ?? "").toLowerCase();
  if (s === "racked" || s === "ready") return "Racked";
  if (s === "rack_pending" || s === "awaiting_rack") return "Awaiting rack";
  if (s.includes("exception") || s.includes("wrong") || s.includes("error")) return "Exceptions";
  return "Bag queue";
}

function toBagBadge(status?: string): Bag["status"] {
  const s = (status ?? "").toLowerCase();
  if (s === "racked" || s === "ready") return { label: "Ready", tone: "green" };
  if (s === "rack_pending" || s === "awaiting_rack") return { label: "Rack pending", tone: "blue" };
  if (s.includes("exception") || s.includes("wrong")) return { label: "Exception", tone: "red" };
  if (s === "picking") return { label: "Picking", tone: "amber" };
  return { label: "Waiting", tone: "grey" };
}

function normalizeBag(raw: RawBag): Bag {
  return {
    id: String(raw.bagId ?? raw.bag_id ?? raw._id ?? ""),
    barcode: String(raw.barcode ?? "—"),
    order: String(raw.orderId ?? raw.order_id ?? "—"),
    store: String(raw.storeId ?? raw.store_id ?? "—"),
    picker: String(raw.picker ?? "—"),
    scanned: Number(raw.scannedCount ?? 0),
    total: Number(raw.totalCount ?? 0),
    rack: String(raw.rackId ?? raw.rack ?? "—"),
    status: toBagBadge(raw.status),
    tab: toBagTab(raw.status),
    createdAt: raw.createdAt,
  };
}


export const realBagsService: BagsService = {
  async list(date?: string): Promise<Bag[]> {
    const dateParam = date ? `&date=${date}` : "";
    const res = await api.get<{ list?: RawBag[]; orders?: RawBag[]; data?: RawBag[] } | RawBag[]>(
      `/api/v1/darkstore/packing/queue?limit=200${dateParam}`,
    );
    const raw: RawBag[] = Array.isArray(res) ? res : (res.list ?? res.orders ?? res.data ?? []);
    return raw.map(normalizeBag);
  },

  async markRacked(id: string, rack: string): Promise<Bag> {
    return api.patch<Bag>(`/api/v1/darkstore/orders/${id}/bag-rack`, { rack });
  },
};
