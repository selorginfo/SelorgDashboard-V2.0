import { api } from "@/lib/apiClient";
import type { BulkOrder, BulkOrderStatus, BulkPaymentStatus, CreateBulkOrderInput } from "@/types/bulkOrder";
import type { BulkOrderService } from "./bulkOrderService";

interface ListBody {
  items: BulkOrder[];
}

export const realBulkOrderService: BulkOrderService = {
  async list() {
    const data = await api.get<ListBody>("/api/v1/admin/bulk-orders", { page: 1, pageSize: 200 });
    return data.items ?? [];
  },

  async create(input: CreateBulkOrderInput) {
    return api.post<BulkOrder>("/api/v1/admin/bulk-orders", {
      business: input.business,
      contactName: input.contactName,
      phone: input.phone,
      email: input.email,
      address: input.address,
      store: input.store,
      deliveryDate: input.deliveryDate,
      slot: input.slot,
      paymentMethod: input.paymentMethod,
      items: input.items.map((item) => ({ sku: item.sku, qty: item.qty, product: item.product, unitPrice: item.unitPrice })),
    });
  },

  async setStatus(id, status: BulkOrderStatus, _by, note) {
    return api.post<BulkOrder>(`/api/v1/admin/bulk-orders/${encodeURIComponent(id)}/status`, { status, note });
  },

  async setPaymentStatus(id, paymentStatus: BulkPaymentStatus) {
    return api.post<BulkOrder>(`/api/v1/admin/bulk-orders/${encodeURIComponent(id)}/payment-status`, { paymentStatus });
  },

  async assignPicker(id, picker) {
    return api.post<BulkOrder>(`/api/v1/admin/bulk-orders/${encodeURIComponent(id)}/assign-picker`, { pickerId: picker });
  },

  async assignRider(id, rider) {
    return api.post<BulkOrder>(`/api/v1/admin/bulk-orders/${encodeURIComponent(id)}/assign-rider`, { riderId: rider });
  },
};
