import type { Badge } from "@/types/common";

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  products: number;
  sortOrder: number;
  updated: string;
  status: Badge;
  imageUrl?: string;
  thumbnailUrl?: string;
}

export interface CategoryFormInput {
  name: string;
  description?: string;
  imageUrl?: string;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}
