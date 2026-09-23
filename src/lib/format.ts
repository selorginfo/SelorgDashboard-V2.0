/** Display helpers shared by the record modules (Bulk Orders, Delivery, Container Stalls). */

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Local calendar day as YYYY-MM-DD — comparable with `<input type="date">` values. */
export function localDay(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-CA");
}

export function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

/** Compact rupee value for KPI tiles — ₹18.4L, ₹2.1Cr, ₹84K. */
export function formatInrCompact(amount: number): string {
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(1)}Cr`;
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(1)}L`;
  if (amount >= 1e3) return `₹${(amount / 1e3).toFixed(1)}K`;
  return formatInr(amount);
}
