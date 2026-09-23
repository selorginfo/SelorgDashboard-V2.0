import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { catalogService } from "@/services/catalog";
import type { AdminProductInput } from "@/types/catalog";

const KEY = ["catalog-products"];

export function useCatalogProducts() {
  return useQuery({ queryKey: KEY, queryFn: () => catalogService.listProducts() });
}

export function useCatalogProductsPaged(params: { page: number; limit: number; q: string; warehouseId?: string }) {
  return useQuery({
    queryKey: [...KEY, "paged", params.page, params.limit, params.q, params.warehouseId ?? ""],
    queryFn: () => catalogService.listProductsPaged(params),
    placeholderData: (prev) => prev,
  });
}

export function useSetProductPublished() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sku, published, id }: { sku: string; published: boolean; id?: string }) =>
      catalogService.setPublished(sku, published, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminProductInput) => catalogService.createProduct(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useGetProduct(id: string | null) {
  return useQuery({
    queryKey: [...KEY, "detail", id],
    queryFn: () => catalogService.getProduct(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AdminProductInput> }) =>
      catalogService.updateProduct(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => catalogService.deleteProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useBulkUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => catalogService.bulkUpload(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
