import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_RIDER_DIRECTORY, SEED_PICKER_DIRECTORY } from "@/services/workforce/directorySeed";
import type { WorkforcePerson, WorkerKind } from "@/types/workforce";
import type { DirectoryService } from "@/services/workforce/directoryService";

const riderTable = createMockTable<WorkforcePerson>("selorg.workforce.directory.rider", SEED_RIDER_DIRECTORY);
const pickerTable = createMockTable<WorkforcePerson>("selorg.workforce.directory.picker", SEED_PICKER_DIRECTORY);

function tableFor(kind: WorkerKind) {
  return kind === "rider" ? riderTable : pickerTable;
}

export const mockDirectoryService: DirectoryService = {
  async list(kind) {
    await mockDelay();
    return tableFor(kind).all();
  },

  async setStatus(kind, id, status, tab) {
    await mockDelay(220);
    let updated: WorkforcePerson | undefined;
    tableFor(kind).update((rows) =>
      rows.map((p) => {
        if (p.id !== id) return p;
        updated = { ...p, status, tab };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`${kind} ${id} not found`);
    return updated;
  },
};
