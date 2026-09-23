import type { SettingItem } from "@/types/system";

export interface SettingsService {
  list(): Promise<SettingItem[]>;
  /** Edits a setting's current value — the one real mutation on the settings board. */
  updateValue(id: string, value: string): Promise<SettingItem>;
}
