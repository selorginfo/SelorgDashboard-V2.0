import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useTransfers, useAdvanceTransfer, useCreateTransfer } from "@/modules/warehouse/hooks/useTransfers";
import { TRANSFER_STAGE_ORDER, nextTransferStatus, toneForStatus } from "@/services/warehouse/transferStatus";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { ViewToggle, type ViewMode } from "@/components/workspace/ViewToggle";
import { RecordsListTable } from "@/components/workspace/RecordsListTable";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";
import { Dialog } from "@/components/ui/Dialog";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { Tone, WorkspaceRow } from "@/types/common";
import type { Transfer } from "@/types/warehouse";
import styles from "./TransfersKanbanPage.module.css";

const TRANSFER_COLUMNS = [
  "Transfer",
  "To dark store",
  "Priority",
  "Requested",
  "Approved",
  "Dispatched",
  "Received",
  "Status",
];

function priorityTone(priority: string): Tone {
  if (priority === "High") return "red";
  if (priority === "Low") return "grey";
  return "blue";
}

export function TransfersKanbanPage() {
  const { data: transfers, isLoading, isError, refetch } = useTransfers();
  const advance = useAdvanceTransfer();
  const createTransfer = useCreateTransfer();
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);
  const canApprove = can("transfers", "approve");
  const canCreate = can("transfers", "create") || can("transfers", "edit");
  const [view, setView] = useState<ViewMode>("workspace");
  const [newOpen, setNewOpen] = useState(false);
  const [destination, setDestination] = useState("");
  const [itemCount, setItemCount] = useState("1");

  const columns = useMemo(() => {
    if (!transfers) return [];
    const statuses = new Set(transfers.map((t) => t.status.label));
    const ordered = TRANSFER_STAGE_ORDER.filter((s) => statuses.has(s));
    const extra = [...statuses].filter((s) => !(TRANSFER_STAGE_ORDER as readonly string[]).includes(s));
    return [...ordered, ...extra];
  }, [transfers]);

  if (isLoading) return <CardSkeleton />;
  if (isError || !transfers) return <ErrorState message="Couldn't load transfers." onRetry={() => refetch()} />;

  function handleAdvance(t: Transfer) {
    advance.mutate(t.id, {
      onSuccess: (updated) => {
        if (updated.status.label !== t.status.label) {
          pushToast(`${t.id} moved to ${updated.status.label}`, "success");
        }
      },
      onError: (e) => pushToast((e as Error).message || "Couldn't advance transfer", "error"),
    });
  }

  function handleCreate() {
    if (!destination.trim()) {
      pushToast("Destination dark store is required", "error");
      return;
    }
    createTransfer.mutate(
      { destination: destination.trim(), items: Number(itemCount) || 1 },
      {
        onSuccess: (t) => {
          pushToast(`Transfer ${t.id} created`, "success");
          setNewOpen(false);
          setDestination("");
          setItemCount("1");
        },
        onError: (e) => pushToast((e as Error).message || "Couldn't create transfer", "error"),
      }
    );
  }

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId="transfers" />

      <div className={styles.headerRow}>
        <ViewToggle view={view} onChange={setView} />
        {canCreate ? (
          <Button size="sm" variant="primary" onClick={() => setNewOpen(true)}>
            <Plus size={13} /> New transfer
          </Button>
        ) : null}
      </div>

      {view === "list" ? (
        <RecordsListTable
          columns={TRANSFER_COLUMNS}
          rows={transfers.map(
            (t): WorkspaceRow => [
              t.id,
              t.toStore,
              t.priority,
              t.requested,
              t.approved,
              t.dispatched,
              t.received,
              t.status,
            ]
          )}
        />
      ) : (
        <div className={styles.board}>
          {columns.map((status) => {
            const cards = transfers.filter((t) => t.status.label === status);
            return (
              <div key={status} className={styles.column}>
                <div className={styles.columnHeader}>
                  <span className={styles.columnTitle}>{status}</span>
                  <span className={styles.columnCount}>{cards.length}</span>
                </div>
                <div className={styles.columnBody}>
                  {cards.map((t) => {
                    const next = nextTransferStatus(t.status.label);
                    return (
                      <Card key={t.id} className={styles.cardEl}>
                        <div className={styles.cardTop}>
                          <span className={styles.cardId}>{t.id}</span>
                          <Badge label={t.priority} tone={priorityTone(t.priority)} />
                        </div>
                        <div className={styles.cardStore}>{t.toStore}</div>
                        <div className={styles.cardMeta}>
                          <span>Priority · {t.priority}</span>
                          <span>Requested · {t.requested}</span>
                        </div>
                        <div className={styles.cardFigs}>
                          <div className={styles.cardFig}>
                            <span className={styles.cardFigValue}>{t.approved}</span>
                            <span className={styles.cardFigLabel}>Approved</span>
                          </div>
                          <div className={styles.cardFig}>
                            <span className={styles.cardFigValue}>{t.dispatched}</span>
                            <span className={styles.cardFigLabel}>Dispatched</span>
                          </div>
                        </div>
                        <div className={styles.cardBottom}>
                          <Badge label={t.status.label} tone={toneForStatus(t.status.label)} />
                          {canApprove && next ? (
                            <Button size="sm" isLoading={advance.isPending} onClick={() => handleAdvance(t)}>
                              Advance
                            </Button>
                          ) : null}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen} title="New transfer">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Destination dark store
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. DS-Adyar-01"
              style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
            />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Item lines
            <input
              type="number"
              min={1}
              value={itemCount}
              onChange={(e) => setItemCount(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
            />
          </label>
          <Button variant="primary" size="sm" isLoading={createTransfer.isPending} onClick={handleCreate}>
            Create transfer
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
