import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_PICKING_ORDERS } from "@/services/darkstore/pickingSeed";
import type { PickingOrder } from "@/types/darkstore";
import type { PickingService } from "@/services/darkstore/pickingService";

const table = createMockTable<PickingOrder>("selorg.darkstore.picking-orders", SEED_PICKING_ORDERS);

export const mockPickingService: PickingService = {
  async list(_date?: string) {
    await mockDelay();
    return table.all();
  },

  async reassignPicker(id, picker) {
    await mockDelay(220);
    let updated: PickingOrder | undefined;
    table.update((rows) =>
      rows.map((o) => {
        if (o.id !== id) return o;
        updated = {
          ...o,
          picker,
          status: o.status.label === "Pending" ? { label: "Assigned", tone: "blue" } : o.status,
        };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Order ${id} not found`);
    return updated;
  },
};
