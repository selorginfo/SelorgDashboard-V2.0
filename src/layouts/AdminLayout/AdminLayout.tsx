import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { CardSkeleton } from "@/components/ui/Skeleton";
import styles from "./AdminLayout.module.css";

export function AdminLayout() {
  return (
    <TooltipProvider>
      <div className={styles.shell}>
        <Sidebar />
        <div className={styles.main}>
          <Topbar />
          <div className={styles.content}>
            <Suspense fallback={<CardSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </div>
      </div>
      <ToastContainer />
    </TooltipProvider>
  );
}
