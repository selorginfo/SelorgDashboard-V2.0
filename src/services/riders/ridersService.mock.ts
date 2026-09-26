import type { RidersService, RiderStats, RiderTableRow } from "./ridersService";
import { SEED_LIVE_RIDERS, SEED_RIDER_DIRECTORY, RIDER_PERFORMANCE_ROWS, RIDER_EARNINGS_ROWS, RIDER_INCIDENT_ROWS } from "./seed";

export const mockRidersService: RidersService = {
  async listLive() {
    return SEED_LIVE_RIDERS;
  },
  async listDirectory() {
    return SEED_RIDER_DIRECTORY;
  },
  async getStats(): Promise<RiderStats> {
    return { online: 48, onDelivery: 31, available: 17, delayed: 6, unassignedOrders: 4, onTimePercent: "96.1%" };
  },
  async listPerformance(): Promise<RiderTableRow[]> {
    return RIDER_PERFORMANCE_ROWS;
  },
  async listEarnings(): Promise<RiderTableRow[]> {
    return RIDER_EARNINGS_ROWS;
  },
  async listIncidents(): Promise<RiderTableRow[]> {
    return RIDER_INCIDENT_ROWS;
  },
  async assignOrder(_orderId: string, _riderId: string) {
    return { ok: true };
  },
  async updateRiderStatus(_riderId: string, _status: string) {
    return { ok: true };
  },
  async raiseIncident(_input: { riderId: string; title: string; detail?: string }) {
    return { ok: true };
  },
};
