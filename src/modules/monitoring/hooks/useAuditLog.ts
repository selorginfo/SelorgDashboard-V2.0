import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { AuditEvent } from "@/types/monitoring";

const TAB_MAP: Record<string, AuditEvent["tab"]> = {
  order: "Orders & refunds",
  refund: "Orders & refunds",
  payment: "Orders & refunds",
  delivery: "Orders & refunds",
  inventory: "Inventory",
  warehouse: "Inventory",
  stock: "Inventory",
  catalog: "Config",
  config: "Config",
  settings: "Config",
  user: "Access",
  role: "Access",
  access: "Access",
};

function inferTab(module?: string, event?: string): AuditEvent["tab"] {
  const key = (module ?? event ?? "").toLowerCase();
  for (const [k, v] of Object.entries(TAB_MAP)) {
    if (key.includes(k)) return v;
  }
  return "Config";
}

function extract(res: unknown): unknown[] {
  if (Array.isArray(res)) return res;
  const r = res as Record<string, unknown>;
  return (r["data"] ?? r["list"] ?? r["logs"] ?? r["events"] ?? []) as unknown[];
}

export function useAuditLog(tab?: string) {
  return useQuery({
    queryKey: ["audit-log", tab],
    queryFn: async (): Promise<AuditEvent[]> => {
      try {
        const res = await api.get<unknown>("/api/v1/admin/audit/logs");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return extract(res).map((e: any, i) => ({
          id: String(e["_id"] ?? e["id"] ?? `aud-${i}`),
          event: String(e["action"] ?? e["event"] ?? e["type"] ?? "Event"),
          user: String(e["user"] ?? e["adminUser"] ?? e["performedBy"] ?? "System"),
          module: String(e["module"] ?? e["resource"] ?? "—"),
          record: String(e["recordId"] ?? e["targetId"] ?? e["record"] ?? "—"),
          oldValue: String(e["oldValue"] ?? e["before"] ?? "—"),
          newValue: String(e["newValue"] ?? e["after"] ?? "—"),
          deviceIp: String(e["ip"] ?? e["deviceIp"] ?? "—"),
          time: e["createdAt"]
            ? new Date(String(e["createdAt"])).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
            : String(e["time"] ?? "—"),
          tab: inferTab(e["module"], e["action"]),
        }));
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
  });
}
