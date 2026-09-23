import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bagsService } from "@/services/darkstore";

export function useBags(date?: string) {
  return useQuery({
    queryKey: ["darkstore-bags", date ?? "today"],
    queryFn: () => bagsService.list(date),
  });
}

export function useMarkRacked() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rack }: { id: string; rack: string }) => bagsService.markRacked(id, rack),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["darkstore-bags"] }),
  });
}
