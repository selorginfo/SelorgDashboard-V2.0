import { beforeEach, describe, expect, it } from "vitest";
import { mockCatalogService } from "@/services/catalog/catalogService.mock";

describe("mockCatalogService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("unpublishes an active product", async () => {
    const products = await mockCatalogService.listProducts();
    const target = products.find((p) => p.status.label === "Active")!;
    expect(target).toBeDefined();

    const updated = await mockCatalogService.setPublished(target.sku, false);
    expect(updated.status.label).toBe("Draft");
    expect(updated.status.tone).toBe("grey");
  });

  it("publishes a draft product", async () => {
    const products = await mockCatalogService.listProducts();
    const target = products.find((p) => p.status.label === "Draft")!;
    expect(target).toBeDefined();

    const updated = await mockCatalogService.setPublished(target.sku, true);
    expect(updated.status.label).toBe("Active");
    expect(updated.status.tone).toBe("green");
  });

  it("throws for an unknown SKU", async () => {
    await expect(mockCatalogService.setPublished("SEL-0000", true)).rejects.toThrow();
  });
});
