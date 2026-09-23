import type { MediaAsset } from "@/types/mediaAsset";

export interface MediaService {
  list(): Promise<MediaAsset[]>;
  listWithMeta?(): Promise<{ assets: MediaAsset[]; totalBytes: number }>;
  archive(id: string): Promise<MediaAsset>;
  upload?(file: File, categories?: string[]): Promise<MediaAsset>;
}
