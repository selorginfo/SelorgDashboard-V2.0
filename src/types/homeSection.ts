import type { Badge } from "@/types/common";

export interface HomeSection {
  id: string;
  section: string;
  component: string;
  boundContent: string;
  surface: "Customer app home" | "Web app home";
  author: string;
  order: number;
  updated: string;
  status: Badge;
}
