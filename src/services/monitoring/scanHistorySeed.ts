import type { ScanHistoryEvent } from "@/types/monitoring";
import type { Tone } from "@/types/common";

const s = (label: string, tone: Tone) => ({ label, tone });

/** Reshaped from DARKSTORE_CONFIGS["scan-history"]'s per-tab rows (workspace/data/darkstores.ts
 * :255-285) into one deduped, canonical event stream — "All scans" / "Product scans" / "Bag
 * scans" / "Rack scans" / "Failures" are all client-side filters over this list (entity type,
 * and "Failures" = any non-green result) rather than separately duplicated rows. Read-only —
 * every barcode scan event is immutable once captured. */
export const SEED_SCAN_HISTORY: ScanHistoryEvent[] = [
  { id: "sh-1", time: "19:10:44", barcode: "890127100505", entity: "Rack", reference: "DS01-R05", order: "ORD-10244", picker: "Ravi M.", device: "HSD-04", status: s("Bag racked", "green") },
  { id: "sh-2", time: "19:10:41", barcode: "890126400981", entity: "Bag", reference: "BAG-000981", order: "ORD-10244", picker: "Ravi M.", device: "HSD-04", status: s("Verified", "green") },
  { id: "sh-3", time: "19:10:29", barcode: "890126402214", entity: "Product", reference: "Amul Gold Milk 1L", order: "ORD-10245", picker: "Ravi M.", device: "HSD-04", status: s("Short qty", "amber") },
  { id: "sh-4", time: "19:10:12", barcode: "890126401102", entity: "Product", reference: "Organic Tomato 500g", order: "ORD-10245", picker: "Ravi M.", device: "HSD-04", status: s("Matched", "green") },
  { id: "sh-5", time: "19:08:55", barcode: "890126409999", entity: "Product", reference: "Unregistered", order: "ORD-10247", picker: "Meena T.", device: "HSD-02", status: s("Unknown barcode", "red") },
  { id: "sh-6", time: "19:06:20", barcode: "890126400982", entity: "Bag", reference: "BAG-000982", order: "ORD-10245", picker: "Ravi M.", device: "HSD-04", status: s("Bag opened", "green") },
  { id: "sh-7", time: "19:04:02", barcode: "890126404410", entity: "Product", reference: "Basmati Rice 5kg", order: "ORD-10247", picker: "Meena T.", device: "HSD-02", status: s("Wrong product", "red") },
  { id: "sh-8", time: "18:58:14", barcode: "890126401005", entity: "Bag", reference: "BAG-001005", order: "ORD-10250", picker: "Suresh P.", device: "HSD-06", status: s("Wrong bag", "red") },
  { id: "sh-9", time: "18:44:10", barcode: "890126404415", entity: "Product", reference: "Ghee 500ml", order: "ORD-10249", picker: "Deepa K.", device: "HSD-05", status: s("Duplicate scan", "amber") },
  { id: "sh-10", time: "18:40:09", barcode: "890127100508", entity: "Rack", reference: "DS01-R08", order: "ORD-10240", picker: "Rekha N.", device: "HSD-09", status: s("Wrong rack", "amber") },
  { id: "sh-11", time: "18:22:47", barcode: "890127100304", entity: "Rack", reference: "DS03-R04", order: "ORD-10238", picker: "Suresh P.", device: "HSD-06", status: s("Inactive barcode", "red") },
];
