import { api } from "@/lib/apiClient";
import type { PickingOrder } from "@/types/darkstore";
import type { PickingService } from "./pickingService";

interface RawAdminOrder {
  _id?: string;
  orderNumber?: string;
  order_id?: string;
  status?: string;
  storeId?: string;
  store_id?: string;
  customer_name?: string;
  pickerAssignment?: { pickerName?: string };
  assignee?: { name?: string };
  pickingData?: { startTime?: string; missingItems?: unknown[] };
  items?: unknown[];
  createdAt?: string;
  [key: string]: unknown;
}

function elapsedSince(iso?: string): string {
  if (!iso) return "—";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function formatTime(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "—";
  }
}

function toPickingTab(status?: string): PickingOrder["tab"] {
  const s = (status ?? "").toLowerCase();
  if (s === "getting-packed") return "Packing";
  if (s === "pending" || s === "confirmed") return "Picking queue";
  return "Picking queue";
}

function toPickingBadge(status?: string): PickingOrder["status"] {
  const s = (status ?? "").toLowerCase();
  if (s === "getting-packed") return { label: "Packing", tone: "amber" };
  if (s === "confirmed") return { label: "Assigned", tone: "green" };
  return { label: "Pending", tone: "amber" };
}

function normalizeToPickingOrder(raw: RawAdminOrder): PickingOrder {
  const id = raw.orderNumber ?? raw.order_id ?? String(raw._id ?? "");
  const store = String(raw.storeId ?? raw.store_id ?? "—");
  const picker =
    raw.pickerAssignment?.pickerName ??
    (raw.assignee as { name?: string } | undefined)?.name ??
    "—";
  const totalItems = Array.isArray(raw.items) ? raw.items.length : 0;
  const missingCount = Array.isArray((raw.pickingData as { missingItems?: unknown[] } | undefined)?.missingItems)
    ? ((raw.pickingData as { missingItems?: unknown[] }).missingItems ?? []).length
    : 0;
  const pickedItems = Math.max(0, totalItems - missingCount);
  const startTime = (raw.pickingData as { startTime?: string } | undefined)?.startTime ?? raw.createdAt;

  return {
    id,
    store,
    picker,
    items: totalItems,
    picked: pickedItems,
    started: formatTime(startTime),
    elapsed: elapsedSince(startTime),
    status: toPickingBadge(raw.status),
    tab: toPickingTab(raw.status),
    createdAt: raw.createdAt,
  };
}

export const realPickingService: PickingService = {
  async list(date?: string): Promise<PickingOrder[]> {
    const dateParam = date ? `&date=${date}` : "";
    const [picking, packing] = await Promise.all([
      api.get<{ data?: RawAdminOrder[] } | RawAdminOrder[]>(`/api/v1/admin/orders?status=confirmed&limit=100${dateParam}`).catch(() => [] as RawAdminOrder[]),
      api.get<{ data?: RawAdminOrder[] } | RawAdminOrder[]>(`/api/v1/admin/orders?status=getting-packed&limit=100${dateParam}`).catch(() => [] as RawAdminOrder[]),
    ]);

    const pickingRaw = Array.isArray(picking) ? picking : (picking as { data?: RawAdminOrder[] }).data ?? [];
    const packingRaw = Array.isArray(packing) ? packing : (packing as { data?: RawAdminOrder[] }).data ?? [];

    return [...pickingRaw, ...packingRaw].map(normalizeToPickingOrder);
  },

  async reassignPicker(id: string, picker: string): Promise<PickingOrder> {
    await api.post<unknown>(`/api/v1/admin/orders/${id}/reassign-picker`, { picker });
    const res = await api.get<{ data?: RawAdminOrder } | RawAdminOrder>(`/api/v1/admin/orders/${id}`);
    const raw = (res as { data?: RawAdminOrder }).data ?? (res as RawAdminOrder);
    return normalizeToPickingOrder({ ...raw, pickerAssignment: { pickerName: picker } });
  },
};
