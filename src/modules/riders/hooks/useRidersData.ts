import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ridersService } from "@/services/riders";

export function useRidersLive() {
  return useQuery({ queryKey: ["riders-live"], queryFn: () => ridersService.listLive(), staleTime: 30_000 });
}

export function useRidersDirectory() {
  return useQuery({ queryKey: ["riders-directory"], queryFn: () => ridersService.listDirectory(), staleTime: 60_000 });
}

export function useRidersStats() {
  return useQuery({ queryKey: ["riders-stats"], queryFn: () => ridersService.getStats(), staleTime: 30_000 });
}

export function useRiderPerformance() {
  return useQuery({
    queryKey: ["riders-performance"],
    queryFn: () => ridersService.listPerformance(),
    staleTime: 60_000,
  });
}

export function useRiderEarningsTab() {
  return useQuery({
    queryKey: ["riders-earnings-tab"],
    queryFn: () => ridersService.listEarnings(),
    staleTime: 60_000,
  });
}

export function useRiderIncidentsTab() {
  return useQuery({
    queryKey: ["riders-incidents-tab"],
    queryFn: () => ridersService.listIncidents(),
    staleTime: 30_000,
  });
}

export function useAssignRiderOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, riderId }: { orderId: string; riderId: string }) =>
      ridersService.assignOrder(orderId, riderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["riders-live"] });
      queryClient.invalidateQueries({ queryKey: ["riders-stats"] });
    },
  });
}

export function useUpdateRiderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ riderId, status }: { riderId: string; status: string }) =>
      ridersService.updateRiderStatus(riderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["riders-live"] });
      queryClient.invalidateQueries({ queryKey: ["riders-stats"] });
      queryClient.invalidateQueries({ queryKey: ["riders-directory"] });
    },
  });
}

export function useRaiseRiderIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { riderId: string; title: string; detail?: string }) =>
      ridersService.raiseIncident(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["riders-live"] });
      queryClient.invalidateQueries({ queryKey: ["riders-incidents-tab"] });
    },
  });
}
