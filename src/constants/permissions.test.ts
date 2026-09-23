import { describe, expect, it } from "vitest";
import { hasPermission } from "@/constants/permissions";

describe("hasPermission", () => {
  it("grants Super Admin every action on every module", () => {
    expect(hasPermission("Super Admin", "settings", "delete")).toBe(true);
    expect(hasPermission("Super Admin", "earn-rules", "approve")).toBe(true);
  });

  it("lets a role view earning rules without granting Activate (approve)", () => {
    expect(hasPermission("Rider Manager", "earn-rules", "view")).toBe(true);
    expect(hasPermission("Rider Manager", "earn-rules", "approve")).toBe(false);
  });

  it("scopes Warehouse Manager to warehouse/transfer modules only", () => {
    expect(hasPermission("Warehouse Manager", "transfers", "approve")).toBe(true);
    expect(hasPermission("Warehouse Manager", "catalog", "view")).toBe(false);
  });

  it("caps Customer Support refund rights to payments/returns/support", () => {
    expect(hasPermission("Customer Support", "returns", "refund")).toBe(true);
    expect(hasPermission("Customer Support", "settings", "refund")).toBe(false);
  });

  it("resolves sub-route visibility from its parent module", () => {
    expect(hasPermission("Dark Store Manager", "order-detail", "view")).toBe(true);
    expect(hasPermission("Catalog Manager", "order-detail", "view")).toBe(false);
  });

  it("lets every role view its own account page", () => {
    expect(hasPermission("Catalog Manager", "account", "view")).toBe(true);
  });
});
