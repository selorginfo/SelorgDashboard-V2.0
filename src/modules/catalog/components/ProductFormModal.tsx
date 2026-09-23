import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Input, FieldLabel } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ImageUploadGrid } from "@/components/ui/ImageUploadGrid";
import { warehouseCreateService } from "@/services/warehouseCreate/warehouseCreateService";
import { warehouseInventoryService } from "@/services/warehouseInventory/warehouseInventoryService";
import type { AdminProductInput, WarehouseStockRow } from "@/types/catalog";
import type { FullProduct } from "@/services/catalog/catalogService";
import styles from "./ProductFormModal.module.css";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: AdminProductInput) => void;
  isLoading: boolean;
  editProduct?: FullProduct | null;
}

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const EMPTY: AdminProductInput = {
  // Identification
  sku: "", name: "", priority: undefined, skuClassification: "", skuSubClassification: "",
  skuSource: "", similarProducts: "",
  // Vendor & Brand
  primaryVendor: "", brandCode: "", mfgSkuCode: "",
  // Physical Specs
  size: "", uom: "", colour: "", material: "",
  weightKg: undefined, heightCm: undefined, lengthCm: undefined, widthCm: undefined, cube: undefined,
  primaryUpcEan: "", countryOfOrigin: "", hierarchyCode: "",
  // Pricing
  mrp: 0, price: 0, baseCost: 0,
  // Tax
  hsnCode: "", taxPercent: 0, sgstPercent: undefined, cgstPercent: undefined,
  igstPercent: undefined, cessPercent: undefined,
  // Content
  about: "", nutrition: "", originOfPlace: "", healthBenefits: "", shippingReturns: "",
  // Operational
  skuRotation: "", rotateBy: "", receivingValidationCode: "",
  pickingInstructions: "", shippingInstructions: "",
  thresholdAlertRequired: "", thresholdQty: undefined,
  shippingCharges: undefined, handlingCharges: undefined,
  isArsApplicable: "", followStyle: "", arsCalculationMethod: "",
  fixedStock: undefined, modelStock: undefined,
  // Media
  imageUrl: "", images: [], searchKeywords: "",
  // Order Limits
  orderLimitType: "", minQtyPerOrder: undefined, maxQtyPerOrder: undefined,
  maxWeightPerOrder: "", cartLimitPerOrder: "", maxOrderValue: "",
  maxCartQty: undefined, maxCartWeight: "", allowMixedPack: "", restrictionType: "",
  // Status & Stock
  status: "draft", stock: 0, warehouseStock: [],
};

const EMPTY_ROW: WarehouseStockRow = { warehouseId: "", quantity: 0 };

function descriptionText(d: FullProduct["description"]): string {
  if (!d) return "";
  if (typeof d === "string") return d;
  return d.about ?? "";
}

function num(v: number | undefined): number { return v ?? 0; }

function computeTaxSplit(taxPercent: number | undefined, mrp: number) {
  const rate = taxPercent ?? 0;
  const half = rate / 2;
  const base = mrp / (1 + rate / 100);
  const sgst = base * (half / 100);
  const cgst = base * (half / 100);
  const igst = base * (rate / 100);
  const priceInclGst = mrp;
  return { sgst: sgst.toFixed(2), cgst: cgst.toFixed(2), igst: igst.toFixed(2), priceInclGst: priceInclGst.toFixed(2) };
}

export function ProductFormModal({ open, onOpenChange, onSubmit, isLoading, editProduct }: Props) {
  const isEdit = Boolean(editProduct);
  const [form, setForm] = useState<AdminProductInput>(EMPTY);

  const { data: warehouseData } = useQuery({
    queryKey: ["warehouses-for-select"],
    queryFn: () => warehouseCreateService.list(),
    staleTime: 120_000,
  });
  const warehouses = (warehouseData?.data ?? []).filter((w) => w.type === "warehouse");

  const { data: whInvData } = useQuery({
    queryKey: ["wh-inventory-all-for-product"],
    queryFn: () => warehouseInventoryService.list(),
    staleTime: 60_000,
    enabled: isEdit && open,
  });

  useEffect(() => {
    if (!open) return;
    if (editProduct) {
      const existingEntries = (whInvData?.items ?? []).filter(
        (i) => String(i.productId) === editProduct._id,
      );
      const warehouseStock: WarehouseStockRow[] = existingEntries.map((i) => ({
        warehouseId: String(i.warehouseId),
        quantity: i.quantity,
      }));
      setForm({
        sku: editProduct.sku,
        name: editProduct.name,
        priority: editProduct.priority,
        skuClassification: editProduct.skuClassification ?? "",
        skuSubClassification: editProduct.skuSubClassification ?? "",
        skuSource: editProduct.skuSource ?? "",
        similarProducts: editProduct.similarProducts ?? "",
        primaryVendor: editProduct.primaryVendor ?? "",
        brandCode: editProduct.brandCode ?? editProduct.brand ?? "",
        mfgSkuCode: editProduct.mfgSkuCode ?? "",
        size: editProduct.size ?? "",
        uom: editProduct.uom ?? "",
        colour: editProduct.colour ?? "",
        material: editProduct.material ?? "",
        weightKg: editProduct.weightKg,
        heightCm: editProduct.heightCm,
        lengthCm: editProduct.lengthCm,
        widthCm: editProduct.widthCm,
        cube: editProduct.cube,
        primaryUpcEan: editProduct.primaryUpcEan ?? "",
        countryOfOrigin: editProduct.countryOfOrigin ?? "",
        hierarchyCode: editProduct.hierarchyCode ?? "",
        mrp: editProduct.mrp ?? 0,
        price: editProduct.price ?? 0,
        baseCost: editProduct.baseCost ?? 0,
        hsnCode: editProduct.hsnCode ?? "",
        taxPercent: editProduct.taxPercent ?? 0,
        sgstPercent: editProduct.sgstPercent,
        cgstPercent: editProduct.cgstPercent,
        igstPercent: editProduct.igstPercent,
        cessPercent: editProduct.cessPercent,
        about: editProduct.about ?? descriptionText(editProduct.description),
        nutrition: editProduct.nutrition ?? "",
        originOfPlace: editProduct.originOfPlace ?? "",
        healthBenefits: editProduct.healthBenefits ?? "",
        shippingReturns: editProduct.shippingReturns ?? "",
        skuRotation: editProduct.skuRotation ?? "",
        rotateBy: editProduct.rotateBy ?? "",
        receivingValidationCode: editProduct.receivingValidationCode ?? "",
        pickingInstructions: editProduct.pickingInstructions ?? "",
        shippingInstructions: editProduct.shippingInstructions ?? "",
        thresholdAlertRequired: editProduct.thresholdAlertRequired ?? "",
        thresholdQty: editProduct.thresholdQty,
        shippingCharges: editProduct.shippingCharges,
        handlingCharges: editProduct.handlingCharges,
        isArsApplicable: editProduct.isArsApplicable ?? "",
        followStyle: editProduct.followStyle ?? "",
        arsCalculationMethod: editProduct.arsCalculationMethod ?? "",
        fixedStock: editProduct.fixedStock,
        modelStock: editProduct.modelStock,
        imageUrl: editProduct.imageUrl ?? "",
        images: editProduct.images ?? (editProduct.imageUrl ? [editProduct.imageUrl] : []),
        searchKeywords: editProduct.searchKeywords ?? "",
        orderLimitType: editProduct.orderLimitType ?? "",
        minQtyPerOrder: editProduct.minQtyPerOrder,
        maxQtyPerOrder: editProduct.maxQtyPerOrder,
        maxWeightPerOrder: editProduct.maxWeightPerOrder ?? "",
        cartLimitPerOrder: editProduct.cartLimitPerOrder ?? "",
        maxOrderValue: editProduct.maxOrderValue ?? "",
        maxCartQty: editProduct.maxCartQty,
        maxCartWeight: editProduct.maxCartWeight ?? "",
        allowMixedPack: editProduct.allowMixedPack ?? "",
        restrictionType: editProduct.restrictionType ?? "",
        status: (editProduct.status as AdminProductInput["status"]) ?? "draft",
        stock: editProduct.stockQuantity ?? 0,
        warehouseStock: warehouseStock.length > 0 ? warehouseStock : [],
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, editProduct, whInvData]);

  function set<K extends keyof AdminProductInput>(key: K, value: AdminProductInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addStockRow() {
    setForm((f) => ({ ...f, warehouseStock: [...(f.warehouseStock ?? []), { ...EMPTY_ROW }] }));
  }

  function removeStockRow(idx: number) {
    setForm((f) => ({ ...f, warehouseStock: (f.warehouseStock ?? []).filter((_, i) => i !== idx) }));
  }

  function updateStockRow(idx: number, field: keyof WarehouseStockRow, value: string | number) {
    setForm((f) => {
      const rows = [...(f.warehouseStock ?? [])];
      rows[idx] = { ...rows[idx]!, [field]: value };
      return { ...f, warehouseStock: rows };
    });
  }

  const stockRows = form.warehouseStock ?? [];
  const taxSplit = computeTaxSplit(form.taxPercent, form.mrp);

  function warehouseOptions(currentRowIdx: number) {
    const usedIds = stockRows.map((r, i) => (i !== currentRowIdx ? r.warehouseId : "")).filter(Boolean);
    return warehouses
      .filter((w) => !usedIds.includes(w._id))
      .map((w) => ({ value: w._id, label: `${w.name} (${w.code})` }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.sku.trim() || !form.name.trim()) return;
    onSubmit({
      ...form,
      sku: form.sku.trim(),
      name: form.name.trim(),
      brandCode: form.brandCode?.trim() || undefined,
      brand: form.brandCode?.trim() || undefined,
      uom: form.uom?.trim() || undefined,
      hsnCode: form.hsnCode?.trim() || undefined,
      imageUrl: form.images?.[0] ?? (form.imageUrl?.trim() || undefined),
      images: form.images ?? [],
      warehouseStock: stockRows.filter((r) => r.warehouseId),
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? `Edit product — ${editProduct?.sku}` : "New product"}
      description={isEdit ? "Update product details." : "Fill in the product details. Matches the SKU Master sheet format."}
      footer={
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button size="sm" variant="secondary" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button size="sm" variant="primary" isLoading={isLoading} onClick={handleSubmit as never}>
            {isEdit ? "Save changes" : "Create product"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* ── SECTION 1: Core Identification ─────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Core Identification</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>SKU Code *</FieldLabel>
              <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="e.g. S10" required disabled={isEdit} />
            </div>
            <div>
              <FieldLabel>Priority</FieldLabel>
              <Input type="number" min="1" value={form.priority ?? ""} onChange={(e) => set("priority", parseInt(e.target.value, 10) || undefined)} placeholder="1" />
            </div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <Select value={form.status ?? "draft"} onValueChange={(v) => set("status", v as AdminProductInput["status"])} options={STATUS_OPTIONS} aria-label="Status" />
            </div>
          </div>
          <div>
            <FieldLabel>SKU Name *</FieldLabel>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Papaya - 5 pcs" required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>SKU Classification</FieldLabel>
              <Input value={form.skuClassification ?? ""} onChange={(e) => set("skuClassification", e.target.value)} placeholder="e.g. Style" />
            </div>
            <div>
              <FieldLabel>SKU Sub-Classification</FieldLabel>
              <Input value={form.skuSubClassification ?? ""} onChange={(e) => set("skuSubClassification", e.target.value)} placeholder="e.g. Organic" />
            </div>
            <div>
              <FieldLabel>SKU Source</FieldLabel>
              <Input value={form.skuSource ?? ""} onChange={(e) => set("skuSource", e.target.value)} placeholder="e.g. Farm Direct" />
            </div>
          </div>
          <div>
            <FieldLabel>Similar Products</FieldLabel>
            <Input value={form.similarProducts ?? ""} onChange={(e) => set("similarProducts", e.target.value)} placeholder="e.g. S13, S24, S36" />
          </div>
        </div>

        {/* ── SECTION 2: Vendor & Brand ───────────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Vendor &amp; Brand</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>Primary Vendor</FieldLabel>
              <Input value={form.primaryVendor ?? ""} onChange={(e) => set("primaryVendor", e.target.value)} placeholder="Vendor code" />
            </div>
            <div>
              <FieldLabel>Brand Code</FieldLabel>
              <Input value={form.brandCode ?? ""} onChange={(e) => set("brandCode", e.target.value)} placeholder="e.g. Selorg" />
            </div>
            <div>
              <FieldLabel>Mfg SKU Code</FieldLabel>
              <Input value={form.mfgSkuCode ?? ""} onChange={(e) => set("mfgSkuCode", e.target.value)} placeholder="Manufacturer code" />
            </div>
          </div>
        </div>

        {/* ── SECTION 3: Physical Specifications ─────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Physical Specifications</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>Size</FieldLabel>
              <Input value={form.size ?? ""} onChange={(e) => set("size", e.target.value)} placeholder="e.g. 5 pcs" />
            </div>
            <div>
              <FieldLabel>SKU UOM</FieldLabel>
              <Input value={form.uom ?? ""} onChange={(e) => set("uom", e.target.value)} placeholder="e.g. EACH" />
            </div>
            <div>
              <FieldLabel>Colour</FieldLabel>
              <Input value={form.colour ?? ""} onChange={(e) => set("colour", e.target.value)} placeholder="e.g. Yellow" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>Material</FieldLabel>
              <Input value={form.material ?? ""} onChange={(e) => set("material", e.target.value)} placeholder="e.g. Organic" />
            </div>
            <div>
              <FieldLabel>Primary UPC / EAN</FieldLabel>
              <Input value={form.primaryUpcEan ?? ""} onChange={(e) => set("primaryUpcEan", e.target.value)} placeholder="Barcode" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>Weight (kg)</FieldLabel>
              <Input type="number" min="0" step="0.001" value={form.weightKg ?? ""} onChange={(e) => set("weightKg", parseFloat(e.target.value) || undefined)} placeholder="0.000" />
            </div>
            <div>
              <FieldLabel>Height (cm)</FieldLabel>
              <Input type="number" min="0" step="0.1" value={form.heightCm ?? ""} onChange={(e) => set("heightCm", parseFloat(e.target.value) || undefined)} placeholder="0.0" />
            </div>
            <div>
              <FieldLabel>Length (cm)</FieldLabel>
              <Input type="number" min="0" step="0.1" value={form.lengthCm ?? ""} onChange={(e) => set("lengthCm", parseFloat(e.target.value) || undefined)} placeholder="0.0" />
            </div>
            <div>
              <FieldLabel>Width (cm)</FieldLabel>
              <Input type="number" min="0" step="0.1" value={form.widthCm ?? ""} onChange={(e) => set("widthCm", parseFloat(e.target.value) || undefined)} placeholder="0.0" />
            </div>
            <div>
              <FieldLabel>Cube</FieldLabel>
              <Input type="number" min="0" step="0.001" value={form.cube ?? ""} onChange={(e) => set("cube", parseFloat(e.target.value) || undefined)} placeholder="0.000" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>Country Of Origin</FieldLabel>
              <Input value={form.countryOfOrigin ?? ""} onChange={(e) => set("countryOfOrigin", e.target.value)} placeholder="e.g. India" />
            </div>
            <div>
              <FieldLabel>Hierarchy Code</FieldLabel>
              <Input value={form.hierarchyCode ?? ""} onChange={(e) => set("hierarchyCode", e.target.value)} placeholder="e.g. A01" />
            </div>
          </div>
        </div>

        {/* ── SECTION 4: Pricing ─────────────────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Pricing</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>MSRP / MRP (₹) *</FieldLabel>
              <Input type="number" min="0" step="0.01" value={form.mrp} onChange={(e) => set("mrp", parseFloat(e.target.value) || 0)} required />
            </div>
            <div>
              <FieldLabel>Sale Price (₹) *</FieldLabel>
              <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => set("price", parseFloat(e.target.value) || 0)} required />
            </div>
            <div>
              <FieldLabel>Base Cost (₹)</FieldLabel>
              <Input type="number" min="0" step="0.01" value={form.baseCost ?? 0} onChange={(e) => set("baseCost", parseFloat(e.target.value) || 0)} />
            </div>
          </div>
        </div>

        {/* ── SECTION 5: Tax ─────────────────────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Tax</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>HSN Code *</FieldLabel>
              <Input value={form.hsnCode ?? ""} onChange={(e) => set("hsnCode", e.target.value)} placeholder="e.g. 08072000" />
            </div>
            <div>
              <FieldLabel>Tax %</FieldLabel>
              <Input type="number" min="0" max="100" step="0.5" value={form.taxPercent ?? 0} onChange={(e) => set("taxPercent", parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <FieldLabel>Cess %</FieldLabel>
              <Input type="number" min="0" step="0.5" value={form.cessPercent ?? ""} onChange={(e) => set("cessPercent", parseFloat(e.target.value) || undefined)} placeholder="0" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>SGST % (auto)</FieldLabel>
              <div className={styles.computedField}>{num(form.taxPercent) / 2}%</div>
            </div>
            <div>
              <FieldLabel>CGST % (auto)</FieldLabel>
              <div className={styles.computedField}>{num(form.taxPercent) / 2}%</div>
            </div>
            <div>
              <FieldLabel>IGST % (auto)</FieldLabel>
              <div className={styles.computedField}>{num(form.taxPercent)}%</div>
            </div>
            <div>
              <FieldLabel>Price incl. GST (₹)</FieldLabel>
              <div className={styles.computedField}>₹{taxSplit.priceInclGst}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>SGST Amt (₹) (auto)</FieldLabel>
              <div className={styles.computedField}>₹{taxSplit.sgst}</div>
            </div>
            <div>
              <FieldLabel>CGST Amt (₹) (auto)</FieldLabel>
              <div className={styles.computedField}>₹{taxSplit.cgst}</div>
            </div>
            <div>
              <FieldLabel>IGST Amt (₹) (auto)</FieldLabel>
              <div className={styles.computedField}>₹{taxSplit.igst}</div>
            </div>
          </div>
        </div>

        {/* ── SECTION 6: Content / Descriptions ─────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Content &amp; Descriptions</div>
          <div>
            <FieldLabel>About</FieldLabel>
            <textarea
              className={styles.textarea}
              value={form.about ?? ""}
              onChange={(e) => set("about", e.target.value)}
              placeholder="Soft tropical fruit rich in digestive enzymes…"
            />
          </div>
          <div>
            <FieldLabel>Nutrition</FieldLabel>
            <textarea
              className={styles.textarea}
              value={form.nutrition ?? ""}
              onChange={(e) => set("nutrition", e.target.value)}
              placeholder="High in vitamin C and enzymes…"
            />
          </div>
          <div>
            <FieldLabel>Origin of Place</FieldLabel>
            <textarea
              className={styles.textarea}
              value={form.originOfPlace ?? ""}
              onChange={(e) => set("originOfPlace", e.target.value)}
              placeholder="Procured from the farms of India…"
            />
          </div>
          <div>
            <FieldLabel>Health Benefits</FieldLabel>
            <textarea
              className={styles.textarea}
              value={form.healthBenefits ?? ""}
              onChange={(e) => set("healthBenefits", e.target.value)}
              placeholder="Improves digestion…"
            />
          </div>
          <div>
            <FieldLabel>Shipping &amp; Returns</FieldLabel>
            <textarea
              className={styles.textarea}
              value={form.shippingReturns ?? ""}
              onChange={(e) => set("shippingReturns", e.target.value)}
              placeholder="Shipping & returns policy…"
            />
          </div>
        </div>

        {/* ── SECTION 7: Operational ─────────────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Operational</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>SKU Rotation</FieldLabel>
              <Input value={form.skuRotation ?? ""} onChange={(e) => set("skuRotation", e.target.value)} placeholder="e.g. FIFO" />
            </div>
            <div>
              <FieldLabel>Rotate By</FieldLabel>
              <Input value={form.rotateBy ?? ""} onChange={(e) => set("rotateBy", e.target.value)} placeholder="e.g. Expiry" />
            </div>
            <div>
              <FieldLabel>Receiving Validation Code</FieldLabel>
              <Input value={form.receivingValidationCode ?? ""} onChange={(e) => set("receivingValidationCode", e.target.value)} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>Picking Instructions</FieldLabel>
              <Input value={form.pickingInstructions ?? ""} onChange={(e) => set("pickingInstructions", e.target.value)} />
            </div>
            <div>
              <FieldLabel>Shipping Instructions</FieldLabel>
              <Input value={form.shippingInstructions ?? ""} onChange={(e) => set("shippingInstructions", e.target.value)} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>Threshold Alert Req.</FieldLabel>
              <Input value={form.thresholdAlertRequired ?? ""} onChange={(e) => set("thresholdAlertRequired", e.target.value)} placeholder="Yes / No" />
            </div>
            <div>
              <FieldLabel>Threshold Qty</FieldLabel>
              <Input type="number" min="0" value={form.thresholdQty ?? ""} onChange={(e) => set("thresholdQty", parseInt(e.target.value, 10) || undefined)} />
            </div>
            <div>
              <FieldLabel>Shipping Charges (₹)</FieldLabel>
              <Input type="number" min="0" step="0.01" value={form.shippingCharges ?? ""} onChange={(e) => set("shippingCharges", parseFloat(e.target.value) || undefined)} />
            </div>
            <div>
              <FieldLabel>Handling Charges (₹)</FieldLabel>
              <Input type="number" min="0" step="0.01" value={form.handlingCharges ?? ""} onChange={(e) => set("handlingCharges", parseFloat(e.target.value) || undefined)} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>Is ARS Applicable?</FieldLabel>
              <Input value={form.isArsApplicable ?? ""} onChange={(e) => set("isArsApplicable", e.target.value)} placeholder="Yes / No" />
            </div>
            <div>
              <FieldLabel>Follow Style</FieldLabel>
              <Input value={form.followStyle ?? ""} onChange={(e) => set("followStyle", e.target.value)} />
            </div>
            <div>
              <FieldLabel>ARS Calculation Method</FieldLabel>
              <Input value={form.arsCalculationMethod ?? ""} onChange={(e) => set("arsCalculationMethod", e.target.value)} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>Fixed Stock</FieldLabel>
              <Input type="number" min="0" value={form.fixedStock ?? ""} onChange={(e) => set("fixedStock", parseInt(e.target.value, 10) || undefined)} />
            </div>
            <div>
              <FieldLabel>Model Stock</FieldLabel>
              <Input type="number" min="0" value={form.modelStock ?? ""} onChange={(e) => set("modelStock", parseInt(e.target.value, 10) || undefined)} />
            </div>
          </div>
        </div>

        {/* ── SECTION 8: Media ───────────────────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Media</div>
          <div>
            <FieldLabel>Product images (up to 5)</FieldLabel>
            <ImageUploadGrid
              images={form.images ?? []}
              onChange={(imgs) => {
                set("images", imgs);
                set("imageUrl", imgs[0] ?? "");
              }}
              max={5}
              disabled={isLoading}
            />
          </div>
          <div>
            <FieldLabel>SKU Image URL</FieldLabel>
            <Input value={form.imageUrl ?? ""} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <FieldLabel>Search Keywords</FieldLabel>
            <textarea
              className={styles.textarea}
              style={{ minHeight: 54 }}
              value={form.searchKeywords ?? ""}
              onChange={(e) => set("searchKeywords", e.target.value)}
              placeholder="papaya, fresh fruit, vitamin c, …"
            />
          </div>
        </div>

        {/* ── SECTION 9: Order Limits ────────────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Order Limits</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>Order Limit Type</FieldLabel>
              <Input value={form.orderLimitType ?? ""} onChange={(e) => set("orderLimitType", e.target.value)} placeholder="e.g. Quantity" />
            </div>
            <div>
              <FieldLabel>Min Qty Per Order</FieldLabel>
              <Input type="number" min="0" value={form.minQtyPerOrder ?? ""} onChange={(e) => set("minQtyPerOrder", parseInt(e.target.value, 10) || undefined)} />
            </div>
            <div>
              <FieldLabel>Max Qty Per Order</FieldLabel>
              <Input type="number" min="0" value={form.maxQtyPerOrder ?? ""} onChange={(e) => set("maxQtyPerOrder", parseInt(e.target.value, 10) || undefined)} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>Max Weight Per Order</FieldLabel>
              <Input value={form.maxWeightPerOrder ?? ""} onChange={(e) => set("maxWeightPerOrder", e.target.value)} placeholder="e.g. N/A" />
            </div>
            <div>
              <FieldLabel>Cart Limit Per Order</FieldLabel>
              <Input value={form.cartLimitPerOrder ?? ""} onChange={(e) => set("cartLimitPerOrder", e.target.value)} placeholder="e.g. Yes" />
            </div>
            <div>
              <FieldLabel>Max Order Value (₹)</FieldLabel>
              <Input value={form.maxOrderValue ?? ""} onChange={(e) => set("maxOrderValue", e.target.value)} placeholder="e.g. N/A" />
            </div>
            <div>
              <FieldLabel>Max Cart Qty</FieldLabel>
              <Input type="number" min="0" value={form.maxCartQty ?? ""} onChange={(e) => set("maxCartQty", parseInt(e.target.value, 10) || undefined)} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>Max Cart Weight</FieldLabel>
              <Input value={form.maxCartWeight ?? ""} onChange={(e) => set("maxCartWeight", e.target.value)} placeholder="e.g. N/A" />
            </div>
            <div>
              <FieldLabel>Allow Mixed Pack</FieldLabel>
              <Input value={form.allowMixedPack ?? ""} onChange={(e) => set("allowMixedPack", e.target.value)} placeholder="e.g. Yes" />
            </div>
            <div>
              <FieldLabel>Restriction Type</FieldLabel>
              <Input value={form.restrictionType ?? ""} onChange={(e) => set("restrictionType", e.target.value)} placeholder="e.g. Qty" />
            </div>
          </div>
        </div>

        {/* ── SECTION 10: Warehouse Stock ────────────────────────────── */}
        <div className={styles.warehouseSection}>
          <div className={styles.warehouseSectionTitle}>Warehouse Stock</div>

          {warehouses.length === 0 ? (
            <p className={styles.noWarehouses}>No warehouses configured yet.</p>
          ) : (
            <table className={styles.stockTable}>
              <thead>
                <tr>
                  <th className={styles.thWarehouse}>WAREHOUSE</th>
                  <th className={styles.thQty}>QTY</th>
                  <th className={styles.thActions} />
                </tr>
              </thead>
              <tbody>
                {stockRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className={styles.emptyRow}>
                      No warehouses added.{" "}
                      <button type="button" className={styles.addInlineBtn} onClick={addStockRow}>
                        Add one
                      </button>
                    </td>
                  </tr>
                ) : (
                  stockRows.map((row, idx) => (
                    <tr key={idx} className={styles.stockRow}>
                      <td className={styles.tdWarehouse}>
                        <Select
                          value={row.warehouseId}
                          onValueChange={(v) => updateStockRow(idx, "warehouseId", v)}
                          options={[
                            { value: "", label: "Select warehouse…" },
                            ...warehouseOptions(idx),
                          ]}
                          aria-label="Warehouse"
                        />
                      </td>
                      <td className={styles.tdQty}>
                        <Input
                          type="number"
                          min="0"
                          value={row.quantity}
                          onChange={(e) => updateStockRow(idx, "quantity", parseInt(e.target.value, 10) || 0)}
                          placeholder="0"
                        />
                      </td>
                      <td className={styles.tdActions}>
                        {idx === stockRows.length - 1 && (
                          <button type="button" className={styles.addRowBtn} onClick={addStockRow} title="Add row">
                            <Plus size={14} />
                          </button>
                        )}
                        <button type="button" className={styles.deleteRowBtn} onClick={() => removeStockRow(idx)} title="Remove row">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {warehouses.length > 0 && stockRows.length === 0 && (
            <button type="button" className={styles.addFirstRowBtn} onClick={addStockRow}>
              <Plus size={13} /> Add warehouse stock
            </button>
          )}
        </div>

      </form>
    </Dialog>
  );
}
