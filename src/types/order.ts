import type { Tone } from "@/types/common";

export type OrderStatus =
  | "Placed"
  | "Confirmed"
  | "Waiting for Picker"
  | "Picker Accepted"
  | "Waiting for Rider"
  | "Rider Accepted"
  | "Rider Picked"
  | "Picking"
  | "Packing"
  | "Ready"
  | "Out for delivery"
  | "Delivered"
  | "Exception"
  | "Cancelled";

export const ORDER_STAGES = [
  "Placed",
  "Waiting for Picker",
  "Picker Accepted",
  "Picking completed",
  "HSD verified",
  "Packed",
  "Waiting for Rider",
  "Rider Accepted",
  "Rider Picked",
  "Out for delivery",
  "Delivered",
] as const;

export type PaymentStatus = "Paid" | "Failed" | "COD" | "Pending";
export type SlaStatus = "On track" | "At risk" | "Breached";

export interface OrderItem {
  name: string;
  sku: string;
  qty: number;
  picked: number;
  missing: number;
  price: string;
  substitution: string;
}

export interface ScanEvent {
  time: string;
  type: string;
  ref: string;
  device: string;
  result: string;
}

export interface Order {
  id: string;
  customer: string;
  phone: string;
  address: string;
  store: string;
  pickupStore?: string;
  date: string;
  createdAt?: string; // ISO date-time from API, used for day-based client-side filtering
  status: OrderStatus;
  fulfillmentStage?: string;
  fulfillmentLabel?: string;
  tone: Tone;
  payment: PaymentStatus;
  paymentLabel?: string;
  picker: string;
  rider: string;
  zone: string;
  value: string;
  sla: SlaStatus;
  exception: string;
  stage: number;
  rawStatus?: string;
  hsdDeviceId?: string;
  bagCode?: string;
  dispatchBay?: string;
  refundLine?: string;
  cancelLine?: string;
  items: OrderItem[];
  scans: ScanEvent[];
}

export interface OrderLogEntry {
  id: string;
  name: string;
  who: string;
  time: string;
  note?: string;
}

export const ORDER_ACTION_IDS = [
  "Reassign picker",
  "Reassign rider",
  "Contact customer",
  "Initiate refund",
  "Add internal note",
  "Cancel order",
] as const;

export type OrderActionId = (typeof ORDER_ACTION_IDS)[number];

export interface ActionFieldDef {
  id: string;
  label: string;
  kind: "select" | "text" | "textarea";
  options?: string[];
  required?: boolean;
}

/** Verbatim from the approved design's ACT_FORMS for the `orders` module (dc.html ~4955-4960). */
export const ORDER_ACTION_FORMS: Record<OrderActionId, ActionFieldDef[]> = {
  "Reassign picker": [
    { id: "picker", label: "New picker", kind: "select", options: ["Ravi M.", "Deepa K.", "Meena T.", "Anita S.", "Suresh P.", "Ganesh R."], required: true },
    { id: "reason", label: "Reason", kind: "select", options: ["Picker on break", "Shift ended", "Load balancing", "Accuracy issue", "Store change"], required: true },
    { id: "note", label: "Note", kind: "textarea" },
  ],
  "Reassign rider": [
    { id: "rider", label: "New rider", kind: "select", options: ["Vikram J.", "Imran A.", "Naveen R.", "Sameer Q.", "Deepak T."], required: true },
    { id: "reason", label: "Reason", kind: "select", options: ["Rider unavailable", "Vehicle issue", "Delay risk", "Zone change", "Rider declined"], required: true },
    { id: "note", label: "Note", kind: "textarea" },
  ],
  "Contact customer": [
    { id: "channel", label: "Channel", kind: "select", options: ["Call", "SMS", "WhatsApp", "Push notification"], required: true },
    { id: "template", label: "Template", kind: "select", options: ["Delay apology", "Missing item", "Substitution approval", "Delivery confirmation", "Custom message"], required: true },
    { id: "note", label: "Message", kind: "textarea" },
  ],
  "Initiate refund": [
    { id: "scope", label: "Refund type", kind: "select", options: ["Full order refund", "Item refund", "Delivery fee refund", "Goodwill credit"], required: true },
    { id: "amount", label: "Amount (₹)", kind: "text", required: true },
    { id: "method", label: "Refund to", kind: "select", options: ["Original payment method", "Selorg wallet", "Bank transfer"], required: true },
    { id: "reason", label: "Reason", kind: "select", options: ["Missing item", "Damaged item", "Quality issue", "Late delivery", "Order cancelled"], required: true },
    { id: "note", label: "Note", kind: "textarea" },
  ],
  "Add internal note": [
    { id: "visibility", label: "Visible to", kind: "select", options: ["Ops team", "Store manager", "Finance", "All admins"], required: true },
    { id: "note", label: "Note", kind: "textarea", required: true },
  ],
  "Cancel order": [
    { id: "reason", label: "Cancellation reason", kind: "select", options: ["Customer request", "Stock unavailable", "Payment failed", "Address unreachable", "Store closed", "Fraud suspected"], required: true },
    { id: "refund", label: "Refund", kind: "select", options: ["Refund to original method", "Refund to wallet", "No refund due"], required: true },
    { id: "notify", label: "Notify customer", kind: "select", options: ["Yes, send notification", "No"], required: true },
    { id: "note", label: "Note", kind: "textarea", required: true },
  ],
};
