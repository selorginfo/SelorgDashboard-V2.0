import { api } from "@/lib/apiClient";
import type { WDTransferRequest, WDTransferLog } from "@/types/warehouse";

const WH_BASE = "/api/v1/warehouse/darkstore-requests";
const DS_BASE = "/api/v1/darkstore/transfer-requests";

export interface WDTransferService {
  // Warehouse side
  listIncoming(params?: { status?: string }): Promise<WDTransferRequest[]>;
  getById(id: string): Promise<WDTransferRequest>;
  fetchLogs(id: string, side: "warehouse" | "darkstore", storeId?: string): Promise<WDTransferLog[]>;
  accept(id: string, items?: Array<{ sku: string; approved_qty: number }>): Promise<WDTransferRequest>;
  reject(id: string, notes?: string): Promise<WDTransferRequest>;
  pack(id: string, items?: Array<{ sku: string; packed_qty: number }>): Promise<WDTransferRequest>;
  dispatch(id: string, details?: { driver_name?: string; driver_phone?: string; vehicle_no?: string; notes?: string }): Promise<WDTransferRequest>;

  // Darkstore side
  createRequest(payload: {
    warehouse_id: string;
    items: Array<{ product_id?: string; product_name?: string; sku: string; requested_qty: number }>;
    notes?: string;
    storeId?: string;
  }): Promise<WDTransferRequest>;
  listMyRequests(storeId: string, params?: { status?: string }): Promise<WDTransferRequest[]>;
  receive(id: string, storeId: string, items?: Array<{ sku: string; received_qty: number }>): Promise<WDTransferRequest>;
}

export const wdTransferService: WDTransferService = {
  async listIncoming(params) {
    const res = await api.get<{ data: WDTransferRequest[] } | WDTransferRequest[]>(WH_BASE, params);
    if (Array.isArray(res)) return res;
    return (res as { data?: WDTransferRequest[] }).data ?? [];
  },

  async getById(id) {
    const res = await api.get<{ data: WDTransferRequest }>(`${WH_BASE}/${id}`);
    return (res as any).data ?? res;
  },

  async fetchLogs(id, side, storeId) {
    const base = side === "warehouse" ? WH_BASE : DS_BASE;
    const qs = storeId ? `?storeId=${storeId}` : "";
    const res = await api.get<{ data: WDTransferLog[] }>(`${base}/${id}/logs${qs}`);
    return (res as any).data ?? [];
  },

  async accept(id, items) {
    const res = await api.post<{ data: WDTransferRequest }>(`${WH_BASE}/${id}/accept`, { items });
    return (res as any).data ?? res;
  },

  async reject(id, notes) {
    const res = await api.post<{ data: WDTransferRequest }>(`${WH_BASE}/${id}/reject`, { notes });
    return (res as any).data ?? res;
  },

  async pack(id, items) {
    const res = await api.post<{ data: WDTransferRequest }>(`${WH_BASE}/${id}/pack`, { items });
    return (res as any).data ?? res;
  },

  async dispatch(id, details) {
    const res = await api.post<{ data: WDTransferRequest }>(`${WH_BASE}/${id}/dispatch`, details ?? {});
    return (res as any).data ?? res;
  },

  async createRequest({ warehouse_id, items, notes, storeId }) {
    const res = await api.post<{ data: WDTransferRequest }>(
      `${DS_BASE}${storeId ? `?storeId=${storeId}` : ""}`,
      { warehouse_id, items, notes },
    );
    return (res as any).data ?? res;
  },

  async listMyRequests(storeId, params) {
    const res = await api.get<{ data: WDTransferRequest[] } | WDTransferRequest[]>(
      `${DS_BASE}?storeId=${storeId}`,
      params,
    );
    if (Array.isArray(res)) return res;
    return (res as { data?: WDTransferRequest[] }).data ?? [];
  },

  async receive(id, storeId, items) {
    const res = await api.post<{ data: WDTransferRequest }>(
      `${DS_BASE}/${id}/receive?storeId=${storeId}`,
      { items },
    );
    return (res as any).data ?? res;
  },
};
