import { api } from "@/lib/apiClient";

export interface WarehouseInventoryProduct {
  _id: string;
  name: string;
  sku: string;
  price?: number;
  mrp?: number;
  imageUrl?: string;
  status?: string;
}

export interface WarehouseInventoryItem {
  _id: string;
  warehouseId: string;
  productId: string;
  quantity: number;
  reservedQty: number;
  isAvailable: boolean;
  lowStockThreshold: number;
  product: WarehouseInventoryProduct | null;
  warehouse: { name: string; code: string } | null;
  updatedAt: string;
}

export interface AddWarehouseInventoryPayload {
  warehouseId: string;
  productId: string;
  quantity?: number;
  isAvailable?: boolean;
  lowStockThreshold?: number;
}

const BASE = "/api/v1/admin/store-warehouse/warehouse-inventory";

export const warehouseInventoryService = {
  async list(warehouseId?: string): Promise<{ items: WarehouseInventoryItem[]; total: number }> {
    const params = warehouseId ? `?warehouseId=${encodeURIComponent(warehouseId)}` : "";
    return api.get<{ items: WarehouseInventoryItem[]; total: number }>(BASE + params);
  },

  async add(payload: AddWarehouseInventoryPayload): Promise<WarehouseInventoryItem> {
    return api.post<WarehouseInventoryItem>(BASE, payload);
  },

  async update(id: string, patch: Partial<{ quantity: number; isAvailable: boolean; lowStockThreshold: number }>): Promise<WarehouseInventoryItem> {
    return api.put<WarehouseInventoryItem>(`${BASE}/${id}`, patch);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};
