import { beforeEach, describe, expect, it } from "vitest";
import { mockUsersService } from "@/services/system/usersService.mock";

describe("mockUsersService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("deactivates an active admin user", async () => {
    const users = await mockUsersService.list();
    const target = users.find((u) => u.accountStatus === "active")!;
    expect(target).toBeDefined();

    const updated = await mockUsersService.setActive(target.id, false);
    expect(updated.accountStatus).toBe("deactivated");
    expect(updated.status.label).toBe("Deactivated");
  });

  it("reactivates a deactivated admin user", async () => {
    const users = await mockUsersService.list();
    const target = users.find((u) => u.accountStatus === "deactivated")!;
    expect(target).toBeDefined();

    const updated = await mockUsersService.setActive(target.id, true);
    expect(updated.accountStatus).toBe("active");
    expect(updated.status.label).toBe("Active");
  });

  it("throws for an unknown user id", async () => {
    await expect(mockUsersService.setActive("usr-unknown", false)).rejects.toThrow();
  });
});
