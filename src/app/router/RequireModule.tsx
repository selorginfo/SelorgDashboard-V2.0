import type { ReactNode } from "react";
import { usePermission } from "@/hooks/usePermission";
import type { ModuleId } from "@/constants/nav";
import { EmptyState } from "@/components/ui/EmptyState";

export function RequireModule({ moduleId, children }: { moduleId: ModuleId; children: ReactNode }) {
  const { can, role } = usePermission();

  if (!can(moduleId, "view")) {
    return (
      <EmptyState
        title="You don't have access to this module"
        description={`${role ?? "Your role"} isn't scoped to see this page. Ask a Super Admin to update your role if you believe this is wrong.`}
      />
    );
  }

  return <>{children}</>;
}
