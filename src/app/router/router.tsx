import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy } from "react";
import type { ComponentType } from "react";
import { RequireAuth } from "@/app/router/RequireAuth";
import { RequireModule } from "@/app/router/RequireModule";
import { AdminLayout } from "@/layouts/AdminLayout/AdminLayout";
import { MODULE_BREADCRUMBS, type ModuleId } from "@/constants/nav";
import { ModulePlaceholderPage } from "@/modules/shared/pages/ModulePlaceholderPage";
import { WORKSPACE_MODULE_IDS } from "@/services/workspace/workspaceModuleIds";
import { OPS_ROUTE_IDS } from "@/modules/ops/routeIds";
import { EmptyState } from "@/components/ui/EmptyState";

const LoginPage = lazy(() => import("@/modules/auth/pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const OtpPage = lazy(() => import("@/modules/auth/pages/OtpPage").then((m) => ({ default: m.OtpPage })));
const DashboardPage = lazy(() =>
  import("@/modules/dashboard/pages/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);
const OrdersWorkspacePage = lazy(() =>
  import("@/modules/orders/pages/OrdersWorkspacePage").then((m) => ({ default: m.OrdersWorkspacePage }))
);
const WorkspaceModulePage = lazy(() =>
  import("@/modules/shared/pages/WorkspaceModulePage").then((m) => ({ default: m.WorkspaceModulePage }))
);
const CategoryTreePage = lazy(() =>
  import("@/modules/categories/pages/CategoryTreePage").then((m) => ({ default: m.CategoryTreePage }))
);
const RolesPage = lazy(() => import("@/modules/roles/pages/RolesPage").then((m) => ({ default: m.RolesPage })));
const RiderApprovalsPage = lazy(() =>
  import("@/modules/approvals/pages/RiderApprovalsPage").then((m) => ({ default: m.RiderApprovalsPage }))
);
const PickerApprovalsPage = lazy(() =>
  import("@/modules/approvals/pages/PickerApprovalsPage").then((m) => ({ default: m.PickerApprovalsPage }))
);
const RidersLivePage = lazy(() =>
  import("@/modules/riders/pages/RidersLivePage").then((m) => ({ default: m.RidersLivePage }))
);
const EarningRulesPage = lazy(() =>
  import("@/modules/earningRules/pages/EarningRulesPage").then((m) => ({ default: m.EarningRulesPage }))
);
const RiderSupportPage = lazy(() =>
  import("@/modules/support/pages/RiderSupportPage").then((m) => ({ default: m.RiderSupportPage }))
);
const PickerSupportPage = lazy(() =>
  import("@/modules/support/pages/PickerSupportPage").then((m) => ({ default: m.PickerSupportPage }))
);
const ContentPipelinePage = lazy(() =>
  import("@/modules/cms/pages/ContentPipelinePage").then((m) => ({ default: m.ContentPipelinePage }))
);
const IntegrationsPage = lazy(() =>
  import("@/modules/integrations/pages/IntegrationsPage").then((m) => ({ default: m.IntegrationsPage }))
);
const HomeBuilderPage = lazy(() =>
  import("@/modules/cms/pages/HomeBuilderPage").then((m) => ({ default: m.HomeBuilderPage }))
);
const NotificationsPage = lazy(() =>
  import("@/modules/notifications/pages/NotificationsPage").then((m) => ({ default: m.NotificationsPage }))
);
const MediaLibraryPage = lazy(() =>
  import("@/modules/cms/pages/MediaLibraryPage").then((m) => ({ default: m.MediaLibraryPage }))
);
const ContentCalendarPage = lazy(() =>
  import("@/modules/cms/pages/ContentCalendarPage").then((m) => ({ default: m.ContentCalendarPage }))
);
const VendorsPage = lazy(() => import("@/modules/vendors/pages/VendorsPage").then((m) => ({ default: m.VendorsPage })));
const RiderDirectoryPage = lazy(() =>
  import("@/modules/workforce/pages/RiderDirectoryPage").then((m) => ({ default: m.RiderDirectoryPage }))
);
const PickerDirectoryPage = lazy(() =>
  import("@/modules/workforce/pages/PickerDirectoryPage").then((m) => ({ default: m.PickerDirectoryPage }))
);
const RiderEarningsPage = lazy(() =>
  import("@/modules/workforce/pages/RiderEarningsPage").then((m) => ({ default: m.RiderEarningsPage }))
);
const PickerEarningsPage = lazy(() =>
  import("@/modules/workforce/pages/PickerEarningsPage").then((m) => ({ default: m.PickerEarningsPage }))
);
const PayoutsPage = lazy(() =>
  import("@/modules/workforce/pages/PayoutsPage").then((m) => ({ default: m.PayoutsPage }))
);
const ShiftsPage = lazy(() => import("@/modules/workforce/pages/ShiftsPage").then((m) => ({ default: m.ShiftsPage })));
const RosterPage = lazy(() => import("@/modules/workforce/pages/RosterPage").then((m) => ({ default: m.RosterPage })));
const WarehouseHierarchyPage = lazy(() =>
  import("@/modules/warehouse/pages/WarehouseHierarchyPage").then((m) => ({ default: m.WarehouseHierarchyPage }))
);
const WarehouseInventoryPage = lazy(() =>
  import("@/modules/warehouse/pages/WarehouseInventoryPage").then((m) => ({ default: m.WarehouseInventoryPage }))
);
const ReceivingPage = lazy(() =>
  import("@/modules/warehouse/pages/ReceivingPage").then((m) => ({ default: m.ReceivingPage }))
);
const PutawayAssignPage = lazy(() =>
  import("@/modules/warehouse/pages/PutawayAssignPage").then((m) => ({ default: m.PutawayAssignPage }))
);
const TransfersKanbanPage = lazy(() =>
  import("@/modules/warehouse/pages/TransfersKanbanPage").then((m) => ({ default: m.TransfersKanbanPage }))
);
const WarehouseUsersPage = lazy(() =>
  import("@/modules/warehouse/pages/WarehouseUsersPage").then((m) => ({ default: m.WarehouseUsersPage }))
);
const WarehouseCreatePage = lazy(() =>
  import("@/modules/warehouse/pages/WarehouseCreatePage").then((m) => ({ default: m.WarehouseCreatePage }))
);
const WarehouseInventoryProductsPage = lazy(() =>
  import("@/modules/warehouse/pages/WarehouseInventoryProductsPage").then((m) => ({ default: m.WarehouseInventoryProductsPage }))
);
const PickingQueuePage = lazy(() =>
  import("@/modules/darkstore/pages/PickingQueuePage").then((m) => ({ default: m.PickingQueuePage }))
);
const BagsPage = lazy(() => import("@/modules/darkstore/pages/BagsPage").then((m) => ({ default: m.BagsPage })));
const RacksPage = lazy(() => import("@/modules/darkstore/pages/RacksPage").then((m) => ({ default: m.RacksPage })));
const StoreInventoryPage = lazy(() =>
  import("@/modules/darkstore/pages/StoreInventoryPage").then((m) => ({ default: m.StoreInventoryPage }))
);
const StoresPage = lazy(() => import("@/modules/darkstore/pages/StoresPage").then((m) => ({ default: m.StoresPage })));
const DarkStoreNetworkPage = lazy(() =>
  import("@/modules/darkstore/pages/DarkStoreNetworkPage").then((m) => ({ default: m.DarkStoreNetworkPage }))
);
const DarkStoreUsersPage = lazy(() =>
  import("@/modules/darkstore/pages/DarkStoreUsersPage").then((m) => ({ default: m.DarkStoreUsersPage }))
);
const DarkStoreProductsPage = lazy(() =>
  import("@/modules/darkstore/pages/DarkStoreProductsPage").then((m) => ({ default: m.DarkStoreProductsPage }))
);
const DarkstoreTransferRequestsPage = lazy(() =>
  import("@/modules/darkstore/pages/DarkstoreTransferRequestsPage").then((m) => ({ default: m.DarkstoreTransferRequestsPage }))
);
const DarkstoreRequestsPage = lazy(() =>
  import("@/modules/warehouse/pages/DarkstoreRequestsPage").then((m) => ({ default: m.DarkstoreRequestsPage }))
);
const ExpectedStockPage = lazy(() =>
  import("@/modules/warehouse/pages/ExpectedStockPage").then((m) => ({ default: m.ExpectedStockPage }))
);
const WarehouseTransfersPage = lazy(() =>
  import("@/modules/warehouse/pages/WarehouseTransfersPage").then((m) => ({ default: m.WarehouseTransfersPage }))
);
const TransferApprovalsPage = lazy(() =>
  import("@/modules/warehouse/pages/TransferApprovalsPage").then((m) => ({ default: m.TransferApprovalsPage }))
);
const WarehouseAuditPage = lazy(() =>
  import("@/modules/warehouse/pages/WarehouseAuditPage").then((m) => ({ default: m.WarehouseAuditPage }))
);
const DarkstoreReceivePage = lazy(() =>
  import("@/modules/darkstore/pages/DarkstoreReceivePage").then((m) => ({ default: m.DarkstoreReceivePage }))
);
const DarkStoreAuditPage = lazy(() =>
  import("@/modules/darkstore/pages/DarkStoreAuditPage").then((m) => ({ default: m.DarkStoreAuditPage }))
);
const CatalogPage = lazy(() => import("@/modules/catalog/pages/CatalogPage").then((m) => ({ default: m.CatalogPage })));
const PromotionsPage = lazy(() =>
  import("@/modules/catalog/pages/PromotionsPage").then((m) => ({ default: m.PromotionsPage }))
);
const MasterSheetPage = lazy(() =>
  import("@/modules/catalog/pages/MasterSheetPage").then((m) => ({ default: m.MasterSheetPage }))
);
const AccountPage = lazy(() =>
  import("@/modules/account/pages/AccountPage").then((m) => ({ default: m.AccountPage }))
);
const CustomersPage = lazy(() =>
  import("@/modules/commerce/pages/CustomersPage").then((m) => ({ default: m.CustomersPage }))
);
const SupportPage = lazy(() =>
  import("@/modules/commerce/pages/SupportPage").then((m) => ({ default: m.SupportPage }))
);
const ExceptionsTriagePage = lazy(() =>
  import("@/modules/monitoring/pages/ExceptionsTriagePage").then((m) => ({ default: m.ExceptionsTriagePage }))
);
const ScannerPage = lazy(() =>
  import("@/modules/monitoring/pages/ScannerPage").then((m) => ({ default: m.ScannerPage }))
);
const ScanHistoryPage = lazy(() =>
  import("@/modules/monitoring/pages/ScanHistoryPage").then((m) => ({ default: m.ScanHistoryPage }))
);
const AuditLogPage = lazy(() =>
  import("@/modules/monitoring/pages/AuditLogPage").then((m) => ({ default: m.AuditLogPage }))
);
const BarcodesPage = lazy(() =>
  import("@/modules/monitoring/pages/BarcodesPage").then((m) => ({ default: m.BarcodesPage }))
);
const UsersDirectoryPage = lazy(() =>
  import("@/modules/system/pages/UsersDirectoryPage").then((m) => ({ default: m.UsersDirectoryPage }))
);
const SettingsPage = lazy(() =>
  import("@/modules/system/pages/SettingsPage").then((m) => ({ default: m.SettingsPage }))
);
const ReportsCatalogPage = lazy(() =>
  import("@/modules/system/pages/ReportsCatalogPage").then((m) => ({ default: m.ReportsCatalogPage }))
);
const OverallReportPage = lazy(() =>
  import("@/modules/analytics/pages/AnalyticsReportPage").then((m) => ({ default: m.OverallReportPage }))
);
const SalesReportPage = lazy(() =>
  import("@/modules/analytics/pages/AnalyticsReportPage").then((m) => ({ default: m.SalesReportPage }))
);
const OperationsReportPage = lazy(() =>
  import("@/modules/analytics/pages/AnalyticsReportPage").then((m) => ({ default: m.OperationsReportPage }))
);
const EmployeeReportPage = lazy(() =>
  import("@/modules/analytics/pages/AnalyticsReportPage").then((m) => ({ default: m.EmployeeReportPage }))
);
const CustomerReportPage = lazy(() =>
  import("@/modules/analytics/pages/AnalyticsReportPage").then((m) => ({ default: m.CustomerReportPage }))
);
const ApiCatalogPage = lazy(() =>
  import("@/modules/system/pages/ApiCatalogPage").then((m) => ({ default: m.ApiCatalogPage }))
);
const OpsModulePage = lazy(() =>
  import("@/modules/ops/pages/OpsModulePage").then((m) => ({ default: m.OpsModulePage }))
);
const BulkOrdersPage = lazy(() =>
  import("@/modules/bulkOrders/pages/BulkOrdersPage").then((m) => ({ default: m.BulkOrdersPage }))
);

/**
 * Routes with a real page built so far — every other ModuleId falls back to the placeholder.
 * The generic workspace template is spread FIRST so a bespoke page always wins: if an id ever
 * appears in both lists, the purpose-built page (which calls real APIs) must not be shadowed
 * by a static table.
 */
const BUILT_PAGES: Partial<Record<ModuleId, ComponentType>> = {
  ...Object.fromEntries(WORKSPACE_MODULE_IDS.map((id) => [id, WorkspaceModulePage])),
  // Delivery + Container Stalls screens rendered from the approved design's screen engine.
  ...Object.fromEntries(OPS_ROUTE_IDS.map((id) => [id, OpsModulePage])),
  dashboard: DashboardPage,
  categories: CategoryTreePage,
  roles: RolesPage,
  "rider-approvals": RiderApprovalsPage,
  "picker-approvals": PickerApprovalsPage,
  riders: RidersLivePage,
  "earn-rules": EarningRulesPage,
  "rider-support": RiderSupportPage,
  "picker-support": PickerSupportPage,
  cms: ContentPipelinePage,
  integrations: IntegrationsPage,
  "cms-home": HomeBuilderPage,
  notifications: NotificationsPage,
  "cms-media": MediaLibraryPage,
  "cms-cal": ContentCalendarPage,
  vendors: VendorsPage,
  "rider-dir": RiderDirectoryPage,
  "picker-dir": PickerDirectoryPage,
  "rider-earn": RiderEarningsPage,
  "picker-earn": PickerEarningsPage,
  payouts: PayoutsPage,
  shifts: ShiftsPage,
  roster: RosterPage,
  wh: WarehouseHierarchyPage,
  "wh-inv": WarehouseInventoryPage,
  inbound: ReceivingPage,
  "inbound-asn": ExpectedStockPage,
  putaway: PutawayAssignPage,
  transfers: TransfersKanbanPage,
  "wh-approvals": DarkstoreRequestsPage,
  "wh-transfer": WarehouseTransfersPage,
  "wh-transfer-approve": TransferApprovalsPage,
  "wh-audit": WarehouseAuditPage,
  "wh-users": WarehouseUsersPage,
  "wh-create": WarehouseCreatePage,
  "wh-products": WarehouseInventoryProductsPage,
  picking: PickingQueuePage,
  bags: BagsPage,
  racks: RacksPage,
  "store-inv": StoreInventoryPage,
  stores: StoresPage,
  "ds-overview": DarkStoreNetworkPage,
  "ds-users": DarkStoreUsersPage,
  "ds-products": DarkStoreProductsPage,
  "ds-request": DarkstoreTransferRequestsPage,
  "ds-receive": DarkstoreReceivePage,
  "ds-audit": DarkStoreAuditPage,
  catalog: CatalogPage,
  promotions: PromotionsPage,
  mastersheet: MasterSheetPage,
  account: AccountPage,
  customers: CustomersPage,
  support: SupportPage,
  exceptions: ExceptionsTriagePage,
  scanner: ScannerPage,
  barcodes: BarcodesPage,
  "scan-history": ScanHistoryPage,
  audit: AuditLogPage,
  users: UsersDirectoryPage,
  settings: SettingsPage,
  reports: ReportsCatalogPage,
  "rpt-overall": OverallReportPage,
  "rpt-sales": SalesReportPage,
  "rpt-ops": OperationsReportPage,
  "rpt-people": EmployeeReportPage,
  "rpt-customer": CustomerReportPage,
  "api-catalog": ApiCatalogPage,
  "bulk-orders": BulkOrdersPage,
};

/** "orders"/"order-detail" get explicit nested routes below (list + direct-URL detail, request §9). */
const ALL_MODULE_IDS = (Object.keys(MODULE_BREADCRUMBS) as ModuleId[]).filter(
  (id) => id !== "orders" && id !== "order-detail"
);

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/otp", element: <OtpPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          {
            path: "orders",
            element: (
              <RequireModule moduleId="orders">
                <OrdersWorkspacePage />
              </RequireModule>
            ),
          },
          {
            path: "orders/:orderId",
            element: (
              <RequireModule moduleId="orders">
                <OrdersWorkspacePage />
              </RequireModule>
            ),
          },
          // Record detail pages for every ops screen (e.g. /bd-batches/BDB-2041).
          ...OPS_ROUTE_IDS.map((id) => ({
            path: `${id}/:recordId`,
            element: (
              <RequireModule moduleId={id}>
                <OpsModulePage />
              </RequireModule>
            ),
          })),
          {
            path: "bulk-orders/:bulkOrderId",
            element: (
              <RequireModule moduleId="bulk-orders">
                <BulkOrdersPage />
              </RequireModule>
            ),
          },
          ...ALL_MODULE_IDS.map((id) => {
            const Page = BUILT_PAGES[id] ?? ModulePlaceholderPage;
            return {
              path: id,
              element: (
                <RequireModule moduleId={id}>
                  <Page />
                </RequireModule>
              ),
            };
          }),
        ],
      },
    ],
  },
  {
    path: "*",
    element: <EmptyState title="Page not found" description="Check the URL or use the sidebar to navigate." />,
  },
]);
