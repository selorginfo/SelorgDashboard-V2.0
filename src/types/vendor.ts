import type { Badge } from "@/types/common";

export interface Vendor {
  id: string;
  name: string;
  category: string;
  contact: string;
  skusSupplied: string;
  fillRate: string;
  rejectRate: string;
  spendMtd: string;
  status: Badge;
}
