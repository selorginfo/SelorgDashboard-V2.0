import type { LiveRider, RiderDirectoryEntry } from "@/types/rider";
import type { Badge, Tone } from "@/types/common";

const s = (label: string, tone: Tone): Badge => ({ label, tone });

/** Verbatim from the approved design's Riders & Live screen (dc.html ~5647-5670). Map positions
 * are illustrative placement on the stylised zone map, not real geo-coordinates (the design's
 * own fleet map is a hand-drawn SVG, not a real maps SDK — no API key exists to plot real ones). */
export const SEED_LIVE_RIDERS: LiveRider[] = [
  { id: "vikram", name: "Vikram J.", hub: "DS-01 Indiranagar", currentOrder: "SEL-104822", zone: "Z-04", eta: "4 min", vehicle: "Bike · KA-01 EF", rating: "4.8", status: s("Out for delivery", "blue"), x: 34, y: 42 },
  { id: "imran", name: "Imran A.", hub: "DS-03 HSR Layout", currentOrder: "SEL-104799", zone: "Z-07", eta: "Delayed 12 min", vehicle: "Bike · KA-05 JJ", rating: "4.6", status: s("Delayed", "red"), x: 62, y: 58 },
  { id: "naveen", name: "Naveen R.", hub: "DS-04 Whitefield", currentOrder: "SEL-104803", zone: "Z-11", eta: "Delivered 18:22", vehicle: "EV · KA-51 AA", rating: "4.9", status: s("Completed", "green"), x: 78, y: 30 },
  { id: "sameer", name: "Sameer Q.", hub: "DS-02 Koramangala", currentOrder: "—", zone: "Z-02", eta: "—", vehicle: "Bike · KA-03 LM", rating: "4.4", status: s("Available", "grey"), x: 47, y: 68 },
];

export const SEED_RIDER_DIRECTORY: RiderDirectoryEntry[] = [
  { name: "Vikram J.", hub: "DS-01 Indiranagar", phone: "+91 98111 20034", zone: "Z-04", kyc: "KYC verified", vehicle: "Bike", rating: "4.8", status: s("Online", "green") },
  { name: "Imran A.", hub: "DS-03 HSR Layout", phone: "+91 98111 55210", zone: "Z-07", kyc: "KYC verified", vehicle: "Bike", rating: "4.6", status: s("Online", "green") },
  { name: "Naveen R.", hub: "DS-04 Whitefield", phone: "+91 97555 41120", zone: "Z-11", kyc: "KYC verified", vehicle: "EV", rating: "4.9", status: s("On break", "amber") },
  { name: "Deepak T.", hub: "DS-05 Jayanagar", phone: "+91 96444 88012", zone: "Z-14", kyc: "Pending", vehicle: "Bike", rating: "—", status: s("Offline", "grey") },
];

export const RIDER_PERFORMANCE_ROWS = [
  ["Vikram J.", "DS-01 Indiranagar", "218 deliveries", "94% accept", "97% on-time", "10.8 min", "4.8", s("Top", "green")],
  ["Imran A.", "DS-03 HSR Layout", "186 deliveries", "88% accept", "91% on-time", "13.4 min", "4.6", s("Review", "amber")],
  ["Naveen R.", "DS-04 Whitefield", "204 deliveries", "96% accept", "98% on-time", "10.2 min", "4.9", s("Top", "green")],
];

export const RIDER_EARNINGS_ROWS = [
  ["Vikram J.", "DS-01 Indiranagar", "₹8,420", "₹1,200 incentive", "₹150 deduction", "₹9,470", "Weekly", s("Settled", "green")],
  ["Imran A.", "DS-03 HSR Layout", "₹7,180", "₹600 incentive", "₹0", "₹7,780", "Weekly", s("Pending", "amber")],
];

export const RIDER_INCIDENT_ROWS = [
  ["INC-441", "Imran A.", "Delivery failed", "SEL-104799", "Z-07", "Customer unavailable", "—", s("Open", "red")],
  ["INC-440", "Deepak T.", "Vehicle issue", "—", "Z-14", "Puncture, shift ended", "—", s("Resolved", "green")],
];
