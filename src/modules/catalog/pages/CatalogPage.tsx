import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Plus, Upload, Search, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import {
  useCatalogProductsPaged,
  useCatalogProducts,
  useSetProductPublished,
  useCreateProduct,
  useBulkUpload,
  useGetProduct,
  useUpdateProduct,
} from "@/modules/catalog/hooks/useCatalog";
import { useCategories } from "@/modules/categories/hooks/useCategories";
import { warehouseCreateService } from "@/services/warehouseCreate/warehouseCreateService";
import { warehouseInventoryService } from "@/services/warehouseInventory/warehouseInventoryService";
import { ProductFormModal } from "@/modules/catalog/components/ProductFormModal";
import { BulkUploadModal } from "@/modules/catalog/components/BulkUploadModal";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { AdminProductInput, CatalogProduct } from "@/types/catalog";
import type { BulkUploadResult } from "@/services/catalog/catalogService";
import styles from "./CatalogPage.module.css";

const PAGE_SIZE = 36;
const TABS = ["Products", "Barcodes", "Categories", "Pricing", "Availability"] as const;

function LiveTable({
  columns,
  rows,
  emptyTitle,
}: {
  columns: string[];
  rows: string[][];
  emptyTitle: string;
}) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} />;
  return (
    <Card className={styles.tableCard}>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((c, ci) => (
                <th key={`${c}-${ci}`}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row[0] ?? "row"}-${i}`}>
                {row.map((cell, j) => (
                  <td key={j} className={j === 0 ? styles.mono : undefined}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function deriveKpis(all: CatalogProduct[], totalHint?: number) {
  const total = totalHint ?? all.length;
  const active = all.filter((p) => p.status.label === "Active").length;
  const draft = all.filter((p) => p.status.label === "Draft").length;
  const inactive = all.filter((p) => p.status.label === "Inactive").length;
  const oos = all.filter((p) => {
    const n = Number(String(p.storesLive).replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) && n <= 0;
  }).length;
  return [
    { value: total.toLocaleString(), label: "Products" },
    { value: String(active), label: "Active (sample)" },
    { value: String(oos), label: "Out of stock (sample)", color: oos ? "var(--red-tx)" : undefined },
    { value: String(draft), label: "Draft (sample)" },
    { value: String(inactive), label: "Inactive (sample)" },
  ];
}

export function CatalogPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Products");
  const [pendingSku, setPendingSku] = useState<string | undefined>(undefined);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [filterWarehouseId, setFilterWarehouseId] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(searchInput.trim());
      setPage(1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const { data: warehouseData } = useQuery({
    queryKey: ["warehouses-list"],
    queryFn: () => warehouseCreateService.list(),
    staleTime: 120_000,
  });
  const warehouses = (warehouseData?.data ?? []).filter((w) => w.type === "warehouse");

  const { data: paged, isLoading, isError, refetch } = useCatalogProductsPaged({
    page,
    limit: PAGE_SIZE,
    q: debouncedQ,
    warehouseId: filterWarehouseId || undefined,
  });
  const products = paged?.products ?? [];

  // Live sample for KPIs + secondary tabs (first page of unfiltered catalog)
  const { data: allProducts = [] } = useCatalogProducts();
  const { data: categories = [] } = useCategories();

  const setPublished = useSetProductPublished();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const bulkUpload = useBulkUpload();
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);
  const canEdit = can("catalog", "edit");

  const { data: editProductData } = useGetProduct(editProductId);

  const kpis = useMemo(
    () => deriveKpis(allProducts, paged?.total),
    [allProducts, paged?.total],
  );

  const barcodeRows = useMemo(
    () =>
      allProducts.slice(0, 50).map((p) => [
        p.sku,
        p.name,
        p.sku || "—",
        "Catalog",
        "SKU",
        p.imageUrl ? "Has image" : "No image",
        p.storesLive,
        p.status.label,
      ]),
    [allProducts],
  );

  const categoryRows = useMemo(() => {
    const top = categories.filter((c) => c.parentId === null);
    if (top.length) {
      return top.map((c) => [
        c.id.slice(0, 8),
        c.name,
        "Top level",
        "—",
        "—",
        "—",
        `${c.products} SKUs`,
        c.status?.label ?? "Active",
      ]);
    }
    const counts = new Map<string, number>();
    for (const p of allProducts) {
      const cat = p.category || "—";
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, n], i) => [
      `CAT-${i + 1}`,
      name,
      "From products",
      "—",
      "—",
      "—",
      `${n} SKUs`,
      "Active",
    ]);
  }, [categories, allProducts]);

  const pricingRows = useMemo(
    () =>
      allProducts.slice(0, 50).map((p) => [
        p.sku,
        p.name,
        p.category,
        p.unit,
        p.mrp,
        p.selling,
        p.mrp !== p.selling ? "Discounted" : "Uniform",
        p.status.label,
      ]),
    [allProducts],
  );

  const availabilityRows = useMemo(
    () =>
      allProducts.slice(0, 50).map((p) => {
        const n = Number(String(p.storesLive).replace(/[^\d.-]/g, ""));
        const stockLabel = Number.isFinite(n)
          ? n <= 0
            ? "Out of stock"
            : `Stock ${n}`
          : p.storesLive;
        return [p.sku, p.name, p.category, p.unit, p.mrp, p.selling, stockLabel, p.status.label];
      }),
    [allProducts],
  );

  if (isLoading && !paged) return <CardSkeleton />;
  if (isError && !paged) return <ErrorState message="Couldn't load the catalog." onRetry={() => refetch()} />;

  function handleCreateProduct(input: AdminProductInput) {
    createProduct.mutate(input, {
      onSuccess: () => {
        pushToast(`${input.sku} created`, "success");
        setProductModalOpen(false);
      },
      onError: (e) => pushToast((e as Error).message, "error"),
    });
  }

  function handleEditProduct(input: AdminProductInput) {
    if (!editProductId) return;
    const { warehouseStock, ...productFields } = input;
    updateProduct.mutate(
      { id: editProductId, input: productFields },
      {
        onSuccess: async () => {
          const rows = (warehouseStock ?? []).filter((r) => r.warehouseId);
          if (rows.length > 0) {
            try {
              const whInv = await warehouseInventoryService.list();
              await Promise.all(
                rows.map((row) => {
                  const existing = whInv.items.find(
                    (i) => String(i.warehouseId) === row.warehouseId && String(i.productId) === editProductId,
                  );
                  if (existing) {
                    return warehouseInventoryService.update(existing._id, { quantity: row.quantity });
                  }
                  return warehouseInventoryService.add({
                    warehouseId: row.warehouseId,
                    productId: editProductId!,
                    quantity: row.quantity,
                  });
                }),
              );
              queryClient.invalidateQueries({ queryKey: ["wh-inventory"] });
            } catch {
              /* non-fatal */
            }
          }
          pushToast(`${input.sku} updated`, "success");
          setEditProductId(null);
          setProductModalOpen(false);
        },
        onError: (e) => pushToast((e as Error).message, "error"),
      },
    );
  }

  function handleBulkUpload(file: File) {
    bulkUpload.mutate(file, {
      onSuccess: (result) => setUploadResult(result),
      onError: (e) => pushToast((e as Error).message, "error"),
    });
  }

  function togglePublish(sku: string, currentlyDraft: boolean, id?: string) {
    setPendingSku(sku);
    setPublished.mutate(
      { sku, published: currentlyDraft, id },
      {
        onSuccess: () => pushToast(`${sku} ${currentlyDraft ? "published" : "unpublished"}`, "success"),
        onError: () => pushToast("Couldn't update product status", "error"),
        onSettled: () => setPendingSku(undefined),
      },
    );
  }

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId="catalog" />

      <KpiStrip kpis={kpis} moduleId="catalog" />

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
        <div className={styles.tabsSpacer} />
        {canEdit ? (
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setUploadResult(undefined);
                setUploadModalOpen(true);
              }}
            >
              <Upload size={13} /> Bulk upload
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setEditProductId(null);
                setProductModalOpen(true);
              }}
            >
              <Plus size={13} /> New product
            </Button>
          </>
        ) : null}
      </div>

      {tab === "Products" ? (
        <>
          <div className={styles.searchRow}>
            <div className={styles.searchWrap}>
              <Search size={14} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                type="search"
                placeholder="Search by name, SKU, or brand…"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            {warehouses.length > 0 && (
              <select
                className={styles.warehouseFilter}
                value={filterWarehouseId}
                onChange={(e) => {
                  setFilterWarehouseId(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by warehouse"
              >
                <option value="">All warehouses</option>
                {warehouses.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            )}
            {paged && (
              <span className={styles.resultCount}>
                {paged.total.toLocaleString()} product{paged.total !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {products.length === 0 ? (
            <EmptyState title={debouncedQ ? `No products matching "${debouncedQ}"` : "No products in the catalog"} />
          ) : (
            <>
              <div className={styles.productGrid}>
                {products.map((p) => {
                  const isDraft = p.status.label === "Draft";
                  return (
                    <Card key={p._id || p.sku} className={styles.productCard}>
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className={styles.productImage} />
                      ) : (
                        <div className={styles.productImageFallback}>
                          {p.name
                            .split(" ")
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join("")
                            .toUpperCase()}
                        </div>
                      )}
                      <div className={styles.cardTop}>
                        <span className={styles.sku}>{p.sku}</span>
                        <Badge label={p.status.label} tone={p.status.tone} />
                      </div>
                      <div className={styles.productName}>{p.name}</div>
                      <div className={styles.cardMeta}>
                        {p.category} · {p.unit}
                      </div>

                      <div className={styles.priceRow}>
                        <div className={styles.priceCell}>
                          <span className={styles.priceValue} data-strike>
                            {p.mrp}
                          </span>
                          <span className={styles.priceLabel}>MRP</span>
                        </div>
                        <div className={styles.priceCell}>
                          <span className={styles.priceValue}>{p.selling}</span>
                          <span className={styles.priceLabel}>Selling</span>
                        </div>
                        <div className={styles.priceCell}>
                          <span className={styles.priceValue}>{p.storesLive}</span>
                          <span className={styles.priceLabel}>In stock</span>
                        </div>
                      </div>

                      {canEdit ? (
                        <div className={styles.actionRow}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <Button
                              size="sm"
                              variant={isDraft ? "primary" : "secondary"}
                              isLoading={setPublished.isPending && pendingSku === p.sku}
                              onClick={() => togglePublish(p.sku, isDraft, p._id)}
                            >
                              {isDraft ? <Eye size={13} /> : <EyeOff size={13} />}
                              {isDraft ? "Publish" : "Unpublish"}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setEditProductId(p._id);
                                setProductModalOpen(true);
                              }}
                              title="Edit product"
                            >
                              <Pencil size={13} />
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </Card>
                  );
                })}
              </div>

              {paged && paged.totalPages > 1 && (
                <div className={styles.pagination}>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className={styles.pageInfo}>
                    Page {paged.page} of {paged.totalPages}
                  </span>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={page >= paged.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      ) : null}

      {tab === "Barcodes" ? (
        <LiveTable
          columns={["SKU", "Product", "Code", "Source", "Type", "Image", "Stock", "Status"]}
          rows={barcodeRows}
          emptyTitle='No barcode rows from live catalog'
        />
      ) : null}
      {tab === "Categories" ? (
        <LiveTable
          columns={["ID", "Category", "Level", "—", "—", "—", "SKUs", "Status"]}
          rows={categoryRows}
          emptyTitle="No categories from live API"
        />
      ) : null}
      {tab === "Pricing" ? (
        <LiveTable
          columns={["SKU", "Product", "Category", "Unit", "MRP", "Selling", "Pricing", "Status"]}
          rows={pricingRows}
          emptyTitle="No pricing rows from live catalog"
        />
      ) : null}
      {tab === "Availability" ? (
        <LiveTable
          columns={["SKU", "Product", "Category", "Unit", "MRP", "Selling", "Stock", "Status"]}
          rows={availabilityRows}
          emptyTitle="No availability rows from live catalog"
        />
      ) : null}

      <ProductFormModal
        open={productModalOpen}
        onOpenChange={(o) => {
          setProductModalOpen(o);
          if (!o) setEditProductId(null);
        }}
        onSubmit={editProductId ? handleEditProduct : handleCreateProduct}
        isLoading={editProductId ? updateProduct.isPending : createProduct.isPending}
        editProduct={editProductId ? (editProductData ?? null) : null}
      />

      <BulkUploadModal
        open={uploadModalOpen}
        onOpenChange={(o) => {
          setUploadModalOpen(o);
          if (!o) setUploadResult(undefined);
        }}
        onUpload={handleBulkUpload}
        isLoading={bulkUpload.isPending}
        result={uploadResult}
      />
    </div>
  );
}
