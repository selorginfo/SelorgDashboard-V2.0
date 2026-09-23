import { useMemo, useState } from "react";
import { useEarningRules, useEarningRuleAction } from "@/modules/earningRules/hooks/useEarningRules";
import { parseRuleAmount } from "@/modules/earningRules/calculatePreview";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { FlowStrip } from "@/components/workspace/FlowStrip";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { EarningRuleAction } from "@/services/earningRules/earningRuleService";
import styles from "./EarningRulesPage.module.css";

const TABS = ["Active rules", "Rider rules", "Picker rules", "Scheduled", "Conflicts"];

const FLOW = ["Draft", "Conditions set", "Previewed", "Approved", "Active", "Expired"].map((label) => ({
  label,
  actor: "",
}));
const FLOW_AT = 4;

export function EarningRulesPage() {
  const { data: rules, isLoading, isError, refetch } = useEarningRules();
  const [tab, setTab] = useState(TABS[0] as string);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [previewUnits, setPreviewUnits] = useState("1");
  const action = useEarningRuleAction();
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);

  const filtered = useMemo(() => {
    if (!rules) return [];
    switch (tab) {
      case "Rider rules":
        return rules.filter((r) => r.appliesTo === "Rider");
      case "Picker rules":
        return rules.filter((r) => r.appliesTo === "Picker");
      case "Scheduled":
        return rules.filter((r) => r.status.label.startsWith("Starts"));
      case "Conflicts":
        return rules.filter((r) => r.conflictWith);
      default:
        return rules.filter((r) => r.status.label === "Active" || r.status.label === "Pending approval");
    }
  }, [rules, tab]);

  const selected = rules?.find((r) => r.id === (selectedId ?? filtered[0]?.id));

  if (isLoading) return <CardSkeleton />;
  if (isError || !rules) return <ErrorState message="Couldn't load earning rules." onRetry={() => refetch()} />;

  const conflicts = rules.filter((r) => r.conflictWith).length;
  const canApprove = can("earn-rules", "approve");
  const canEdit = can("earn-rules", "edit");

  function runAction(a: EarningRuleAction) {
    if (!selected) return;
    action.mutate(
      { id: selected.id, action: a },
      {
        onSuccess: () => pushToast(`${a}: ${selected.name}`, "success"),
        onError: () => pushToast(`Couldn't apply ${a}`, "error"),
      }
    );
  }

  const preview = selected ? parseRuleAmount(selected) : null;
  const units = Number(previewUnits) || 0;

  return (
    <div className={styles.wrap}>
      <Card className={styles.hintCard}>
        <p className={styles.hint}>
          Rules that compute what riders and pickers earn. Editing an active rule creates a new version — it never
          overwrites.
        </p>
      </Card>

      <KpiStrip
        moduleId="earn-rules"
        kpis={[
          { value: String(rules.filter((r) => r.status.label === "Active").length), label: "Active rules" },
          { value: String(rules.filter((r) => r.appliesTo === "Rider").length), label: "Rider rules" },
          { value: String(rules.filter((r) => r.appliesTo === "Picker").length), label: "Picker rules" },
          { value: String(rules.filter((r) => r.status.label.startsWith("Starts")).length), label: "Scheduled" },
          { value: String(conflicts), label: "Conflicts", color: conflicts ? "var(--red-tx)" : undefined },
          {
            value:
              rules.length === 0
                ? "—"
                : (() => {
                    const versions = rules.map((r) => String(r.version || "").replace(/^v/i, "")).filter(Boolean);
                    const nums = versions.map((v) => Number(v)).filter((n) => Number.isFinite(n));
                    if (nums.length) return `v${Math.max(...nums)}`;
                    return String(rules[0]?.version || "—");
                  })(),
            label: "Latest version",
          },
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
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <Button size="sm" variant="ghost" onClick={() => refetch()}>
          Refresh
        </Button>
        {canEdit ? (
          <Button size="sm" variant="primary" disabled={!selected} onClick={() => selected && runAction("Submit for approval")}>
            Submit for approval
          </Button>
        ) : null}
        {canApprove ? (
          <Button size="sm" disabled={!selected} onClick={() => selected && runAction("Approve rule")}>
            Approve rule
          </Button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={`No rules in "${tab}"`} />
      ) : (
        <div className={styles.board}>
          <Card className={styles.list}>
            {filtered.map((r) => (
              <button
                key={r.id}
                type="button"
                className={styles.listRow}
                data-selected={r.id === selected?.id}
                onClick={() => {
                  setSelectedId(r.id);
                  setPreviewUnits("1");
                }}
              >
                <div className={styles.listTop}>
                  <span className={styles.listName}>{r.name}</span>
                  <Badge label={r.status.label} tone={r.status.tone} />
                </div>
                <div className={styles.listMeta}>
                  {r.appliesTo} · {r.component} · {r.scope}
                </div>
              </button>
            ))}
          </Card>

          {selected && preview ? (
            <Card className={styles.detail}>
              <div className={styles.detailHeader}>
                <div>
                  <div className={styles.detailName}>{selected.name}</div>
                  <div className={styles.detailMeta}>
                    {selected.appliesTo} · {selected.component}
                  </div>
                </div>
                <div className={styles.detailBadges}>
                  <span className={styles.versionBadge}>{selected.version}</span>
                  <Badge label={selected.status.label} tone={selected.status.tone} />
                </div>
              </div>

              <div className={styles.formulaCard}>
                <div className={styles.formulaLabel}>If</div>
                <div className={styles.formulaIf}>{selected.condition}</div>
                <div className={styles.formulaLabel} style={{ marginTop: 14 }}>
                  Then apply
                </div>
                <div className={styles.formulaThen}>{selected.amount}</div>
              </div>

              {selected.conflictWith ? (
                <div className={styles.conflictBanner}>
                  <div className={styles.conflictTitle}>Conflict detected</div>
                  <div className={styles.conflictBody}>
                    {selected.conflictWith} covers the same window and scope. Resolve before the week closes.
                  </div>
                </div>
              ) : null}

              <div className={styles.previewCard}>
                <div className={styles.previewTitle}>Preview calculation</div>
                {preview.isPerUnit ? (
                  <div className={styles.previewRow}>
                    <Input
                      value={previewUnits}
                      onChange={(e) => setPreviewUnits(e.target.value.replace(/[^\d.]/g, ""))}
                      style={{ width: 90 }}
                      aria-label={`Number of ${preview.unit}`}
                    />
                    <span className={styles.previewUnit}>{preview.unit}</span>
                    <span className={styles.previewEquals}>=</span>
                    <span className={styles.previewResult}>₹{preview.compute(units).toLocaleString("en-IN")}</span>
                  </div>
                ) : (
                  <div className={styles.previewRow}>
                    <span className={styles.previewFlatLabel}>Flat amount, applied once per match:</span>
                    <span className={styles.previewResult}>{preview.flatAmount}</span>
                  </div>
                )}
                <div className={styles.previewFooter}>Rule version {selected.version} applied</div>
              </div>

              <div className={styles.actionsRow}>
                {canEdit ? (
                  <Button size="sm" onClick={() => runAction("Submit for approval")}>
                    Submit for approval
                  </Button>
                ) : null}
                {canApprove ? (
                  <Button size="sm" variant="primary" onClick={() => runAction("Approve rule")}>
                    Approve rule
                  </Button>
                ) : null}
                {canApprove ? (
                  <Button size="sm" onClick={() => runAction("Schedule rule")}>
                    Schedule rule
                  </Button>
                ) : null}
                {selected.conflictWith && canEdit ? (
                  <Button size="sm" onClick={() => runAction("Resolve conflict")}>
                    Resolve conflict
                  </Button>
                ) : null}
                {canEdit ? (
                  <Button size="sm" variant="danger" onClick={() => runAction("Expire rule")}>
                    Expire rule
                  </Button>
                ) : null}
              </div>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
