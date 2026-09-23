import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_ORDERS } from "@/services/orders/seed";
import { ORDER_STAGES } from "@/types/order";
import type { Order, OrderActionId, OrderLogEntry } from "@/types/order";
import type { OrderService, PlaceOrderInput } from "@/services/orders/orderService";

const ordersTable = createMockTable<Order>("selorg.orders", SEED_ORDERS);
const logsTable = createMockTable<OrderLogEntry & { orderId: string }>("selorg.orders.log", []);

function now(): string {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function appendLog(orderId: string, name: string, note?: string) {
  logsTable.update((rows) => [
    { id: crypto.randomUUID(), orderId, name, who: "Arun K.", time: now(), note },
    ...rows,
  ]);
}

function updateOrder(id: string, patch: Partial<Order>): Order {
  let updated: Order | undefined;
  ordersTable.update((rows) =>
    rows.map((o) => {
      if (o.id !== id) return o;
      updated = { ...o, ...patch };
      return updated;
    })
  );
  if (!updated) throw new MockApiError(`Order ${id} not found`);
  return updated;
}

export const mockOrderService: OrderService = {
  async list(_date?: string) {
    await mockDelay();
    return ordersTable.all();
  },

  async get(id) {
    await mockDelay(180);
    return ordersTable.all().find((o) => o.id === id);
  },

  async getLog(id) {
    await mockDelay(150);
    return logsTable.all().filter((l) => l.orderId === id);
  },

  async advanceStage(id, _currentRawStatus?) {
    await mockDelay(260);
    const order = ordersTable.all().find((o) => o.id === id);
    if (!order) throw new MockApiError(`Order ${id} not found`);
    const nextStage = Math.min(order.stage + 1, ORDER_STAGES.length - 1);
    appendLog(id, `Marked ${ORDER_STAGES[nextStage]}`);
    return updateOrder(id, { stage: nextStage });
  },

  async applyAction(id, action: OrderActionId, values) {
    await mockDelay(320);
    switch (action) {
      case "Reassign picker":
        appendLog(id, "Picker reassigned", `${values["reason"]}${values["note"] ? " · " + values["note"] : ""}`);
        return updateOrder(id, { picker: values["picker"] ?? "" });
      case "Reassign rider":
        appendLog(id, "Rider reassigned", `${values["reason"]}${values["note"] ? " · " + values["note"] : ""}`);
        return updateOrder(id, { rider: values["rider"] ?? "" });
      case "Contact customer":
        appendLog(id, `Customer contacted via ${values["channel"]}`, values["template"]);
        return ordersTable.all().find((o) => o.id === id) as Order;
      case "Initiate refund": {
        const line = `₹${values["amount"]} refund initiated · ${values["reason"]}`;
        appendLog(id, "Refund initiated", line);
        return updateOrder(id, { refundLine: line });
      }
      case "Add internal note":
        appendLog(id, `Note added (${values["visibility"]})`, values["note"]);
        return ordersTable.all().find((o) => o.id === id) as Order;
      case "Cancel order": {
        const line = `${values["reason"]} · ${values["refund"]}`;
        appendLog(id, "Order cancelled", line);
        return updateOrder(id, { status: "Cancelled", cancelLine: line });
      }
      default:
        throw new MockApiError(`Unknown action: ${action}`);
    }
  },

  async placeOnBehalf(input: PlaceOrderInput): Promise<Order> {
    await mockDelay(400);
    const newOrder: Order = {
      id: `ORD-${Date.now().toString(36).toUpperCase()}`,
      customer: input.customerId,
      store: "DS-Adyar-01",
      rider: "—",
      picker: "—",
      status: "Picking",
      stage: 0,
      items: input.items.length,
      value: "₹0",
      eta: "15 min",
      elapsed: "0 min",
      paymentMode: input.paymentMethod ?? "cash",
      actions: [],
    } as unknown as Order;
    ordersTable.update((rows) => [newOrder, ...rows]);
    return newOrder;
  },
};
