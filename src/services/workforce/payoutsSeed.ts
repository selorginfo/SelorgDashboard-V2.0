import { WORKFORCE_CONFIGS } from "@/services/workspace/data/workforce";
import type { PayoutRun } from "@/types/workforce";
import type { Tone } from "@/types/common";

const CONFIG = WORKFORCE_CONFIGS.payouts;

/** The payouts table's Status column is a plain string in the source data (unlike every other
 * workforce table, which already carries a Badge) — reconstructed into a tone here from the
 * status text itself. */
function toneFor(status: string): Tone {
  if (status === "Paid") return "green";
  if (status === "Awaiting approval") return "amber";
  if (status === "Week open") return "blue";
  if (status === "Approved") return "blue";
  return "red";
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Reshapes the already-transcribed `payouts` rows into typed run rows. Each tab (Current run,
 * Scheduled, Completed runs, On hold, Failed transfers) is its own independent dataset in the
 * source config — they don't overlap — so this is a straight per-tab build, one entity per row. */
function buildPayoutRuns(): PayoutRun[] {
  if (!CONFIG) return [];
  const out: PayoutRun[] = [];
  for (const tab of CONFIG.tabs) {
    for (const row of CONFIG.rows[tab] ?? []) {
      const [run, cycle, workforce, people, gross, deductions, net, status] = row as [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ];
      out.push({
        id: `${slug(tab)}-${slug(run)}-${slug(workforce)}`,
        run,
        cycle,
        workforce,
        people,
        gross,
        deductions,
        net,
        status: { label: status, tone: toneFor(status) },
        tab,
      });
    }
  }
  return out;
}

export const SEED_PAYOUT_RUNS: PayoutRun[] = buildPayoutRuns();
