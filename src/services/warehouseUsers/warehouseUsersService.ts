import { api } from "@/lib/apiClient";

export interface WarehouseUserMapping {
  _id: string;
  warehouseId: string;
  warehouseName?: string;
  userId: string;
  role: "manager" | "picker" | "delivery_boy";
  status: boolean;
  createdAt: string;
}

export interface CreateWarehouseUserPayload {
  warehouseId: string;
  userId: string;
  role: "manager" | "picker" | "delivery_boy";
  status?: boolean;
}

const BASE = "/api/v1/admin/warehouse-users";

export const warehouseUsersService = {
  async list(warehouseId?: string): Promise<{ items: WarehouseUserMapping[]; total: number }> {
    const params = warehouseId ? `?warehouseId=${encodeURIComponent(warehouseId)}` : "";
    const res = await api.get<{ items: WarehouseUserMapping[]; total: number }>(BASE + params);
    return res;
  },

  async create(payload: CreateWarehouseUserPayload): Promise<WarehouseUserMapping> {
    return api.post<WarehouseUserMapping>(BASE, payload);
  },

  async update(id: string, payload: Partial<CreateWarehouseUserPayload>): Promise<WarehouseUserMapping> {
    return api.put<WarehouseUserMapping>(`${BASE}/${id}`, payload);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};
