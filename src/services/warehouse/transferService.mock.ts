import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_TRANSFERS } from "@/services/warehouse/transferSeed";
import { nextTransferStatus } from "@/services/warehouse/transferStatus";
import type { Transfer } from "@/types/warehouse";
import type { TransferService, CreateTransferInput } from "@/services/warehouse/transferService";

const table = createMockTable<Transfer>("selorg.warehouse.transfers", SEED_TRANSFERS);

export const mockTransferService: TransferService = {
  async list() {
    await mockDelay();
    return table.all();
  },

  async advance(id) {
    await mockDelay(220);
    const current = table.all().find((t) => t.id === id);
    if (!current) throw new MockApiError(`Transfer ${id} not found`);
    const next = nextTransferStatus(current.status.label);
    if (!next) return current;
    let updated: Transfer | undefined;
    table.update((rows) =>
      rows.map((t) => {
        if (t.id !== id) return t;
        updated = { ...t, status: next };
        return updated;
      })
    );
    return updated ?? current;
  },

  async create(input: CreateTransferInput): Promise<Transfer> {
    await mockDelay(250);
    const transfer: Transfer = {
      id: `TR-${Date.now().toString(36).toUpperCase()}`,
      toStore: input.destination,
      priority: "Normal",
      requested: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      approved: "—",
      dispatched: "—",
      received: String(input.items ?? 1),
      status: { label: "Requested", tone: "amber" },
    };
    table.update((rows) => [...rows, transfer]);
    return transfer;
  },
};
