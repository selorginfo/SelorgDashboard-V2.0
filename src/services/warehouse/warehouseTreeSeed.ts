import type { WhZone, BinItem } from "@/types/warehouse";

/**
 * Zone → rack hierarchy for WH-01 Bommasandra, transcribed from the approved design
 * (dc.html:4768-4801). Purely illustrative/static like RiderFleetMap's seed — nothing here is
 * mutated, so it lives as a plain const rather than behind a mock service.
 */
export const WH_TREE: WhZone[] = [
  {
    zone: "Zone A",
    desc: "Ambient · fruit & vegetables",
    cap: 420,
    used: 341,
    racks: [
      { id: "A01", bins: 12, used: 11, skus: 8, note: "Fast movers" },
      { id: "A04", bins: 12, used: 9, skus: 6, note: "Tomato, onion" },
      { id: "A08", bins: 12, used: 12, skus: 9, note: "Leafy greens" },
      { id: "A12", bins: 12, used: 7, skus: 5, note: "Pick face" },
    ],
  },
  {
    zone: "Zone B",
    desc: "Ambient · staples & packaged",
    cap: 640,
    used: 402,
    racks: [
      { id: "B09", bins: 24, used: 21, skus: 14, note: "Rice, atta" },
      { id: "B11", bins: 24, used: 18, skus: 11, note: "Oils" },
      { id: "B14", bins: 24, used: 9, skus: 6, note: "Overflow" },
    ],
  },
  {
    zone: "Zone C",
    desc: "Chilled 2–6 °C · dairy & eggs",
    cap: 280,
    used: 254,
    racks: [
      { id: "C01", bins: 16, used: 16, skus: 12, note: "Milk, curd" },
      { id: "C02", bins: 16, used: 14, skus: 9, note: "Eggs" },
    ],
  },
  {
    zone: "Zone D",
    desc: "Frozen −18 °C · meat & seafood",
    cap: 120,
    used: 68,
    racks: [
      { id: "D01", bins: 8, used: 6, skus: 4, note: "Poultry" },
      { id: "D02", bins: 8, used: 3, skus: 2, note: "Seafood" },
    ],
  },
  {
    zone: "Quarantine",
    desc: "Damage & QC hold",
    cap: 60,
    used: 22,
    racks: [{ id: "Q1", bins: 6, used: 4, skus: 3, note: "Awaiting write-off" }],
  },
];

/** Bin-level contents for a selected rack — columns: [sku, name, batch, expiry, qty, status]. */
const BIN_DETAIL_ROWS: Record<string, [string, string, string, string, string, string][]> = {
  A01: [
    ["SEL-1102", "Organic Tomato 500g", "B-5510", "12 Sep 26", "640", "Healthy"],
    ["SEL-1058", "Lemon 250g", "B-5512", "09 Sep 26", "210", "Healthy"],
  ],
  B09: [
    ["SEL-4410", "Basmati Rice 5kg", "B-5301", "14 Mar 27", "2,860", "Healthy"],
    ["SEL-4402", "Atta 10kg", "B-5310", "02 Feb 27", "1,120", "Healthy"],
  ],
  C01: [
    ["SEL-2214", "Amul Gold Milk 1L", "B-5488", "02 Sep 26", "118", "Low"],
    ["SEL-2280", "Curd 400g", "B-5501", "04 Sep 26", "480", "Healthy"],
  ],
  D01: [["SEL-5501", "Chicken Breast 500g", "B-5519", "29 Aug 26", "210", "Expiring"]],
  Q1: [["SEL-1010", "Banana Robusta 1kg", "B-5490", "—", "24", "Write-off"]],
};

export const BIN_DETAIL: Record<string, BinItem[]> = Object.fromEntries(
  Object.entries(BIN_DETAIL_ROWS).map(([rackId, rows]) => [
    rackId,
    rows.map(([sku, name, batch, expiry, qty, status]) => ({ sku, name, batch, expiry, qty, status })),
  ])
);
