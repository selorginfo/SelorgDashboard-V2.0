import type { Badge } from "@/types/common";

export interface LiveRider {
  id: string;
  name: string;
  hub: string;
  currentOrder: string;
  zone: string;
  eta: string;
  vehicle: string;
  rating: string;
  status: Badge;
  /** Illustrative position on the zone map, percentage of the map container. */
  x: number;
  y: number;
}

export interface RiderDirectoryEntry {
  name: string;
  hub: string;
  phone: string;
  zone: string;
  kyc: string;
  vehicle: string;
  rating: string;
  status: Badge;
}
