import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useWarehouseZones } from "@/modules/warehouse/hooks/useWarehouseHierarchy";
import { warehouseCreateService } from "@/services/warehouseCreate/warehouseCreateService";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import styles from "./WarehouseHierarchyPage.module.css";

export function WarehouseHierarchyPage() {
  const navigate = useNavigate();
  const { data: zones = [], isLoading } = useWarehouseZones();
  const { data: warehouses } = useQuery({
    queryKey: ["warehouses-list", "central"],
    queryFn: async () => {
      const res = await warehouseCreateService.list();
      const list = Array.isArray(res)
        ? res
        : Array.isArray((res as { data?: unknown }).data)
          ? ((res as { data: unknown[] }).data)
          : [];
      return (list as { type?: string; code?: string; name?: string }[]).filter((w) => w.type === "warehouse");
    },
    staleTime: 60_000,
  });

  const [expandedZone, setExpandedZone] = useState<string | undefined>(undefined);
  const [selectedRackId, setSelectedRackId] = useState<string | undefined>(undefined);

  const selectedZone = zones.find((z) => z.racks.some((r) => r.id === selectedRackId)) ?? zones[0];
  const selectedRack = selectedZone?.racks.find((r) => r.id === selectedRackId) ?? selectedZone?.racks[0];
  const primary = warehouses?.[0];
  const warehouseLabel = primary
    ? `${primary.code || primary.name}${primary.name && primary.code ? ` · ${primary.name}` : ""}`
    : "Central warehouse";

  if (isLoading) {
    return <div className={styles.wrap}><p className={styles.noBinDetail}>Loading warehouse data…</p></div>;
  }

  return (
    <div className={styles.wrap}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <div className={styles.breadcrumb}>
          {warehouseLabel}
          {selectedZone ? <span> › {selectedZone.zone}</span> : null}
          {selectedRack ? <span> › Rack {selectedRack.id}</span> : null}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button size="sm" variant="secondary" aria-label="Edit warehouse" onClick={() => navigate("/wh-create")}>
            Edit warehouse
          </Button>
          <Button size="sm" variant="primary" aria-label="Create warehouse" onClick={() => navigate("/wh-create")}>
            Create warehouse
          </Button>
        </div>
      </div>

      {zones.length === 0 ? (
        <p className={styles.noBinDetail}>No warehouse zone data available.</p>
      ) : (
      <div className={styles.board}>
        <Card className={styles.zoneList}>
          {zones.map((zone) => {
            const pct = zone.cap > 0 ? Math.round((zone.used / zone.cap) * 100) : 0;
            const isExpanded = zone.zone === expandedZone;
            return (
              <div key={zone.zone} className={styles.zoneBlock}>
                <button
                  type="button"
                  className={styles.zoneHeader}
                  onClick={() => setExpandedZone(isExpanded ? undefined : zone.zone)}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <div className={styles.zoneHeaderBody}>
                    <div className={styles.zoneTop}>
                      <span className={styles.zoneName}>{zone.zone}</span>
                      <span className={styles.zonePct} data-tone={pct >= 90 ? "amber" : undefined}>
                        {pct}%
                      </span>
                    </div>
                    <div className={styles.zoneDesc}>{zone.desc}</div>
                    <div className={styles.capBar}>
                      <div className={styles.capBarFill} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <div className={styles.zoneCap}>
                      {zone.used} / {zone.cap} bins used
                    </div>
                  </div>
                </button>
                {isExpanded ? (
                  <div className={styles.rackList}>
                    {zone.racks.map((rack) => {
                      const rackPct = rack.bins > 0 ? Math.round((rack.used / rack.bins) * 100) : 0;
                      return (
                        <button
                          key={rack.id}
                          type="button"
                          className={styles.rackRow}
                          data-selected={rack.id === selectedRackId}
                          onClick={() => setSelectedRackId(rack.id)}
                        >
                          <span className={styles.rackId}>{rack.id}</span>
                          <span className={styles.rackNote}>{rack.note}</span>
                          <span className={styles.rackMeta}>
                            {rack.used}/{rack.bins} bins · {rack.skus} SKUs
                          </span>
                          <span className={styles.rackPct} data-tone={rackPct >= 90 ? "amber" : undefined}>
                            {rackPct}%
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </Card>
      </div>
      )}
    </div>
  );
}
