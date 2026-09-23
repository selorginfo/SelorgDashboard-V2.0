import { beforeEach, describe, expect, it } from "vitest";
import { mockIntegrationService } from "@/services/integrations/integrationService.mock";

describe("mockIntegrationService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("marks a degraded integration connected again after a successful test", async () => {
    const integrations = await mockIntegrationService.list();
    const degraded = integrations.find((i) => i.status.label === "Degraded")!;

    const updated = await mockIntegrationService.testConnection(degraded.system);
    expect(updated.status.label).toBe("Connected");
    expect(updated.lastSync).toBe("Just now");
  });
});
