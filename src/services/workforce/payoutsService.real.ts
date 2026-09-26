import { api } from "@/lib/apiClient";
import type { PayoutRun } from "@/types/workforce";
import type { Badge } from "@/types/common";
import type { PayoutsService } from "./payoutsService";

function extractList(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  if (!res || typeof res !== "object") return [];
  const r = res as Record<string, unknown>;
  for (const k of ["data", "list", "items", "payments", "payouts"]) {
    if (Array.isArray(r[k])) return r[k] as Record<string, unknown>[];
  }
  return [];
}

function statusBadge(raw: unknown): Badge {
  const s = String(raw ?? "pending").toLowerCase();
  if (s.includes("paid") || s.includes("settled") || s.includes("complete")) return { label: "Paid", tone: "green" };
  if (s.includes("approv")) return { label: "Approved", tone: "blue" };
  if (s.includes("hold") || s.includes("reject")) return { label: "On hold", tone: "red" };
  return { label: "Pending Finance", tone: "amber" };
}

function mapRun(raw: Record<string, unknown>, index: number): PayoutRun {
  const amount = raw.amount ?? raw.net ?? raw.total ?? 0;
  const money = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? `₹${n.toLocaleString("en-IN")}` : String(v ?? "₹0");
  };
  const status = statusBadge(raw.status ?? raw.payoutStatus);
  return {
    id: String(raw.id ?? raw._id ?? `payout-${index}`),
    run: String(raw.run ?? raw.ref ?? raw.payoutId ?? `PAY-${index + 1}`),
    cycle: String(raw.cycle ?? raw.week ?? raw.period ?? "This week"),
    workforce: String(raw.workforce ?? raw.kind ?? "Riders"),
    people: String(raw.people ?? raw.workers ?? raw.riders ?? raw.person ?? raw.riderName ?? "1"),
    gross: money(raw.gross ?? amount),
    deductions: money(raw.deductions ?? raw.deduction ?? 0),
    net: money(raw.net ?? amount),
    status,
    tab: status.label.includes("Pending") ? "Pending Finance" : status.label.includes("Paid") ? "Paid" : "This week",
  };
}

export const realPayoutsService: PayoutsService = {
  async list(): Promise<PayoutRun[]> {
    const res = await api.get<unknown>("/api/v1/admin/finance/rider-cash/payouts");
    const items = extractList(res);
    if (items.length > 0) return items.map(mapRun);
    const vendor = await api
      .get<{ list?: PayoutRun[]; payments?: PayoutRun[] } | PayoutRun[]>(
        "/api/v1/admin/finance/vendor-payments/payments",
      )
      .catch(() => []);
    if (Array.isArray(vendor)) return vendor;
    const r = vendor as { list?: PayoutRun[]; payments?: PayoutRun[] };
    return r.list ?? r.payments ?? [];
  },

  async approveRun(id: string): Promise<PayoutRun> {
    const patched = await api
      .patch<Record<string, unknown>>(`/api/v1/admin/finance/picker-withdrawals/${id}`, {
        action: "approve",
      })
      .catch(() => null);
    if (patched && typeof patched === "object") return mapRun(patched, 0);
    return api.post<PayoutRun>(`/api/v1/admin/finance/vendor-payments/payments/${id}/advance`);
  },
};
