import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { opsService, type ApplyActionInput, type SaveRecordInput } from "@/services/ops";
import { useSessionStore } from "@/store/sessionStore";
import type { AdminUser } from "@/types/auth";

const key = (route: string) => ["ops-route", route];

export function useOpsRoute(route: string) {
  return useQuery({ queryKey: key(route), queryFn: () => opsService.getRoute(route) });
}

export function useOpsKpis(route: string) {
  return useQuery({
    queryKey: ["ops-kpis", route],
    queryFn: () => opsService.getKpis(route),
    staleTime: 15_000,
  });
}

export function useOpsActor() {
  const user = useSessionStore((s: { user: AdminUser | null }) => s.user);
  return user ? `${user.name} · ${user.role}` : "Admin";
}

/** Every mutation returns the route's new state, which replaces the cached copy directly. */
function useOpsMutation<T>(route: string, fn: (input: T) => ReturnType<typeof opsService.getRoute>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (state) => {
      queryClient.setQueryData(key(route), state);
      queryClient.invalidateQueries({ queryKey: ["ops-kpis", route] });
    },
  });
}

export function useApplyOpsAction(route: string) {
  return useOpsMutation(route, (input: Omit<ApplyActionInput, "route">) => opsService.applyAction({ ...input, route }));
}

export function useSaveOpsRecord(route: string) {
  return useOpsMutation(route, (input: Omit<SaveRecordInput, "route">) => opsService.saveRecord({ ...input, route }));
}

export function useDeleteOpsRecord(route: string) {
  return useOpsMutation(route, (id: string) => opsService.deleteRecord(route, id));
}

export function useAdvanceOpsStage(route: string) {
  return useOpsMutation(route, ({ id, by }: { id: string; by: string }) => opsService.advanceStage(route, id, by));
}
