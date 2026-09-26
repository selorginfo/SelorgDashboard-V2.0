import { api } from "@/lib/apiClient";
import type { WorkforceEarning, WorkerKind } from "@/types/workforce";
import type { Badge } from "@/types/common";
import type { EarningsService } from "./earningsService";

function extractList(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  if (!res || typeof res !== "object") return [];
  const r = res as Record<string, unknown>;
  for (const k of ["data", "list", "items", "payouts", "withdrawals", "earnings", "requests", "rows", "payroll"]) {
    if (Array.isArray(r[k])) return r[k] as Record<string, unknown>[];
  }
  // Nested ResponseFormatter: { data: { rows|payroll|items } }
  if (r.data && typeof r.data === "object") {
    const d = r.data as Record<string, unknown>;
    for (const k of ["rows", "payroll", "items", "list", "withdrawals", "requests"]) {
      if (Array.isArray(d[k])) return d[k] as Record<string, unknown>[];
    }
  }
  return [];
}

function money(v: unknown): string {
  if (v == null || v === "") return "₹0";
  const s = String(v);
  if (s.includes("₹")) return s;
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return `₹${n.toLocaleString("en-IN")}`;
}

function statusBadge(raw: unknown): Badge {
  if (raw && typeof raw === "object" && "label" in (raw as object)) return raw as Badge;
  const s = String(raw ?? "pending").toLowerCase();
  if (s.includes("paid") || s.includes("settled") || s.includes("complete")) return { label: "Settled", tone: "green" };
  if (s.includes("approv")) return { label: "Approved", tone: "blue" };
  if (s.includes("hold") || s.includes("dispute")) return { label: "On hold", tone: "red" };
  if (s.includes("adjust")) return { label: "Pending", tone: "amber" };
  return { label: "Pending", tone: "amber" };
}

function tabFor(status: Badge): string {
  const l = status.label.toLowerCase();
  if (l.includes("pending")) return "Pending approval";
  if (l.includes("settled") || l.includes("paid")) return "Paid";
  if (l.includes("hold") || l.includes("dispute")) return "On hold";
  if (l.includes("adjust")) return "Adjustments";
  return "This week";
}

function mapEarning(raw: Record<string, unknown>, kind: WorkerKind, index: number): WorkforceEarning {
  const status = statusBadge(raw.status ?? raw.payoutStatus);
  const net = money(raw.net ?? raw.amount ?? raw.total ?? raw.finalSalary ?? raw.payoutAmount ?? 0);
  const base = money(raw.base ?? raw.baseAmount ?? raw.gross ?? raw.monthlySalary ?? 0);
  const incentive = money(raw.incentive ?? raw.bonus ?? raw.otEarnings ?? 0);
  const deduction = money(raw.deduction ?? raw.deductions ?? raw.leaveDeduction ?? 0);
  return {
    id: String(raw.id ?? raw._id ?? raw.pickerId ?? `earn-${index}`),
    kind,
    ref: String(raw.ref ?? raw.reference ?? raw.payoutId ?? raw.monthKey ?? raw.id ?? `PAY-${index}`),
    person: String(raw.person ?? raw.riderName ?? raw.pickerName ?? raw.name ?? raw.workerName ?? "—"),
    metrics:
      kind === "rider"
        ? [
            { label: "Deliveries", value: String(raw.deliveries ?? raw.orders ?? raw.count ?? "0") },
            { label: "Base", value: base },
            { label: "Incentive", value: incentive },
            { label: "Deduction", value: deduction },
          ]
        : [
            { label: "Orders", value: String(raw.orders ?? raw.picks ?? raw.paidDays ?? raw.count ?? "0") },
            { label: "Items", value: String(raw.items ?? raw.unpaidLeave ?? "—") },
            { label: "Base", value: base },
            { label: "Incentive", value: incentive },
          ],
    net,
    status,
    tab: String(raw.tab ?? tabFor(status)),
  };
}

export const realEarningsService: EarningsService = {
  async list(kind: WorkerKind): Promise<WorkforceEarning[]> {
    if (kind === "rider") {
      const res = await api.get<unknown>("/api/v1/admin/finance/rider-cash/payouts");
      return extractList(res).map((row, i) => mapEarning(row, kind, i));
    }
    // Prefer real monthly salary/payroll ledger for picker KPIs (not empty withdrawals)
    const payroll = await api.get<unknown>("/api/v1/admin/picker/payroll").catch(() => null);
    const fromPayroll = extractList(payroll);
    if (fromPayroll.length > 0) return fromPayroll.map((row, i) => mapEarning(row, kind, i));

    const salary = await api.get<unknown>("/api/v1/admin/picker/salary").catch(() => null);
    const fromSalary = extractList(salary);
    if (fromSalary.length > 0) return fromSalary.map((row, i) => mapEarning(row, kind, i));

    // Prefer real picker withdrawals collection; finance path also bridged
    const primary = await api.get<unknown>("/api/v1/admin/picker/withdrawals").catch(() => null);
    const fromPrimary = extractList(primary);
    if (fromPrimary.length > 0) return fromPrimary.map((row, i) => mapEarning(row, kind, i));
    const fallback = await api.get<unknown>("/api/v1/admin/finance/picker-withdrawals");
    return extractList(fallback).map((row, i) => mapEarning(row, kind, i));
  },

  async approve(kind: WorkerKind, id: string): Promise<WorkforceEarning> {
    if (kind === "picker" || kind === "rider") {
      const res = await api
        .patch<Record<string, unknown>>(`/api/v1/admin/finance/picker-withdrawals/${id}`, {
          action: "approve",
        })
        .catch(async () =>
          api.post<Record<string, unknown>>(`/api/v1/admin/picker/withdrawals/${id}/process`, {
            action: "APPROVED",
          }),
        );
      return mapEarning(res && typeof res === "object" ? res : { id, status: "approved" }, kind, 0);
    }
    const res = await api.post<Record<string, unknown>>(`/api/v1/admin/finance/approvals/${id}/decision`, {
      decision: "approve",
    });
    return mapEarning(res && typeof res === "object" ? res : { id, status: "approved" }, kind, 0);
  },
};
