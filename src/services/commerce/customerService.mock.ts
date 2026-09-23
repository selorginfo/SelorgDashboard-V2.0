import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_CUSTOMERS } from "@/services/commerce/customerSeed";
import type { Customer } from "@/types/commerce";
import type { CustomerService, NewCustomerInput } from "@/services/commerce/customerService";

const table = createMockTable<Customer>("selorg.commerce.customers", SEED_CUSTOMERS);

export const mockCustomerService: CustomerService = {
  async list() {
    await mockDelay();
    return table.all();
  },

  async creditWallet(id, amount) {
    await mockDelay(240);
    let updated: Customer | undefined;
    table.update((rows) =>
      rows.map((c) => {
        if (c.id !== id) return c;
        updated = { ...c, walletBalance: c.walletBalance + amount };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Customer ${id} not found`);
    return updated;
  },

  async setStatus(id, status) {
    await mockDelay(220);
    let updated: Customer | undefined;
    table.update((rows) =>
      rows.map((c) => {
        if (c.id !== id) return c;
        updated = { ...c, status };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Customer ${id} not found`);
    return updated;
  },

  async create(input: NewCustomerInput): Promise<Customer> {
    await mockDelay(300);
    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      name: input.name,
      phone: input.phoneNumber ?? "—",
      orders: "0",
      totalSpend: "₹0",
      lastOrder: "Never",
      walletBalance: 0,
      tickets: "0",
      status: { label: "Active", tone: "green" },
    };
    table.update((rows) => [...rows, newCustomer]);
    return newCustomer;
  },

  async getOrders(id) {
    await mockDelay();
    const c = table.all().find((x) => x.id === id);
    if (!c) return [];
    return [{ id: "mock-1", orderNumber: "ORD-MOCK-1", status: "delivered", total: 100, createdAt: new Date().toISOString() }];
  },

  async getRefunds() {
    await mockDelay();
    return [];
  },

  async getWallet(id) {
    await mockDelay();
    const c = table.all().find((x) => x.id === id);
    return { balance: c?.walletBalance ?? 0, currency: "INR" };
  },

  async getActivity(id) {
    await mockDelay();
    const orders = await this.getOrders(id);
    return orders.map((o) => ({
      title: `Order ${o.orderNumber}`,
      meta: `${o.status} · ₹${o.total}`,
      at: Date.now(),
    }));
  },
};
