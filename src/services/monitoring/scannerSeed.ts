import type { ScannerDevice, ScannerFeedEvent } from "@/types/monitoring";
import type { Tone } from "@/types/common";

const s = (label: string, tone: Tone) => ({ label, tone });

/** Reshaped from DARKSTORE_CONFIGS.scanner "Devices" tab (workspace/data/darkstores.ts:208-214).
 * Read-only device fleet — no mutation, matches RidersLivePage's static-seed treatment. */
export const SEED_SCANNER_DEVICES: ScannerDevice[] = [
  { id: "HSD-04", store: "DS-01 Indiranagar", operator: "Suresh P.", lastActivity: "19:10", network: "Wi-Fi strong", lastSync: "19:10:44", scansToday: "1,204", status: s("Active", "green") },
  { id: "HSD-02", store: "DS-02 Koramangala", operator: "Meena T.", lastActivity: "19:01", network: "Wi-Fi weak", lastSync: "19:01:02", scansToday: "986", status: s("Active", "green") },
  { id: "HSD-06", store: "DS-03 HSR Layout", operator: "Divya M.", lastActivity: "18:58", network: "Wi-Fi strong", lastSync: "18:58:40", scansToday: "742", status: s("Idle", "blue") },
  { id: "HSD-07", store: "DS-03 HSR Layout", operator: "—", lastActivity: "08:12", network: "Disconnected", lastSync: "08:12:19", scansToday: "12", status: s("Offline", "red") },
  { id: "HSD-09", store: "DS-05 Jayanagar", operator: "Rekha N.", lastActivity: "18:38", network: "4G", lastSync: "18:38:11", scansToday: "410", status: s("Sync pending", "amber") },
];

/** Reshaped from the scanner "Scan activity" / "Exceptions" / "Audit" tabs (darkstores.ts
 * :215-231) into one most-recent-first feed, filtered client-side by `tab`. Read-only. */
export const SEED_SCANNER_FEED: ScannerFeedEvent[] = [
  { id: "sc-1", time: "19:10:44", store: "DS-01 Indiranagar", operator: "Suresh P.", action: "Order verify", reference: "SEL-104822", device: "HSD-04", status: s("Verified", "green"), tab: "Scan activity" },
  { id: "sc-2", time: "19:10:41", store: "DS-01 Indiranagar", operator: "Suresh P.", action: "Bag scan", reference: "BAG-77120", device: "HSD-04", status: s("OK", "green"), tab: "Scan activity" },
  { id: "sc-3", time: "19:10:29", store: "DS-01 Indiranagar", operator: "Suresh P.", action: "Item scan", reference: "SEL-2214", device: "HSD-04", status: s("Short qty", "amber"), tab: "Scan activity" },
  { id: "sc-4", time: "19:01:02", store: "DS-02 Koramangala", operator: "Meena T.", action: "Item scan", reference: "SEL-4410", device: "HSD-02", status: s("OK", "green"), tab: "Scan activity" },
  { id: "sc-5", time: "19:10:29", store: "DS-01 Indiranagar", operator: "Suresh P.", action: "Item scan", reference: "SEL-2214", device: "HSD-04", status: s("Wrong item", "red"), tab: "Exceptions" },
  { id: "sc-6", time: "18:44:10", store: "DS-04 Whitefield", operator: "Deepa K.", action: "Item scan", reference: "SEL-4415", device: "HSD-05", status: s("Invalid barcode", "red"), tab: "Exceptions" },
  { id: "sc-7", time: "18:20:55", store: "DS-05 Jayanagar", operator: "Rekha N.", action: "Bag scan", reference: "BAG-77088", device: "HSD-09", status: s("Duplicate scan", "amber"), tab: "Exceptions" },
  { id: "sc-8", time: "19:10:44", store: "DS-01 Indiranagar", operator: "Suresh P.", action: "Order verify", reference: "SEL-104822", device: "HSD-04", status: s("Accepted", "green"), tab: "Audit" },
  { id: "sc-9", time: "18:38:11", store: "DS-05 Jayanagar", operator: "Rekha N.", action: "Order verify", reference: "SEL-104811", device: "HSD-09", status: s("Accepted", "green"), tab: "Audit" },
  { id: "sc-10", time: "08:12:19", store: "DS-03 HSR Layout", operator: "System", action: "Heartbeat", reference: "HSD-07", device: "HSD-07", status: s("Lost", "red"), tab: "Audit" },
];
