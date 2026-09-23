import type { Order, OrderActionId, OrderLogEntry } from "@/types/order";

export interface PlaceOrderInput {
  customerId: string;
  items: { productId: string; quantity: number }[];
  paymentMethod?: string;
  deliveryNotes?: string;
  couponCode?: string;
}

export interface OrderService {
  /** Pass an ISO date string (YYYY-MM-DD) to scope results to that day; omit for today. */
  list(date?: string): Promise<Order[]>;
  get(id: string): Promise<Order | undefined>;
  getLog(id: string): Promise<OrderLogEntry[]>;
  advanceStage(id: string, currentRawStatus?: string): Promise<Order>;
  applyAction(id: string, action: OrderActionId, values: Record<string, string>): Promise<Order>;
  placeOnBehalf(input: PlaceOrderInput): Promise<Order>;
}
