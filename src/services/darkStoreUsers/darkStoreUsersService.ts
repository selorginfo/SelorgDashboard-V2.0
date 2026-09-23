import { api } from "@/lib/apiClient";

export type DarkStoreRole = "manager" | "picker" | "delivery_boy";
export type DarkStoreShift = "morning" | "afternoon" | "evening" | "night" | "full_day";

export interface DarkStoreStaff {
  _id: string;
  darkStoreId: string;
  darkStoreName?: string | null;
  darkStoreCode?: string | null;
  name: string;
  email: string;
  phone: string;
  role: DarkStoreRole;
  shift: DarkStoreShift;
  isActive: boolean;
  createdAt: string;
}

export interface CreateDarkStoreStaffPayload {
  darkStoreId: string;
  name: string;
  email: string;
  phone?: string;
  role: DarkStoreRole;
  shift: DarkStoreShift;
  isActive?: boolean;
}

const BASE = "/api/v1/admin/darkstore-users";

export const darkStoreUsersService = {
  async list(darkStoreId?: string): Promise<{ items: DarkStoreStaff[]; total: number }> {
    const params = darkStoreId ? `?darkStoreId=${encodeURIComponent(darkStoreId)}` : "";
    return api.get<{ items: DarkStoreStaff[]; total: number }>(BASE + params);
  },

  async create(payload: CreateDarkStoreStaffPayload): Promise<DarkStoreStaff> {
    return api.post<DarkStoreStaff>(BASE, payload);
  },

  async update(id: string, payload: Partial<CreateDarkStoreStaffPayload> & { isActive?: boolean }): Promise<DarkStoreStaff> {
    return api.put<DarkStoreStaff>(`${BASE}/${id}`, payload);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};
