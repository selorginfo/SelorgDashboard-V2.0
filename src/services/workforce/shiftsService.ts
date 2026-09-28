import type { LiveShiftWorker, ShiftTemplate } from "@/types/workforce";

export interface CreateShiftInput {
  name: string;
  appliesTo: "Picker" | "Rider";
  hours: string;
  days: string;
  breakTime: string;
  headcountTarget: string;
  scope?: string;
  /** Dark store code / warehouseKey — required for real create. */
  hubId?: string;
  hubName?: string;
  startTime?: string;
  endTime?: string;
  breakMinutes?: number;
  capacity?: number;
}

export interface ShiftsService {
  list(): Promise<ShiftTemplate[]>;
  create(input: CreateShiftInput): Promise<ShiftTemplate>;
  /** Flips a Draft template to Active. */
  activate(id: string): Promise<ShiftTemplate>;
  update(
    id: string,
    patch: Partial<Pick<ShiftTemplate, "hours" | "days" | "breakTime" | "headcountTarget" | "name">>,
  ): Promise<ShiftTemplate>;
  duplicate(id: string): Promise<ShiftTemplate>;
  remove(id: string): Promise<void>;
  listLiveWorkforce?(): Promise<LiveShiftWorker[]>;
}
