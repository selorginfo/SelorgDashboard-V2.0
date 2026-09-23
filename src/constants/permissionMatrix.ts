import type { Role } from "@/types/auth";

/**
 * Literal per-role permission grid, transcribed verbatim from the approved design's `PERM_GRID`
 * (dc.html:4803-4824) — each row is an 8-character "10101010" string keyed to PERM_COLS, one
 * character per module in PERM_MODULES order. This is the actual matrix the Roles & Permissions
 * screen renders; `src/constants/permissions.ts` stays the separate runtime UX gate.
 */
export const PERM_MODULES = [
  "Orders",
  "Picking",
  "Bags & racks",
  "Warehouse",
  "Inventory",
  "Transfers",
  "Dark stores",
  "Catalog",
  "Riders",
  "Payments",
  "Customers",
  "Users & roles",
  "Reports",
  "Settings",
] as const;

export const PERM_COLS = ["View", "Create", "Edit", "Delete", "Approve", "Export", "Assign", "Manage"] as const;

export const PERM_GRID: Record<Role, string[]> = {
  "Super Admin": Array(14).fill("11111111"),
  "Operations Admin": [
    "11101110", "11101011", "11101011", "11100010", "11100010", "11101010",
    "11101011", "10100010", "11100011", "10000100", "11100000", "10000000",
    "10000100", "10000000",
  ],
  "Warehouse Manager": [
    "10000000", "10000000", "10000000", "11101010", "11101010", "11101010",
    "10000000", "10000000", "00000000", "00000000", "00000000", "00000000",
    "10000100", "00000000",
  ],
  "Dark Store Manager": [
    "11100010", "11101011", "11101011", "00000000", "10100000", "10000010",
    "10100000", "10000000", "10000010", "00000000", "10000000", "00000000",
    "10000100", "00000000",
  ],
  "Rider Manager": [
    "10000010", "00000000", "00000000", "00000000", "00000000", "00000000",
    "10000000", "00000000", "11101011", "00000000", "10000000", "00000000",
    "10000100", "00000000",
  ],
  "Customer Support": [
    "11100100", "10000000", "00000000", "00000000", "00000000", "00000000",
    "10000000", "10000000", "10000010", "10000100", "11100100", "00000000",
    "10000100", "00000000",
  ],
  "Finance Admin": [
    "10000100", "00000000", "00000000", "00000000", "10000100", "10000100",
    "10000100", "10000100", "10000100", "11101100", "10000100", "00000000",
    "11100100", "00000000",
  ],
  "Catalog Manager": [
    "00000000", "00000000", "00000000", "00000000", "10000000", "00000000",
    "00000000", "11101110", "00000000", "00000000", "00000000", "00000000",
    "10000100", "00000000",
  ],
};

export const ROLE_SCOPE: Record<Role, string> = {
  "Super Admin": "Global — all warehouses, all dark stores",
  "Operations Admin": "Global — all dark stores and the central warehouse",
  "Warehouse Manager": "Warehouse scope — WH-01 Bommasandra",
  "Dark Store Manager": "Store scope — assigned dark stores only",
  "Rider Manager": "Hub scope — all delivery hubs",
  "Customer Support": "Global read, capped refund rights",
  "Finance Admin": "Global — finance and settlement data",
  "Catalog Manager": "Global — catalog and pricing only",
};

export function grantedCount(role: Role): number {
  return PERM_GRID[role].join("").split("1").length - 1;
}

export const PERM_TOTAL = PERM_MODULES.length * PERM_COLS.length;
