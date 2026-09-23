import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { mockBulkOrderData } from "@/services/bulkOrders/mockBulkOrderData";
import {
  BULK_ORDER_STAGES,
  type BulkOrder,
  type BulkOrderEvent,
  type BulkOrderStatus,
  type BulkPaymentStatus,
  type CreateBulkOrderInput,
} from "@/types/bulkOrder";

export interface BulkOrderService {
  list(): Promise<BulkOrder[]>;
  create(input: CreateBulkOrderInput, by: string): Promise<BulkOrder>;
  setStatus(id: string, status: BulkOrderStatus, by: string, note?: string): Promise<BulkOrder>;
  setPaymentStatus(id: string, paymentStatus: BulkPaymentStatus, by: string): Promise<BulkOrder>;
  assignPicker(id: string, picker: string, by: string): Promise<BulkOrder>;
  assignRider(id: string, rider: string, by: string): Promise<BulkOrder>;
}

/**
 * Local-only implementation. The backend has no B2B bulk-order endpoints yet, so this service is
 * not switched by USE_MOCKS — it always runs on the seeded table (persisted to localStorage).
 * Swap in a fetch-backed implementation once `/api/v1/admin/bulk-orders` exists.
 */
const table = createMockTable<BulkOrder>("selorg.bulkOrders", mockBulkOrderData);

/** Stage index each settable status lands on. */
const STATUS_STAGE: Partial<Record<BulkOrderStatus, number>> = {
  Pending: 0,
  Processing: 2,
  "Ready for Delivery": 5,
  "Out for Delivery": 7,
  Delivered: 8,
};

export function statusForStage(stage: number): BulkOrderStatus {
  if (stage >= 8) return "Delivered";
  if (stage >= 7) return "Out for Delivery";
  if (stage >= 5) return "Ready for Delivery";
  if (stage >= 2) return "Processing";
  return "Pending";
}

function mutate(id: string, fn: (o: BulkOrder) => BulkOrder): BulkOrder {
  let updated: BulkOrder | undefined;
  table.update((rows) =>
    rows.map((o) => {
      if (o.id !== id) return o;
      updated = fn(o);
      return updated;
    })
  );
  if (!updated) throw new MockApiError(`Bulk order ${id} not found`);
  return updated;
}

/** Moves an order forward to `target`, recording every stage it passes through. */
function advance(o: BulkOrder, target: number, by: string, note?: string): BulkOrder {
  const now = new Date().toISOString();
  const events: BulkOrderEvent[] = [];
  for (let s = o.stage + 1; s <= target; s++) {
    const name = BULK_ORDER_STAGES[s]!;
    events.push({ stage: name, at: now, by, note: s === target ? note : undefined });
  }
  return { ...o, stage: target, status: statusForStage(target), history: [...o.history, ...events] };
}

export const bulkOrderService: BulkOrderService = {
  async list() {
    await mockDelay();
    return table.all();
  },

  async create(input, by) {
    await mockDelay(260);
    const nextNum = Math.max(4399, ...table.all().map((o) => Number(o.id.replace(/\D/g, "")) || 0)) + 1;
    const order: BulkOrder = {
      id: `BLK-${nextNum}`,
      business: input.business,
      contactName: input.contactName,
      phone: input.phone,
      email: input.email,
      address: input.address,
      store: input.store,
      orderDate: new Date().toISOString(),
      deliveryDate: new Date(input.deliveryDate).toISOString(),
      slot: input.slot,
      items: input.items,
      discount: 0,
      deliveryCharge: 450,
      taxRate: 0.05,
      paymentStatus: "Pending",
      paymentMethod: input.paymentMethod,
      status: "Pending",
      stage: 0,
      history: [{ stage: "Order Created", at: new Date().toISOString(), by }],
    };
    table.update((rows) => [order, ...rows]);
    return order;
  },

  async setStatus(id, status, by, note) {
    await mockDelay(220);
    return mutate(id, (o) => {
      if (o.status === "Cancelled") throw new MockApiError(`${id} is cancelled`);
      if (status === "Cancelled") {
        if (o.status === "Delivered") throw new MockApiError(`${id} is already delivered`);
        return {
          ...o,
          status: "Cancelled",
          history: [...o.history, { stage: "Cancelled", at: new Date().toISOString(), by, note }],
        };
      }
      const target = STATUS_STAGE[status]!;
      if (target < o.stage) throw new MockApiError(`${id} is already past "${status}"`);
      if (target >= 7 && !o.rider) throw new MockApiError("Assign a rider before dispatching");
      if (target === o.stage) return o;
      return advance(o, target, by, note);
    });
  },

  async setPaymentStatus(id, paymentStatus, by) {
    await mockDelay(200);
    return mutate(id, (o) => ({
      ...o,
      paymentStatus,
      history: [...o.history, { stage: `Payment marked ${paymentStatus.toLowerCase()}`, at: new Date().toISOString(), by }],
    }));
  },

  async assignPicker(id, picker, by) {
    await mockDelay(220);
    return mutate(id, (o) => {
      if (o.status === "Cancelled" || o.status === "Delivered") throw new MockApiError(`${id} is ${o.status.toLowerCase()}`);
      const withPicker = { ...o, picker };
      // Assigning a picker to an order in processing starts picking.
      if (o.stage === 2) return advance(withPicker, 3, by, picker);
      return {
        ...withPicker,
        history: [...o.history, { stage: "Picker assigned", at: new Date().toISOString(), by, note: picker }],
      };
    });
  },

  async assignRider(id, rider, by) {
    await mockDelay(220);
    return mutate(id, (o) => {
      if (o.status === "Cancelled" || o.status === "Delivered") throw new MockApiError(`${id} is ${o.status.toLowerCase()}`);
      const withRider = { ...o, rider };
      if (o.stage === 5) return advance(withRider, 6, by, rider);
      return {
        ...withRider,
        history: [...o.history, { stage: o.rider ? "Rider reassigned" : "Rider assigned", at: new Date().toISOString(), by, note: rider }],
      };
    });
  },
};

export function bulkOrderTotals(o: BulkOrder) {
  const subtotal = o.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
  const taxable = Math.max(subtotal - o.discount, 0);
  const tax = Math.round(taxable * o.taxRate);
  return {
    subtotal,
    discount: o.discount,
    delivery: o.deliveryCharge,
    tax,
    total: taxable + tax + o.deliveryCharge,
    quantity: o.items.reduce((sum, it) => sum + it.qty, 0),
  };
}
