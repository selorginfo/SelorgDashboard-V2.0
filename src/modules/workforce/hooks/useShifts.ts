import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { shiftsService } from "@/services/workforce";

const KEY = ["workforce-shifts"];

export function useShiftTemplates() {
  return useQuery({ queryKey: KEY, queryFn: () => shiftsService.list() });
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof shiftsService.create>[0]) => shiftsService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useActivateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => shiftsService.activate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof shiftsService.update>[1] }) =>
      shiftsService.update(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDuplicateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => shiftsService.duplicate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => shiftsService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
