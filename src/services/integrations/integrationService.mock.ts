import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_INTEGRATIONS } from "@/services/integrations/seed";
import type { IntegrationHealth } from "@/types/integration";
import type { IntegrationService } from "@/services/integrations/integrationService";

const table = createMockTable<IntegrationHealth>("selorg.integrations", SEED_INTEGRATIONS);

export const mockIntegrationService: IntegrationService = {
  async list() {
    await mockDelay();
    return table.all();
  },

  async testConnection(system) {
    await mockDelay(420);
    let updated: IntegrationHealth | undefined;
    table.update((rows) =>
      rows.map((r) => {
        if (r.system !== system) return r;
        updated = { ...r, lastSync: "Just now", status: { label: "Connected", tone: "green" } };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Integration ${system} not found`);
    return updated;
  },
};
