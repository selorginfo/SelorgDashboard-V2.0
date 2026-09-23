import type { Category } from "@/types/category";
import type { Tone } from "@/types/common";

const s = (label: string, tone: Tone) => ({ label, tone });

/** Verbatim from the approved design's Categories screen (dc.html ~6238-6253). */
export const SEED_CATEGORIES: Category[] = [
  { id: "fruits-veg", name: "Fruits & Vegetables", parentId: null, products: 412, sortOrder: 1, updated: "12 Aug", status: s("Live", "green") },
  { id: "fresh-veg", name: "Fresh Vegetables", parentId: "fruits-veg", products: 186, sortOrder: 1, updated: "12 Aug", status: s("Live", "green") },
  { id: "seasonal-fruit", name: "Seasonal Fruit", parentId: "fruits-veg", products: 148, sortOrder: 2, updated: "20 Aug", status: s("Live", "green") },
  { id: "exotic-imported", name: "Exotic & Imported", parentId: "fruits-veg", products: 78, sortOrder: 3, updated: "20 Aug", status: s("Live", "green") },

  { id: "dairy-eggs", name: "Dairy & Eggs", parentId: null, products: 286, sortOrder: 2, updated: "12 Aug", status: s("Live", "green") },
  { id: "milk-curd", name: "Milk & Curd", parentId: "dairy-eggs", products: 112, sortOrder: 1, updated: "12 Aug", status: s("Live", "green") },
  { id: "cheese-paneer", name: "Cheese & Paneer", parentId: "dairy-eggs", products: 64, sortOrder: 2, updated: "18 Aug", status: s("Live", "green") },

  { id: "staples", name: "Staples", parentId: null, products: 508, sortOrder: 3, updated: "12 Aug", status: s("Live", "green") },
  { id: "rice-grains", name: "Rice & Grains", parentId: "staples", products: 164, sortOrder: 1, updated: "12 Aug", status: s("Live", "green") },
  { id: "oils-ghee", name: "Oils & Ghee", parentId: "staples", products: 96, sortOrder: 2, updated: "22 Aug", status: s("Live", "green") },

  { id: "meat-seafood", name: "Meat & Seafood", parentId: null, products: 96, sortOrder: 4, updated: "14 Aug", status: s("Live", "green") },

  { id: "beverages", name: "Beverages", parentId: null, products: 218, sortOrder: 5, updated: "20 Aug", status: s("Live", "green") },
  { id: "summer-coolers", name: "Summer Coolers", parentId: "beverages", products: 0, sortOrder: 4, updated: "30 Jun", status: s("Disabled", "grey") },

  { id: "frozen", name: "Frozen", parentId: null, products: 0, sortOrder: 6, updated: "Today", status: s("Empty", "amber") },
  { id: "festive-hampers", name: "Festive Hampers", parentId: null, products: 0, sortOrder: 7, updated: "Today", status: s("Draft", "grey") },
];
