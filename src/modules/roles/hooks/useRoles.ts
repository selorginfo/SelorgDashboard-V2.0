import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { permissionsService, rolesService } from "@/services/roles";
import type { CreateRoleInput } from "@/services/roles/rolesService";

export function useRolesList() {
  return useQuery({ queryKey: ["roles-list"], queryFn: () => rolesService.listRoles(), staleTime: 60_000 });
}

export function useRolesKpis() {
  return useQuery({ queryKey: ["roles-kpis"], queryFn: () => rolesService.getKpis(), staleTime: 60_000 });
}

/** The backend permission catalog the Roles matrix is rendered from. */
export function usePermissionsMatrix() {
  return useQuery({
    queryKey: ["permissions-matrix"],
    queryFn: () => permissionsService.getMatrix(),
    staleTime: 5 * 60_000,
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoleInput) => rolesService.createRole(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["roles-list"] });
      void qc.invalidateQueries({ queryKey: ["roles-kpis"] });
    },
  });
}

export function useUpdateRoleMatrix() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      rolesService.updateRoleMatrix(id, permissions),
    onSuccess: () => {
      // The role list carries the granted permissions the grid renders, so it must refetch.
      void qc.invalidateQueries({ queryKey: ["roles-list"] });
      void qc.invalidateQueries({ queryKey: ["roles-kpis"] });
    },
  });
}
