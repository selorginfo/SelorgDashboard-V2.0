import { api } from "@/lib/apiClient";
import type { Order, OrderItem, OrderActionId, OrderLogEntry, OrderStatus, PaymentStatus, SlaStatus } from "@/types/order";
import type { Tone } from "@/types/common";
import type { OrderService, PlaceOrderInput } from "./orderService";

interface RawOrderItem {
  productId?: string;
  productName?: string;
  quantity?: number;
  price?: number | string;
  variantSize?: string;
  [key: string]: unknown;
}

interface RawOrder {
  _id?: string;
  orderNumber?: string;
  userId?: string;
  paymentStatus?: string;
  paymentMethodDisplay?: string;
  paymentMethod?: { methodType?: string; type?: string; displayLabel?: string };
  totalBill?: number;
  storeId?: string;
  deliveryAddress?: { address?: string; line1?: string; line2?: string; city?: string; state?: string; pincode?: string; landmark?: string };
  order_id?: string;
  id?: string;
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: string;
  store_id?: string;
  payment_status?: string;
  payment_method?: string;
  sla_status?: string;
  total_bill?: number;
  pickerAssignment?: { pickerName?: string };
  assignee?: { name?: string };
  pickingData?: { missingItems?: { productId?: string }[]; startTime?: string };
  status?: string;
  createdAt?: string;
  items?: RawOrderItem[];
  timeline?: { status: string; timestamp: string }[];
  pickerId?: string;
  riderId?: string;
  refundAmount?: number;
  refundStatus?: string;
  cancellationReason?: string;
  [key: string]: unknown;
}

function normalizeItem(raw: RawOrderItem, missingIds: Set<string>): OrderItem {
  const qty = raw.quantity ?? 0;
  const id = raw.productId ?? "";
  const missing = missingIds.has(id) ? 1 : 0;
  return {
    name: raw.productName ?? "",
    sku: id,
    qty,
    picked: qty - missing,
    missing,
    price: `₹${raw.price ?? 0}`,
    substitution: "",
  };
}

function toOrderStatus(raw: string): OrderStatus {
  const map: Record<string, OrderStatus> = {
    PENDING: "Picking",
    CONFIRMED: "Picking",
    "GETTING-PACKED": "Packing",
    "ON-THE-WAY": "Out for delivery",
    ARRIVED: "Out for delivery",
    ASSIGNED: "Picking",
    PICKING: "Picking",
    PICKED: "Packing",
    PACKED: "Ready",
    READY: "Ready",
    READY_FOR_DISPATCH: "Ready",
    OUT_FOR_DELIVERY: "Out for delivery",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
    EXCEPTION: "Exception",
    NEW: "Picking",
  };
  return map[raw?.toUpperCase()] ?? "Picking";
}

function toPaymentStatus(paymentStatus?: string, paymentMethod?: string): PaymentStatus {
  if (paymentStatus === "paid") return "Paid";
  if (paymentStatus === "failed") return "Failed";
  if (paymentMethod === "cash" || paymentStatus === "cod_pending") return "COD";
  return "Pending";
}

function toTone(slaStatus?: string): Tone {
  if (slaStatus === "safe") return "green";
  if (slaStatus === "critical") return "red";
  return "amber";
}

function toSlaStatus(raw?: string): SlaStatus {
  if (raw === "safe") return "On track";
  if (raw === "critical") return "At risk";
  if (raw === "breached") return "Breached";
  return "On track";
}

function toStage(status?: string): number {
  const s = (status || "").toLowerCase();
  if (s === "pending") return 0; // Placed
  if (s === "confirmed" || s === "assigned") return 1; // Confirmed
  if (s === "picking") return 2; // Picking started
  if (s === "picked") return 3; // Picking completed
  if (s === "getting-packed") return 4; // HSD / packing
  if (s === "packed") return 5;
  if (s === "ready" || s === "ready_for_dispatch") return 6;
  if (s === "on-the-way" || s === "out_for_delivery") return 9;
  if (s === "arrived") return 9;
  if (s === "delivered") return 10;
  if (s === "cancelled") return 0;
  return 1;
}

function normalizeOrder(raw: RawOrder): Order {
  const missingIds = new Set(
    (raw.pickingData?.missingItems ?? []).map((m) => String(m.productId ?? "")).filter(Boolean),
  );
  const items = (raw.items ?? []).map((i) => normalizeItem(i, missingIds));
  const id = String(raw.orderNumber ?? raw.id ?? raw._id ?? raw.order_id ?? "");
  const addr = raw.deliveryAddress;
  const address =
    raw.delivery_address ||
    (addr
      ? [addr.line1 || addr.address, addr.line2, addr.city, addr.pincode].filter(Boolean).join(", ")
      : "");
  return {
    id,
    customer: String(raw.customer_name ?? ""),
    phone: String(raw.customer_phone ?? ""),
    store: String(raw.storeId ?? raw.store_id ?? "—"),
    pickupStore: String(raw.storeId ?? raw.store_id ?? ""),
    rider: String(raw.riderId ?? "Unassigned"),
    picker: String(raw.pickerAssignment?.pickerName ?? raw.assignee?.name ?? raw.pickerId ?? "Unassigned"),
    status: toOrderStatus(raw.status ?? ""),
    tone: toTone(raw.sla_status),
    sla: toSlaStatus(raw.sla_status),
    value: `₹${raw.totalBill ?? raw.total_bill ?? 0}`,
    date: raw.createdAt
      ? new Date(raw.createdAt).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })
      : "",
    payment: toPaymentStatus(raw.paymentStatus ?? raw.payment_status, raw.paymentMethod?.type ?? raw.payment_method),
    paymentLabel: raw.paymentMethodDisplay ?? raw.paymentMethod?.displayLabel ?? raw.payment_method ?? "",
    zone: "",
    address,
    exception: "",
    stage: toStage(raw.status),
    rawStatus: raw.status ?? "",
    items,
    scans: [],
    refundLine:
      raw.refundStatus && raw.refundStatus !== "none"
        ? `Refund ${raw.refundStatus}${raw.refundAmount ? ` · ₹${raw.refundAmount}` : ""}`
        : undefined,
    cancelLine: raw.cancellationReason || undefined,
  };
}

function extractPickerId(values: Record<string, string>): { pickerId: string; pickerName: string } {
  // Options are encoded as "id|Name" when loaded from API; fall back to raw value
  const raw = values.picker || values.pickerId || "";
  if (raw.includes("|")) {
    const [pickerId, ...rest] = raw.split("|");
    return { pickerId, pickerName: rest.join("|") || pickerId };
  }
  return { pickerId: raw, pickerName: raw };
}

function extractRiderId(values: Record<string, string>): { riderId: string; riderName: string } {
  const raw = values.rider || values.riderId || "";
  if (raw.includes("|")) {
    const [riderId, ...rest] = raw.split("|");
    return { riderId, riderName: rest.join("|") || riderId };
  }
  return { riderId: raw, riderName: raw };
}

export const realOrderService: OrderService = {
  async list(date?: string): Promise<Order[]> {
    const dateParam = date ? `?date=${date}` : "";
    const res = await api.get<{ data?: RawOrder[]; list?: RawOrder[]; orders?: RawOrder[] } | RawOrder[]>(
      `/api/v1/admin/orders${dateParam}`,
    );
    const raw = Array.isArray(res) ? res : (res.data ?? res.list ?? res.orders ?? []);
    return raw.map(normalizeOrder);
  },

  async get(id: string): Promise<Order | undefined> {
    const res = await api.get<{ data?: RawOrder } | RawOrder>(`/api/v1/admin/orders/${id}`).catch(() => undefined);
    if (!res) return undefined;
    const raw = (res as { data?: RawOrder }).data ?? (res as RawOrder);
    return normalizeOrder(raw);
  },

  async getLog(id: string): Promise<OrderLogEntry[]> {
    type RawLog = { status?: string; timestamp?: string; note?: string; actor?: string; name?: string; time?: string; who?: string; id?: string };
    const res = await api
      .get<{ data?: RawLog[]; list?: RawLog[]; logs?: RawLog[] } | RawLog[] | { data?: { data?: RawLog[] } }>(
        `/api/v1/admin/orders/${id}/logs`,
      )
      .catch(() => [] as RawLog[]);
    let raw: RawLog[] = [];
    if (Array.isArray(res)) raw = res;
    else if (res && typeof res === "object") {
      const r = res as { data?: RawLog[] | { data?: RawLog[] }; list?: RawLog[]; logs?: RawLog[] };
      if (Array.isArray(r.data)) raw = r.data;
      else if (r.data && typeof r.data === "object" && Array.isArray((r.data as { data?: RawLog[] }).data)) {
        raw = (r.data as { data: RawLog[] }).data;
      } else {
        raw = r.list ?? r.logs ?? [];
      }
    }
    return raw.map((e, i): OrderLogEntry => ({
      id: e.id ?? String(i),
      name: e.name ?? e.status ?? "",
      time: e.time ?? (e.timestamp ? new Date(e.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }) : ""),
      who: e.who ?? e.actor ?? "system",
      note: e.note,
    }));
  },

  async advanceStage(id: string, currentRawStatus?: string): Promise<Order> {
    // Must match backend VALID_TRANSITIONS in orders.service.ts
    const NEXT: Record<string, string> = {
      pending: "confirmed",
      confirmed: "getting-packed",
      assigned: "getting-packed",
      picking: "on-the-way",
      picked: "on-the-way",
      "getting-packed": "on-the-way",
      packed: "on-the-way",
      ready: "on-the-way",
      ready_for_dispatch: "on-the-way",
      "on-the-way": "arrived",
      out_for_delivery: "arrived",
      arrived: "delivered",
    };
    const currentStatus = (currentRawStatus ?? "pending").toLowerCase();
    if (currentStatus === "delivered" || currentStatus === "cancelled") {
      throw new Error(`Order is already ${currentStatus}; cannot advance further`);
    }
    const nextStatus = NEXT[currentStatus];
    if (!nextStatus) {
      throw new Error(`Unknown status "${currentRawStatus}" — cannot advance`);
    }
    await api.put<unknown>(`/api/v1/admin/orders/${id}/update-status`, { status: nextStatus });
    const updated = await api.get<{ data?: RawOrder } | RawOrder>(`/api/v1/admin/orders/${id}`);
    const updatedRaw = (updated as { data?: RawOrder }).data ?? (updated as RawOrder);
    return normalizeOrder(updatedRaw);
  },

  async applyAction(id: string, action: OrderActionId, values: Record<string, string>): Promise<Order> {
    if (action === "Cancel order") {
      await api.put<unknown>(`/api/v1/admin/orders/${id}/update-status`, {
        status: "cancelled",
        note: values.reason ?? values.note ?? "Cancelled by admin",
      });
    } else if (action === "Reassign picker") {
      const { pickerId, pickerName } = extractPickerId(values);
      await api.post<unknown>(`/api/v1/admin/orders/${id}/reassign-picker`, {
        pickerId,
        pickerName,
        reason: values.reason,
        note: values.note,
      });
    } else if (action === "Reassign rider") {
      const { riderId, riderName } = extractRiderId(values);
      await api.post<unknown>(`/api/v1/admin/orders/${id}/reassign-rider`, {
        riderId,
        riderName,
        reason: values.reason,
        note: values.note,
      });
    } else if (action === "Contact customer") {
      await api.post<unknown>(`/api/v1/admin/orders/${id}/contact`, {
        channel: values.channel,
        template: values.template,
        note: values.note,
      });
    } else if (action === "Add internal note") {
      await api.post<unknown>(`/api/v1/admin/orders/${id}/notes`, {
        note: values.note,
        visibility: values.visibility,
      });
    } else if (action === "Initiate refund") {
      await api.post<unknown>(`/api/v1/admin/orders/${id}/refund`, {
        amount: Number(values.amount),
        method: values.method,
        reason: values.reason,
        scope: values.scope,
        note: values.note,
      });
    } else {
      throw new Error(`Unsupported order action: ${action}`);
    }

    const res = await api.get<{ data?: RawOrder } | RawOrder>(`/api/v1/admin/orders/${id}`);
    const raw = (res as { data?: RawOrder }).data ?? (res as RawOrder);
    return normalizeOrder(raw);
  },

  async placeOnBehalf(input: PlaceOrderInput): Promise<Order> {
    const raw = await api.post<RawOrder>("/api/v1/admin/orders", input);
    return normalizeOrder(raw);
  },
};
