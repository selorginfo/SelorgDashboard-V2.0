import { SYSTEM_CONFIGS } from "@/services/workspace/data/system";
import type { IntegrationHealth } from "@/types/integration";
import type { Badge } from "@/types/common";

/** Reuses the "Integrations" tab rows already transcribed once in workspace/data/system.ts,
 * rather than re-copying the same 9 rows for the bespoke health-card view. */
function buildSeed(): IntegrationHealth[] {
  const rows = SYSTEM_CONFIGS.integrations?.rows["Integrations"] ?? [];
  return rows.map((row) => {
    const [system, type, environment, lastSync, latency, errors24h, retries, status] = row;
    return {
      system: system as string,
      type: type as string,
      environment: environment as string,
      lastSync: lastSync as string,
      latency: latency as string,
      errors24h: Number(errors24h),
      retries: Number(retries),
      status: status as Badge,
    };
  });
}

export const SEED_INTEGRATIONS: IntegrationHealth[] = buildSeed();
