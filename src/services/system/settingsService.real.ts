import { api } from "@/lib/apiClient";
import type { SettingItem } from "@/types/system";
import type { SettingsService } from "./settingsService";

export const realSettingsService: SettingsService = {
  async list(): Promise<SettingItem[]> {
    const res = await api.get<{ list?: SettingItem[] } | SettingItem[]>("/api/v1/admin/platform-config");
    if (Array.isArray(res)) return res;
    return (res as { list?: SettingItem[] }).list ?? [];
  },

  async updateValue(id: string, value: string): Promise<SettingItem> {
    return api.put<SettingItem>(`/api/v1/admin/platform-config/${id}`, { value });
  },
};
