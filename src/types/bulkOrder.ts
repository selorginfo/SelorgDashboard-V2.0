export type BulkOrderStatus =
  | "Pending"
  | "Processing"
  | "Ready for Delivery"
  | "Out for Delivery"
  | "Delivered"
  | "Cancelled";

export type BulkPaymentStatus = "Paid" | "Pending" | "Partially paid" | "Refunded" | "Failed";

/** Lifecycle shown on the bulk order detail timeline, in order. */
export const BULK_ORDER_STAGES = [
  "Order Created",
  "Payment Confirmed",
  "Processing",
  "Picking",
  "Packed",
  "Ready for Delivery",
  "Rider Assigned",
  "Out for Delivery",
  "Delivered",
] as const;

export type BulkOrderStage = (typeof BULK_ORDER_STAGES)[number];

export interface BulkOrderItem {
  product: string;
  sku: string;
  qty: number;
  /** ₹ per unit */
  unitPrice: number;
}

export interface BulkOrderEvent {
  stage: string;
  /** ISO timestamp */
  at: string;
  by: string;
  note?: string;
}

export interface BulkOrder {
  id: string;
  business: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  store: string;
  /** ISO timestamps */
  orderDate: string;
  deliveryDate: string;
  slot: string;
  items: BulkOrderItem[];
  discount: number;
  deliveryCharge: number;
  /** e.g. 0.05 for 5% GST */
  taxRate: number;
  paymentStatus: BulkPaymentStatus;
  paymentMethod: string;
  status: BulkOrderStatus;
  /** Index into BULK_ORDER_STAGES — the last completed stage. */
  stage: number;
  picker?: string;
  rider?: string;
  history: BulkOrderEvent[];
}

export interface CreateBulkOrderInput {
  business: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  store: string;
  deliveryDate: string;
  slot: string;
  paymentMethod: string;
  items: BulkOrderItem[];
}
