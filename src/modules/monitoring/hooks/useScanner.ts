import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { ScannerDevice, ScannerFeedEvent } from "@/types/monitoring";
import type { Tone } from "@/types/common";

function deviceTone(s?: string): Tone {
  const v = (s ?? "").toLowerCase();
  if (v.includes("online") || v.includes("active")) return "green";
  if (v.includes("warn") || v.includes("idle")) return "amber";
  if (v.includes("offline") || v.includes("inactive")) return "red";
  return "grey";
}

function feedTone(s?: string): Tone {
  const v = (s ?? "").toLowerCase();
  if (v.includes("ok") || v.includes("success")) return "green";
  if (v.includes("warn") || v.includes("mismatch")) return "amber";
  if (v.includes("fail") || v.includes("error")) return "red";
  return "grey";
}

function extract(res: unknown): unknown[] {
  if (Array.isArray(res)) return res;
  const r = res as Record<string, unknown>;
  return (r["data"] ?? r["list"] ?? r["devices"] ?? r["fleet"] ?? r["logs"] ?? []) as unknown[];
}

export function useScannerDevices() {
  return useQuery({
    queryKey: ["scanner-devices"],
    queryFn: async (): Promise<ScannerDevice[]> => {
      try {
        const res = await api.get<unknown>("/api/v1/darkstore/hsd/fleet");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return extract(res).map((d: any, i) => {
          const status = String(d["status"] ?? d["connectionStatus"] ?? "Online");
          return {
            id: String(d["deviceId"] ?? d["_id"] ?? d["id"] ?? `HSD-${i + 1}`),
            store: String(d["store"] ?? d["darkStore"] ?? d["assignedStore"] ?? "—"),
            operator: String(d["operator"] ?? d["assignedPicker"] ?? d["user"] ?? "—"),
            lastActivity: String(d["lastActivity"] ?? d["lastSeen"] ?? "—"),
            network: String(d["network"] ?? d["wifiSsid"] ?? d["connection"] ?? "—"),
            lastSync: d["lastSync"] ?? d["lastSyncAt"]
              ? new Date(String(d["lastSync"] ?? d["lastSyncAt"])).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
              : "—",
            scansToday: String(d["scansToday"] ?? d["scanCount"] ?? "0"),
            status: { label: status, tone: deviceTone(status) },
          };
        });
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
  });
}

export function useScannerFeed() {
  return useQuery({
    queryKey: ["scanner-feed"],
    queryFn: async (): Promise<ScannerFeedEvent[]> => {
      try {
        const res = await api.get<unknown>("/api/v1/darkstore/hsd/logs");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return extract(res).map((e: any, i) => {
          const status = String(e["status"] ?? e["result"] ?? "OK");
          const tab: ScannerFeedEvent["tab"] =
            e["tab"] === "Exceptions" ? "Exceptions"
            : e["tab"] === "Audit" ? "Audit"
            : "Scan activity";
          return {
            id: String(e["_id"] ?? e["id"] ?? `feed-${i}`),
            time: e["createdAt"]
              ? new Date(String(e["createdAt"])).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
              : String(e["time"] ?? "—"),
            store: String(e["store"] ?? e["darkStore"] ?? "—"),
            operator: String(e["operator"] ?? e["picker"] ?? e["user"] ?? "—"),
            action: String(e["action"] ?? e["event"] ?? e["type"] ?? "Scan"),
            reference: String(e["reference"] ?? e["barcode"] ?? e["orderId"] ?? "—"),
            device: String(e["device"] ?? e["deviceId"] ?? "—"),
            status: { label: status, tone: feedTone(status) },
            tab,
          };
        });
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
  });
}
