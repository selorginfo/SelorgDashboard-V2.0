import type { Badge } from "@/types/common";

/** A customer in the `customers` people layout — "Customers" tab (columns: Customer, Phone,
 * Orders, Total spend, Last order, Wallet, Tickets, Status from workspace/data/commerce.ts).
 * `walletBalance` is the numeric form of the "Wallet" column so the credit-wallet mutation can
 * add to it directly; `wallet` stays as the formatted display string for the other tabs. */
export interface Customer {
  id: string;
  name: string;
  phone: string;
  orders: string;
  totalSpend: string;
  lastOrder: string;
  walletBalance: number;
  tickets: string;
  status: Badge;
}

/** A ticket message — shared shape with the rider/picker support consoles' thread entries. */
export interface CxTicketMessage {
  from: string;
  text: string;
  time: string;
  internal: boolean;
}

/** A ticket in the `support` (Commerce/CX) directory layout — distinct from the rider/picker
 * support consoles (src/modules/support): context here is order + payment, not delivery/earning.
 * Columns: Ticket, Customer, Order, Issue, Channel, Agent, Age, Status from
 * workspace/data/commerce.ts. */
export interface CxTicket {
  id: string;
  customer: string;
  order: string;
  issue: string;
  channel: string;
  agent: string;
  age: string;
  status: Badge;
  thread: CxTicketMessage[];
}
