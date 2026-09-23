import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { integrationService } from "@/services/integrations";

const KEY = ["integrations"];

export function useIntegrations() {
  return useQuery({ queryKey: KEY, queryFn: () => integrationService.list() });
}

export function useTestConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (system: string) => integrationService.testConnection(system),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
