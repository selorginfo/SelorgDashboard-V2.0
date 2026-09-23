import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Search, PackageCheck, AlertTriangle } from "lucide-react";
import { darkStoreInventoryService, type AddInventoryPayload } from "@/services/darkStoreInventory/darkStoreInventoryService";
import { useStoreRecords } from "@/modules/darkstore/hooks/useStores";
import { api } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import styles from "./DarkStoreProductsPage.module.css";

interface RawProduct {
  _id?: string;
  id?: string;
  name?: string;
  sku?: string;
  price?: number;
  mrp?: number;
  imageUrl?: string;
  thumbnailUrl?: string;
}

const EMPTY_FORM: AddInventoryPayload = {
  storeId: "",
  productId: "",
  quantity: 0,
  isAvailable: true,
  lowStockThreshold: 5,
};

export function DarkStoreProductsPage() {
  const queryClient = useQueryClient();
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddInventoryPayload>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState(0);
  const [editThreshold, setEditThreshold] = useState(5);

  const { data: storeRecords = [] } = useStoreRecords();

  // Auto-select first store once records load
  useEffect(() => {
    if (!selectedStoreId && storeRecords.length > 0) {
      setSelectedStoreId(storeRecords[0]._id);
    }
  }, [storeRecords, selectedStoreId]);

  // All-store counts for the dropdown (so user knows which stores have inventory)
  const { data: allInventory } = useQuery({
    queryKey: ["ds-inventory-all-counts"],
    queryFn: () => darkStoreInventoryService.list(),
    staleTime: 60_000,
  });
  const countByStore = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of allInventory?.items ?? []) {
      const sid = String(item.storeId);
      map[sid] = (map[sid] ?? 0) + 1;
    }
    return map;
  }, [allInventory]);

  // Inventory for selected store
  const { data: inventoryData, isLoading, isError } = useQuery({
    queryKey: ["ds-inventory", selectedStoreId],
    queryFn: () => darkStoreInventoryService.list(selectedStoreId || undefined),
    enabled: !!selectedStoreId,
    staleTime: 30_000,
  });

  // Full product catalog for the add dialog
  const { data: allProducts = [] } = useQuery({
    queryKey: ["products-for-select"],
    queryFn: async (): Promise<RawProduct[]> => {
      try {
        const res = await api.get<{ list?: RawProduct[]; data?: RawProduct[] } | RawProduct[]>("/api/v1/admin/products");
        return Array.isArray(res) ? res : ((res as { list?: RawProduct[] }).list ?? (res as { data?: RawProduct[] }).data ?? []);
      } catch { return []; }
    },
    staleTime: 120_000,
  });

  const items = inventoryData?.items ?? [];
  const total = inventoryData?.total ?? 0;

  // Already-added product IDs for this store (exclude from picker)
  const addedProductIds = new Set(items.map((i) => String(i.productId)));

  // Filter catalog by search, exclude already-added
  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase();
    return allProducts.filter((p) => {
      const id = String(p._id ?? p.id ?? "");
      if (addedProductIds.has(id)) return false;
      return !q || (p.name ?? "").toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q);
    });
  }, [allProducts, productSearch, addedProductIds]);

  // KPIs
  const available = items.filter((i) => i.isAvailable).length;
  const lowStock = items.filter((i) => i.quantity <= i.lowStockThreshold && i.quantity > 0).length;
  const outOfStock = items.filter((i) => i.quantity === 0).length;

  const addMutation = useMutation({
    mutationFn: darkStoreInventoryService.add,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ds-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["ds-inventory-all-counts"] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setProductSearch("");
      setFormError(null);
    },
    onError: (err: Error) => setFormError(err.message ?? "Failed to add product."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof darkStoreInventoryService.update>[1] }) =>
      darkStoreInventoryService.update(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ds-inventory"] });
      setEditId(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      darkStoreInventoryService.update(id, { isAvailable }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ds-inventory"] }),
  });

  const removeMutation = useMutation({
    mutationFn: darkStoreInventoryService.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ds-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["ds-inventory-all-counts"] });
    },
  });

  function openForm() {
    setForm({ ...EMPTY_FORM, storeId: selectedStoreId });
    setProductSearch("");
    setFormError(null);
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.storeId) { setFormError("Select a dark store first."); return; }
    if (!form.productId) { setFormError("Select a product."); return; }
    setFormError(null);
    addMutation.mutate(form);
  }

  function startEdit(id: string, qty: number, threshold: number) {
    setEditId(id);
    setEditQty(qty);
    setEditThreshold(threshold);
  }

  function saveEdit(id: string) {
    updateMutation.mutate({ id, patch: { quantity: editQty, lowStockThreshold: editThreshold } });
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Dark Store Products</h2>
          <p className={styles.subtitle}>Manage which products are stocked at each dark store.</p>
        </div>
        <Button size="sm" onClick={openForm} disabled={!selectedStoreId}>
          <Plus size={14} /> Add Product
        </Button>
      </div>

      {/* Store selector */}
      <div className={styles.storeBar}>
        <select
          className={styles.storeSelect}
          value={selectedStoreId}
          onChange={(e) => setSelectedStoreId(e.target.value)}
        >
          {storeRecords.map((s) => {
            const count = countByStore[s._id] ?? 0;
            return (
              <option key={s._id} value={s._id}>
                {s.name} ({s.code}){count > 0 ? ` · ${count} SKUs` : ""}
              </option>
            );
          })}
        </select>
        {selectedStoreId && (
          <span className={styles.totalCount}>{total} product{total !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* KPI chips */}
      {selectedStoreId && items.length > 0 && (
        <div className={styles.kpiRow}>
          <div className={styles.kpiChip}>
            <PackageCheck size={13} />
            <span className={styles.kpiVal}>{available}</span>
            <span className={styles.kpiLabel}>Available</span>
          </div>
          <div className={`${styles.kpiChip} ${lowStock > 0 ? styles.kpiAmber : ""}`}>
            <AlertTriangle size={13} />
            <span className={styles.kpiVal}>{lowStock}</span>
            <span className={styles.kpiLabel}>Low stock</span>
          </div>
          <div className={`${styles.kpiChip} ${outOfStock > 0 ? styles.kpiRed : ""}`}>
            <span className={styles.kpiVal}>{outOfStock}</span>
            <span className={styles.kpiLabel}>Out of stock</span>
          </div>
          <div className={styles.kpiChip}>
            <span className={styles.kpiVal}>{items.length - available}</span>
            <span className={styles.kpiLabel}>Unavailable</span>
          </div>
        </div>
      )}

      {!selectedStoreId ? (
        <p className={styles.empty}>Loading stores…</p>
      ) : isLoading ? (
        <p className={styles.empty}>Loading…</p>
      ) : isError ? (
        <p className={styles.error}>Failed to load inventory.</p>
      ) : items.length === 0 ? (
        <Card className={styles.emptyCard}>
          <p className={styles.empty}>No products added to this store yet. Click <strong>Add Product</strong> to get started.</p>
        </Card>
      ) : (
        <Card className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Price</th>
                <th>Stock Qty</th>
                <th>Reserved</th>
                <th>Low Stock Alert</th>
                <th>Available</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const p = item.product;
                const isLow = item.quantity > 0 && item.quantity <= item.lowStockThreshold;
                const isOut = item.quantity === 0;
                const isEditing = editId === item._id;
                return (
                  <tr key={item._id}>
                    <td>
                      <div className={styles.productCell}>
                        {p?.imageUrl && (
                          <img src={p.imageUrl} alt={p.name ?? ""} className={styles.productImg} />
                        )}
                        <span className={styles.productName}>{p?.name ?? "Unknown product"}</span>
                      </div>
                    </td>
                    <td className={styles.skuCell}>{p?.sku ?? "—"}</td>
                    <td className={styles.priceCell}>
                      {p?.mrp != null ? `₹${p.mrp}` : "—"}
                      {p?.price != null && p.price !== p.mrp && (
                        <span className={styles.sellingPrice}> · ₹{p.price}</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          className={styles.qtyInput}
                          value={editQty}
                          onChange={(e) => setEditQty(Number(e.target.value))}
                        />
                      ) : (
                        <span
                          className={`${styles.qtyValue} ${isOut ? styles.qtyOut : isLow ? styles.qtyLow : ""}`}
                          onClick={() => startEdit(item._id, item.quantity, item.lowStockThreshold)}
                          title="Click to edit"
                        >
                          {item.quantity}
                          {isOut && <span className={styles.stockTag}>Out</span>}
                          {isLow && !isOut && <span className={styles.stockTagLow}>Low</span>}
                        </span>
                      )}
                    </td>
                    <td className={styles.muteCell}>{item.reservedQty}</td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          className={styles.qtyInput}
                          value={editThreshold}
                          onChange={(e) => setEditThreshold(Number(e.target.value))}
                        />
                      ) : (
                        <span className={styles.muteCell}>{item.lowStockThreshold}</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.toggleBtn}
                        onClick={() => toggleMutation.mutate({ id: item._id, isAvailable: !item.isAvailable })}
                      >
                        <Badge label={item.isAvailable ? "Yes" : "No"} tone={item.isAvailable ? "green" : "grey"} />
                      </button>
                    </td>
                    <td className={styles.actionCell}>
                      {isEditing ? (
                        <>
                          <Button size="sm" variant="primary" onClick={() => saveEdit(item._id)}>Save</Button>
                          <Button size="sm" variant="secondary" onClick={() => setEditId(null)}>Cancel</Button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className={styles.deleteBtn}
                          onClick={() => { if (confirm(`Remove "${p?.name ?? "product"}" from this store?`)) removeMutation.mutate(item._id); }}
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Add Product Dialog */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => { if (!open) { setShowForm(false); setProductSearch(""); setFormError(null); } }}
        title="Add Product to Dark Store"
        description="Select a product from the catalog and set its initial stock."
      >
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Store */}
          <label className={styles.label}>
            Dark Store *
            <select
              className={styles.input}
              value={form.storeId}
              onChange={(e) => setForm((f) => ({ ...f, storeId: e.target.value, productId: "" }))}
              required
            >
              <option value="">— Select dark store —</option>
              {storeRecords.map((s) => (
                <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </label>

          {/* Product search */}
          <div className={styles.label}>
            Product *
            <div className={styles.searchWrap}>
              <Search size={13} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Search by name or SKU…"
                value={productSearch}
                onChange={(e) => { setProductSearch(e.target.value); setForm((f) => ({ ...f, productId: "" })); }}
              />
            </div>
            <div className={styles.productList}>
              {filteredProducts.length === 0 ? (
                <div className={styles.listEmpty}>
                  {productSearch ? "No products match your search." : "All products already added, or catalog is empty."}
                </div>
              ) : (
                filteredProducts.slice(0, 30).map((p) => {
                  const id = String(p._id ?? p.id ?? "");
                  return (
                    <button
                      key={id}
                      type="button"
                      className={styles.productRow}
                      data-selected={id === form.productId}
                      onClick={() => { setForm((f) => ({ ...f, productId: id })); setProductSearch(p.name ?? ""); }}
                    >
                      {p.imageUrl && <img src={p.imageUrl} alt="" className={styles.rowImg} />}
                      <div>
                        <div className={styles.rowName}>{p.name}</div>
                        <div className={styles.rowMeta}>{p.sku}{p.mrp != null ? ` · ₹${p.mrp}` : ""}</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Qty + threshold */}
          <div className={styles.formRow}>
            <label className={styles.label}>
              Initial Quantity
              <input
                className={styles.input}
                type="number"
                min={0}
                value={form.quantity ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
              />
            </label>
            <label className={styles.label}>
              Low Stock Alert (qty)
              <input
                className={styles.input}
                type="number"
                min={0}
                value={form.lowStockThreshold ?? 5}
                onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: Number(e.target.value) }))}
              />
            </label>
          </div>

          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={form.isAvailable ?? true}
              onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))}
            />
            Available for ordering
          </label>

          {formError && <p className={styles.error}>{formError}</p>}

          <div className={styles.formActions}>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={addMutation.isPending || !form.productId}>
              {addMutation.isPending ? "Adding…" : "Add to Store"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
