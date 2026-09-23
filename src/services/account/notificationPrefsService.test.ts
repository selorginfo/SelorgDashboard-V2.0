import { beforeEach, describe, expect, it } from "vitest";
import { mockNotificationPrefsService } from "@/services/account/notificationPrefsService.mock";

describe("mockNotificationPrefsService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns the seeded defaults on first read", async () => {
    const prefs = await mockNotificationPrefsService.get();
    expect(prefs.sla).toBe(true);
    expect(prefs.sms).toBe(false);
  });

  it("persists an update and returns it on the next read", async () => {
    const prefs = await mockNotificationPrefsService.get();
    const updated: typeof prefs = { ...prefs, sms: true };
    await mockNotificationPrefsService.update(updated);

    const reread = await mockNotificationPrefsService.get();
    expect(reread.sms).toBe(true);
  });
});
