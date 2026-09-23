import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_SHIFT_TEMPLATES } from "@/services/workforce/shiftsSeed";
import type { ShiftTemplate } from "@/types/workforce";
import type { ShiftsService } from "@/services/workforce/shiftsService";

const table = createMockTable<ShiftTemplate>("selorg.workforce.shifts", SEED_SHIFT_TEMPLATES);

export const mockShiftsService: ShiftsService = {
  async list() {
    await mockDelay();
    return table.all();
  },

  async create(input) {
    await mockDelay(220);
    const created: ShiftTemplate = {
      id: `shift-${Date.now()}`,
      name: input.name,
      appliesTo: input.appliesTo,
      hours: input.hours,
      days: input.days,
      breakTime: input.breakTime,
      headcountTarget: input.headcountTarget,
      scope: input.scope ?? "All stores",
      status: { label: "Draft", tone: "grey" },
    };
    table.update((rows) => [created, ...rows]);
    return created;
  },

  async activate(id) {
    await mockDelay(220);
    let updated: ShiftTemplate | undefined;
    table.update((rows) =>
      rows.map((t) => {
        if (t.id !== id) return t;
        updated = { ...t, status: { label: "Active", tone: "green" } };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Shift template ${id} not found`);
    return updated;
  },

  async update(id, patch) {
    await mockDelay(220);
    let updated: ShiftTemplate | undefined;
    table.update((rows) =>
      rows.map((t) => {
        if (t.id !== id) return t;
        updated = { ...t, ...patch };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Shift template ${id} not found`);
    return updated;
  },

  async duplicate(id) {
    await mockDelay(220);
    const source = table.all().find((t) => t.id === id);
    if (!source) throw new MockApiError(`Shift template ${id} not found`);
    const copy: ShiftTemplate = {
      ...source,
      id: `${source.id}-copy-${Date.now()}`,
      name: `${source.name} (copy)`,
      status: { label: "Draft", tone: "grey" },
    };
    table.update((rows) => [...rows, copy]);
    return copy;
  },

  async remove(id) {
    await mockDelay(220);
    table.update((rows) => rows.filter((t) => t.id !== id));
  },
};
