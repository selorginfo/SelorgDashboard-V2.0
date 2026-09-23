import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pickingService } from "@/services/darkstore";

export function usePickingOrders(date?: string) {
  return useQuery({
    queryKey: ["darkstore-picking-orders", date ?? "today"],
    queryFn: () => pickingService.list(date),
  });
}

export function useReassignPicker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, picker }: { id: string; picker: string }) => pickingService.reassignPicker(id, picker),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["darkstore-picking-orders"] }),
  });
}
