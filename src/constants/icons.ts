import type { ModuleId } from "@/constants/nav";

/**
 * Outline icon set transcribed verbatim from the approved design's `ICONS` map
 * (design-reference/Selorg Admin Dashboard.dc.html:4526-4594) — one entry per module id, plus a
 * handful of generic icons (rupee/alert/target/clock/people/etc.) used by `kpiIconFor` below and
 * by the topbar. Each value is an array of SVG `<path d="...">` strings for a 24x24 viewBox,
 * matching the design's stroke-only style exactly (see Icon.tsx).
 */
export const ICONS: Record<string, string[]> = {
  dashboard: ["M4 13h6V4H4v9Z", "M14 20h6v-9h-6v9Z", "M4 20h6v-4H4v4Z", "M14 8h6V4h-6v4Z"],
  orders: ["M6 3h9l4 4v14H6z", "M9 8h5", "M9 12h7", "M9 16h7"],
  exceptions: ["M12 4 3 20h18L12 4Z", "M12 10v4", "M12 17h.01"],
  returns: ["M9 4 4 9l5 5", "M4 9h10a6 6 0 0 1 0 12h-4"],
  wh: ["M3 10 12 4l9 6v10H3z", "M8 20v-6h8v6"],
  "wh-inv": ["M4 7h16v13H4z", "M4 7 8 3h8l4 4", "M10 12h4"],
  inbound: ["M12 3v10", "M8 9l4 4 4-4", "M4 17h16v4H4z"],
  putaway: ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"],
  transfers: ["M4 8h13l-3-3", "M20 16H7l3 3"],
  stores: ["M3 9h18l-2-5H5L3 9Z", "M4 9v11h16V9", "M9 20v-6h6v6"],
  "store-inv": ["M5 6h14v14H5z", "M9 6V3h6v3", "M9 12h6", "M9 16h4"],
  picking: ["M6 7h12l-1 13H7L6 7Z", "M9 7V5a3 3 0 0 1 6 0v2", "M10 12l2 2 4-4"],
  bags: ["M6 8h12l-1.2 12H7.2L6 8Z", "M9 8V6a3 3 0 0 1 6 0v2", "M9.5 13l1.8 1.8 3.2-3.4"],
  racks: ["M3 5h18v5H3z", "M3 14h18v5H3z", "M7 5v5", "M7 14v5", "M17 5v5", "M17 14v5"],
  "scan-history": ["M4 6V4h3", "M20 6V4h-3", "M4 18v2h3", "M20 18v2h-3", "M8 8v8", "M11 8v8", "M14 8v8", "M17 8v8"],
  scanner: ["M4 6V4h4", "M20 6V4h-4", "M4 18v2h4", "M20 18v2h-4", "M8 8v8", "M11 8v8", "M14 8v8", "M17 8v8"],
  catalog: ["M4 5h16v14H4z", "M4 9h16", "M9 9v10"],
  promotions: ["M4 11 13 2v7h7l-9 13v-8H4Z"],
  categories: ["M4 5h6v6H4z", "M14 5h6v6h-6z", "M4 15h6v4H4z", "M14 15h6v4h-6z"],
  "rider-approvals": ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M8.5 12.2l2.4 2.4 4.6-5"],
  "picker-approvals": ["M7 4h10v16H7z", "M10 2h4v4h-4z", "M9.5 12l1.8 1.8 3.4-3.6"],
  "rider-dir": ["M6 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M18 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M9 15h6l-2-7h-3"],
  "picker-dir": ["M6 7h12l-1 13H7L6 7Z", "M9 7V5a3 3 0 0 1 6 0v2"],
  "rider-earn": ["M3 7h18v11H3z", "M3 11h18", "M7 15h4"],
  "picker-earn": ["M4 6h16v13H4z", "M8 3v4", "M16 3v4", "M9 13h6"],
  "earn-rules": ["M6 3h9l4 4v14H6z", "M9 11h6", "M9 15h4", "M9 7h3"],
  payouts: ["M3 7h18v11H3z", "M3 11h18", "M7 15h4", "M16 15h2"],
  shifts: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 7v5l3 2"],
  roster: ["M4 6h16v14H4z", "M4 10h16", "M8 3v4", "M16 3v4", "M8 14h3", "M13 17h3"],
  "rider-support": ["M12 3a8 8 0 0 0-8 8v5a3 3 0 0 0 3 3h2v-6H6", "M20 16v-5a8 8 0 0 0-8-8"],
  "picker-support": ["M4 5h16v11H4z", "M8 20h8", "M9 9h6", "M9 12h4"],
  cms: ["M4 5h16v11H4z", "M4 9h16", "M7 12h6", "M8 19h8"],
  "cms-home": ["M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z", "M9 7h6", "M9 11h6", "M11 18h2"],
  "cms-media": ["M4 5h16v14H4z", "M4 15l4-4 3 3 3-4 6 6", "M9 9a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z"],
  "cms-cal": ["M4 6h16v14H4z", "M4 10h16", "M8 3v4", "M16 3v4", "M9 14h2", "M14 14h2"],
  vendors: ["M4 8l8-4 8 4v10l-8 4-8-4V8Z", "M4 8l8 4 8-4", "M12 12v8"],
  riders: ["M6 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M18 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M9 15h6l-2-7h-3", "M13 8l2-3h3"],
  zones: ["M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z", "M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"],
  customers: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M4 21c0-4 3.6-6 8-6s8 2 8 6"],
  payments: ["M3 7h18v11H3z", "M3 11h18", "M7 15h4"],
  support: ["M12 3a8 8 0 0 0-8 8v5a3 3 0 0 0 3 3h2v-6H6", "M20 16v-5a8 8 0 0 0-8-8", "M20 16a3 3 0 0 1-3 3h-2v-6h5"],
  reports: ["M4 20h16", "M7 20V10", "M12 20V4", "M17 20v-8"],
  "rpt-overall": ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 12V3", "M12 12l7 4"],
  "rpt-sales": ["M4 17l5-5 4 3 6-7", "M14 8h5v5"],
  "rpt-ops": ["M4 18a8 8 0 0 1 16 0", "M4 18h16", "M12 18l4.5-5"],
  "rpt-people": ["M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z", "M2 20c0-3.4 3.1-5 7-5s7 1.6 7 5", "M17 11a3 3 0 1 0 0-6"],
  "rpt-customer": ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M4 21c0-4 3.6-6 8-6s8 2 8 6"],
  notifications: ["M12 4a5 5 0 0 0-5 5v4l-2 3h14l-2-3V9a5 5 0 0 0-5-5Z", "M10 19a2 2 0 0 0 4 0"],
  users: ["M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z", "M2 20c0-3.4 3.1-5 7-5s7 1.6 7 5", "M17 8h5", "M19.5 5.5v5"],
  roles: ["M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z", "M9.5 12l1.8 1.8 3.4-3.6"],
  audit: ["M6 3h9l4 4v14H6z", "M9 12h6", "M9 16h6", "M9 8h3"],
  settings: [
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    "M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 11.5 4a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 19.4 11a2 2 0 1 1 0 4Z",
  ],
  integrations: ["M9 7V5a3 3 0 0 1 6 0v2", "M5 7h14v4a7 7 0 0 1-14 0V7Z", "M12 18v3"],
  search: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z", "M20 20l-4-4"],
  bell: ["M12 4a5 5 0 0 0-5 5v4l-2 3h14l-2-3V9a5 5 0 0 0-5-5Z", "M10 19a2 2 0 0 0 4 0"],
  sun: [
    "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
    "M12 2v2",
    "M12 20v2",
    "M2 12h2",
    "M20 12h2",
    "M5 5l1.5 1.5",
    "M17.5 17.5 19 19",
    "M19 5l-1.5 1.5",
    "M6.5 17.5 5 19",
  ],
  moon: ["M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"],
  doc: ["M7 3h7l4 4v14H7z", "M10 12h6", "M10 16h6"],
  clock: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 7v5l3 2"],
  rupee: ["M7 5h10", "M7 9h10", "M15 5c0 5-4 4-8 4l8 10"],
  truck: ["M3 7h11v9H3z", "M14 11h4l3 3v2h-7", "M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z", "M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"],
  target: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"],
  box: ["M4 8l8-4 8 4-8 4-8-4Z", "M4 8v8l8 4 8-4V8", "M12 12v8"],
  alert: ["M12 4 3 20h18L12 4Z", "M12 10v4", "M12 17h.01"],
  people: ["M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z", "M2 20c0-3.4 3.1-5 7-5s7 1.6 7 5", "M17 11a3 3 0 1 0 0-6"],
  pie: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 12V3", "M12 12l7 4"],
  trend: ["M4 17l5-5 4 3 6-7", "M14 8h5v5"],
};

/**
 * Picks a KPI card's icon by matching its label text against the same keyword rules as the
 * approved design's `kpiIcon(label, r)` (dc.html:7698-7715) — falls back to the route's own
 * module icon, then to a generic pie-chart icon. Deliberately label-driven (not per-stat config)
 * so every existing `KpiStrip` call site gets icons without changing its data.
 */
export function kpiIconFor(label: string, moduleId?: ModuleId | string): string[] {
  const l = label.toLowerCase();
  if (/revenue|₹|margin|value|refund|discount|order value|settle/.test(l)) return ICONS.rupee as string[];
  if (/exception|failed|failure|breach|missing|damaged|out of stock|error/.test(l)) return ICONS.alert as string[];
  if (/sla|on-time|target|accuracy|success|rate|utilisation|fill/.test(l)) return ICONS.target as string[];
  if (/min|time|shift|lead|response|resolution/.test(l)) return ICONS.clock as string[];
  if (/customer|staff|picker|packer|user|rider|people|workforce/.test(l)) return ICONS.people as string[];
  if (/bag/.test(l)) return ICONS.bags as string[];
  if (/rack|bin|slot|location/.test(l)) return ICONS.racks as string[];
  if (/scan|device|barcode/.test(l)) return ICONS["scan-history"] as string[];
  if (/transfer|transit|dispatch|deliver/.test(l)) return ICONS.truck as string[];
  if (/order/.test(l)) return ICONS.orders as string[];
  if (/stock|sku|units|inventory|product|catalog/.test(l)) return ICONS.box as string[];
  if (/store|warehouse|zone/.test(l)) return ICONS.stores as string[];
  if (/repeat|new|growth|trend|lift|turnover/.test(l)) return ICONS.trend as string[];
  if (/role|module|permission|2fa/.test(l)) return ICONS.roles as string[];
  return (moduleId && ICONS[moduleId]) || (ICONS.pie as string[]);
}
