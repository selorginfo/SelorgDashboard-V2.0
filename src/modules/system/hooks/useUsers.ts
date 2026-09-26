import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersService } from "@/services/system";
import type { AdminUserInput, UserUpdateInput } from "@/services/system/usersService";

const KEY = ["system-users"];

export function useSystemUsers() {
  return useQuery({ queryKey: KEY, queryFn: () => usersService.list() });
}

export function useSetUserActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => usersService.setActive(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminUserInput) => usersService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSendUserOtp() {
  return useMutation({
    mutationFn: (email: string) => usersService.sendOtp(email),
  });
}

export function useVerifyUserOtp() {
  return useMutation({
    mutationFn: ({ email, otp, verificationRequestId }: { email: string; otp: string; verificationRequestId: string }) =>
      usersService.verifyOtp(email, otp, verificationRequestId),
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ id, sendEmail }: { id: string; sendEmail?: boolean }) =>
      usersService.resetPassword(id, sendEmail),
  });
}

export function useAssignUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      roleId,
      assignedStores,
      primaryStoreId,
    }: {
      id: string;
      roleId: string;
      assignedStores?: string[];
      primaryStoreId?: string;
    }) => usersService.assignRole(id, roleId, { assignedStores, primaryStoreId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UserUpdateInput }) => usersService.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
