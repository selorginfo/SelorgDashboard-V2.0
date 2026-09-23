import { useMemo, useState, useCallback } from "react";
import { ChevronRight, ChevronDown, Plus } from "lucide-react";
import { useCategories, useSetCategoryStatus, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/modules/categories/hooks/useCategories";
import { CategoryFormModal } from "@/modules/categories/components/CategoryFormModal";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { ViewToggle, type ViewMode } from "@/components/workspace/ViewToggle";
import { RecordsListTable } from "@/components/workspace/RecordsListTable";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { Category } from "@/types/category";
import type { CategoryFormInput } from "@/types/category";
import type { WorkspaceRow } from "@/types/common";
import styles from "./CategoryTreePage.module.css";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function CategoryThumb({ src, name, className, fallbackClass }: { src?: string; name: string; className: string; fallbackClass: string }) {
  const [broken, setBroken] = useState(false);
  const handleError = useCallback(() => setBroken(true), []);
  if (src && !broken) {
    return <img src={src} alt={name} className={className} onError={handleError} />;
  }
  return <span className={fallbackClass}>{initials(name)}</span>;
}

export function CategoryTreePage() {
  const { data: categories, isLoading, isError, refetch } = useCategories();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [view, setView] = useState<ViewMode>("workspace");
  const setStatus = useSetCategoryStatus();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalEditing, setModalEditing] = useState<Category | undefined>(undefined);
  const [modalDefaultParent, setModalDefaultParent] = useState<string | null>(null);

  const topLevel = useMemo(() => (categories ?? []).filter((c) => c.parentId === null), [categories]);
  const childrenOf = (id: string) => (categories ?? []).filter((c) => c.parentId === id);

  if (isLoading) return <CardSkeleton />;
  if (isError || !categories) {
    return <ErrorState message="Couldn't load categories." onRetry={() => refetch()} />;
  }

  const totalProducts = categories.reduce((sum, c) => sum + (c.parentId === null ? c.products : 0), 0);
  const emptyBranches = topLevel.filter((c) => c.products === 0 && childrenOf(c.id).length === 0).length;
  const disabled = categories.filter((c) => c.status?.tone === "grey" && c.status?.label === "Disabled").length;

  const canEdit = can("categories", "edit");
  const canDelete = can("categories", "delete");

  const selected = categories.find((c) => c.id === selectedId) ?? topLevel[0];
  const selectedKids = selected ? childrenOf(selected.id) : [];
  const deleteBlocked = !!selected && (selected.products > 0 || selectedKids.length > 0);

  function openNew() {
    setModalEditing(undefined);
    setModalDefaultParent(null);
    setModalOpen(true);
  }

  function openAddSubcategory(parentId: string) {
    setModalEditing(undefined);
    setModalDefaultParent(parentId);
    setModalOpen(true);
  }

  function openEdit(category: Category) {
    setModalEditing(category);
    setModalDefaultParent(null);
    setModalOpen(true);
  }

  function handleModalSubmit(input: CategoryFormInput) {
    if (modalEditing) {
      updateCategory.mutate(
        { id: modalEditing.id, input },
        {
          onSuccess: () => { pushToast(`${input.name} updated`, "success"); setModalOpen(false); },
          onError: (e) => pushToast((e as Error).message, "error"),
        }
      );
    } else {
      createCategory.mutate(input, {
        onSuccess: () => { pushToast(`${input.name} created`, "success"); setModalOpen(false); },
        onError: (e) => pushToast((e as Error).message, "error"),
      });
    }
  }

  function runAction(label: string, category: Category) {
    if (label === "Disable category") {
      setStatus.mutate(
        { id: category.id, status: { label: "Disabled", tone: "grey" } },
        { onSuccess: () => pushToast(`${category.name} disabled`, "success") }
      );
      return;
    }
    if (label === "Add subcategory") {
      openAddSubcategory(category.id);
      return;
    }
    if (label === "Edit category") {
      openEdit(category);
      return;
    }
    if (label === "Delete category") {
      if (!window.confirm(`Delete "${category.name}"? This cannot be undone.`)) return;
      deleteCategory.mutate(category.id, {
        onSuccess: () => { pushToast(`${category.name} deleted`, "success"); setSelectedId(undefined); },
        onError: (e) => pushToast((e as Error).message, "error"),
      });
      return;
    }
    pushToast(`${label}: ${category.name}`, "info");
  }

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId="categories" />

      <KpiStrip
        moduleId="categories"
        kpis={[
          { value: String(topLevel.length), label: "Top-level" },
          { value: String(categories.length - topLevel.length), label: "Subcategories" },
          { value: totalProducts.toLocaleString(), label: "Products mapped" },
          { value: String(emptyBranches), label: "Empty branches", color: emptyBranches ? "var(--amber-tx)" : undefined },
          { value: String(disabled), label: "Disabled" },
          {
            value: String(categories.filter((c) => c.status?.label !== "Disabled").length),
            label: "Active",
          },
        ]}
      />

      <div className={styles.headerRow}>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === "list" ? (
        <RecordsListTable
          columns={["Category", "Parent", "Products", "Sort order", "Status"]}
          rows={categories.map((c): WorkspaceRow => {
            const parent = c.parentId ? categories.find((p) => p.id === c.parentId) : undefined;
            return [c.name, parent?.name ?? "—", String(c.products), String(c.sortOrder), c.status];
          })}
          onRowClick={(i) => {
            setSelectedId(categories[i]!.id);
            setView("workspace");
          }}
        />
      ) : (
      <div className={styles.board}>
        <Card className={styles.treeCard}>
          <div className={styles.toolbar}>
            <div className={styles.treeTitle}>Category tree</div>
            {canEdit ? (
              <Button size="sm" onClick={openNew}>
                <Plus size={13} /> New
              </Button>
            ) : null}
          </div>

          <div className={styles.tree}>
            {topLevel
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((cat, catIdx) => {
                const kids = childrenOf(cat.id);
                const isOpen = !collapsed[cat.id];
                return (
                  <div key={`${cat.id}-${catIdx}`} className={styles.branch}>
                    <div className={styles.row}>
                      {kids.length > 0 ? (
                        <button
                          type="button"
                          className={styles.caret}
                          onClick={() => setCollapsed((s) => ({ ...s, [cat.id]: !s[cat.id] }))}
                          aria-label={isOpen ? "Collapse" : "Expand"}
                        >
                          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      ) : (
                        <span className={styles.caretSpacer} />
                      )}
                      <CategoryThumb
                        src={cat.thumbnailUrl || cat.imageUrl}
                        name={cat.name}
                        className={styles.thumb}
                        fallbackClass={styles.thumbFallback}
                      />
                      <button
                        type="button"
                        className={styles.nameBtn}
                        data-selected={cat.id === selected?.id}
                        onClick={() => setSelectedId(cat.id)}
                      >
                        {cat.name}
                      </button>
                      <span className={styles.meta}>{cat.products} SKUs</span>
                      <Badge label={cat.status?.label} tone={cat.status?.tone} />
                    </div>
                    {isOpen && kids.length > 0 ? (
                      <div className={styles.children}>
                        {kids
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((child, childIdx) => (
                            <button
                              type="button"
                              key={`${child.id}-${childIdx}`}
                              className={styles.childRow}
                              data-selected={child.id === selected?.id}
                              onClick={() => setSelectedId(child.id)}
                            >
                              <CategoryThumb
                                src={child.thumbnailUrl || child.imageUrl || cat.thumbnailUrl || cat.imageUrl}
                                name={child.name}
                                className={styles.thumb}
                                fallbackClass={styles.thumbFallback}
                              />
                              <span className={styles.name}>{child.name}</span>
                              <span className={styles.meta}>{child.products} SKUs</span>
                              <Badge label={child.status?.label} tone={child.status?.tone} />
                            </button>
                          ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
          </div>
        </Card>

        {selected ? (
          <Card className={styles.detailCard}>
            <div className={styles.detailHeader}>
              {(() => {
                const parent = selected.parentId ? categories.find((c) => c.id === selected.parentId) : undefined;
                const img = selected.imageUrl || selected.thumbnailUrl || parent?.imageUrl || parent?.thumbnailUrl;
                return (
                  <CategoryThumb
                    src={img}
                    name={selected.name}
                    className={styles.detailImage}
                    fallbackClass={styles.avatar}
                  />
                );
              })()}
              <div className={styles.detailHeaderBody}>
                <div className={styles.detailTitle}>{selected.name}</div>
                <div className={styles.detailMeta}>{selected.parentId === null ? "Top level category" : "Subcategory"}</div>
              </div>
              <Badge label={selected.status?.label} tone={selected.status?.tone} />
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statCell}>
                <span className={styles.statValue}>{selected.products}</span>
                <span className={styles.statLabel}>Products</span>
              </div>
              <div className={styles.statCell}>
                <span className={styles.statValue}>{selectedKids.length}</span>
                <span className={styles.statLabel}>Subcategories</span>
              </div>
              <div className={styles.statCell}>
                <span className={styles.statValue}>{selected.sortOrder}</span>
                <span className={styles.statLabel}>Sort order</span>
              </div>
              <div className={styles.statCell}>
                <span className={styles.statValue}>{selected.parentId === null ? "Top level" : "Subcategory"}</span>
                <span className={styles.statLabel}>Level</span>
              </div>
            </div>

            {canEdit ? (
              <div className={styles.actionsRow}>
                <Button size="sm" onClick={() => runAction("Add subcategory", selected)}>
                  Add subcategory
                </Button>
                <Button size="sm" onClick={() => runAction("Edit category", selected)}>
                  Edit category
                </Button>
                <Button size="sm" onClick={() => runAction("Reorder", selected)}>
                  Reorder
                </Button>
                <Button size="sm" onClick={() => runAction("Move products", selected)}>
                  Move products
                </Button>
                <Button size="sm" onClick={() => runAction("Disable category", selected)}>
                  Disable category
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={!canDelete || deleteBlocked}
                  onClick={() => runAction("Delete category", selected)}
                >
                  Delete category
                </Button>
              </div>
            ) : null}

            {deleteBlocked ? (
              <div className={styles.deleteBanner}>
                <div className={styles.deleteBannerTitle}>Delete is blocked</div>
                <div className={styles.deleteBannerBody}>
                  This category holds {selected.products} products
                  {selectedKids.length > 0 ? ` and ${selectedKids.length} subcategories` : ""}. Move them before it can be
                  deleted — or disable it instead, which hides it from the customer app without losing the mapping.
                </div>
              </div>
            ) : null}

            {selectedKids.length > 0 ? (
              <div className={styles.subList}>
                <div className={styles.subListTitle}>Subcategories</div>
                {selectedKids
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((child, i) => (
                    <div key={`${child.id}-${i}`} className={styles.subRow}>
                      <span className={styles.subOrder}>{i + 1}</span>
                      <CategoryThumb
                        src={child.thumbnailUrl || child.imageUrl || selected.imageUrl || selected.thumbnailUrl}
                        name={child.name}
                        className={styles.subThumb}
                        fallbackClass={styles.thumbFallback}
                      />
                      <span className={styles.subName}>{child.name}</span>
                      <span className={styles.subMeta}>{child.products} products</span>
                      <Badge label={child.status?.label} tone={child.status?.tone} />
                    </div>
                  ))}
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>
      )}

      <CategoryFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        categories={categories}
        editing={modalEditing}
        defaultParentId={modalDefaultParent}
        onSubmit={handleModalSubmit}
        isLoading={createCategory.isPending || updateCategory.isPending}
      />
    </div>
  );
}
