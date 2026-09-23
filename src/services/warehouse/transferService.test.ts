import { beforeEach, describe, expect, it } from "vitest";
import { mockTransferService } from "@/services/warehouse/transferService.mock";

describe("mockTransferService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("advances a pending-approval transfer to Approved", async () => {
    const transfers = await mockTransferService.list();
    const target = transfers.find((t) => t.status.label === "Pending approval")!;

    const updated = await mockTransferService.advance(target.id);
    expect(updated.status.label).toBe("Approved");
  });

  it("leaves an exception-state transfer (Delayed) unchanged since it has no next stage", async () => {
    const transfers = await mockTransferService.list();
    const target = transfers.find((t) => t.status.label === "Delayed")!;

    const updated = await mockTransferService.advance(target.id);
    expect(updated.status.label).toBe("Delayed");
  });

  it("throws for an unknown transfer id", async () => {
    await expect(mockTransferService.advance("TR-0000")).rejects.toThrow();
  });
});
