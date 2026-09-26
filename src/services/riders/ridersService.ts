import type { LiveRider, RiderDirectoryEntry } from "@/types/rider";
import type { Badge } from "@/types/common";

export interface RiderStats {
  online: number;
  onDelivery: number;
  available: number;
  unassignedOrders: number;
  /**
   * `null` when the backend exposes no source for the metric, so the UI can show "—" instead of
   * a fabricated 0. No endpoint currently reports SLA-breached deliveries or a fleet on-time
   * rate; both need an SLA-breach aggregation that doesn't exist yet.
   */
  delayed: number | null;
  onTimePercent: string | null;
}

export type RiderTableRow = (string | Badge)[];

export interface RidersService {
  listLive(): Promise<LiveRider[]>;
  listDirectory(): Promise<RiderDirectoryEntry[]>;
  getStats(): Promise<RiderStats>;
  listPerformance(): Promise<RiderTableRow[]>;
  listEarnings(): Promise<RiderTableRow[]>;
  listIncidents(): Promise<RiderTableRow[]>;
  assignOrder(orderId: string, riderId: string): Promise<unknown>;
  updateRiderStatus(riderId: string, status: string): Promise<unknown>;
  raiseIncident(input: { riderId: string; title: string; detail?: string }): Promise<unknown>;
}
