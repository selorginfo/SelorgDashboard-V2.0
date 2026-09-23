import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mediaService } from "@/services/cms";

const KEY = ["cms-media"];

export function useMediaAssets() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      if (mediaService.listWithMeta) {
        return mediaService.listWithMeta();
      }
      const assets = await mediaService.list();
      return { assets, totalBytes: 0 };
    },
  });
}

export function useArchiveAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mediaService.archive(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUploadMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, categories }: { file: File; categories?: string[] }) => {
      if (!mediaService.upload) throw new Error("Media upload is not available");
      return mediaService.upload(file, categories);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
