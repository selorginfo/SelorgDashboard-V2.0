export const CONTENT_STAGES = ["Draft", "In review", "Approved", "Scheduled", "Published", "Archived"] as const;
export type ContentStage = (typeof CONTENT_STAGES)[number];

export const CONTENT_SURFACES = ["Customer app", "Picker app", "Rider app", "HSD scanner", "Web app", "Shared media"] as const;
export type ContentSurface = (typeof CONTENT_SURFACES)[number];

export interface ContentItem {
  id: string;
  title: string;
  type: string;
  placement: string;
  surface: ContentSurface;
  author: string;
  schedule: string;
  updated: string;
  stage: ContentStage;
}
