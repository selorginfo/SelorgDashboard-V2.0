import { useMemo, useState } from "react";
import { useSettings, useUpdateSettingValue } from "@/modules/system/hooks/useSettings";
import { SYSTEM_CONFIGS } from "@/services/workspace/data/system";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { SectionsBoard, ConfigRow } from "@/components/workspace/SectionsBoard";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, FieldLabel } from "@/components/ui/Input";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { SettingItem } from "@/types/system";
import styles from "./SettingsPage.module.css";

const CONFIG = SYSTEM_CONFIGS.settings;
const TABS = (CONFIG?.tabs ?? []) as SettingItem["tab"][];

/** Only the SLA target gets a real edit form — spec: "keep this light, don't build a
 * form-per-setting-type system." Every other setting here is read-only, same as the design. */
const EDITABLE_SETTING_ID = "set-sla-target-ds02";

export function SettingsPage() {
  const { data: settings, isLoading, isError, refetch } = useSettings();
  const updateValue = useUpdateSettingValue();
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);
  const [tab, setTab] = useState<SettingItem["tab"]>(TABS[0] ?? "Business");
  const [editing, setEditing] = useState<SettingItem | null>(null);
  const [draftValue, setDraftValue] = useState("");

  const filtered = useMemo(() => (settings ?? []).filter((s) => s.tab === tab), [settings, tab]);

  if (isLoading) return <CardSkeleton />;
  if (isError || !settings) return <ErrorState message="Couldn't load settings." onRetry={() => refetch()} />;

  const canEdit = can("settings", "edit");

  function openEdit(setting: SettingItem) {
    setEditing(setting);
    setDraftValue(setting.value);
  }

  function saveEdit() {
    if (!editing) return;
    updateValue.mutate(
      { id: editing.id, value: draftValue },
      {
        onSuccess: () => {
          pushToast(`${editing.name} updated`, "success");
          setEditing(null);
        },
        onError: () => pushToast("Couldn't update the setting", "error"),
      }
    );
  }

  function configure(setting: SettingItem) {
    if (setting.id === EDITABLE_SETTING_ID) {
      openEdit(setting);
    } else {
      pushToast(`Configure — ${setting.name}`, "info");
    }
  }

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId="settings" />

      {CONFIG ? <KpiStrip kpis={CONFIG.kpis} moduleId="settings" /> : null}

      <SectionsBoard
        sections={TABS}
        active={tab}
        onSelect={(section) => setTab(section as SettingItem["tab"])}
        hint={CONFIG?.hint}
      >
        {filtered.length === 0 ? (
          <EmptyState title={`No settings in "${tab}"`} />
        ) : (
          <div className={styles.rows}>
            {filtered.map((setting) => (
              <ConfigRow
                key={setting.id}
                name={setting.name}
                scope={setting.scope}
                detail={`Applies to: ${setting.appliesTo} · Owner: ${setting.owner}`}
                value={setting.value}
                updatedLabel={`Updated ${setting.changedBy}`}
                status={setting.status.label}
                statusTone={setting.status.tone}
                onConfigure={canEdit ? () => configure(setting) : undefined}
              />
            ))}
          </div>
        )}
      </SectionsBoard>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing ? `Edit ${editing.name}` : "Edit setting"}
        description={editing ? `${editing.scope} · applies to ${editing.appliesTo}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button variant="primary" isLoading={updateValue.isPending} onClick={saveEdit}>
              Save
            </Button>
          </>
        }
      >
        <FieldLabel>Value</FieldLabel>
        <Input value={draftValue} onChange={(e) => setDraftValue(e.target.value)} autoFocus />
      </Dialog>
    </div>
  );
}
