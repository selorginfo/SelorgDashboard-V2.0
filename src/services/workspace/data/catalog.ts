import type { WorkspaceConfig } from "@/types/common";
import type { ModuleId } from "@/constants/nav";
import { b, kpis, type Row } from "./helpers";

export const CATALOG_CONFIGS: Partial<Record<ModuleId, WorkspaceConfig>> = {
  catalog: {
    hint: "Products, categories, pricing and store availability",
    flow: [],
    kpis: kpis([
      ["3,284", "Products"],
      ["2,940", "Active"],
      ["148", "Out of stock", "var(--red-tx)"],
      ["64", "Draft"],
      ["132", "Categories"],
      ["18", "Price changes today"],
    ]),
    tabs: ["Products", "Barcodes", "Categories", "Pricing", "Availability"],
    columns: ["SKU", "Product", "Category", "Unit", "MRP", "Selling", "Stores live", "Status"],
    rows: {
      Products: [
        ["SEL-1102", "Organic Tomato 500g", "Vegetables", "500 g", "₹45", "₹39", "5 / 5", b("Active", "green")],
        ["SEL-2214", "Amul Gold Milk 1L", "Dairy", "1 L", "₹72", "₹68", "5 / 5", b("Active", "green")],
        ["SEL-4415", "Ghee 500ml", "Staples", "500 ml", "₹460", "₹410", "3 / 5", b("Out of stock", "red")],
        ["SEL-5501", "Chicken Breast 500g", "Meat", "500 g", "₹340", "₹320", "2 / 5", b("Active", "green")],
        ["SEL-6600", "Cold Brew 200ml", "Beverages", "200 ml", "₹120", "₹110", "0 / 5", b("Draft", "grey")],
      ] as Row[],
      Barcodes: [
        ["SEL-1102", "Organic Tomato 500g", "890126401102", "Internal (Selorg)", "EAN-13", "Printed", "5 / 5", b("Active", "green")],
        ["SEL-2214", "Amul Gold Milk 1L", "8901262214017", "Manufacturer", "EAN-13", "Printed", "5 / 5", b("Active", "green")],
        ["SEL-4415", "Ghee 500ml", "8904103344159", "Manufacturer", "EAN-13", "Printed", "3 / 5", b("Active", "green")],
        ["SEL-5501", "Chicken Breast 500g", "890126405501", "Internal (Selorg)", "EAN-13", "Reprint queued", "2 / 5", b("Active", "amber")],
        ["SEL-6600", "Cold Brew 200ml", "—", "Not assigned", "—", "Not printed", "0 / 5", b("Barcode missing", "red")],
        ["SEL-1043", "Baby Spinach 250g", "890126401043", "Internal (Selorg)", "EAN-13", "Not printed", "5 / 5", b("Label pending", "amber")],
      ] as Row[],
      Categories: [
        ["CAT-01", "Fruits & Vegetables", "Top level", "—", "—", "—", "412 SKUs", b("Active", "green")],
        ["CAT-02", "Dairy & Eggs", "Top level", "—", "—", "—", "286 SKUs", b("Active", "green")],
        ["CAT-03", "Staples", "Top level", "—", "—", "—", "508 SKUs", b("Active", "green")],
        ["CAT-04", "Meat & Seafood", "Top level", "—", "—", "—", "96 SKUs", b("Active", "green")],
      ] as Row[],
      Pricing: [
        ["SEL-1102", "Organic Tomato 500g", "Vegetables", "500 g", "₹45", "₹39", "Store-level", b("Discounted", "blue")],
        ["SEL-4410", "Basmati Rice 5kg", "Staples", "5 kg", "₹720", "₹640", "Uniform", b("Active", "green")],
      ] as Row[],
      Availability: [
        ["SEL-4415", "Ghee 500ml", "Staples", "500 ml", "₹460", "₹410", "DS-01, 02, 03", b("Unavailable DS-04", "amber")],
        ["SEL-6600", "Cold Brew 200ml", "Beverages", "200 ml", "₹120", "₹110", "—", b("Not launched", "grey")],
      ] as Row[],
    },
  },
};
