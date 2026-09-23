import { beforeEach, describe, expect, it } from "vitest";
import { mockCustomerService } from "@/services/commerce/customerService.mock";

describe("mockCustomerService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("credits a customer's wallet balance", async () => {
    const customers = await mockCustomerService.list();
    const target = customers[0]!;
    const before = target.walletBalance;

    const updated = await mockCustomerService.creditWallet(target.id, 250);
    expect(updated.walletBalance).toBe(before + 250);
  });

  it("throws for an unknown customer id", async () => {
    await expect(mockCustomerService.creditWallet("0000000000", 100)).rejects.toThrow();
  });
});
