import type { Badge } from "@/types/common";

export type OpsDateRange =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "custom";

export interface OpsRangeQuery {
  range: OpsDateRange;
  from?: string;
  to?: string;
}

export interface OpsMetric {
  label: string;
  value: string;
}

export interface OpsOrderRef {
  id: string;
  orderNumber: string;
  status?: string;
  amount?: string;
  store?: string;
  createdAt?: string;
  note?: string;
}

export interface OpsActivityItem {
  id: string;
  time: string;
  event: string;
  detail?: string;
}

export interface OpsDocItem {
  id: string;
  label: string;
  status: string;
  value?: string;
}

export interface WorkerDetailBundle {
  id: string;
  name: string;
  phone: string;
  status: Badge;
  profile: OpsMetric[];
  work: OpsMetric[];
  location: OpsMetric[];
  docs: OpsDocItem[];
  earnings: OpsMetric[];
  attendance: OpsMetric[];
  orders: OpsOrderRef[];
  activity: OpsActivityItem[];
}

export interface WorkerStatsBundle {
  range: OpsDateRange;
  metrics: OpsMetric[];
  orders: OpsOrderRef[];
}

export type CodLedgerState =
  | "pending"
  | "collected"
  | "submitted"
  | "verified"
  | "settled"
  | "exception";

export interface CodCollectionRow {
  id: string;
  orderId: string;
  orderNumber: string;
  orderValue: string;
  collected: string;
  pending: string;
  submitted: string;
  verified: string;
  settled: string;
  exception: string;
  state: CodLedgerState;
  rider?: string;
  store?: string;
  updatedAt?: string;
}

export interface CodCollectionBoard {
  summary: OpsMetric[];
  rows: CodCollectionRow[];
  /** Realized revenue must use settled only — never pending. */
  realizedRevenue: string;
}

export type CodRiderTransferState = "clear" | "pending_transfer" | "blocked";

export interface CodRiderTransferRow {
  id: string;
  riderId: string;
  riderName: string;
  phone?: string;
  hub?: string;
  isOnline: boolean;
  cashInHand: string;
  cashInHandAmount: number;
  collectedToday: string;
  depositedToday: string;
  lastDepositAt?: string;
  lastDepositRef?: string;
  transferStatus: CodRiderTransferState;
  blockedFromOnline: boolean;
  ordersPendingSettle: number;
}

export interface CodRiderTransferBoard {
  summary: OpsMetric[];
  rows: CodRiderTransferRow[];
  note?: string;
}

export type FulfillmentStage =
  | "waiting_for_picker"
  | "picker_accepted"
  | "packed_rack"
  | "waiting_for_rider"
  | "rider_accepted"
  | "rider_picked"
  | "delivered"
  | "exception";

export interface OrderProgressTimelineEvent {
  id: string;
  time: string;
  status: string;
  note?: string;
  actor?: string;
}

export interface OrderProgressRow {
  id: string;
  orderNumber: string;
  store: string;
  fulfillmentStage: FulfillmentStage | string;
  fulfillmentLabel: string;
  status?: string;
  picker?: string;
  rider?: string;
  updatedAt?: string;
  timeline: OrderProgressTimelineEvent[];
}

export interface CustomerReviewRow {
  id: string;
  orderId: string;
  orderNumber: string;
  rating: number;
  comment: string;
  customer?: string;
  createdAt?: string;
  store?: string;
}

export interface HsdDeviceRow {
  id: string;
  deviceId: string;
  label: string;
  store: string;
  status: Badge;
  assignedTo?: string;
  lastSeen?: string;
  model?: string;
}

export interface HsdDeviceHistoryEvent {
  id: string;
  time: string;
  event: string;
  detail?: string;
  orderNumber?: string;
  actor?: string;
}
