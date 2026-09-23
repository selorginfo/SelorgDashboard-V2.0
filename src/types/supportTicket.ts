import type { Badge } from "@/types/common";

export type SupportWorkerKind = "rider" | "picker";

export interface TicketMessage {
  from: string;
  text: string;
  time: string;
  internal: boolean;
}

export interface SupportTicket {
  id: string;
  person: string;
  issue: string;
  context: string;
  priority: string;
  agent: string;
  age: string;
  status: Badge;
  thread: TicketMessage[];
}
