import { useMemo } from "react";

import { useAppShell } from "@/app/AppShellContext";
import { useChannelTypesQuery } from "@/features/channels/queries";
import { useWarehousesList } from "@/features/warehouses/queries";
import { Sheet3Section } from "@/features/orders/components/Sheet3Section";
import { buildChannelStaffByCode } from "@/features/orders/channel-staff";
import { OrderFormDialog } from "@/features/orders/OrderFormDialog";
import { OrdersFiltersBar } from "@/features/orders/orders-page/OrdersFiltersBar";
import { OrdersPageDialogs } from "@/features/orders/orders-page/OrdersPageDialogs";
import { buildOrdersFilterKey } from "@/features/orders/orders-page/orders-filter-key";
import { OrdersAddOrderButton } from "@/features/orders/orders-page/OrdersToolbarActions";
import { OrdersTablePanel } from "@/features/orders/orders-page/OrdersTablePanel";
import { useOrdersFilterHandlers } from "@/features/orders/orders-page/use-orders-filter-handlers";
import { useOrdersFilterOptions } from "@/features/orders/orders-page/use-orders-filter-options";
import { useOrdersKiotVietActions } from "@/features/orders/orders-page/use-orders-kiotviet-actions";
import { useOrdersKshipDialogs } from "@/features/orders/orders-page/use-orders-kship-dialogs";
import { useOrdersCrmPanel } from "@/features/orders/orders-page/use-orders-crm-panel";
import { useOrdersOrderDialog } from "@/features/orders/orders-page/use-orders-order-dialog";
import { useOrdersImport } from "@/features/orders/use-orders-import";
import { usePermission } from "@/hooks/usePermission";
import { useOrderFieldGrants } from "@/hooks/useOrderFieldGrants";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MOBILE_VIEWPORT_QUERY } from "@/lib/constants/layout";
import {
  ORDER_COLUMN_OPTIONS,
  type OrderColumnKey,
  type OrderRow,
} from "@/features/orders/order-types";
import { RECALL_COLUMN_KEYS } from "@/features/orders/order-import-format";
import { useI18n } from "@/i18n";
import type {
  OrdersActions,
  OrdersCatalogs,
  OrdersFilterHandlers,
  OrdersFilterValues,
  OrdersPaginationProps,
} from "@/features/orders/orders-page/orders-page-props";

// Tab consts đã chuyển sang features/orders/landing-tabs.ts (Fast Refresh yêu cầu
// file component chỉ export component). Re-export type để importer cũ không gãy.
import { type LandingTabKey } from "@/features/orders/landing-tabs";

export type { LandingTabKey };

type Props = {
  rows: OrderRow[];
  /** Snapshot bộ lọc danh sách hiện tại để xuất Excel toàn bộ (null nếu không khả dụng). */
  getExportFilters?: () => Record<string, unknown> | null;
  catalogs: OrdersCatalogs;
  filters: OrdersFilterValues;
  filterHandlers: OrdersFilterHandlers;
  pagination: OrdersPaginationProps;
  actions: OrdersActions;
  /** ID đơn đang xem (để highlight row trong grid) */
  activeOrderId?: number;
  /** Đang fetch dữ liệu đơn hàng (bảng trống → spinner toàn khung) */
  isLoading?: boolean;
  /** Có request query nào đang chạy (kể cả khi bảng đang có dữ liệu) → lớp phủ spinner */
  isFetching?: boolean;
  showOrderTabs?: boolean;
  /** Ẩn ô filter "Kênh bán hàng" — dùng cho trang đã khóa cứng 1 kênh (vd KOC/KOL). */
  hideChannelFilter?: boolean;
  /** Trang đơn KOC — bật auto-fill thanh toán cho đơn "không trả lại". */
  isKoc?: boolean;
  /** Chế độ Landing Page: ẩn import, tạo đơn, hóa đơn, phiếu giao hàng */
  isLandingPage?: boolean;
  /** Tab hiện tại (chỉ dùng khi isLandingPage=true). */
  landingTab?: LandingTabKey;
  /** Callback khi user đổi tab. */
  onLandingTabChange?: (next: LandingTabKey) => void;
  /** User là admin */
  isAdmin?: boolean;
};

function OrdersPage({
  rows,
  getExportFilters,
  catalogs,
  filters,
  filterHandlers,
  pagination,
  actions,
  activeOrderId,
  isLoading = false,
  isFetching = false,
  showOrderTabs = false,
  hideChannelFilter = false,
  isKoc = false,
  isLandingPage = false,
  landingTab = "orders",
  onLandingTabChange,
  isAdmin = false,
}: Props) {
  const {
    channels,
    allChannels,
    staffUsers,
    userAssignedChannels,
    kiotvietOptions,
    products,
    productsPriceBook,
    addressCatalog,
  } = catalogs;
  const {
    q,
    salesStatus,
    visibleOrderColumns = ORDER_COLUMN_OPTIONS.map((option) => option.key),
    lockedOrderColumns = [] as OrderColumnKey[],
  } = filters;
  const { onClearFilters } = filterHandlers;
  const { ordersPage, onOrdersPageChange, onOrdersPageSizeChange } = pagination;
  const {
    onLogContact,
    onCloseCase,
    onPatchOrder,
    onCreateOrder,
    onSearchProducts,
    onEnsureProductsLoaded,
    onFetchOrderHistoryByPhone,
    onLookupCustomerByPhone,
    onKiotVietPrecheck,
    onKiotVietAction,
    onLoadDistrictsForProvince,
    onLoadWardsForDistrict,
    onFetchKiotVietLogs,
    onFetchKshipOptions,
    onCreateKshipDelivery,
    onRefreshOrdersAfterImport,
    onNavigateToDetail,
  } = actions;
  const { t } = useI18n();
  const shouldShowOrderTabs = isLandingPage || showOrderTabs;
  // Danh mục loại kênh nuôi ô lọc "Loại kênh". Nạp ngay khi vào trang đơn (không
  // chờ mở panel lọc) để lần mở đầu tiên không thấy ô rỗng; vài dòng + staleTime
  // 5' nên chi phí không đáng kể.
  const channelTypeCatalog = useChannelTypesQuery(true).data;
  // Danh mục kho nuôi ô lọc "Kho xuất" — lấy CẢ kho đã tắt vì đơn cũ vẫn trỏ tới.
  const warehouseCatalog = useWarehousesList({ limit: 200, offset: 0 }).data?.items;

  // Section RBAC của trang — backend check quyền `{section}:export` theo đúng trang.
  const exportSection = isKoc
    ? ("koc-orders" as const)
    : isLandingPage
      ? ("landing-orders" as const)
      : ("orders" as const);

  const effectiveVisibleColumns = useMemo(() => {
    let cols = visibleOrderColumns;
    if (!isKoc) {
      cols = cols.filter((key) => !RECALL_COLUMN_KEYS.includes(key));
    }
    return cols;
  }, [visibleOrderColumns, isKoc]);

  // Truyền xuống OrdersTable để reset selection khi user đổi bộ lọc.
  const ordersFilterKey = useMemo(
    () => buildOrdersFilterKey(filters, isLandingPage ? landingTab : null),
    [filters, isLandingPage, landingTab],
  );
  const can = usePermission();
  const canEditOrderField = useOrderFieldGrants();
  const { user } = useAppShell();
  const orderDialog = useOrdersOrderDialog({
    t,
    isLandingPage,
    canEditOrderField,
    onCreateOrder,
    onPatchOrder,
  });

  const importer = useOrdersImport({
    isLandingPage,
    isKoc,
    t,
    onClearFilters,
    onOrdersPageChange,
    onRefreshOrdersAfterImport,
  });

  const kship = useOrdersKshipDialogs({
    rows,
    t,
    onFetchKshipOptions,
    onCreateKshipDelivery,
  });

  const filterOptions = useOrdersFilterOptions({
    t,
    channels,
    channelTypes: channelTypeCatalog,
    warehouses: warehouseCatalog,
    allChannels,
    userAssignedChannels,
    staffUsers,
    products,
    kiotvietOptions,
    channel: filters.channel,
    product: filters.product,
    staff: filters.staff,
    deliveryBusinessStatus: filters.deliveryBusinessStatus,
    salesStatus,
    kiotvietChannel: filters.kiotvietChannel,
    branchId: filters.branchId,
    fulfillmentWarehouse: filters.fulfillmentWarehouse,
  });

  // Handler nhận đủ bộ on*Change của trang (spread), cộng q/page để tự áp bộ lọc.
  const filterUiHandlers = useOrdersFilterHandlers({
    ...filterHandlers,
    t,
    q,
    ordersPage,
    onOrdersPageChange,
    onOrdersPageSizeChange,
  });

  const kiotviet = useOrdersKiotVietActions({
    t,
    onFetchKiotVietLogs,
    onKiotVietPrecheck,
    onKiotVietAction,
  });

  // Ô chọn nhân viên trong form: BE đã scope danh sách theo phòng ban của trang
  // (KOC -> Booking, còn lại -> Sales), FE chỉ dựng map theo mã kênh để hiển thị.
  const channelStaffByCode = useMemo(
    () => buildChannelStaffByCode(channels, staffUsers),
    [channels, staffUsers],
  );

  // Điện thoại: thanh lọc riêng thu thành nút icon trong toolbar của bảng.
  const isMobileViewport = useMediaQuery(MOBILE_VIEWPORT_QUERY);
  const filtersBar = (
    <OrdersFiltersBar
      filters={filters}
      options={filterOptions}
      handlers={filterUiHandlers}
      hideChannelFilter={hideChannelFilter}
      isKoc={isKoc}
      compact={isMobileViewport}
    />
  );

  const { crmPanelOrderId, closeCrmPanel, handleOpenDetails } = useOrdersCrmPanel(
    isLandingPage && landingTab === "sheet3",
    onNavigateToDetail,
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        {isMobileViewport ? null : filtersBar}

        <OrdersTablePanel
          rows={rows}
          getExportFilters={getExportFilters}
          exportSection={exportSection}
          catalogs={catalogs}
          filters={filters}
          filterHandlers={filterHandlers}
          pagination={pagination}
          actions={actions}
          effectiveVisibleColumns={effectiveVisibleColumns}
          visibleOrderColumns={visibleOrderColumns}
          lockedOrderColumns={lockedOrderColumns}
          channelStaffByCode={channelStaffByCode}
          filterKey={ordersFilterKey}
          filterOptions={filterOptions}
          filterUiHandlers={filterUiHandlers}
          kiotviet={kiotviet}
          isKoc={isKoc}
          isLandingPage={isLandingPage}
          isAdmin={isAdmin}
          shouldShowOrderTabs={shouldShowOrderTabs}
          landingTab={landingTab}
          onLandingTabChange={onLandingTabChange}
          onOpenImport={importer.openImportModal}
          onOpenDetails={handleOpenDetails}
          onOpenCreateKshipCodeModal={kship.handleOpenCreateKshipCodeModal}
          rightActions={<OrdersAddOrderButton t={t} onClick={orderDialog.handleOpenCreate} />}
          mobileFilterButton={isMobileViewport ? filtersBar : undefined}
          activeOrderId={activeOrderId}
          isLoading={isLoading}
          isFetching={isFetching}
          t={t}
        />
      </div>

      {isLandingPage && (
        <Sheet3Section
          rows={rows}
          openOrderId={crmPanelOrderId}
          onClose={closeCrmPanel}
          onLogContact={onLogContact}
          onCloseCase={onCloseCase}
          onPatchOrder={onPatchOrder}
          onNavigateToDetail={onNavigateToDetail}
        />
      )}

      <OrderFormDialog
        open={orderDialog.orderDialogOpen}
        onOpenChange={orderDialog.setOrderDialogOpen}
        mode={orderDialog.orderDialogMode}
        initialOrder={orderDialog.selectedOrder}
        channels={channels}
        products={products}
        productsPriceBook={productsPriceBook}
        onSearchProducts={onSearchProducts}
        onEnsureProductsLoaded={onEnsureProductsLoaded}
        kiotvietOptions={kiotvietOptions}
        addressCatalog={addressCatalog}
        channelStaffByCode={channelStaffByCode}
        submitting={orderDialog.orderSubmitting}
        kocMode={isKoc}
        onSubmit={orderDialog.handleSubmitOrderDialog}
        onKiotVietAction={kiotviet.handleKiotVietAction}
        onFetchOrderHistoryByPhone={onFetchOrderHistoryByPhone}
        onLookupCustomerByPhone={onLookupCustomerByPhone}
        onLoadDistrictsForProvince={onLoadDistrictsForProvince}
        onLoadWardsForDistrict={onLoadWardsForDistrict}
        canAssignSale={can("sale-assignment:edit")}
        currentUserId={user?.id ?? null}
        canEditField={canEditOrderField}
      />

      <OrdersPageDialogs
        importer={importer}
        kiotviet={kiotviet}
        kship={kship}
        isLandingPage={isLandingPage}
        isKoc={isKoc}
        canManageSenderAddresses={can("kiotviet:edit")}
        t={t}
      />
    </div>
  );
}

export default OrdersPage;
