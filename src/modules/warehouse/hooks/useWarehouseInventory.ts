import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { WhInventoryRow } from "@/types/warehouse";
import type { Tone } from "@/types/common";

interface RawWhInvItem {
  _id?: string;
  id?: string;
  quantity?: number;
  reservedQty?: number;
  isAvailable?: boolean;
  lowStockThreshold?: number;
  warehouseId?: string;
  product?: {
    _id?: string;
    name?: string;
    sku?: string;
    price?: number;
    mrp?: number;
    imageUrl?: string;
    status?: string;
  } | null;
  warehouse?: { name?: string; code?: string } | null;
}

function stockTone(qty: number, threshold: number, isAvailable: boolean): Tone {
  if (!isAvailable || qty === 0) return "red";
  if (qty <= threshold) return "amber";
  return "green";
}

function stockLabel(qty: number, threshold: number, isAvailable: boolean): string {
  if (!isAvailable) return "Unavailable";
  if (qty === 0) return "Out of stock";
  if (qty <= threshold) return "Low stock";
  return "In stock";
}

function inferTab(qty: number, threshold: number, isAvailable: boolean): string {
  if (!isAvailable || qty === 0) return "Out of stock";
  if (qty <= threshold) return "Low stock";
  return "All SKUs";
}

export function useWarehouseInventory() {
  return useQuery({
    queryKey: ["warehouse-inventory"],
    queryFn: async (): Promise<WhInventoryRow[]> => {
      try {
        const res = await api.get<{ items?: RawWhInvItem[]; data?: RawWhInvItem[] } | RawWhInvItem[]>(
          "/api/v1/admin/store-warehouse/warehouse-inventory?limit=200",
        );
        const rawItems: RawWhInvItem[] = Array.isArray(res)
          ? res
          : ((res as { items?: RawWhInvItem[] }).items ?? (res as { data?: RawWhInvItem[] }).data ?? []);

        return rawItems.map((item, i) => {
          const qty = item.quantity ?? 0;
          const reserved = item.reservedQty ?? 0;
          const threshold = item.lowStockThreshold ?? 5;
          const available = item.isAvailable !== false;
          const p = item.product;
          return {
            id: String(item._id ?? item.id ?? `wh-${i}`),
            tab: inferTab(qty, threshold, available),
            sku: String(p?.sku ?? "—"),
            product: String(p?.name ?? "Unknown"),
            batch: "—",
            expiry: "—",
            available: String(qty),
            reserved: String(reserved),
            location: item.warehouse?.name ?? item.warehouse?.code ?? "—",
            status: {
              label: stockLabel(qty, threshold, available),
              tone: stockTone(qty, threshold, available),
            },
          };
        });
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });
}
