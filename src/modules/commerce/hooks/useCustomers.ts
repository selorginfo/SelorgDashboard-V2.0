import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customerService } from "@/services/commerce";
import type { Badge } from "@/types/common";
import type { NewCustomerInput } from "@/services/commerce/customerService";

const KEY = ["commerce-customers"];

export function useCustomers() {
  return useQuery({ queryKey: KEY, queryFn: () => customerService.list() });
}

export function useCreditWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => customerService.creditWallet(id, amount),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSetCustomerStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Badge }) => customerService.setStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewCustomerInput) => customerService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCustomerOrders(customerId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, customerId, "orders"],
    queryFn: () => customerService.getOrders(customerId!),
    enabled: Boolean(customerId),
  });
}

export function useCustomerRefunds(customerId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, customerId, "refunds"],
    queryFn: () => customerService.getRefunds(customerId!),
    enabled: Boolean(customerId),
  });
}

export function useCustomerWallet(customerId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, customerId, "wallet"],
    queryFn: () => customerService.getWallet(customerId!),
    enabled: Boolean(customerId),
  });
}

export function useCustomerActivity(customerId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, customerId, "activity"],
    queryFn: () => customerService.getActivity(customerId!),
    enabled: Boolean(customerId),
  });
}
