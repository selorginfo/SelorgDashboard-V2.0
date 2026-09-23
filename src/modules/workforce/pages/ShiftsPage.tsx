import { useMemo, useState } from "react";
import { PlayCircle, Plus } from "lucide-react";
import {
  useShiftTemplates,
  useActivateShift,
  useUpdateShift,
  useDuplicateShift,
  useDeleteShift,
  useCreateShift,
} from "@/modules/workforce/hooks/useShifts";
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
const DEFAULT_TABS = ["All templates", "Picker shifts", "Rider shifts", "Draft & retired"];

function matchesTab(template: ShiftTemplate, tab: string): boolean {
  if (tab === "Picker shifts") return template.appliesTo === "Picker";
  if (tab === "Rider shifts") return template.appliesTo === "Rider";
  if (tab === "Draft & retired") return template.status.label === "Draft" || template.status.label === "Retired";
  return true;
}

export function ShiftsPage() {
  const { data: templates, isLoading, isError, refetch } = useShiftTemplates();
  const create = useCreateShift();
  const activate = useActivateShift();
  const update = useUpdateShift();
  const duplicate = useDuplicateShift();
  const remove = useDeleteShift();
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);
  const tabs = CONFIG?.tabs?.length ? CONFIG.tabs : DEFAULT_TABS;
  const [tab, setTab] = useState(tabs[0] ?? "All templates");
  const [activatingId, setActivatingId] = useState<string | undefined>(undefined);
  const [editing, setEditing] = useState<ShiftTemplate | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [editDraft, setEditDraft] = useState({ hours: "", days: "", breakTime: "", headcountTarget: "" });
  const [createDraft, setCreateDraft] = useState({
    name: "",
    appliesTo: "Picker" as "Picker" | "Rider",
    hours: "09:00 – 17:00",
    days: "Mon–Sun",
    breakTime: "30 min",
    headcountTarget: "8",
    scope: "All stores",
  });
  const [deleting, setDeleting] = useState<ShiftTemplate | undefined>(undefined);
  const [detail, setDetail] = useState<string | undefined>(undefined);
  const [detailLoading, setDetailLoading] = useState(false);

  const filtered = useMemo(() => (templates ?? []).filter((t) => matchesTab(t, tab)), [templates, tab]);

  const liveKpis: KpiStat[] = useMemo(() => {
    const list = templates ?? [];
    const active = list.filter((t) => t.status?.label === "Active").length;
    const draft = list.filter((t) => t.status?.label === "Draft").length;
    const retired = list.filter((t) => t.status?.label === "Retired").length;
    return [
      { value: String(list.length), label: "Shift templates" },
      { value: String(active), label: "Active" },
      { value: String(draft), label: "Draft" },
      { value: String(retired), label: "Retired" },
      { value: String(list.filter((t) => t.appliesTo === "Picker").length), label: "Picker shifts" },
      { value: String(list.filter((t) => t.appliesTo === "Rider").length), label: "Rider shifts" },
    ];
  }, [templates]);

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

  function submitCreate() {
    if (!createDraft.name.trim()) {
      pushToast("Template name is required", "error");
      return;
    }
    create.mutate(createDraft, {
      onSuccess: () => {
        pushToast("Shift template created", "success");
        setCreating(false);
        setCreateDraft({
          name: "",
          appliesTo: "Picker",
          hours: "09:00 – 17:00",
          days: "Mon–Sun",
          breakTime: "30 min",
          headcountTarget: "8",
          scope: "All stores",
        });
      },
      onError: (e) => pushToast((e as Error).message || "Create failed", "error"),
    });
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
      const res = await api.get<unknown>(`/api/v1/warehouse/staff/shifts/${encodeURIComponent(template.id)}`);
      setDetail(JSON.stringify(res, null, 2));
    } catch (err) {
      pushToast((err as Error).message || "Couldn't load shift detail", "error");
    } finally {
      setDetailLoading(false);
    }
  }

  const firstDraft = filtered.find((t) => t.status?.label === "Draft") ?? templates.find((t) => t.status?.label === "Draft");

  return (
    <div className={styles.wrap}>
      <KpiStrip kpis={liveKpis} moduleId="shifts" />

      {CONFIG && CONFIG.flow.length > 0 ? (
        <Card className={styles.flowCard}>
          <FlowStrip flow={CONFIG.flow} activeIndex={CONFIG.flowAt} />
        </Card>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <Button size="sm" variant="ghost" onClick={() => refetch()}>
          Refresh
        </Button>
        {canCreate ? (
          <Button size="sm" variant="primary" onClick={() => setCreating(true)}>
            <Plus size={13} /> Create template
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
        {tabs.map((t) => (
          <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
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
                  <span className={styles.fieldLabel}>Headcount target</span>
                </div>
              </div>

              <div className={styles.scopeLine}>Scope: {template.scope}</div>

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
        title="Create shift template"
        footer={
          <Button variant="primary" isLoading={create.isPending} onClick={submitCreate}>
            Create
          </Button>
        }
      >
        <div className={styles.editForm}>
          <div>
            <FieldLabel>Name</FieldLabel>
            <Input value={createDraft.name} onChange={(e) => setCreateDraft((d) => ({ ...d, name: e.target.value }))} />
          </div>
          <div>
            <FieldLabel>Applies to</FieldLabel>
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
            <FieldLabel>Hours</FieldLabel>
            <Input value={createDraft.hours} onChange={(e) => setCreateDraft((d) => ({ ...d, hours: e.target.value }))} />
          </div>
          <div>
            <FieldLabel>Days</FieldLabel>
            <Input value={createDraft.days} onChange={(e) => setCreateDraft((d) => ({ ...d, days: e.target.value }))} />
          </div>
          <div>
            <FieldLabel>Break</FieldLabel>
            <Input value={createDraft.breakTime} onChange={(e) => setCreateDraft((d) => ({ ...d, breakTime: e.target.value }))} />
          </div>
          <div>
            <FieldLabel>Headcount target</FieldLabel>
            <Input
              value={createDraft.headcountTarget}
              onChange={(e) => setCreateDraft((d) => ({ ...d, headcountTarget: e.target.value }))}
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
            <Input value={editDraft.breakTime} onChange={(e) => setEditDraft((d) => ({ ...d, breakTime: e.target.value }))} />
          </div>
          <div>
            <FieldLabel>Headcount target</FieldLabel>
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
