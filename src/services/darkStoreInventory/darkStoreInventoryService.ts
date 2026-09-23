import { api } from "@/lib/apiClient";

export interface StoreInventoryProduct {
  _id: string;
  name: string;
  sku: string;
  price?: number;
  mrp?: number;
  imageUrl?: string;
  status?: string;
}

export interface StoreInventoryItem {
  _id: string;
  storeId: string;
  productId: string;
  quantity: number;
  reservedQty: number;
  isAvailable: boolean;
  lowStockThreshold: number;
  product: StoreInventoryProduct | null;
  updatedAt: string;
}

export interface AddInventoryPayload {
  storeId: string;
  productId: string;
  quantity?: number;
  isAvailable?: boolean;
  lowStockThreshold?: number;
}

const BASE = "/api/v1/admin/store-warehouse/inventories";

export const darkStoreInventoryService = {
  async list(storeId?: string): Promise<{ items: StoreInventoryItem[]; total: number }> {
    const params = storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";
    return api.get<{ items: StoreInventoryItem[]; total: number }>(BASE + params);
  },

  async add(payload: AddInventoryPayload): Promise<StoreInventoryItem> {
    return api.post<StoreInventoryItem>(BASE, payload);
  },

  async update(id: string, patch: Partial<{ quantity: number; isAvailable: boolean; lowStockThreshold: number }>): Promise<StoreInventoryItem> {
    return api.put<StoreInventoryItem>(`${BASE}/${id}`, patch);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};
