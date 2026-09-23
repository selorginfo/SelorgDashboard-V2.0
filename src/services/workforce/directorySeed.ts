import { WORKFORCE_CONFIGS } from "@/services/workspace/data/workforce";
import type { WorkforcePerson, WorkerKind } from "@/types/workforce";
import type { Badge } from "@/types/common";

const RIDER_CONFIG = WORKFORCE_CONFIGS["rider-dir"];
const PICKER_CONFIG = WORKFORCE_CONFIGS["picker-dir"];

const RIDER_TABS = ["Available", "On delivery", "Offline", "Suspended"];
const PICKER_TABS = ["Picking now", "Available", "Offline", "Under review"];

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Reshapes the already-transcribed `rider-dir`/`picker-dir` rows (workspace/data/workforce.ts)
 * into typed directory people. Each person appears in exactly one specific tab bucket in the
 * source data (the "All riders"/"All pickers" tab is the union, not iterated here), so a flat
 * unique-by-name list falls out directly — same reuse pattern as darkstore/bagsSeed.ts. */
function buildRiders(): WorkforcePerson[] {
  if (!RIDER_CONFIG) return [];
  const people: WorkforcePerson[] = [];
  for (const tab of RIDER_TABS) {
    for (const row of RIDER_CONFIG.rows[tab] ?? []) {
      const [name, zone, phone, vehicle, deliveries, onTime, rating, status] = row;
      people.push({
        id: `rider-${slug(name as string)}`,
        kind: "rider",
        name: name as string,
        locationLabel: "Zone",
        location: zone as string,
        contactLabel: "Phone",
        contact: phone as string,
        vehicle: vehicle as string,
        stats: [
          { label: "Deliveries today", value: deliveries as string },
          { label: "On-time", value: onTime as string },
          { label: "Rating", value: rating as string },
        ],
        status: status as Badge,
        tab,
      });
    }
  }
  return people;
}

function buildPickers(): WorkforcePerson[] {
  if (!PICKER_CONFIG) return [];
  const people: WorkforcePerson[] = [];
  for (const tab of PICKER_TABS) {
    for (const row of PICKER_CONFIG.rows[tab] ?? []) {
      const [name, store, shift, orders, items, accuracy, avgPick, status] = row;
      people.push({
        id: `picker-${slug(name as string)}`,
        kind: "picker",
        name: name as string,
        locationLabel: "Dark store",
        location: store as string,
        contactLabel: "Shift",
        contact: shift as string,
        stats: [
          { label: "Orders today", value: orders as string },
          { label: "Items today", value: items as string },
          { label: "Accuracy", value: accuracy as string },
          { label: "Avg pick", value: avgPick as string },
        ],
        status: status as Badge,
        tab,
      });
    }
  }
  return people;
}

export const SEED_RIDER_DIRECTORY: WorkforcePerson[] = buildRiders();
export const SEED_PICKER_DIRECTORY: WorkforcePerson[] = buildPickers();

export function seedFor(kind: WorkerKind): WorkforcePerson[] {
  return kind === "rider" ? SEED_RIDER_DIRECTORY : SEED_PICKER_DIRECTORY;
}
