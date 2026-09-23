import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { ScanHistoryEvent } from "@/types/monitoring";
import type { Tone } from "@/types/common";

function statusTone(s?: string): Tone {
  const v = (s ?? "").toLowerCase();
  if (v.includes("fail") || v.includes("error") || v.includes("reject")) return "red";
  if (v.includes("warn") || v.includes("mismatch")) return "amber";
  return "green";
}

function inferEntity(type?: string, ref?: string): ScanHistoryEvent["entity"] {
  const v = (type ?? ref ?? "").toLowerCase();
  if (v.includes("bag")) return "Bag";
  if (v.includes("rack") || v.includes("shelf")) return "Rack";
  return "Product";
}

function extract(res: unknown): unknown[] {
  if (Array.isArray(res)) return res;
  const r = res as Record<string, unknown>;
  return (r["data"] ?? r["list"] ?? r["logs"] ?? r["events"] ?? []) as unknown[];
}

export function useScanHistory() {
  return useQuery({
    queryKey: ["scan-history"],
    queryFn: async (): Promise<ScanHistoryEvent[]> => {
      try {
        const res = await api.get<unknown>("/api/v1/darkstore/utilities/audit-logs");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return extract(res).map((e: any, i) => {
          const statusLabel = String(e["status"] ?? e["result"] ?? "OK");
          return {
            id: String(e["_id"] ?? e["id"] ?? `sc-${i}`),
            time: e["createdAt"]
              ? new Date(String(e["createdAt"])).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
              : String(e["time"] ?? "—"),
            barcode: String(e["barcode"] ?? e["code"] ?? "—"),
            entity: inferEntity(e["entityType"], e["reference"]),
            reference: String(e["reference"] ?? e["refId"] ?? "—"),
            order: String(e["orderId"] ?? e["order"] ?? "—"),
            picker: String(e["picker"] ?? e["user"] ?? "—"),
            device: String(e["device"] ?? e["deviceId"] ?? "—"),
            status: { label: statusLabel, tone: statusTone(statusLabel) },
          };
        });
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
  });
}
