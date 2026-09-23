import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_VENDORS } from "@/services/vendors/seed";
import type { Vendor } from "@/types/vendor";
import type { VendorService, CreateVendorInput, VendorPerformance } from "./vendorService";

const table = createMockTable<Vendor>("selorg.vendors", SEED_VENDORS);

export const mockVendorService: VendorService = {
  async list() {
    await mockDelay();
    return table.all();
  },

  async setStatus(id, status) {
    await mockDelay(220);
    let updated: Vendor | undefined;
    table.update((rows) =>
      rows.map((v) => {
        if (v.id !== id) return v;
        updated = { ...v, status };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Vendor ${id} not found`);
    return updated;
  },

  async create(input: CreateVendorInput): Promise<Vendor> {
    await mockDelay(250);
    const vendor: Vendor = {
      id: `vnd-${Date.now()}`,
      name: input.name,
      category: input.category ?? "—",
      contact: input.contact ?? input.email ?? input.phone ?? "—",
      skusSupplied: "0",
      fillRate: "—",
      rejectRate: "—",
      spendMtd: "—",
      status: { label: "pending", tone: "amber" },
    };
    table.update((rows) => [...rows, vendor]);
    return vendor;
  },

  async recordQualityIssue(id: string, _notes: string) {
    await mockDelay(200);
    if (!table.all().find((v) => v.id === id)) throw new MockApiError(`Vendor ${id} not found`);
    return { ok: true };
  },

  async requestDocuments(id: string, _note?: string) {
    await mockDelay(200);
    if (!table.all().find((v) => v.id === id)) throw new MockApiError(`Vendor ${id} not found`);
    return { emailSent: false, message: "Document request recorded" };
  },

  async getPerformance(id: string): Promise<VendorPerformance> {
    await mockDelay(150);
    if (!table.all().find((v) => v.id === id)) throw new MockApiError(`Vendor ${id} not found`);
    return {
      vendorId: id,
      qc: { total: 3, pass: 2, fail: 1, pending: 0, passRate: 66.7 },
      openAlerts: 1,
      certificates: { total: 2, valid: 1, expired: 1 },
    };
  },
};
