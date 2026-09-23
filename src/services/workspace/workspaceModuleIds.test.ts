import { describe, expect, it } from "vitest";
import { WORKSPACE_MODULE_IDS } from "@/services/workspace/workspaceModuleIds";
import { WORKSPACE_CONFIGS } from "@/services/workspace/workspaceData";

describe("WORKSPACE_MODULE_IDS", () => {
  it("stays in sync with WORKSPACE_CONFIGS so the router doesn't drift from the data", () => {
    const configKeys = Object.keys(WORKSPACE_CONFIGS).sort();
    const idList = [...WORKSPACE_MODULE_IDS].sort();
    expect(idList).toEqual(configKeys);
  });
});
