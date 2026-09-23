import { useMemo, useRef, useState } from "react";
import { Image as ImageIcon, FileVideo, Shapes, Archive, Upload } from "lucide-react";
import { useMediaAssets, useArchiveAsset, useUploadMedia } from "@/modules/cms/hooks/useMedia";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { FlowStrip } from "@/components/workspace/FlowStrip";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import styles from "./MediaLibraryPage.module.css";

const TABS = ["All assets", "Banners", "Product & recipe", "App help", "Unused", "Archived"];

const FLOW = ["Uploaded", "Tagged", "Approved", "In use", "Archived"].map((label) => ({ label, actor: "" }));
const FLOW_AT = 3;

function formatIcon(format: string) {
  if (format === "SVG") return Shapes;
  if (format === "MP4") return FileVideo;
  return ImageIcon;
}

function formatStorage(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function MediaLibraryPage() {
  const { data, isLoading, isError, refetch } = useMediaAssets();
  const assets = data?.assets ?? [];
  const totalBytes = data?.totalBytes ?? 0;
  const [tab, setTab] = useState(TABS[0] as string);
  const archive = useArchiveAsset();
  const upload = useUploadMedia();
  const fileRef = useRef<HTMLInputElement>(null);
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);

  const filtered = useMemo(() => {
    if (tab === "All assets") return assets;
    if (tab === "Unused") return assets.filter((a) => a.status.label === "Unused" || a.categories.includes("Unused"));
    if (tab === "Archived") return assets.filter((a) => a.status.label === "Archived" || a.categories.includes("Archived"));
    return assets.filter((a) => a.categories.includes(tab));
  }, [assets, tab]);

  if (isLoading) return <CardSkeleton />;
  if (isError) return <ErrorState message="Couldn't load media." onRetry={() => refetch()} />;

  const inUse = assets.filter((a) => a.status.label === "In use").length;
  const unused = assets.filter((a) => a.status.label === "Unused").length;
  const awaiting = assets.filter((a) => a.status.label === "Awaiting approval").length;
  const archived = assets.filter((a) => a.status.label === "Archived" || a.categories.includes("Archived")).length;
  const canEdit = can("cms-media", "edit");

  function onPickFile(file: File | undefined) {
    if (!file) return;
    upload.mutate(
      { file, categories: tab === "All assets" || tab === "Unused" || tab === "Archived" ? ["Unused"] : [tab] },
      {
        onSuccess: (asset) => pushToast(`${asset.filename} uploaded`, "success"),
        onError: (e) => pushToast((e as Error).message || "Upload failed", "error"),
      },
    );
  }

  return (
    <div className={styles.wrap}>
      <Card className={styles.hintCard}>
        <p className={styles.hint}>
          Every image, vector and video used across the five surfaces — with where each asset is in use.
        </p>
      </Card>

      <KpiStrip
        moduleId="cms-media"
        kpis={[
          { value: String(assets.length), label: "Assets" },
          { value: String(inUse), label: "In use" },
          { value: String(unused), label: "Unused" },
          { value: String(archived), label: "Archived" },
          { value: formatStorage(totalBytes), label: "Storage" },
          { value: String(awaiting), label: "Awaiting approval", color: awaiting ? "var(--amber-tx)" : undefined },
        ]}
      />

      <Card className={styles.flowCard}>
        <FlowStrip flow={FLOW} activeIndex={FLOW_AT} />
      </Card>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {canEdit ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,video/mp4"
              style={{ display: "none" }}
              onChange={(e) => {
                onPickFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Button
              size="sm"
              variant="primary"
              isLoading={upload.isPending}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={13} /> Upload
            </Button>
          </>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={`No assets in "${tab}"`} />
      ) : (
        <div className={styles.grid}>
          {filtered.map((asset, i) => {
            const Icon = formatIcon(asset.format);
            return (
              <Card key={asset.id || `asset-${i}`} className={styles.card}>
                <div className={styles.swatch} data-format={asset.format}>
                  {asset.url && asset.format !== "MP4" && asset.format !== "SVG" ? (
                    <img src={asset.url} alt={asset.filename} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <Icon size={22} strokeWidth={1.6} />
                  )}
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.filename}>{asset.filename}</div>
                  <div className={styles.meta}>
                    {asset.format} · {asset.dimensions}
                  </div>
                  <div className={styles.usedIn}>{asset.usedIn}</div>
                  <div className={styles.footer}>
                    <span className={styles.uploader}>
                      {asset.uploadedBy} · {asset.size}
                    </span>
                    <Badge label={asset.status.label} tone={asset.status.tone} />
                  </div>
                  {canEdit && asset.status.label !== "Archived" ? (
                    <button
                      type="button"
                      className={styles.archiveBtn}
                      onClick={() =>
                        archive.mutate(asset.id, { onSuccess: () => pushToast(`${asset.filename} archived`, "success") })
                      }
                    >
                      <Archive size={12} /> Archive
                    </button>
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
