import { beforeEach, describe, expect, it } from "vitest";
import { mockVendorService } from "@/services/vendors/vendorService.mock";

describe("mockVendorService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("approves a vendor on hold", async () => {
    const vendors = await mockVendorService.list();
    const onHold = vendors.find((v) => v.status.label === "On hold")!;

    const updated = await mockVendorService.setStatus(onHold.id, { label: "Active", tone: "green" });
    expect(updated.status.label).toBe("Active");
  });
});
