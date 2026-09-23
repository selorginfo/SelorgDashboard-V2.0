import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsService } from "@/services/system";

const KEY = ["system-settings"];

export function useSettings() {
  return useQuery({ queryKey: KEY, queryFn: () => settingsService.list() });
}

export function useUpdateSettingValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) => settingsService.updateValue(id, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
