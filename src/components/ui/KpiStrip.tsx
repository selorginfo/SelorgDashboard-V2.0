import type { KpiStat } from "@/types/common";
import type { ModuleId } from "@/constants/nav";
import { kpiIconFor } from "@/constants/icons";
import { Icon } from "@/components/ui/Icon";
import styles from "./KpiStrip.module.css";

export function KpiStrip({ kpis, moduleId }: { kpis: KpiStat[]; moduleId?: ModuleId | string }) {
  return (
    <div className={styles.grid}>
      {kpis.map((k) => (
        <div key={k.label} className={styles.card}>
          <div className={styles.top}>
            <span className={styles.iconWrap} style={k.color ? { color: k.color } : undefined}>
              <Icon paths={kpiIconFor(k.label, moduleId)} />
            </span>
            <div className={styles.value} style={k.color ? { color: k.color } : undefined}>
              {k.value}
            </div>
          </div>
          <div className={styles.label}>{k.label}</div>
        </div>
      ))}
    </div>
  );
}
