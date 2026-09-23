import type { IntegrationHealth } from "@/types/integration";

export interface IntegrationService {
  list(): Promise<IntegrationHealth[]>;
  testConnection(system: string): Promise<IntegrationHealth>;
}
