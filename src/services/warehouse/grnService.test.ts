import { beforeEach, describe, expect, it } from "vitest";
import { mockGrnService } from "@/services/warehouse/grnService.mock";

describe("mockGrnService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("accepts a GRN", async () => {
    const grns = await mockGrnService.list();
    const target = grns[0]!;

    const updated = await mockGrnService.accept(target.id);
    expect(updated.status.label).toBe("Accepted");
    expect(updated.status.tone).toBe("green");
  });

  it("rejects a GRN", async () => {
    const grns = await mockGrnService.list();
    const target = grns[0]!;

    const updated = await mockGrnService.reject(target.id);
    expect(updated.status.label).toBe("Rejected");
  });

  it("raises a debit note", async () => {
    const grns = await mockGrnService.list();
    const target = grns[0]!;

    const updated = await mockGrnService.raiseDebitNote(target.id);
    expect(updated.status.label).toBe("Debit note");
  });

  it("throws for an unknown GRN id", async () => {
    await expect(mockGrnService.accept("GRN-0000")).rejects.toThrow();
  });
});
