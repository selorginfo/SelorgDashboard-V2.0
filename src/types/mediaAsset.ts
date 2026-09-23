import type { Badge } from "@/types/common";

export interface MediaAsset {
  id: string;
  filename: string;
  format: string;
  dimensions: string;
  usedIn: string;
  uploadedBy: string;
  size: string;
  sizeBytes?: number;
  url?: string;
  updated: string;
  status: Badge;
  /** Which "cms-media" tabs (besides "All assets") this file appears under in the approved design. */
  categories: string[];
}
