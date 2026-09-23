import type { Tone } from "@/types/common";
import type { BulkOrderStatus, BulkPaymentStatus } from "@/types/bulkOrder";

export const BULK_STATUS_TONE: Record<BulkOrderStatus, Tone> = {
  Pending: "grey",
  Processing: "amber",
  "Ready for Delivery": "blue",
  "Out for Delivery": "blue",
  Delivered: "green",
  Cancelled: "red",
};

export const PAYMENT_STATUS_TONE: Record<BulkPaymentStatus, Tone> = {
  Paid: "green",
  Pending: "amber",
  "Partially paid": "amber",
  Refunded: "grey",
  Failed: "red",
};
