import { useMemo, useState } from "react";
import { PlayCircle, Plus } from "lucide-react";
import {
  useShiftTemplates,
  useActivateShift,
  useUpdateShift,
  useDuplicateShift,
  useDeleteShift,
  useCreateShift,
  useLiveShiftWorkforce,
} from "@/modules/workforce/hooks/useShifts";
import { useStoreRecords } from "@/modules/darkstore/hooks/useStores";
import { WORKFORCE_CONFIGS } from "@/services/workspace/data/workforce";
import { api } from "@/lib/apiClient";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, FieldLabel } from "@/components/ui/Input";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { FlowStrip } from "@/components/workspace/FlowStrip";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { ShiftTemplate } from "@/types/workforce";
import type { KpiStat } from "@/types/common";
import styles from "./ShiftsPage.module.css";

const CONFIG = WORKFORCE_CONFIGS.shifts;
const DEFAULT_TABS = ["All templates", "Picker shifts", "Rider shifts", "Draft & retired", "Live tracking"];

const SHIFT_PRESETS = [
  {
    id: "day",
    label: "08:00 AM – 06:00 PM",
    startTime: "08:00",
    endTime: "18:00",
    breakMinutes: 60,
    hint: "10-hour shift · 1-hour break",
  },
  {
    id: "evening",
    label: "06:00 PM – 04:00 AM",
    startTime: "18:00",
    endTime: "04:00",
    breakMinutes: 60,
    hint: "10-hour overnight · 1-hour break",
  },
  {
    id: "early",
    label: "04:00 AM – 08:00 AM",
    startTime: "04:00",
    endTime: "08:00",
    breakMinutes: 30,
    hint: "4-hour shift · 30-minute break",
  },
  {
    id: "custom",
    label: "Custom",
    startTime: "09:00",
    endTime: "17:00",
    breakMinutes: 30,
    hint: "Set your own start, end, and break",
  },
] as const;

type PresetId = (typeof SHIFT_PRESETS)[number]["id"];

function matchesTab(template: ShiftTemplate, tab: string): boolean {
  if (tab === "Picker shifts") return template.appliesTo === "Picker";
  if (tab === "Rider shifts") return template.appliesTo === "Rider";
  if (tab === "Draft & retired") return template.status.label === "Draft" || template.status.label === "Retired";
  if (tab === "Live tracking") return false;
  return true;
}

function formatStartedAt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return iso;
  }
}

const emptyCreate = {
  name: "",
  appliesTo: "Picker" as "Picker" | "Rider",
  hubId: "",
  hubName: "",
  presetId: "day" as PresetId,
  startTime: "08:00",
  endTime: "18:00",
  breakMinutes: "60",
  capacity: "5",
  days: "Mon–Sun",
};

export function ShiftsPage() {
  const { data: templates, isLoading, isError, refetch } = useShiftTemplates();
  const { data: liveWorkers, isLoading: liveLoading, refetch: refetchLive } = useLiveShiftWorkforce();
  const { data: stores = [] } = useStoreRecords();
  const create = useCreateShift();
  const activate = useActivateShift();
  const update = useUpdateShift();
  const duplicate = useDuplicateShift();
  const remove = useDeleteShift();
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);
  const tabs = CONFIG?.tabs?.length ? [...CONFIG.tabs, "Live tracking"] : DEFAULT_TABS;
  const uniqueTabs = Array.from(new Set(tabs));
  const [tab, setTab] = useState(uniqueTabs[0] ?? "All templates");
  const [activatingId, setActivatingId] = useState<string | undefined>(undefined);
  const [editing, setEditing] = useState<ShiftTemplate | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [editDraft, setEditDraft] = useState({ hours: "", days: "", breakTime: "", headcountTarget: "" });
  const [createDraft, setCreateDraft] = useState(emptyCreate);
  const [deleting, setDeleting] = useState<ShiftTemplate | undefined>(undefined);
  const [detail, setDetail] = useState<string | undefined>(undefined);
  const [detailLoading, setDetailLoading] = useState(false);

  const filtered = useMemo(() => (templates ?? []).filter((t) => matchesTab(t, tab)), [templates, tab]);
  const showLive = tab === "Live tracking";

  const liveKpis: KpiStat[] = useMemo(() => {
    const list = templates ?? [];
    const active = list.filter((t) => t.status?.label === "Active").length;
    const draft = list.filter((t) => t.status?.label === "Draft").length;
    const retired = list.filter((t) => t.status?.label === "Retired").length;
    const onShift = (liveWorkers ?? []).filter((w) => w.onShift).length;
    return [
      { value: String(list.length), label: "Shift templates" },
      { value: String(active), label: "Active" },
      { value: String(draft), label: "Draft" },
      { value: String(retired), label: "Retired" },
      { value: String(list.filter((t) => t.appliesTo === "Picker").length), label: "Picker shifts" },
      { value: String(onShift), label: "On shift now" },
    ];
  }, [templates, liveWorkers]);

  if (isLoading) return <CardSkeleton />;
  if (isError || !templates) return <ErrorState message="Couldn't load shift templates." onRetry={() => refetch()} />;

  const canEdit = can("shifts", "edit");
  const canCreate = can("shifts", "create") || canEdit;
  const canDelete = can("shifts", "delete");

  function handleActivate(id: string) {
    setActivatingId(id);
    activate.mutate(id, {
      onSuccess: () => {
        pushToast("Shift template activated", "success");
        setActivatingId(undefined);
      },
      onError: () => setActivatingId(undefined),
    });
  }

  function openEdit(template: ShiftTemplate) {
    setEditing(template);
    setEditDraft({
      hours: template.hours,
      days: template.days,
      breakTime: template.breakTime,
      headcountTarget: template.headcountTarget,
    });
  }

  function submitEdit() {
    if (!editing) return;
    update.mutate(
      { id: editing.id, patch: editDraft },
      {
        onSuccess: () => {
          pushToast(`${editing.name} updated`, "success");
          setEditing(undefined);
        },
      },
    );
  }

  function applyPreset(presetId: PresetId) {
    const preset = SHIFT_PRESETS.find((p) => p.id === presetId) ?? SHIFT_PRESETS[0];
    setCreateDraft((d) => ({
      ...d,
      presetId,
      startTime: preset.startTime,
      endTime: preset.endTime,
      breakMinutes: String(preset.breakMinutes),
    }));
  }

  function submitCreate() {
    if (!createDraft.name.trim()) {
      pushToast("Shift name is required", "error");
      return;
    }
    if (!createDraft.hubId) {
      pushToast("Please select a Dark Store", "error");
      return;
    }
    if (!createDraft.startTime || !createDraft.endTime) {
      pushToast("Start and end times are required", "error");
      return;
    }
    const capacity = Math.max(1, Number(createDraft.capacity) || 1);
    const breakMinutes = Math.max(0, Number(createDraft.breakMinutes) || 0);
    create.mutate(
      {
        name: createDraft.name.trim(),
        appliesTo: createDraft.appliesTo,
        hours: `${createDraft.startTime} – ${createDraft.endTime}`,
        days: createDraft.days,
        breakTime: `${breakMinutes} min`,
        headcountTarget: String(capacity),
        scope: createDraft.hubName || createDraft.hubId,
        hubId: createDraft.hubId,
        hubName: createDraft.hubName || createDraft.hubId,
        startTime: createDraft.startTime,
        endTime: createDraft.endTime,
        breakMinutes,
        capacity,
      },
      {
        onSuccess: () => {
          pushToast("Shift template created", "success");
          setCreating(false);
          setCreateDraft(emptyCreate);
        },
        onError: (e) => pushToast((e as Error).message || "Create failed", "error"),
      },
    );
  }

  function handleDuplicate(template: ShiftTemplate) {
    duplicate.mutate(template.id, {
      onSuccess: () => pushToast(`Duplicated as "${template.name} (copy)"`, "success"),
    });
  }

  function confirmDelete() {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: () => {
        pushToast(`${deleting.name} deleted`, "success");
        setDeleting(undefined);
      },
    });
  }

  async function openDetail(template: ShiftTemplate) {
    setDetailLoading(true);
    try {
      const res = await api.get<unknown>(`/api/v1/rider/shifts/${encodeURIComponent(template.id)}`);
      setDetail(JSON.stringify(res, null, 2));
    } catch (err) {
      pushToast((err as Error).message || "Couldn't load shift detail", "error");
    } finally {
      setDetailLoading(false);
    }
  }

  const firstDraft = filtered.find((t) => t.status?.label === "Draft") ?? templates.find((t) => t.status?.label === "Draft");
  const activeStores = stores.filter((s) => s.isActive !== false);

  return (
    <div className={styles.wrap}>
      <KpiStrip kpis={liveKpis} moduleId="shifts" />

      {CONFIG && CONFIG.flow.length > 0 ? (
        <Card className={styles.flowCard}>
          <FlowStrip flow={CONFIG.flow} activeIndex={CONFIG.flowAt} />
        </Card>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            void refetch();
            void refetchLive();
          }}
        >
          Refresh
        </Button>
        {canCreate ? (
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setCreateDraft(emptyCreate);
              setCreating(true);
            }}
          >
            <Plus size={13} /> Create Picker Shift
          </Button>
        ) : null}
        {canEdit ? (
          <Button size="sm" disabled={!firstDraft} onClick={() => firstDraft && handleActivate(firstDraft.id)}>
            <PlayCircle size={13} /> Activate
          </Button>
        ) : null}
        {canEdit && filtered[0] ? (
          <Button size="sm" onClick={() => openEdit(filtered[0]!)}>
            Edit
          </Button>
        ) : (
          <Button size="sm" disabled={!templates[0]} onClick={() => templates[0] && openEdit(templates[0]!)}>
            Edit
          </Button>
        )}
      </div>

      <div className={styles.tabs}>
        {uniqueTabs.map((t) => (
          <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {showLive ? (
        liveLoading && !liveWorkers ? (
          <CardSkeleton />
        ) : !(liveWorkers ?? []).length ? (
          <EmptyState title="No booked or started shifts yet" />
        ) : (
          <div className={styles.grid}>
            {(liveWorkers ?? []).map((row) => (
              <Card key={row.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <div className={styles.name}>{row.picker}</div>
                    <div className={styles.appliesTo}>
                      {row.role} · {row.darkStore}
                    </div>
                  </div>
                  <Badge
                    label={row.currentStatus}
                    tone={row.onShift ? "blue" : row.bookingStatus === "ASSIGNED" ? "amber" : "grey"}
                  />
                </div>
                <div className={styles.fieldsGrid}>
                  <div className={styles.field}>
                    <span className={styles.fieldValue}>{row.shiftName}</span>
                    <span className={styles.fieldLabel}>Shift</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldValue}>{row.hours}</span>
                    <span className={styles.fieldLabel}>Hours</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldValue}>{row.bookingStatus}</span>
                    <span className={styles.fieldLabel}>Booking</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldValue}>{formatStartedAt(row.startedAt)}</span>
                    <span className={styles.fieldLabel}>Started at</span>
                  </div>
                </div>
                <div className={styles.scopeLine}>
                  {row.isOnline ? "Online" : "Offline"}
                  {row.onShift ? " · Currently on shift" : ""}
                </div>
              </Card>
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <EmptyState title={`No templates in "${tab}"`} />
      ) : (
        <div className={styles.grid}>
          {filtered.map((template) => (
            <Card key={template.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <div className={styles.name}>{template.name}</div>
                  <div className={styles.appliesTo}>{template.appliesTo} shift</div>
                </div>
                <Badge label={template.status?.label ?? "—"} tone={template.status?.tone ?? "grey"} />
              </div>

              <div className={styles.fieldsGrid}>
                <div className={styles.field}>
                  <span className={styles.fieldValue}>{template.hours}</span>
                  <span className={styles.fieldLabel}>Hours</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldValue}>{template.days}</span>
                  <span className={styles.fieldLabel}>Days</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldValue}>{template.breakTime}</span>
                  <span className={styles.fieldLabel}>Break</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldValue}>{template.headcountTarget}</span>
                  <span className={styles.fieldLabel}>Max workers</span>
                </div>
              </div>

              <div className={styles.scopeLine}>Dark Store: {template.scope}</div>

              <div className={styles.actionsRow}>
                {canEdit && template.status?.label === "Draft" ? (
                  <Button
                    size="sm"
                    variant="primary"
                    isLoading={activate.isPending && activatingId === template.id}
                    onClick={() => handleActivate(template.id)}
                  >
                    <PlayCircle size={13} /> Activate
                  </Button>
                ) : null}
                {canEdit ? (
                  <Button size="sm" onClick={() => openEdit(template)}>
                    Edit
                  </Button>
                ) : null}
                {canEdit ? (
                  <Button size="sm" isLoading={duplicate.isPending} onClick={() => handleDuplicate(template)}>
                    Duplicate
                  </Button>
                ) : null}
                <Button size="sm" isLoading={detailLoading} onClick={() => void openDetail(template)}>
                  Open
                </Button>
                {canDelete ? (
                  <Button size="sm" variant="danger" onClick={() => setDeleting(template)}>
                    Delete
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={creating}
        onOpenChange={(open) => !open && setCreating(false)}
        title="Create Picker Shift"
        footer={
          <Button variant="primary" isLoading={create.isPending} onClick={submitCreate}>
            Create Shift
          </Button>
        }
      >
        <div className={styles.editForm}>
          <div>
            <FieldLabel>Choose Dark Store</FieldLabel>
            <select
              value={createDraft.hubId}
              onChange={(e) => {
                const store = activeStores.find((s) => s.code === e.target.value || s._id === e.target.value);
                setCreateDraft((d) => ({
                  ...d,
                  hubId: e.target.value,
                  hubName: store?.name || e.target.value,
                }));
              }}
              style={{ width: "100%", padding: 8 }}
            >
              <option value="">Select Dark Store…</option>
              {activeStores.map((s) => (
                <option key={s._id} value={s.code || s._id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Name</FieldLabel>
            <Input
              placeholder="Morning Shift"
              value={createDraft.name}
              onChange={(e) => setCreateDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </div>
          <div>
            <FieldLabel>Role</FieldLabel>
            <select
              value={createDraft.appliesTo}
              onChange={(e) => setCreateDraft((d) => ({ ...d, appliesTo: e.target.value as "Picker" | "Rider" }))}
              style={{ width: "100%", padding: 8 }}
            >
              <option value="Picker">Picker</option>
              <option value="Rider">Rider</option>
            </select>
          </div>
          <div>
            <FieldLabel>Shift Hours</FieldLabel>
            <div className={styles.presetRow}>
              {SHIFT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={styles.presetChip}
                  data-active={createDraft.presetId === p.id}
                  onClick={() => applyPreset(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className={styles.presetHint}>
              {SHIFT_PRESETS.find((p) => p.id === createDraft.presetId)?.hint}
            </div>
          </div>
          {createDraft.presetId === "custom" ? (
            <>
              <div className={styles.timeRow}>
                <div>
                  <FieldLabel>Start time</FieldLabel>
                  <Input
                    type="time"
                    value={createDraft.startTime}
                    onChange={(e) => setCreateDraft((d) => ({ ...d, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <FieldLabel>End time</FieldLabel>
                  <Input
                    type="time"
                    value={createDraft.endTime}
                    onChange={(e) => setCreateDraft((d) => ({ ...d, endTime: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Break duration (minutes)</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={createDraft.breakMinutes}
                  onChange={(e) => setCreateDraft((d) => ({ ...d, breakMinutes: e.target.value }))}
                />
              </div>
            </>
          ) : null}
          <div>
            <FieldLabel>Maximum Workers</FieldLabel>
            <Input
              type="number"
              min={1}
              value={createDraft.capacity}
              onChange={(e) => setCreateDraft((d) => ({ ...d, capacity: e.target.value }))}
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(undefined)}
        title={editing ? `Edit ${editing.name}` : ""}
        footer={
          <Button variant="primary" isLoading={update.isPending} onClick={submitEdit}>
            Save changes
          </Button>
        }
      >
        <div className={styles.editForm}>
          <div>
            <FieldLabel>Hours</FieldLabel>
            <Input value={editDraft.hours} onChange={(e) => setEditDraft((d) => ({ ...d, hours: e.target.value }))} />
          </div>
          <div>
            <FieldLabel>Days</FieldLabel>
            <Input value={editDraft.days} onChange={(e) => setEditDraft((d) => ({ ...d, days: e.target.value }))} />
          </div>
          <div>
            <FieldLabel>Break</FieldLabel>
            <Input
              value={editDraft.breakTime}
              onChange={(e) => setEditDraft((d) => ({ ...d, breakTime: e.target.value }))}
            />
          </div>
          <div>
            <FieldLabel>Maximum Workers</FieldLabel>
            <Input
              value={editDraft.headcountTarget}
              onChange={(e) => setEditDraft((d) => ({ ...d, headcountTarget: e.target.value }))}
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={`Delete ${deleting?.name ?? "this template"}?`}
        description="This cannot be undone."
        footer={
          <Button variant="danger" isLoading={remove.isPending} onClick={confirmDelete}>
            Delete template
          </Button>
        }
      >
        <p className={styles.deleteNote}>
          Rosters already using this template keep the pattern they ran on; only future scheduling is affected.
        </p>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(undefined)} title="Shift template detail">
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, margin: 0, maxHeight: 360, overflow: "auto" }}>{detail}</pre>
      </Dialog>
    </div>
  );
}
