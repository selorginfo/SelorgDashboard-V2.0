import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_SETTINGS } from "@/services/system/settingsSeed";
import type { SettingItem } from "@/types/system";
import type { SettingsService } from "@/services/system/settingsService";

const table = createMockTable<SettingItem>("selorg.system.settings", SEED_SETTINGS);

export const mockSettingsService: SettingsService = {
  async list() {
    await mockDelay();
    return table.all();
  },

  async updateValue(id, value) {
    await mockDelay(200);
    let updated: SettingItem | undefined;
    table.update((rows) =>
      rows.map((setting) => {
        if (setting.id !== id) return setting;
        updated = { ...setting, value, lastChanged: "Today" };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Setting ${id} not found`);
    return updated;
  },
};
