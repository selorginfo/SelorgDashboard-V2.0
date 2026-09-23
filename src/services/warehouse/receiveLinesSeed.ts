import type { ReceiveLine } from "@/types/warehouse";

/** Line-item detail per GRN — columns: [sku, name, batch, expected, received, accepted, rejected]
 * (dc.html:4768-4801). Static/read-only reference data used by the `inbound` receiving detail
 * panel; the GRN header rows themselves (status, supplier) live in the mock-backed grnService. */
const RECEIVE_LINES_ROWS: Record<string, [string, string, string, number, number, number, number][]> = {
  "GRN-8841": [
    ["SEL-2214", "Amul Gold Milk 1L", "B-5488", 240, 228, 228, 0],
    ["SEL-2280", "Curd 400g", "B-5501", 120, 120, 120, 0],
  ],
  "GRN-8842": [["SEL-4419", "Cold Pressed Oil 1L", "B-5288", 300, 300, 288, 12]],
  "GRN-8843": [["SEL-2280", "Curd 400g", "B-5501", 480, 480, 480, 0]],
  "GRN-8844": [["SEL-1043", "Baby Spinach 250g", "B-5522", 180, 0, 0, 0]],
};

export const RECEIVE_LINES: Record<string, ReceiveLine[]> = Object.fromEntries(
  Object.entries(RECEIVE_LINES_ROWS).map(([ref, rows]) => [
    ref,
    rows.map(([sku, name, batch, expected, received, accepted, rejected]) => ({
      sku,
      name,
      batch,
      expected,
      received,
      accepted,
      rejected,
    })),
  ])
);
