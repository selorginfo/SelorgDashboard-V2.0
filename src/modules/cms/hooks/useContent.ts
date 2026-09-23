import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contentService } from "@/services/cms";
import type { ContentStage } from "@/types/contentItem";
import type { CreateContentInput } from "@/services/cms/contentService";

const KEY = ["cms-content"];

export function useContentItems() {
  return useQuery({ queryKey: KEY, queryFn: () => contentService.list() });
}

export function useSetContentStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: ContentStage }) => contentService.setStage(id, stage),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCreateContentItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContentInput) => contentService.create(input),
    onSuccess: (item) => {
      queryClient.setQueryData<Awaited<ReturnType<typeof contentService.list>>>(KEY, (prev) => {
        const list = prev ?? [];
        if (list.some((x) => x.id === item.id)) return list;
        return [item, ...list];
      });
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}
