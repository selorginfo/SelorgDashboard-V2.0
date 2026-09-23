import { api } from "@/lib/apiClient";

export interface Warehouse {
  _id: string;
  id?: string;
  name: string;
  code: string;
  type: "warehouse" | "dark_store";
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  service_radius_km: number;
  status: boolean;
  open_time: string;
  close_time: string;
  max_orders_per_day: number;
  max_orders_per_hour: number;
  createdAt?: string;
  updatedAt?: string;
}

export type WarehouseInput = Omit<Warehouse, "_id" | "id" | "createdAt" | "updatedAt">;

const BASE = "/api/v1/admin/warehouses";

export const warehouseCreateService = {
  async list(): Promise<{ data: Warehouse[]; pagination: { total: number; page: number; limit: number } }> {
    return api.get(BASE);
  },

  async create(payload: WarehouseInput): Promise<Warehouse> {
    return api.post<Warehouse>(BASE, payload);
  },

  async update(id: string, payload: Partial<WarehouseInput>): Promise<Warehouse> {
    return api.put<Warehouse>(`${BASE}/${id}`, payload);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};
