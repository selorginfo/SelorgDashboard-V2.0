import { beforeEach, describe, expect, it } from "vitest";
import { mockSettingsService } from "@/services/system/settingsService.mock";

describe("mockSettingsService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("updates the SLA target's value and last-changed date", async () => {
    const settings = await mockSettingsService.list();
    const target = settings.find((s) => s.id === "set-sla-target-ds02")!;
    expect(target).toBeDefined();

    const updated = await mockSettingsService.updateValue(target.id, "10 min");
    expect(updated.value).toBe("10 min");
    expect(updated.lastChanged).toBe("Today");
  });

  it("throws for an unknown setting id", async () => {
    await expect(mockSettingsService.updateValue("set-unknown", "x")).rejects.toThrow();
  });
});
