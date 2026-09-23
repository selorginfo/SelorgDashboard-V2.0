import { api } from "@/lib/apiClient";
import type { EarningRule } from "@/types/earningRule";
import type { Badge } from "@/types/common";
import type { EarningRuleService, EarningRuleAction } from "./earningRuleService";

function extractList(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  if (!res || typeof res !== "object") return [];
  const r = res as Record<string, unknown>;
  for (const k of ["data", "list", "items", "rules", "slabs", "commissionSlabs"]) {
    if (Array.isArray(r[k])) return r[k] as Record<string, unknown>[];
  }
  return [];
}

function statusBadge(raw: unknown): Badge {
  if (raw && typeof raw === "object" && "label" in (raw as object)) return raw as Badge;
  const s = String(raw ?? "active").toLowerCase();
  if (s.includes("pending")) return { label: "Pending approval", tone: "amber" };
  if (s.includes("sched") || s.includes("start")) return { label: "Starts later", tone: "blue" };
  if (s.includes("expir") || s.includes("inactive")) return { label: "Expired", tone: "grey" };
  return { label: "Active", tone: "green" };
}

function mapRule(raw: Record<string, unknown>, index: number): EarningRule {
  const appliesRaw = String(raw.appliesTo ?? raw.workforce ?? raw.role ?? raw.type ?? "Rider").toLowerCase();
  return {
    id: String(raw.id ?? raw._id ?? raw.slabId ?? `RULE-${index + 1}`),
    name: String(raw.name ?? raw.title ?? raw.slabName ?? `Rule ${index + 1}`),
    appliesTo: appliesRaw.includes("picker") ? "Picker" : "Rider",
    component: String(raw.component ?? raw.metric ?? raw.basis ?? "Base"),
    condition: String(raw.condition ?? raw.criteria ?? "Always"),
    amount: String(raw.amount ?? raw.rate ?? raw.value ?? "₹0"),
    scope: String(raw.scope ?? raw.city ?? raw.zone ?? "All"),
    version: String(raw.version ?? raw.ver ?? `v${index + 1}`),
    status: statusBadge(raw.status),
    conflictWith: raw.conflictWith ? String(raw.conflictWith) : undefined,
  };
}

export const realEarningRuleService: EarningRuleService = {
  async list(): Promise<EarningRule[]> {
    const res = await api.get<unknown>("/api/v1/admin/finance/config/commission-slabs");
    return extractList(res).map(mapRule);
  },

  async applyAction(id: string, action: EarningRuleAction): Promise<EarningRule> {
    const res = await api.post<Record<string, unknown>>(`/api/v1/admin/finance/approvals/${id}/decision`, { action });
    return mapRule(res && typeof res === "object" ? res : { id, status: "active" }, 0);
  },
};
