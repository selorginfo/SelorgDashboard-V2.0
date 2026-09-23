import type { Badge } from "@/types/common";

export interface IntegrationHealth {
  /** Backend Mongo id — required for POST /integrations/:id/test */
  id?: string;
  system: string;
  type: string;
  environment: string;
  lastSync: string;
  latency: string;
  errors24h: number;
  retries: number;
  status: Badge;
}
