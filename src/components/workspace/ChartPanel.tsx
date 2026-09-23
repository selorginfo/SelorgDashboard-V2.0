import { useState } from "react";
import { Card } from "@/components/ui/Card";
import type { WorkspaceChart } from "@/types/common";
import styles from "./ChartPanel.module.css";

/**
 * Bar chart (dual series, hover tooltip) + donut/stacked-bar (with legend) pair — transcribed
 * from the approved design's `isChart` block (dc.html:3588-3643) and its `chartVals()` bar-height
 * math (dc.html:8695-8725): each series is normalized to *its own* max, not a shared scale.
 */
export function ChartPanel({ chart }: { chart: WorkspaceChart }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max1 = Math.max(...chart.series.map((s) => s.v1));
  const max2 = Math.max(...chart.series.map((s) => s.v2));

  return (
    <div className={styles.grid}>
      <Card className={styles.barCard}>
        <div className={styles.barHeader}>
          <div>
            <div className={styles.title}>{chart.title}</div>
            <div className={styles.sub}>{chart.sub}</div>
          </div>
          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: "var(--brand)" }} />
              {chart.legend[0]}
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: "#c7d3e2" }} />
              {chart.legend[1]}
            </span>
          </div>
        </div>

        <div className={styles.bars}>
          {chart.series.map((s, i) => {
            const h1 = Math.max(2, Math.round((s.v1 / max1) * 100));
            const h2 = Math.max(2, Math.round((s.v2 / max2) * 100));
            return (
              <div
                key={s.label}
                className={styles.barCol}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {hovered === i ? (
                  <div className={styles.tooltip}>
                    <div className={styles.tooltipLabel}>{s.label}</div>
                    <div className={styles.tooltipValue}>
                      {chart.legend[0]}: {s.v1}
                      {chart.unit}
                    </div>
                    <div className={styles.tooltipValue}>
                      {chart.legend[1]}: {s.v2}
                      {chart.unit === "%" ? "%" : ""}
                    </div>
                  </div>
                ) : null}
                <div className={styles.barPair}>
                  <div className={styles.bar1} style={{ height: `${h1}%` }} />
                  <div className={styles.bar2} style={{ height: `${h2}%` }} />
                </div>
                <div className={styles.barLabel}>{s.label}</div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className={styles.donutCard}>
        <div className={styles.title}>{chart.donutTitle}</div>
        <div className={styles.stack}>
          {chart.donut.map((d) => (
            <div key={d.label} title={d.label} className={styles.stackSeg} style={{ width: `${d.value}%`, background: d.color }} />
          ))}
        </div>
        <div className={styles.donutLegend}>
          {chart.donut.map((d) => (
            <div key={d.label} className={styles.donutRow}>
              <span className={styles.legendDot} style={{ background: d.color }} />
              <div className={styles.donutLabel}>{d.label}</div>
              <div className={styles.donutBarTrack}>
                <div className={styles.donutBarFill} style={{ width: `${d.value}%`, background: d.color }} />
              </div>
              <div className={styles.donutValue}>{d.value}%</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
