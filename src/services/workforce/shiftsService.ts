import type { ShiftTemplate } from "@/types/workforce";

export interface ShiftsService {
  list(): Promise<ShiftTemplate[]>;
  create(input: {
    name: string;
    appliesTo: "Picker" | "Rider";
    hours: string;
    days: string;
    breakTime: string;
    headcountTarget: string;
    scope?: string;
  }): Promise<ShiftTemplate>;
  /** Flips a Draft template to Active. */
  activate(id: string): Promise<ShiftTemplate>;
  update(
    id: string,
    patch: Partial<Pick<ShiftTemplate, "hours" | "days" | "breakTime" | "headcountTarget" | "name">>,
  ): Promise<ShiftTemplate>;
  duplicate(id: string): Promise<ShiftTemplate>;
  remove(id: string): Promise<void>;
}
