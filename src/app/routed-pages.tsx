import { lazy } from "react";
import { Outlet, useOutletContext, useParams } from "react-router-dom";

import { useAppShell } from "@/app/AppShellContext";
import { type RootOutletContext } from "@/app/RootLayout";
import { type OrderRow } from "@/features/orders/order-types";
import { usePermission } from "@/hooks/usePermission";
import { can } from "@/lib/permissions";
import type { OrdersFilterOverrides } from "@/features/orders/orders-page/orders-page-props";

const OrdersPage = lazy(() => import("@/pages/OrdersPage"));
const OrderDetailPage = lazy(() => import("@/pages/OrderDetailPage"));
const ChannelsPage = lazy(() =>
  import("@/features/channels/components/ChannelManagement").then((m) => ({
    default: m.ChannelManagement,
  })),
);
const KiotVietPage = lazy(() =>
  import("@/features/kiotviet/components/KiotVietManagement").then((m) => ({
    default: m.KiotVietManagement,
  })),
);
const FacebookAdsPage = lazy(() => import("@/pages/FacebookAdsPage"));
const GoogleAdsPage = lazy(() => import("@/pages/GoogleAdsPage"));
const UsersPage = lazy(() =>
  import("@/features/users/components/UserManagement").then((m) => ({ default: m.UserManagement })),
);
const LeadAssignmentPage = lazy(() => import("@/pages/LeadAssignmentPage"));
const RolesPage = lazy(() => import("@/pages/RolesPage"));
const DepartmentsPage = lazy(() => import("@/pages/DepartmentsPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const CustomerProfilePage = lazy(() => import("@/pages/CustomerProfilePage"));
const AdsReportPage = lazy(() => import("@/features/ads/pages/AdsReportPage"));
const OverviewReportPage = lazy(
  () => import("@/features/overview-report/pages/OverviewReportPage"),
);
const FoxiaReportPage = lazy(() => import("@/features/foxia-report/pages/FoxiaReportPage"));
const CallQualityPage = lazy(() => import("@/features/call-quality/pages/CallQualityPage"));
const CustomersPage = lazy(() => import("@/pages/CustomersPage"));
const ContactsPage = lazy(() => import("@/features/contacts/pages/ContactsPage"));
const ContactFlowSettingsPage = lazy(
  () => import("@/features/contact-flow/pages/ContactFlowSettingsPage"),
);
const FoxiaLinkSettingsPage = lazy(
  () => import("@/features/foxia-link/pages/FoxiaLinkSettingsPage"),
);
const PancakeSettingsPage = lazy(() => import("@/features/pancake/pages/PancakeSettingsPage"));
const PancakeLeadsPage = lazy(() => import("@/features/pancake/pages/PancakeLeadsPage"));
const PancakePosSettingsPage = lazy(
  () => import("@/features/pancake-pos/pages/PancakePosSettingsPage"),
);
const SystemSettingsPage = lazy(
  () => import("@/features/system-settings/pages/SystemSettingsPage"),
);
const FloatingPoolPage = lazy(() =>
  import("@/features/floating-pool/pages/FloatingPoolPage").then((m) => ({
    default: m.FloatingPoolPage,
  })),
);
const LoyalCustomersPage = lazy(() => import("@/pages/LoyalCustomersPage"));
const ResaleTrackingPage = lazy(() => import("@/pages/ResaleTrackingPage"));
const WarrantyClaimsPage = lazy(() => import("@/pages/WarrantyClaimsPage"));
const WarrantyClaimDetailPage = lazy(() => import("@/pages/WarrantyClaimDetailPage"));
const WarrantyCodesPage = lazy(() => import("@/features/warranty-codes/pages/WarrantyCodesPage"));
const AddressLookupPage = lazy(() => import("@/features/address-lookup/pages/AddressLookupPage"));
const ProductsPage = lazy(() => import("@/features/products/pages/ProductsPage"));
const ProductContentPage = lazy(() => import("@/pages/ProductContentPage"));
const ProductCategoriesPage = lazy(() => import("@/pages/ProductCategoriesPage"));
const WarehousesPage = lazy(() => import("@/pages/WarehousesPage"));
const AuditLogsPage = lazy(() => import("@/pages/AuditLogsPage"));
const StockPage = lazy(() => import("@/features/inventory/pages/StockPage"));
const DispatchHistoryPage = lazy(() => import("@/features/inventory/pages/DispatchHistoryPage"));
const ShipmentsPage = lazy(() => import("@/features/inventory/pages/ShipmentsPage"));
const StockDocumentsPage = lazy(() => import("@/features/inventory/pages/StockDocumentsPage"));
const EmployeesPage = lazy(() => import("@/features/hr/pages/EmployeesPage"));
const EmployeeDetailPage = lazy(() => import("@/features/hr/pages/EmployeeDetailPage"));
const LeaveRequestsPage = lazy(() => import("@/features/hr/pages/LeaveRequestsPage"));
const AttendanceCheckInPage = lazy(() => import("@/features/hr/pages/AttendanceCheckInPage"));
const AttendanceLocationsPage = lazy(() => import("@/features/hr/pages/AttendanceLocationsPage"));
const CompensationPage = lazy(() => import("@/features/hr/pages/CompensationPage"));
const AttendanceHistoryPage = lazy(() => import("@/features/hr/pages/AttendanceHistoryPage"));
const BlocklistPage = lazy(() =>
  import("@/pages/BlocklistPage").then((m) => ({ default: m.BlocklistPage })),
);
const MediaExplorePage = lazy(() => import("@/features/media/pages/MediaExplorePage"));
const MediaContentsPage = lazy(() => import("@/features/media/pages/MediaContentsPage"));
const MediaProposalsPage = lazy(() => import("@/features/media/pages/MediaProposalsPage"));
const MediaReportsPage = lazy(() => import("@/features/media/pages/MediaReportsPage"));
const MediaTaxonomyPage = lazy(() => import("@/features/media/pages/MediaTaxonomyPage"));
const MediaSettingsPage = lazy(() => import("@/features/media/pages/MediaSettingsPage"));

function useRootNav(): RootOutletContext {
  return useOutletContext<RootOutletContext>();
}

/**
 * Bundle các props của OrdersPage được chia sẻ giữa orders/koc/landing.
 * Giữ nguyên hệt mapping prop trong App.tsx trước cutover.
 */
function useOrdersPageProps() {
  const shell = useAppShell();
  const nav = useRootNav();
  const { orders, channels, allChannels, staffUsers, user } = shell;
  return {
    rows: orders.rows,
    getExportFilters: orders.getOrdersExportFilters,
    catalogs: {
      channels,
      allChannels,
      staffUsers,
      userAssignedChannels: user.assigned_channels,
      kiotvietOptions: orders.kiotvietOptions,
      products: orders.products,
      productsPriceBook: orders.productsPriceBook,
      addressCatalog: orders.addressCatalog,
    },
    filters: {
      q: orders.q,
      dateFilter: orders.dateFilter,
      returnDateFilter: orders.returnDateFilter,
      kiotvietPurchaseDateFilter: orders.kiotvietPurchaseDateFilter,
      status: orders.status,
      channel: orders.channel,
      product: orders.product,
      staff: orders.staff,
      deliveryBusinessStatus: orders.deliveryBusinessStatus,
      salesStatus: orders.salesStatus,
      kiotvietChannel: orders.kiotvietChannel,
      branchId: orders.branchId,
      fulfillmentWarehouse: orders.fulfillmentWarehouse,
      invoiceStatus: orders.invoiceStatus,
      vat: orders.vat,
      orderType: orders.orderType,
      shippingType: orders.shippingType,
      channelType: orders.channelType,
      kocOrderType: orders.kocOrderType,
      hasShippingCode: orders.hasShippingCode,
      hasInvoiceCode: orders.hasInvoiceCode,
      isDeliveryInvoicePrinted: orders.isDeliveryInvoicePrinted,
      customerReturn: orders.customerReturn,
      hasInternalNote: orders.hasInternalNote,
      hasAddress: orders.hasAddress,
      hasReturnSlip: orders.hasReturnSlip,
      hasRecallCode: orders.hasRecallCode,
      hasCallRecording: orders.hasCallRecording,
      sort: orders.ordersSort,
      visibleOrderColumns: orders.visibleOrderColumns,
      lockedOrderColumns: orders.lockedOrderColumns,
    },
    filterHandlers: {
      onQChange: orders.setQ,
      onDateFilterChange: orders.setDateFilter,
      onReturnDateFilterChange: orders.setReturnDateFilter,
      onKiotvietPurchaseDateFilterChange: orders.setKiotvietPurchaseDateFilter,
      onStatusChange: orders.setStatus,
      onChannelChange: orders.setChannel,
      onProductChange: orders.setProduct,
      onStaffChange: orders.setStaff,
      onDeliveryBusinessStatusChange: orders.setDeliveryBusinessStatus,
      onSalesStatusChange: orders.setSalesStatus,
      onKiotvietChannelChange: orders.setKiotvietChannel,
      onBranchIdChange: orders.setBranchId,
      onFulfillmentWarehouseChange: orders.setFulfillmentWarehouse,
      onInvoiceStatusChange: orders.setInvoiceStatus,
      onVatChange: orders.setVat,
      onOrderTypeChange: orders.setOrderType,
      onShippingTypeChange: orders.setShippingType,
      onChannelTypeChange: orders.setChannelType,
      onKocOrderTypeChange: orders.setKocOrderType,
      onHasShippingCodeChange: orders.setHasShippingCode,
      onHasInvoiceCodeChange: orders.setHasInvoiceCode,
      onIsDeliveryInvoicePrintedChange: orders.setIsDeliveryInvoicePrinted,
      onCustomerReturnChange: orders.setCustomerReturn,
      onHasInternalNoteChange: orders.setHasInternalNote,
      onHasAddressChange: orders.setHasAddress,
      onHasReturnSlipChange: orders.setHasReturnSlip,
      onHasRecallCodeChange: orders.setHasRecallCode,
      onHasCallRecordingChange: orders.setHasCallRecording,
      onSortChange: orders.setOrdersSort,
      onToggleOrderColumn: orders.toggleOrderColumn,
      onToggleLockOrderColumn: orders.toggleLockOrderColumn,
      onSetOrderColumns: orders.setOrderColumns,
      onResetOrderColumns: orders.resetOrderColumns,
      onClearFilters: orders.clearFilters,
      // Áp dụng bộ lọc = về trang 0 với overrides — giống nhau ở cả 3 route đơn.
      onApplyFilters: async (overrides?: OrdersFilterOverrides) =>
        orders.goToOrdersPage(0, { overrides }),
    },
    pagination: {
      ordersPage: orders.ordersPage,
      ordersPageSize: orders.ordersPageSize,
      ordersHasNextPage: orders.ordersHasNextPage,
      ordersTotalCount: orders.ordersTotalCount,
      salesStatusCounts: orders.salesStatusCounts,
      statusCounts: orders.statusCounts,
      sheetStats: orders.sheetStats,
      onOrdersPageChange: orders.goToOrdersPage,
      onOrdersPageSizeChange: orders.changeOrdersPageSize,
    },
    actions: {
      onLogContact: orders.logContact,
      onCloseCase: orders.closeCase,
      onPatchOrder: shell.patchOrder,
      onCreateOrder: shell.handleCreateOrder,
      onEnsureProductsLoaded: orders.loadProducts,
      onSearchProducts: orders.searchProducts,
      onDuplicateOrder: orders.duplicateOrder,
      onFetchOrderHistoryByPhone: orders.fetchOrderHistoryByPhone,
      onLookupCustomerByPhone: orders.fetchCustomerByPhone,
      onBulkDeleteOrders: shell.bulkDeleteOrders,
      onKiotVietPrecheck: shell.runKiotVietOrderPrecheck,
      onKiotVietAction: shell.runKiotVietOrderAction,
      onLoadDistrictsForProvince: orders.loadDistrictsForProvince,
      onLoadWardsForDistrict: orders.loadWardsForDistrict,
      onFetchKiotVietLogs: orders.fetchKiotVietLogs,
      onFetchKshipOptions: orders.fetchKshipOptions,
      onCreateKshipDelivery: orders.createKshipDelivery,
      onRefreshOrdersAfterImport: orders.refreshOrders,
      onNavigateToDetail: nav.navigateToOrderDetail,
      onCancelKiotvietOrders: orders.cancelKiotvietOrders,
    },
    landingTab: shell.landingTab,
    onLandingTabChange: nav.handleLandingTabChange,
    isLoading: orders.ordersLoading,
    isFetching: orders.ordersFetching,
    // Nút "Xem log KiotViet" — BE gate /api/orders/kiotviet-jobs theo section đơn,
    // FE gate theo quyền xem KiotViet thay vì is_superuser (audit 2026-09-23 P2-6).
    isAdmin: can(user, "kiotviet:view"),
  };
}

/**
 * Phần lõi chi tiết đơn — dùng chung cho cả full-page (/orders/:id) và drawer
 * (/landing-orders/:id). Lấy orderId từ route param, fetch standaloneOrder qua
 * `ordersView` (đồng bộ trong RootLayout) khi đơn không nằm trong list hiện tại.
 */
function OrderDetailInner() {
  const shell = useAppShell();
  const nav = useRootNav();
  const can = usePermission();
  const { orderId: orderIdParam } = useParams();
  const orderId = Number(orderIdParam);
  const { orders, standaloneOrder, standaloneOrderLoading, channels, staffUsers } = shell;
  // Chi tiết đơn KOC (/koc-orders/:id) lọc nhân viên theo phòng Booking trong form.
  const isKoc = shell.section === "koc-orders";
  // Ưu tiên standaloneOrder (bản ĐẦY ĐỦ từ GET /api/orders/{id} — App luôn fetch khi
  // vào detail) và chỉ nhận đúng đơn đang xem (chống stale khi điều hướng A→B);
  // row của list là bản gọn OrderListSerializer, chỉ dùng làm placeholder lúc chờ.
  const standaloneForThisOrder = standaloneOrder?.id === orderId ? standaloneOrder : null;
  const detailOrder: OrderRow | null =
    standaloneForThisOrder ?? orders.rows.find((r) => r.id === orderId) ?? null;
  const detailIndex = orders.rows.findIndex((r) => r.id === orderId);
  return (
    <OrderDetailPage
      orderId={orderId}
      order={detailOrder}
      isLoading={standaloneOrderLoading}
      onBack={nav.navigateBackToOrderList}
      onPatch={shell.patchOrder}
      onDuplicate={orders.duplicateOrder}
      kiotvietOptions={orders.kiotvietOptions}
      products={orders.products}
      channels={channels}
      staffUsers={staffUsers}
      isKoc={isKoc}
      canAssignSale={can("sale-assignment:edit")}
      canDispatch={can("stock:edit")}
      onNavigatePrev={() => {
        if (detailIndex > 0) nav.navigateToOrderDetail(orders.rows[detailIndex - 1].id);
      }}
      onNavigateNext={() => {
        if (detailIndex >= 0 && detailIndex < orders.rows.length - 1) {
          nav.navigateToOrderDetail(orders.rows[detailIndex + 1].id);
        }
      }}
      hasPrev={detailIndex > 0}
      hasNext={detailIndex >= 0 && detailIndex < orders.rows.length - 1}
    />
  );
}

/** Trang chi tiết đơn (route /orders/:orderId) — render full-page giống section "orders" cũ. */
function OrderDetailView() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <OrderDetailInner />
      </div>
    </div>
  );
}

/** Route /orders — list đơn hàng thường (hoặc blocklist tab). */
export function OrdersRoute() {
  const shell = useAppShell();
  const nav = useRootNav();
  const ordersProps = useOrdersPageProps();
  if (shell.landingTab === "blocklist") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1">
          <BlocklistPage activeTab={shell.landingTab} onTabChange={nav.handleLandingTabChange} />
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <OrdersPage
          {...ordersProps}
          showOrderTabs
          actions={{
            ...ordersProps.actions,
            onRestoreCancelledOrders:
              shell.landingTab === "cancelled"
                ? (ids) => shell.orders.restoreCancelledOrders(ids, { showOrders: true })
                : undefined,
          }}
        />
      </div>
    </div>
  );
}

/** Route /orders/:orderId — chi tiết đơn hàng thường. */
export function OrderDetailRoute() {
  return <OrderDetailView />;
}

/** Route /koc-orders — list đơn KOC/KOL (ẩn filter kênh). */
export function KocOrdersRoute() {
  const shell = useAppShell();
  const nav = useRootNav();
  const ordersProps = useOrdersPageProps();
  if (shell.landingTab === "blocklist") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1">
          <BlocklistPage activeTab={shell.landingTab} onTabChange={nav.handleLandingTabChange} />
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <OrdersPage
          {...ordersProps}
          showOrderTabs
          hideChannelFilter
          isKoc
          actions={{
            ...ordersProps.actions,
            onRestoreCancelledOrders:
              shell.landingTab === "cancelled"
                ? (ids) => shell.orders.restoreCancelledOrders(ids, { showOrders: true })
                : undefined,
          }}
        />
      </div>
    </div>
  );
}

/** Route /landing-orders — list đơn landing page. */
export function LandingOrdersRoute() {
  const shell = useAppShell();
  const nav = useRootNav();
  const ordersProps = useOrdersPageProps();
  if (shell.landingTab === "blocklist") {
    return (
      <div className="min-h-0 flex-1">
        <BlocklistPage activeTab={shell.landingTab} onTabChange={nav.handleLandingTabChange} />
      </div>
    );
  }
  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <OrdersPage
          {...ordersProps}
          isLandingPage
          actions={{
            ...ordersProps.actions,
            onTransferLandingOrders: shell.orders.transferLandingOrders,
            onRestoreCancelledOrders:
              shell.landingTab === "cancelled" ? shell.orders.restoreCancelledOrders : undefined,
          }}
        />
      </div>
      {/* Child route /landing-orders/:orderId render drawer chi tiết ở đây.
          Forward outlet context của RootLayout xuống để drawer dùng useRootNav. */}
      <Outlet context={nav} />
    </div>
  );
}

/**
 * Route con /landing-orders/:orderId — drawer chi tiết trượt từ phải, đè lên
 * list landing (vẫn mounted ở route cha). Mirror đúng panel trượt của trang
 * landing trước cutover.
 */
export function LandingOrderDetailRoute() {
  const nav = useRootNav();
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 animate-in fade-in"
        onClick={nav.navigateBackToOrderList}
      />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-5xl flex-col overflow-y-auto border-l border-border bg-background shadow-2xl animate-in slide-in-from-right">
        <OrderDetailInner />
      </div>
    </>
  );
}

export function ChannelsRoute() {
  const shell = useAppShell();
  return (
    <ChannelsPage
      channels={shell.channels}
      // BE `ChannelService.can_manage` = superuser-only (channels_core/services.py):
      // chưa có mã quyền tương ứng, gate theo `channels:edit` sẽ hiện nút rồi 403.
      // Giữ is_superuser cho tới khi BE chuyển sang require_permission (audit P2-6).
      canManage={Boolean(shell.user.is_superuser)}
      staffUsers={shell.staffUsers}
      onCreate={shell.createChannel}
      onUpdate={shell.updateChannel}
      onBulkDelete={shell.bulkDeleteChannels}
      onLoadAssignments={shell.loadAssignments}
      onAddAssignment={shell.addAssignment}
      onRemoveAssignment={shell.removeAssignment}
      kiotvietChannels={shell.kiotVietChannels}
    />
  );
}

export function KiotVietRoute() {
  const shell = useAppShell();
  return (
    <KiotVietPage
      rows={shell.kiotVietChannels}
      onCreate={shell.createKiotVietChannel}
      onUpdate={shell.updateKiotVietChannel}
      onDelete={shell.deleteKiotVietChannel}
      onBulkDelete={shell.bulkDeleteKiotVietChannels}
    />
  );
}

export function UsersRoute() {
  const shell = useAppShell();
  return (
    <UsersPage
      currentUserId={shell.user.id}
      onCreate={shell.createAdminUser}
      onUpdate={shell.updateAdminUser}
      onDelete={shell.deleteAdminUser}
      departments={shell.departments}
      kiotvietChannels={shell.kiotVietChannels}
    />
  );
}

export function LeadAssignmentRoute() {
  return <LeadAssignmentPage />;
}

export function RolesRoute() {
  return <RolesPage />;
}

export function DepartmentsRoute() {
  const shell = useAppShell();
  return (
    <DepartmentsPage
      departments={shell.departments}
      channels={shell.channels.map((c) => ({ id: c.id, code: c.code, name: c.name }))}
      onCreate={shell.createDepartment}
      onUpdate={shell.updateDepartment}
      onDelete={shell.deleteDepartment}
    />
  );
}

export function DashboardRoute() {
  const shell = useAppShell();
  return (
    <DashboardPage
      summary={shell.summary as never}
      loading={shell.summaryLoading}
      filters={shell.summaryFilters}
      onApplyFilters={async (filters: { dateFrom: string; dateTo: string }) =>
        shell.loadSummary({ force: true, dateFrom: filters.dateFrom, dateTo: filters.dateTo })
      }
    />
  );
}

export function AdsReportRoute() {
  const shell = useAppShell();
  // Biểu đồ doanh thu theo kênh/ngày là góc nhìn cấp quản lý — gate bằng
  // `ads-report:export` (quyền quản lý của section) thay vì is_superuser.
  return <AdsReportPage channels={shell.channels} isAdmin={can(shell.user, "ads-report:export")} />;
}

export function OverviewReportRoute() {
  return <OverviewReportPage />;
}

export function FoxiaReportRoute() {
  return <FoxiaReportPage />;
}

export function CallQualityRoute() {
  return <CallQualityPage />;
}

export function CustomersRoute() {
  const shell = useAppShell();
  return <CustomersPage canManageUsers={can(shell.user, "customers:delete")} />;
}

export function ContactsRoute() {
  return <ContactsPage />;
}

export function ContactFlowRoute() {
  return <ContactFlowSettingsPage />;
}

export function FoxiaLinkRoute() {
  return <FoxiaLinkSettingsPage />;
}

export function PancakeSettingsRoute() {
  return <PancakeSettingsPage />;
}

export function PancakeLeadsRoute() {
  return <PancakeLeadsPage />;
}

export function PancakePosSettingsRoute() {
  return <PancakePosSettingsPage />;
}

export function SystemSettingsRoute() {
  return <SystemSettingsPage />;
}

export function FloatingPoolRoute() {
  return <FloatingPoolPage />;
}

export function LoyalCustomersRoute() {
  return <LoyalCustomersPage />;
}

export function CustomerProfileRoute() {
  return <CustomerProfilePage />;
}

export function ResaleTrackingRoute() {
  return <ResaleTrackingPage />;
}

export function WarrantyClaimsRoute() {
  return <WarrantyClaimsPage />;
}

export function WarrantyClaimDetailRoute() {
  return <WarrantyClaimDetailPage />;
}

export function WarrantyCodesRoute() {
  return <WarrantyCodesPage />;
}

export function AddressLookupRoute() {
  return <AddressLookupPage />;
}

export function ProductsRoute() {
  const shell = useAppShell();
  return <ProductsPage canManageUsers={can(shell.user, "products:edit")} />;
}

/**
 * Route /catalog/products/:id/content — trang param id đọc trực tiếp trong
 * ProductContentPage. `canEdit` tính ở đây (nơi có `useAppShell`) rồi truyền
 * xuống prop thuần, đúng mẫu `ProductsRoute` truyền `canManageUsers` — BE
 * tách hẳn 2 quyền `products:view`/`products:edit` cho profile + ảnh
 * (`test_product_profile_api.py`), FE phải khớp: user chỉ có view thì đọc
 * được nhưng không sửa/lưu/upload được.
 */
export function ProductContentRoute() {
  const can = usePermission();
  return <ProductContentPage canEdit={can("products:edit")} />;
}

export function ProductCategoriesRoute() {
  const shell = useAppShell();
  return <ProductCategoriesPage canManageUsers={can(shell.user, "product-categories:edit")} />;
}

export function WarehousesRoute() {
  return <WarehousesPage />;
}

export function FacebookAdsRoute() {
  const shell = useAppShell();
  return <FacebookAdsPage isAdmin={can(shell.user, "facebook-ads:edit")} />;
}

export function GoogleAdsRoute() {
  const shell = useAppShell();
  return <GoogleAdsPage isAdmin={can(shell.user, "google-ads:edit")} />;
}

export function AuditLogsRoute() {
  return <AuditLogsPage />;
}

export function StockRoute() {
  return <StockPage />;
}

export function DispatchHistoryRoute() {
  return <DispatchHistoryPage />;
}

export function ShipmentsRoute() {
  return <ShipmentsPage />;
}

export function StockDocumentsRoute() {
  return <StockDocumentsPage />;
}

export function EmployeesRoute() {
  return <EmployeesPage />;
}

export function EmployeeDetailRoute() {
  return <EmployeeDetailPage />;
}

export function LeaveRequestsRoute() {
  return <LeaveRequestsPage />;
}

export function AttendanceCheckInRoute() {
  return <AttendanceCheckInPage />;
}

export function AttendanceLocationsRoute() {
  return <AttendanceLocationsPage />;
}

export function AttendanceHistoryRoute() {
  return <AttendanceHistoryPage />;
}

export function CompensationRoute() {
  return <CompensationPage />;
}

export function MediaExploreRoute() {
  return <MediaExplorePage />;
}

export function MediaContentsRoute() {
  return <MediaContentsPage />;
}

export function MediaProposalsRoute() {
  return <MediaProposalsPage />;
}

export function MediaReportsRoute() {
  return <MediaReportsPage />;
}

export function MediaTaxonomyRoute() {
  return <MediaTaxonomyPage />;
}

export function MediaSettingsRoute() {
  return <MediaSettingsPage />;
}
