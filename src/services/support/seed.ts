import type { SupportTicket, SupportWorkerKind } from "@/types/supportTicket";
import type { Tone } from "@/types/common";

const s = (label: string, tone: Tone) => ({ label, tone });

/** Verbatim from the approved design's Rider/Picker Support screens (dc.html ~6184-6231). Ticket
 * threads aren't part of the design's row data (only list metadata is) — seeded with a single
 * opening message per ticket so the console has something real to reply against. */
export const SEED_RIDER_TICKETS: SupportTicket[] = [
  { id: "TKT-R-3312", person: "Imran A.", issue: "Delivery issue · customer unavailable", context: "SEL-104799", priority: "P1", agent: "Kavya S.", age: "12 min", status: s("Investigating", "amber"), thread: [{ from: "Imran A.", text: "Customer isn't answering calls at the delivery address.", time: "18:20", internal: false }] },
  { id: "TKT-R-3311", person: "Deepak T.", issue: "Earnings issue · deduction disputed", context: "—", priority: "P2", agent: "Kavya S.", age: "1 h", status: s("Waiting on rider", "amber"), thread: [{ from: "Deepak T.", text: "I was charged a late deduction but my delivery was on time.", time: "17:40", internal: false }] },
  { id: "TKT-R-3309", person: "Sameer Q.", issue: "App issue · order not loading", context: "SEL-104824", priority: "P2", agent: "Kavya S.", age: "2 h", status: s("Investigating", "amber"), thread: [{ from: "Sameer Q.", text: "The order details screen is stuck loading.", time: "16:55", internal: false }] },
  { id: "TKT-R-3310", person: "Vikram J.", issue: "Vehicle issue · puncture mid-route", context: "SEL-104822", priority: "P1", agent: "Rohit V.", age: "28 min", status: s("Escalated", "red"), thread: [{ from: "Vikram J.", text: "Got a puncture, need a replacement or reassignment.", time: "18:02", internal: false }] },
  { id: "TKT-R-3308", person: "Naveen R.", issue: "Payment issue · COD short", context: "—", priority: "P2", agent: "Latha S.", age: "3 h", status: s("Open", "blue"), thread: [] },
  { id: "TKT-R-3307", person: "Salim K.", issue: "Safety issue · road incident", context: "—", priority: "P1", agent: "Rohit V.", age: "4 h", status: s("Escalated", "red"), thread: [{ from: "Salim K.", text: "Minor collision, I'm safe but bike needs inspection.", time: "14:30", internal: false }] },
  { id: "TKT-R-3305", person: "Rohit V.", issue: "Account issue · bank details", context: "—", priority: "P3", agent: "Latha S.", age: "1 day", status: s("Waiting on rider", "amber"), thread: [] },
  { id: "TKT-R-3304", person: "Naveen R.", issue: "Delivery issue · wrong address", context: "SEL-104803", priority: "P2", agent: "Kavya S.", age: "Yesterday", status: s("Resolved", "green"), thread: [{ from: "Kavya S.", text: "Corrected the address with the customer and confirmed redelivery.", time: "Yesterday", internal: false }] },
];

export const SEED_PICKER_TICKETS: SupportTicket[] = [
  { id: "TKT-P-2214", person: "Meena T.", issue: "Scanner issue · barcode not reading", context: "DS-02 · SEL-104821", priority: "P1", agent: "Divya M.", age: "9 min", status: s("Investigating", "amber"), thread: [{ from: "Meena T.", text: "HSD-02 won't scan this product's barcode, tried three times.", time: "19:01", internal: false }] },
  { id: "TKT-P-2213", person: "Deepa K.", issue: "Inventory issue · item not on shelf", context: "DS-04 · SEL-104815", priority: "P2", agent: "Divya M.", age: "34 min", status: s("Investigating", "amber"), thread: [{ from: "Deepa K.", text: "Ghee 500ml isn't on the shelf despite system showing stock.", time: "18:40", internal: false }] },
  { id: "TKT-P-2211", person: "Ganesh R.", issue: "Earnings issue · shift bonus missing", context: "DS-05", priority: "P3", agent: "Divya M.", age: "2 h", status: s("Waiting on picker", "amber"), thread: [] },
  { id: "TKT-P-2212", person: "Ravi M.", issue: "Bag issue · label will not print", context: "DS-01 · BAG-77120", priority: "P2", agent: "Nisha R.", age: "1 h", status: s("Open", "blue"), thread: [] },
  { id: "TKT-P-2210", person: "Suresh P.", issue: "Rack issue · slot occupied", context: "DS-03 · DS03-R04", priority: "P2", agent: "Nisha R.", age: "3 h", status: s("Escalated", "red"), thread: [{ from: "Suresh P.", text: "Assigned rack slot already has another bag in it.", time: "16:10", internal: false }] },
  { id: "TKT-P-2209", person: "Anita S.", issue: "Order issue · duplicate bag created", context: "DS-01 · SEL-104809", priority: "P1", agent: "Nisha R.", age: "5 h", status: s("Escalated", "red"), thread: [{ from: "Anita S.", text: "System created two bags for the same order.", time: "14:00", internal: false }] },
  { id: "TKT-P-2208", person: "Latha S.", issue: "Account issue · shift change", context: "DS-02", priority: "P3", agent: "Nisha R.", age: "Yesterday", status: s("Resolved", "green"), thread: [{ from: "Nisha R.", text: "Shift swapped to Shift 1 as requested.", time: "Yesterday", internal: false }] },
];

export function seedTicketsFor(kind: SupportWorkerKind): SupportTicket[] {
  return kind === "rider" ? SEED_RIDER_TICKETS : SEED_PICKER_TICKETS;
}
