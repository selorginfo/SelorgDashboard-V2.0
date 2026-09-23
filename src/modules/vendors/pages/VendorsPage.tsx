import { useMemo, useState } from "react";
import {
  useVendors,
  useSetVendorStatus,
  useCreateVendor,
  useRecordVendorQualityIssue,
  useRequestVendorDocuments,
  useVendorPerformance,
} from "@/modules/vendors/hooks/useVendors";
import { WORKFORCE_CONFIGS } from "@/services/workspace/data/workforce";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { FlowStrip } from "@/components/workspace/FlowStrip";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { ViewToggle, type ViewMode } from "@/components/workspace/ViewToggle";
import { RecordsListTable } from "@/components/workspace/RecordsListTable";
import { Dialog } from "@/components/ui/Dialog";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { WorkspaceCell, WorkspaceRow } from "@/types/common";
import type { Vendor } from "@/types/vendor";
import styles from "./VendorsPage.module.css";

function initials(name: string): string {
  return name
    .split(/[\s·]+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function renderCell(cell: WorkspaceCell) {
  if (typeof cell === "string") return cell;
  return <Badge label={cell.label} tone={cell.tone} />;
}

export function VendorsPage() {
  const { data: vendors, isLoading, isError, refetch } = useVendors();
  const setStatus = useSetVendorStatus();
  const createVendor = useCreateVendor();
  const recordIssue = useRecordVendorQualityIssue();
  const requestDocs = useRequestVendorDocuments();
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const vendorConfig = WORKFORCE_CONFIGS.vendors;
  const [tab, setTab] = useState(vendorConfig?.tabs[0] ?? "All vendors");
  const [view, setView] = useState<ViewMode>("workspace");
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newContact, setNewContact] = useState("");
  const [perfOpen, setPerfOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!vendors) return [];
    const q = query.toLowerCase();
    return q
      ? vendors.filter((v) => v.name.toLowerCase().includes(q) || v.category.toLowerCase().includes(q))
      : vendors;
  }, [vendors, query]);

  const selected: Vendor | undefined = filtered.find((v) => v.id === selectedId) ?? filtered[0];
  const { data: performance, isFetching: perfLoading } = useVendorPerformance(perfOpen ? selected?.id : undefined);

  if (isLoading) return <CardSkeleton />;
  if (isError || !vendors) return <ErrorState message="Couldn't load vendors." onRetry={() => refetch()} />;

  const designKpis = vendorConfig?.kpis;
  const active = vendors.filter((v) => v.status.label === "Active").length;
  const onHold = vendors.filter((v) => v.status.label === "On hold").length;
  const canApprove = can("vendors", "approve");
  const canEdit = can("vendors", "edit");

  function setVendorStatus(vendor: Vendor, label: string, tone: "green" | "amber" | "grey") {
    setStatus.mutate(
      { id: vendor.id, status: { label, tone } },
      {
        onSuccess: () => pushToast(`${vendor.name} — ${label}`, "success"),
        onError: (e) => pushToast((e as Error).message || "Couldn't update vendor", "error"),
      }
    );
  }

  function handleCreate() {
    if (!newName.trim()) {
      pushToast("Vendor name is required", "error");
      return;
    }
    createVendor.mutate(
      { name: newName.trim(), category: newCategory.trim() || undefined, contact: newContact.trim() || undefined },
      {
        onSuccess: (v) => {
          pushToast(`${v.name} created`, "success");
          setNewOpen(false);
          setNewName("");
          setNewCategory("");
          setNewContact("");
          setSelectedId(v.id);
        },
        onError: (e) => pushToast((e as Error).message || "Couldn't create vendor", "error"),
      }
    );
  }

  const columns = vendorConfig?.columns ?? [];
  const otherRows = tab !== "All vendors" ? (vendorConfig?.rows[tab] ?? []) : [];
  const vendorRows: WorkspaceRow[] = filtered.map((v) => [
    v.name,
    v.category,
    v.contact,
    v.skusSupplied,
    v.fillRate,
    v.rejectRate,
    v.spendMtd,
    v.status,
  ]);

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId="vendors" />

      <KpiStrip
        moduleId="vendors"
        kpis={
          designKpis ?? [
            { value: String(vendors.length), label: "Vendors" },
            { value: String(active), label: "Active" },
            { value: String(onHold), label: "On hold", color: onHold ? "var(--amber-tx)" : undefined },
          ]
        }
      />

      {vendorConfig && vendorConfig.flow.length > 0 ? (
        <Card className={styles.flowCard}>
          <FlowStrip flow={vendorConfig.flow} activeIndex={vendorConfig.flowAt} />
        </Card>
      ) : null}

      <div className={styles.tabs}>
        {(vendorConfig?.tabs ?? ["All vendors"]).map((t) => (
          <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
        <div className={styles.tabsSpacer} />
        <span className={styles.recordCount}>{tab === "All vendors" ? filtered.length : otherRows.length} records</span>
        {tab === "All vendors" ? <ViewToggle view={view} onChange={setView} /> : null}
        {canEdit ? (
          <Button variant="primary" size="sm" onClick={() => setNewOpen(true)}>
            + New vendor
          </Button>
        ) : null}
      </div>

      {tab !== "All vendors" ? (
        otherRows.length === 0 ? (
          <EmptyState title={`No data in "${tab}"`} />
        ) : (
          <Card className={styles.tableCard}>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {columns.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {otherRows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j}>{renderCell(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : (
        <>
          <input
            className={styles.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vendors or category"
            aria-label="Search vendors"
          />

          {filtered.length === 0 ? (
            <EmptyState title="No vendors found" />
          ) : view === "list" ? (
            <RecordsListTable
              columns={columns}
              rows={vendorRows}
              onRowClick={(i) => {
                setSelectedId(filtered[i]!.id);
                setView("workspace");
              }}
            />
          ) : (
            <div className={styles.board}>
              <Card className={styles.list}>
                {filtered.map((vendor) => (
                  <button
                    key={vendor.id}
                    type="button"
                    className={styles.listRow}
                    data-selected={vendor.id === selected?.id}
                    onClick={() => setSelectedId(vendor.id)}
                  >
                    <span className={styles.avatar}>{initials(vendor.name)}</span>
                    <div className={styles.listBody}>
                      <div className={styles.listName}>{vendor.name}</div>
                      <div className={styles.listCategory}>{vendor.category}</div>
                    </div>
                    <span className={styles.statusDot} data-tone={vendor.status.tone} />
                  </button>
                ))}
              </Card>

              {selected ? (
                <div className={styles.detailCol}>
                  <Card className={styles.detailCard}>
                    <div className={styles.detailHeader}>
                      <span className={styles.avatarLg}>{initials(selected.name)}</span>
                      <div className={styles.detailHeaderBody}>
                        <div className={styles.detailName}>{selected.name}</div>
                        <div className={styles.detailCategory}>{selected.category}</div>
                      </div>
                      <Badge label={selected.status.label} tone={selected.status.tone} />
                    </div>

                    <div className={styles.statsGrid}>
                      <div className={styles.statCell}>
                        <span className={styles.statLabel}>Category</span>
                        <span className={styles.statValue}>{selected.category}</span>
                      </div>
                      <div className={styles.statCell}>
                        <span className={styles.statLabel}>Contact</span>
                        <span className={styles.statValue}>{selected.contact}</span>
                      </div>
                      <div className={styles.statCell}>
                        <span className={styles.statLabel}>SKUs supplied</span>
                        <span className={styles.statValue}>{selected.skusSupplied}</span>
                      </div>
                      <div className={styles.statCell}>
                        <span className={styles.statLabel}>Fill rate</span>
                        <span className={styles.statValue}>{selected.fillRate}</span>
                      </div>
                      <div className={styles.statCell}>
                        <span className={styles.statLabel}>Reject rate</span>
                        <span className={styles.statValue}>{selected.rejectRate}</span>
                      </div>
                      <div className={styles.statCell}>
                        <span className={styles.statLabel}>Spend MTD</span>
                        <span className={styles.statValue}>{selected.spendMtd}</span>
                      </div>
                      <div className={styles.statCell}>
                        <span className={styles.statLabel}>Status</span>
                        <span className={styles.statValue}>{selected.status.label}</span>
                      </div>
                    </div>

                    {canEdit ? (
                      <div className={styles.actionsRow}>
                        {canApprove && selected.status.label !== "Active" ? (
                          <Button
                            size="sm"
                            isLoading={setStatus.isPending}
                            onClick={() => setVendorStatus(selected, "Active", "green")}
                          >
                            Approve vendor
                          </Button>
                        ) : null}
                        <Button size="sm" onClick={() => setVendorStatus(selected, "On hold", "amber")}>
                          Place on hold
                        </Button>
                        <Button
                          size="sm"
                          isLoading={recordIssue.isPending}
                          onClick={() => {
                            const notes = window.prompt("Describe the quality issue", "") ?? "";
                            if (!notes.trim()) return;
                            recordIssue.mutate(
                              { id: selected.id, notes: notes.trim() },
                              {
                                onSuccess: () => pushToast(`Quality issue logged for ${selected.name}`, "success"),
                                onError: (e) => pushToast((e as Error).message || "Couldn't log issue", "error"),
                              }
                            );
                          }}
                        >
                          Record quality issue
                        </Button>
                        <Button
                          size="sm"
                          isLoading={requestDocs.isPending}
                          onClick={() => {
                            requestDocs.mutate(
                              { id: selected.id, note: `Documents requested for ${selected.name}` },
                              {
                                onSuccess: () =>
                                  pushToast(
                                    `Document request recorded for ${selected.name} (email not configured — follow up manually)`,
                                    "success"
                                  ),
                                onError: (e) =>
                                  pushToast((e as Error).message || "Couldn't request documents", "error"),
                              }
                            );
                          }}
                        >
                          Request documents
                        </Button>
                        <Button size="sm" onClick={() => setPerfOpen(true)}>
                          Review performance
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setVendorStatus(selected, "Offboarded", "grey")}
                        >
                          Offboard vendor
                        </Button>
                      </div>
                    ) : null}
                  </Card>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen} title="New vendor">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Name
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
            />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Category
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
            />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Contact
            <input
              value={newContact}
              onChange={(e) => setNewContact(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
            />
          </label>
          <Button variant="primary" size="sm" isLoading={createVendor.isPending} onClick={handleCreate}>
            Create vendor
          </Button>
        </div>
      </Dialog>

      <Dialog open={perfOpen} onOpenChange={setPerfOpen} title={`Performance — ${selected?.name ?? ""}`}>
        {perfLoading ? (
          <p>Loading…</p>
        ) : performance ? (
          <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
            <div>
              QC checks: {performance.qc.total} (pass {performance.qc.pass} · fail {performance.qc.fail} · pending{" "}
              {performance.qc.pending})
            </div>
            <div>Pass rate: {performance.qc.passRate}%</div>
            <div>Open alerts: {performance.openAlerts}</div>
            <div>
              Certificates: {performance.certificates.total} (valid {performance.certificates.valid} · expired{" "}
              {performance.certificates.expired})
            </div>
          </div>
        ) : (
          <p>No performance data available.</p>
        )}
      </Dialog>
    </div>
  );
}
