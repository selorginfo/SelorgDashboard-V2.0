export interface HeroKpi {
  label: string;
  value: string;
  delta: string;
  deltaColor: string;
  icon: "orders" | "revenue" | "active" | "sla";
}

export interface OpsKpi {
  label: string;
  value: string;
  color?: string;
}

export interface HourlyBar {
  hour: string;
  heightPct: number;
  pendingPct: number;
}

export interface DashboardAlert {
  id: string;
  title: string;
  detail: string;
  color: string;
  ago: string;
  linkTo: string;
}

export interface StoreOpsRow {
  name: string;
  city: string;
  orders: number;
  pick: number;
  pack: number;
  sla: string;
  slaColor: string;
  status: string;
  badgeTone: "green" | "red" | "amber";
}

export interface SupplyStat {
  value: string;
  label: string;
  color?: string;
}

export interface DeliveryStat {
  label: string;
  value: string;
  pct: number;
  color: string;
}

export interface DashboardSnapshot {
  heroKpis: HeroKpi[];
  opsKpis: OpsKpi[];
  hourly: HourlyBar[];
  alerts: DashboardAlert[];
  storeRows: StoreOpsRow[];
  supply: SupplyStat[];
  delivery: DeliveryStat[];
}
