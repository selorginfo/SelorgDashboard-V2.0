import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { homeSectionService } from "@/services/cms";
import type { CreateHomeSectionInput } from "@/services/cms/homeSectionService";

const KEY = ["cms-home-sections"];

export function useHomeSections() {
  return useQuery({ queryKey: KEY, queryFn: () => homeSectionService.list() });
}

export function useSetSectionEnabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => homeSectionService.setEnabled(id, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMoveSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: "up" | "down" }) => homeSectionService.move(id, direction),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCreateHomeSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHomeSectionInput) => homeSectionService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useBindHomeSectionContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, productIds }: { id: string; productIds: string[] }) => {
      if (!homeSectionService.bindContent) throw new Error("Bind content is not available");
      return homeSectionService.bindContent(id, productIds);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function usePreviewHome() {
  return useMutation({
    mutationFn: () => {
      if (!homeSectionService.preview) throw new Error("Preview is not available");
      return homeSectionService.preview();
    },
  });
}

export function usePublishHomeSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (!homeSectionService.publish) throw new Error("Publish is not available");
      return homeSectionService.publish(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
