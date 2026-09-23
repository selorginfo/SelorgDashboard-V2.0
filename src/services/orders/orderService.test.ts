import { beforeEach, describe, expect, it } from "vitest";
import { mockOrderService } from "@/services/orders/orderService.mock";

describe("mockOrderService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("advances an order to the next stage and logs the transition", async () => {
    const orders = await mockOrderService.list();
    const order = orders[0]!;
    const startStage = order.stage;

    const updated = await mockOrderService.advanceStage(order.id);
    expect(updated.stage).toBe(startStage + 1);

    const log = await mockOrderService.getLog(order.id);
    expect(log[0]?.name).toContain("Marked");
  });

  it("does not advance past the final stage", async () => {
    const orders = await mockOrderService.list();
    const delivered = orders.find((o) => o.stage === 10)!;

    const updated = await mockOrderService.advanceStage(delivered.id);
    expect(updated.stage).toBe(10);
  });

  it("reassigns the picker and records the reason in the log", async () => {
    const orders = await mockOrderService.list();
    const order = orders[0]!;

    const updated = await mockOrderService.applyAction(order.id, "Reassign picker", {
      picker: "Suresh P.",
      reason: "Load balancing",
    });
    expect(updated.picker).toBe("Suresh P.");

    const log = await mockOrderService.getLog(order.id);
    expect(log[0]?.name).toBe("Picker reassigned");
    expect(log[0]?.note).toContain("Load balancing");
  });

  it("cancels an order and stores the cancellation reason", async () => {
    const orders = await mockOrderService.list();
    const order = orders[1]!;

    const updated = await mockOrderService.applyAction(order.id, "Cancel order", {
      reason: "Customer request",
      refund: "Refund to original method",
      notify: "Yes, send notification",
      note: "Customer called in",
    });

    expect(updated.status).toBe("Cancelled");
    expect(updated.cancelLine).toContain("Customer request");
  });
});
