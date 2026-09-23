import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { DsInventoryRow } from "@/types/darkstore";
import type { Tone } from "@/types/common";

function statusTone(s?: string): Tone {
  const v = (s ?? "").toLowerCase();
  if (v.includes("ok") || v.includes("good") || v.includes("normal")) return "green";
  if (v.includes("low") || v.includes("warn")) return "amber";
  if (v.includes("out") || v.includes("critical") || v.includes("zero")) return "red";
  return "green";
}

function extract(res: unknown): unknown[] {
  if (Array.isArray(res)) return res;
  const r = res as Record<string, unknown>;
  return (r["data"] ?? r["list"] ?? r["items"] ?? r["stockLevels"] ?? []) as unknown[];
}

export function useStoreInventory(storeId?: string) {
  return useQuery({
    queryKey: ["darkstore-store-inventory", storeId],
    queryFn: async (): Promise<DsInventoryRow[]> => {
      try {
        const res = await api.get<unknown>("/api/v1/darkstore/inventory/stock-levels");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return extract(res).map((item: any, i) => {
          const store = String(item["store"] ?? item["storeName"] ?? item["storeId"] ?? "All stores");
          return {
            id: String(item["_id"] ?? item["id"] ?? `si-${i}`),
            tab: store,
            sku: String(item["sku"] ?? item["skuCode"] ?? "—"),
            product: String(item["product"] ?? item["name"] ?? item["productName"] ?? "—"),
            store,
            available: String(item["available"] ?? item["availableQty"] ?? "0"),
            reserved: String(item["reserved"] ?? item["reservedQty"] ?? "0"),
            pickedToday: String(item["pickedToday"] ?? item["picked"] ?? "0"),
            source: String(item["source"] ?? item["warehouseCode"] ?? "—"),
            status: { label: item["status"] ?? "OK", tone: statusTone(item["status"]) },
          };
        });
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
  });
}
