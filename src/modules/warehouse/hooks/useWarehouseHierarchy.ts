import { useQuery } from "@tanstack/react-query";
import { fetchWarehouseZones } from "@/services/warehouse/hierarchyService";

export function useWarehouseZones() {
  return useQuery({ queryKey: ["warehouse-zones"], queryFn: fetchWarehouseZones, staleTime: 60_000 });
}
