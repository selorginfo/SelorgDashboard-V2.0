import { describe, expect, it } from "vitest";
import { OPS_ROUTE_IDS } from "@/modules/ops/routeIds";
import { OPS_SCREENS } from "@/modules/ops/screens";
import { MODULE_BREADCRUMBS, NAV_GROUPS } from "@/constants/nav";
import { WORKSPACE_MODULE_IDS } from "@/services/workspace/workspaceModuleIds";

describe("OPS_ROUTE_IDS", () => {
  it("stays in sync with the ops screen definitions", () => {
    expect([...OPS_ROUTE_IDS].sort()).toEqual(Object.keys(OPS_SCREENS).sort());
  });

  it("gives every ops route a breadcrumb and a sidebar entry", () => {
    const navIds = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id));
    for (const id of OPS_ROUTE_IDS) {
      expect(MODULE_BREADCRUMBS[id], id).toBeDefined();
      expect(navIds, id).toContain(id);
    }
  });

  it("isn't also registered on the generic workspace template", () => {
    expect(OPS_ROUTE_IDS.filter((id) => WORKSPACE_MODULE_IDS.includes(id))).toEqual([]);
  });
});
