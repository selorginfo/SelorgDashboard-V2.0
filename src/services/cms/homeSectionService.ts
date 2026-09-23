import type { HomeSection } from "@/types/homeSection";

export interface CreateHomeSectionInput {
  section: string;
  component: string;
  surface: HomeSection["surface"];
  order?: number;
}

export interface HomeSectionService {
  list(): Promise<HomeSection[]>;
  setEnabled(id: string, enabled: boolean): Promise<HomeSection>;
  move(id: string, direction: "up" | "down"): Promise<HomeSection[]>;
  create(input: CreateHomeSectionInput): Promise<HomeSection>;
  bindContent?(id: string, productIds: string[]): Promise<HomeSection>;
  preview?(): Promise<unknown>;
  publish?(id: string): Promise<HomeSection>;
}
