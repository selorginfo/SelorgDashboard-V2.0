import type { LiveRider } from "@/types/rider";
import styles from "./RiderFleetMap.module.css";

/**
 * Stylised illustrative map matching the approved design (dc.html ~2806-2821): a grid backdrop
 * with two dashed "zone" blobs and pinned rider positions — not a real maps SDK, since no maps
 * API key exists for this build (request §24/§49 — mock with a clear seam, don't fake a real
 * integration).
 */
export function RiderFleetMap({
  riders,
  selectedId,
  onSelect,
}: {
  riders: LiveRider[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  return (
    <div className={styles.map}>
      <div className={styles.grid} />
      <div className={styles.zoneA} />
      <div className={styles.zoneB} />
      <div className={styles.caption}>Bengaluru · delivery zones</div>
      <div className={styles.liveTag}>
        <span className={styles.liveDot} /> Live fleet
      </div>
      {riders.map((r) => (
        <button
          key={r.id}
          type="button"
          className={styles.pinWrap}
          style={{ left: `${r.x}%`, top: `${r.y}%` }}
          onClick={() => onSelect(r.id)}
        >
          <span className={styles.pinRing} data-tone={r.status.tone} data-selected={r.id === selectedId}>
            <span className={styles.pinDot} data-tone={r.status.tone} />
          </span>
          <span className={styles.pinLabel}>
            {r.name} · {r.zone}
          </span>
        </button>
      ))}
    </div>
  );
}
