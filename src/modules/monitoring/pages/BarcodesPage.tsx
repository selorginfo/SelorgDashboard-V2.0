import { useMemo, useState } from "react";
import { Printer, RefreshCw } from "lucide-react";
import { useCatalogProducts, useSetProductPublished } from "@/modules/catalog/hooks/useCatalog";
import { api } from "@/lib/apiClient";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { CatalogProduct } from "@/types/catalog";
import type { KpiStat } from "@/types/common";
import styles from "./BarcodesPage.module.css";

const FLOW = ["SKU created", "Barcode mapped", "Label printed", "Active in stores", "Scan verified"].map(
  (label) => ({ label, actor: "" }),
);

function barcodeOf(p: CatalogProduct): string {
  return p.sku || p._id || "—";
}

export function BarcodesPage() {
  const { data: products, isLoading, isError, refetch } = useCatalogProducts();
  const setPublished = useSetProductPublished();
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);
  const [q, setQ] = useState("");
  const [printing, setPrinting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const list = products ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter(
      (p) =>
        p.sku.toLowerCase().includes(needle) ||
        p.name.toLowerCase().includes(needle) ||
        p.category.toLowerCase().includes(needle),
    );
  }, [products, q]);

  const liveKpis: KpiStat[] = useMemo(() => {
    const list = products ?? [];
    const active = list.filter((p) => /active|published|live/i.test(p.status.label)).length;
    const draft = list.filter((p) => /draft|inactive/i.test(p.status.label)).length;
    const withImage = list.filter((p) => Boolean(p.imageUrl)).length;
    return [
      { value: String(list.length), label: "Registered codes" },
      { value: String(active), label: "Active" },
      { value: String(draft), label: "Inactive / draft" },
      { value: String(withImage), label: "With media" },
      { value: String(selected.size), label: "Selected" },
      { value: String(filtered.length), label: "Matching search" },
    ];
  }, [products, selected, filtered]);

  if (isLoading) return <CardSkeleton />;
  if (isError || !products) return <ErrorState message="Couldn't load barcode registry." onRetry={() => refetch()} />;

  const canEdit = can("catalog", "edit") || can("barcodes", "edit");

  function toggleSelect(sku: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  }

  async function printLabels() {
    const skus = selected.size > 0 ? [...selected] : filtered.slice(0, 20).map((p) => p.sku);
    if (!skus.length) {
      pushToast("No SKUs to print", "error");
      return;
    }
    setPrinting(true);
    try {
      await api.post("/api/v1/warehouse/utilities/print-barcodes", { skus, qty: 1 });
      pushToast(`Barcode labels requested for ${skus.length} SKU(s)`, "success");
    } catch (e) {
      pushToast((e as Error).message || "Couldn't print barcode labels", "error");
    } finally {
      setPrinting(false);
    }
  }

  function activate(p: CatalogProduct, activate: boolean) {
    setPublished.mutate(
      { sku: p.sku, published: activate, id: p._id },
      {
        onSuccess: () => pushToast(`${p.sku} ${activate ? "activated" : "deactivated"}`, "success"),
        onError: (e) => pushToast((e as Error).message || "Couldn't update barcode status", "error"),
      },
    );
  }

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId="barcodes" flow={FLOW} activeIndex={2} />

      <KpiStrip kpis={liveKpis} moduleId="barcodes" />

      <div className={styles.toolbar}>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search barcode / SKU / product"
          aria-label="Search barcodes"
        />
        <Button size="sm" onClick={() => refetch()}>
          <RefreshCw size={12} /> Refresh
        </Button>
        {canEdit ? (
          <Button size="sm" variant="primary" onClick={() => void printLabels()} isLoading={printing}>
            <Printer size={12} /> Print labels
          </Button>
        ) : null}
        {canEdit ? (
          <Button
            size="sm"
            onClick={() => {
              pushToast("Register new barcode via Catalog → New product (SKU = barcode code)", "info");
            }}
          >
            Register
          </Button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={q ? "No barcodes match search" : "No barcodes registered in catalog"} />
      ) : (
        <div className={styles.list}>
          {filtered.map((p) => {
            const code = barcodeOf(p);
            const isActive = /active|published|live/i.test(p.status.label);
            return (
              <Card key={p._id || p.sku} className={styles.row}>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={selected.has(p.sku)}
                    onChange={() => toggleSelect(p.sku)}
                    aria-label={`Select ${p.sku}`}
                  />
                </label>
                <div className={styles.body}>
                  <div className={styles.code}>{code}</div>
                  <div className={styles.name}>{p.name}</div>
                  <div className={styles.meta}>
                    SKU {p.sku} · {p.category || "—"} · {p.unit || "—"} · Stores {p.storesLive}
                  </div>
                </div>
                <div className={styles.right}>
                  <Badge label={p.status.label} tone={p.status.tone} />
                  {canEdit ? (
                    <div className={styles.actions}>
                      <Button size="sm" onClick={() => activate(p, !isActive)}>
                        {isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelected(new Set([p.sku]));
                          void printLabels();
                        }}
                      >
                        Edit / Print
                      </Button>
                    </div>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
