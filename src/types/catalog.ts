import type { Badge } from "@/types/common";

export interface CatalogProduct {
  _id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  mrp: string;
  selling: string;
  storesLive: string;
  status: Badge;
  imageUrl?: string;
}

export interface WarehouseStockRow {
  warehouseId: string;
  quantity: number;
}

export interface AdminProductInput {
  // ── Core Identification ──────────────────────────────────────────────
  sku: string;
  name: string;
  priority?: number;
  skuClassification?: string;
  skuSubClassification?: string;
  skuSource?: string;
  similarProducts?: string;

  // ── Vendor & Brand ───────────────────────────────────────────────────
  primaryVendor?: string;
  brandCode?: string;
  mfgSkuCode?: string;

  // ── Physical Specifications ──────────────────────────────────────────
  size?: string;
  uom?: string;
  colour?: string;
  material?: string;
  weightKg?: number;
  heightCm?: number;
  lengthCm?: number;
  widthCm?: number;
  cube?: number;
  primaryUpcEan?: string;
  countryOfOrigin?: string;
  hierarchyCode?: string;

  // ── Pricing ──────────────────────────────────────────────────────────
  mrp: number;
  price: number;
  baseCost?: number;

  // ── Tax ──────────────────────────────────────────────────────────────
  hsnCode?: string;
  taxPercent?: number;
  sgstPercent?: number;
  cgstPercent?: number;
  igstPercent?: number;
  cessPercent?: number;

  // ── Content / Descriptions ───────────────────────────────────────────
  about?: string;
  nutrition?: string;
  originOfPlace?: string;
  healthBenefits?: string;
  shippingReturns?: string;

  // ── Operational ──────────────────────────────────────────────────────
  skuRotation?: string;
  rotateBy?: string;
  receivingValidationCode?: string;
  pickingInstructions?: string;
  shippingInstructions?: string;
  thresholdAlertRequired?: string;
  thresholdQty?: number;
  shippingCharges?: number;
  handlingCharges?: number;
  isArsApplicable?: string;
  followStyle?: string;
  arsCalculationMethod?: string;
  fixedStock?: number;
  modelStock?: number;

  // ── Media ────────────────────────────────────────────────────────────
  imageUrl?: string;
  images?: string[];
  searchKeywords?: string;

  // ── Order Limits ─────────────────────────────────────────────────────
  orderLimitType?: string;
  minQtyPerOrder?: number;
  maxQtyPerOrder?: number;
  maxWeightPerOrder?: string;
  cartLimitPerOrder?: string;
  maxOrderValue?: string;
  maxCartQty?: number;
  maxCartWeight?: string;
  allowMixedPack?: string;
  restrictionType?: string;

  // ── Status & Warehouse Stock ─────────────────────────────────────────
  status?: "active" | "inactive" | "draft";
  stock?: number;
  warehouseStock?: WarehouseStockRow[];

  // Legacy aliases kept for backward compatibility
  brand?: string;
  gstRate?: number;
  categoryId?: string;
  subcategoryId?: string;
  description?: string;
}
