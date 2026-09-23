import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_EXCEPTIONS } from "@/services/monitoring/exceptionsSeed";
import type { ExceptionCase } from "@/types/monitoring";
import type { ExceptionsService } from "@/services/monitoring/exceptionsService";

const table = createMockTable<ExceptionCase>("selorg.monitoring.exceptions", SEED_EXCEPTIONS);

export const mockExceptionsService: ExceptionsService = {
  async list() {
    await mockDelay();
    return table.all();
  },

  async assignOwner(id, owner) {
    await mockDelay(200);
    let updated: ExceptionCase | undefined;
    table.update((rows) =>
      rows.map((e) => {
        if (e.id !== id) return e;
        updated = { ...e, owner };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Exception ${id} not found`);
    return updated;
  },
};
