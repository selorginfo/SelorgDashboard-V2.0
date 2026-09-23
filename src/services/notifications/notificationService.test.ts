import { beforeEach, describe, expect, it } from "vitest";
import { mockNotificationService } from "@/services/notifications/notificationService.mock";

describe("mockNotificationService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("pauses an active template", async () => {
    const entries = await mockNotificationService.list();
    const active = entries.find((e) => e.kind === "template" && e.status.label === "Active")!;

    const updated = await mockNotificationService.setActive(active.id, false);
    expect(updated.status.label).toBe("Paused");
  });

  it("returns the delivery log rows", async () => {
    const log = await mockNotificationService.deliveryLog();
    expect(log.length).toBeGreaterThan(0);
  });
});
