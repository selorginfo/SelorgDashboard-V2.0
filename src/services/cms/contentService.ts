import type { ContentItem, ContentStage, ContentSurface } from "@/types/contentItem";

export interface CreateContentInput {
  title: string;
  surface: ContentSurface;
  type?: string;
}

export interface ContentService {
  list(): Promise<ContentItem[]>;
  setStage(id: string, stage: ContentStage): Promise<ContentItem>;
  create(input: CreateContentInput): Promise<ContentItem>;
}
