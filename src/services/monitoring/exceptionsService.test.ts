import { beforeEach, describe, expect, it } from "vitest";
import { mockExceptionsService } from "@/services/monitoring/exceptionsService.mock";

describe("mockExceptionsService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("assigns an exception to a new owner", async () => {
    const exceptions = await mockExceptionsService.list();
    const target = exceptions[0]!;

    const updated = await mockExceptionsService.assignOwner(target.id, "You");
    expect(updated.owner).toBe("You");
  });

  it("throws for an unknown exception id", async () => {
    await expect(mockExceptionsService.assignOwner("EXC-0000", "You")).rejects.toThrow();
  });
});
