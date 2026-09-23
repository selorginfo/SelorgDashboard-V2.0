import { ShoppingCart, IndianRupee, Clock, Target } from "lucide-react";
import type { HeroKpi } from "@/modules/dashboard/types";
import styles from "./HeroKpis.module.css";

const ICONS = { orders: ShoppingCart, revenue: IndianRupee, active: Clock, sla: Target };
const DOT_COLORS: Record<HeroKpi["icon"], string> = {
  orders: "#1e8e43",
  revenue: "#3b7fc4",
  active: "#c78a1e",
  sla: "#8a5cd6",
};

export function HeroKpis({ kpis }: { kpis: HeroKpi[] }) {
  return (
    <div className={styles.grid}>
      {kpis.map((k) => {
        const Icon = ICONS[k.icon];
        return (
          <div key={k.label} className={styles.card}>
            <div className={styles.top}>
              <div className={styles.label}>{k.label}</div>
              <span className={styles.dot} style={{ background: DOT_COLORS[k.icon] }}>
                <Icon size={18} strokeWidth={1.7} />
              </span>
            </div>
            <div className={styles.value}>{k.value}</div>
            <div className={styles.delta} style={{ color: k.deltaColor }}>
              {k.delta}
            </div>
          </div>
        );
      })}
    </div>
  );
}
