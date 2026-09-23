import { beforeEach, describe, expect, it } from "vitest";
import { mockDirectoryService } from "@/services/workforce/directoryService.mock";

describe("mockDirectoryService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("suspends an available rider", async () => {
    const riders = await mockDirectoryService.list("rider");
    const target = riders.find((r) => r.status.label === "Available")!;
    expect(target).toBeDefined();

    const updated = await mockDirectoryService.setStatus(
      "rider",
      target.id,
      { label: "Suspended", tone: "red" },
      "Suspended"
    );
    expect(updated.status.label).toBe("Suspended");
    expect(updated.tab).toBe("Suspended");
  });

  it("reactivates a suspended picker", async () => {
    const pickers = await mockDirectoryService.list("picker");
    const target = pickers.find((p) => p.status.label === "Suspended")!;
    expect(target).toBeDefined();

    const updated = await mockDirectoryService.setStatus(
      "picker",
      target.id,
      { label: "Available", tone: "green" },
      "Available"
    );
    expect(updated.status.label).toBe("Available");
    expect(updated.tab).toBe("Available");
  });

  it("throws for an unknown person id", async () => {
    await expect(
      mockDirectoryService.setStatus("rider", "rider-unknown", { label: "Available", tone: "green" }, "Available")
    ).rejects.toThrow();
  });
});
