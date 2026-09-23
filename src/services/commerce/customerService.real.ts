import { api } from "@/lib/apiClient";
import type { Customer } from "@/types/commerce";
import type { Badge } from "@/types/common";
import type { CustomerService, NewCustomerInput, CustomerActivityItem, CustomerOrderSummary, CustomerRefundSummary, CustomerWalletInfo } from "./customerService";

function asArray<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === "object") {
    const r = res as { data?: T[]; list?: T[] };
    if (Array.isArray(r.data)) return r.data;
    if (Array.isArray(r.list)) return r.list;
  }
  return [];
}

export const realCustomerService: CustomerService = {
  async list(): Promise<Customer[]> {
    const res = await api.get<{ data?: Customer[]; list?: Customer[] } | Customer[]>("/api/v1/admin/customers");
    if (Array.isArray(res)) return res;
    const r = res as { data?: Customer[]; list?: Customer[] };
    return r.data ?? r.list ?? [];
  },

  async creditWallet(id: string, amount: number): Promise<Customer> {
    await api.post(`/api/v1/admin/customers/${id}/wallet/credit`, { amount });
    return api.get<Customer>(`/api/v1/admin/customers/${id}`);
  },

  async setStatus(id: string, status: Badge): Promise<Customer> {
    return api.patch<Customer>(`/api/v1/admin/customers/${id}`, { status });
  },

  async create(input: NewCustomerInput): Promise<Customer> {
    return api.post<Customer>("/api/v1/admin/customers", input);
  },

  async getOrders(id: string): Promise<CustomerOrderSummary[]> {
    const res = await api.get<unknown>(`/api/v1/admin/customers/${id}/orders`);
    return asArray<Record<string, unknown>>(res).map((o) => ({
      id: String(o._id ?? o.id ?? o.orderNumber ?? ""),
      orderNumber: String(o.orderNumber ?? o.id ?? ""),
      status: String(o.status ?? ""),
      total: Number(o.totalBill ?? o.total ?? 0),
      createdAt: o.createdAt ? String(o.createdAt) : undefined,
    }));
  },

  async getRefunds(id: string): Promise<CustomerRefundSummary[]> {
    const res = await api.get<unknown>(`/api/v1/admin/customers/${id}/refunds`);
    return asArray<Record<string, unknown>>(res).map((r) => ({
      id: String(r._id ?? r.id ?? ""),
      orderNumber: String(r.orderNumber ?? r.orderId ?? ""),
      amount: Number(r.amount ?? 0),
      status: String(r.status ?? ""),
      method: String(r.refundMethod ?? r.method ?? ""),
      createdAt: r.createdAt ? String(r.createdAt) : undefined,
    }));
  },

  async getWallet(id: string): Promise<CustomerWalletInfo> {
    const res = await api.get<Record<string, unknown> | { data?: Record<string, unknown> }>(
      `/api/v1/admin/customers/${id}/wallet`,
    );
    const raw = (res as { data?: Record<string, unknown> })?.data ?? (res as Record<string, unknown>);
    return {
      balance: Number(raw?.balance ?? raw?.walletBalance ?? 0),
      currency: String(raw?.currency ?? "INR"),
    };
  },

  async getActivity(id: string): Promise<CustomerActivityItem[]> {
    const [orders, refunds, ticketsRes] = await Promise.all([
      this.getOrders(id).catch(() => [] as CustomerOrderSummary[]),
      this.getRefunds(id).catch(() => [] as CustomerRefundSummary[]),
      api.get<unknown>(`/api/v1/admin/customers/${id}/tickets`).catch(() => []),
    ]);
    const tickets = asArray<Record<string, unknown>>(ticketsRes);
    const items: CustomerActivityItem[] = [];

    for (const o of orders.slice(0, 20)) {
      items.push({
        title: `Order ${o.orderNumber || o.id}`,
        meta: `${o.status} · ₹${o.total}${o.createdAt ? ` · ${new Date(o.createdAt).toLocaleString("en-IN")}` : ""}`,
        at: o.createdAt ? new Date(o.createdAt).getTime() : 0,
      });
    }
    for (const r of refunds.slice(0, 20)) {
      items.push({
        title: `Refund ${r.id.slice(-6)}`,
        meta: `${r.status} · ₹${r.amount}${r.method ? ` · ${r.method}` : ""}`,
        at: r.createdAt ? new Date(r.createdAt).getTime() : 0,
      });
    }
    for (const t of tickets.slice(0, 20)) {
      items.push({
        title: `Ticket ${String(t.ticketNumber ?? t._id ?? t.id ?? "").slice(-8)}`,
        meta: `${String(t.status ?? "")} · ${String(t.subject ?? t.issue ?? "Support")}`,
        at: t.createdAt ? new Date(String(t.createdAt)).getTime() : 0,
      });
    }

    return items.sort((a, b) => b.at - a.at).slice(0, 30);
  },
};
