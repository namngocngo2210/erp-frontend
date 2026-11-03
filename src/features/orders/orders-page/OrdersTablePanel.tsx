import type { ReactNode } from "react";
import { Upload } from "lucide-react";

import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { OpenDialpadButton, OpenDialpadMenuItem } from "@/features/callcenter/OpenDialpadButton";
import { OrdersTable } from "../OrdersTable";
import { OrdersPagination } from "../OrdersPagination";
import type { LandingTabKey } from "../landing-tabs";
import type { OrderColumnKey, OrderRow } from "../order-types";
import { OrdersColumnPicker } from "./OrdersColumnPicker";
import { OrdersLandingTabsBar } from "./OrdersLandingTabsBar";
import { OrdersSalesStatusChipBar } from "./OrdersSalesStatusChipBar";
import { OrdersStatusChipBar } from "./OrdersStatusChipBar";
import {
  OrdersImportButton,
  OrdersSearchInput,
  OrdersSortMenu,
  OrdersSortMenuItems,
} from "./OrdersToolbarActions";
import type {
  OrdersActions,
  OrdersCatalogs,
  OrdersFilterHandlers,
  OrdersFilterValues,
  OrdersPaginationProps,
} from "./orders-page-props";
import type { useOrdersFilterHandlers } from "./use-orders-filter-handlers";
import type { useOrdersFilterOptions } from "./use-orders-filter-options";
import type { useOrdersKiotVietActions } from "./use-orders-kiotviet-actions";

type Props = {
  rows: OrderRow[];
  getExportFilters?: () => Record<string, unknown> | null;
  exportSection: "orders" | "koc-orders" | "landing-orders";
  catalogs: OrdersCatalogs;
  filters: OrdersFilterValues;
  filterHandlers: OrdersFilterHandlers;
  pagination: OrdersPaginationProps;
  actions: OrdersActions;
  /** Cột đang hiện (đã bỏ cột recall ngoài trang KOC) và cột người dùng chọn. */
  effectiveVisibleColumns: OrderColumnKey[];
  visibleOrderColumns: OrderColumnKey[];
  lockedOrderColumns: OrderColumnKey[];
  channelStaffByCode: Record<string, Array<{ id: number; name: string }>>;
  filterKey: string;
  filterOptions: ReturnType<typeof useOrdersFilterOptions>;
  filterUiHandlers: ReturnType<typeof useOrdersFilterHandlers>;
  kiotviet: ReturnType<typeof useOrdersKiotVietActions>;
  isKoc: boolean;
  isLandingPage: boolean;
  isAdmin: boolean;
  shouldShowOrderTabs: boolean;
  landingTab: LandingTabKey;
  onLandingTabChange?: (next: LandingTabKey) => void;
  onOpenImport: () => void;
  onOpenDetails: (order: OrderRow) => void;
  onOpenCreateKshipCodeModal: (orderIds: number[]) => void;
  rightActions: ReactNode;
  /** Điện thoại: nút "Bộ lọc" (icon + badge) đặt trong toolbar thay cho thanh lọc riêng. */
  mobileFilterButton?: ReactNode;
  activeOrderId?: number;
  isLoading: boolean;
  isFetching: boolean;
  t: (key: string, fallback?: string) => string;
};

/** Bảng đơn + thanh công cụ (tab landing, chip trạng thái, tìm/sắp xếp, cột) + phân trang. */
export function OrdersTablePanel({
  rows,
  getExportFilters,
  exportSection,
  catalogs,
  filters,
  filterHandlers,
  pagination,
  actions,
  effectiveVisibleColumns,
  visibleOrderColumns,
  lockedOrderColumns,
  channelStaffByCode,
  filterKey,
  filterOptions,
  filterUiHandlers,
  kiotviet,
  isKoc,
  isLandingPage,
  isAdmin,
  shouldShowOrderTabs,
  landingTab,
  onLandingTabChange,
  onOpenImport,
  onOpenDetails,
  onOpenCreateKshipCodeModal,
  rightActions,
  mobileFilterButton,
  activeOrderId,
  isLoading,
  isFetching,
  t,
}: Props) {
  const { q, status, invoiceStatus, salesStatus, sort } = filters;
  const { onSalesStatusChange, onSortChange, onApplyFilters } = filterHandlers;
  const { salesStatusCounts, statusCounts = {}, sheetStats = {}, ordersTotalCount } = pagination;
  const { handleSearchChange, handleSearchKeyDown, applyStatusChips } = filterUiHandlers;
  // --- Thanh chip lọc nhanh theo trạng thái đơn (Order.status) ---
  // Chỉ trang Đơn hàng và KOC. Landing đã có thanh chip trạng thái sale riêng.
  const showStatusChips = !isLandingPage;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <OrdersTable
        rows={rows}
        getExportFilters={getExportFilters}
        exportSection={exportSection}
        products={catalogs.products}
        onPatch={actions.onPatchOrder}
        onDuplicateOrder={actions.onDuplicateOrder}
        onBulkDelete={actions.onBulkDeleteOrders}
        onKiotVietAction={kiotviet.handleKiotVietAction}
        visibleColumns={effectiveVisibleColumns}
        lockedColumns={lockedOrderColumns}
        kiotvietOptions={catalogs.kiotvietOptions}
        addressCatalog={catalogs.addressCatalog}
        channelStaffByCode={channelStaffByCode}
        channels={catalogs.channels}
        filterKey={filterKey}
        isLandingPage={isLandingPage}
        onTransferLandingOrders={actions.onTransferLandingOrders}
        isAdmin={isAdmin}
        onCancelKiotvietOrders={actions.onCancelKiotvietOrders}
        onRestoreCancelledOrders={actions.onRestoreCancelledOrders}
        wrapToolbarInCard={shouldShowOrderTabs}
        aboveToolbar={
          shouldShowOrderTabs ? (
            <OrdersLandingTabsBar
              isLandingPage={isLandingPage}
              landingTab={landingTab}
              onLandingTabChange={onLandingTabChange}
              sheetStats={sheetStats}
              ordersTotalCount={ordersTotalCount}
              salesStatusCounts={salesStatusCounts}
              onSalesStatusChange={onSalesStatusChange}
              onApplyFilters={onApplyFilters}
            />
          ) : null
        }
        belowToolbar={
          <div className="flex flex-col gap-1.5">
            {showStatusChips ? (
              <OrdersStatusChipBar
                t={t}
                statusLabel={filterOptions.statusLabel}
                status={status}
                invoiceStatus={invoiceStatus}
                statusCounts={statusCounts}
                onApplyStatusChips={applyStatusChips}
              />
            ) : null}
            {isLandingPage ? (
              <OrdersSalesStatusChipBar
                t={t}
                salesStatus={salesStatus}
                salesStatusOptions={filterOptions.salesStatusOptions}
                salesStatusCounts={salesStatusCounts}
                onSalesStatusChange={onSalesStatusChange}
                onApplyFilters={onApplyFilters}
              />
            ) : null}
          </div>
        }
        mobileFilterButton={mobileFilterButton}
        mobileMenuItems={
          <>
            <OpenDialpadMenuItem className="gap-2 py-2" />
            <DropdownMenuItem className="gap-2 py-2" onClick={onOpenImport}>
              <Upload className="h-4 w-4" />
              {t("orders.actions.importExcel", "Nhập đơn")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t("orders.sort.ariaLabel", "Sắp xếp")}</DropdownMenuLabel>
            <OrdersSortMenuItems
              t={t}
              sort={sort}
              onSortChange={onSortChange}
              onApplyFilters={onApplyFilters}
              itemClassName="gap-2 py-2"
            />
          </>
        }
        mobileSearchBar={
          <OrdersSearchInput
            t={t}
            id="orders-toolbar-search-mobile"
            wrapperClassName="relative w-full"
            inputClassName="h-9 w-full pl-8 text-sm"
            q={q}
            onSearchChange={handleSearchChange}
            onSearchKeyDown={handleSearchKeyDown}
          />
        }
        leftActions={
          <>
            <OrdersSearchInput
              t={t}
              id="orders-toolbar-search"
              wrapperClassName="relative hidden w-40 sm:block sm:w-56 md:w-64"
              inputClassName="h-8 w-full pl-8 text-sm"
              q={q}
              onSearchChange={handleSearchChange}
              onSearchKeyDown={handleSearchKeyDown}
            />
            <OrdersSortMenu
              t={t}
              sort={sort}
              onSortChange={onSortChange}
              onApplyFilters={onApplyFilters}
            />
          </>
        }
        preKiotVietActions={
          <>
            <OpenDialpadButton />
            <OrdersImportButton t={t} onClick={onOpenImport} />
          </>
        }
        columnPicker={
          <OrdersColumnPicker
            t={t}
            visibleOrderColumns={visibleOrderColumns}
            lockedOrderColumns={lockedOrderColumns}
            isKoc={isKoc}
            onToggleOrderColumn={filterHandlers.onToggleOrderColumn}
            onToggleLockOrderColumn={filterHandlers.onToggleLockOrderColumn}
            onSetOrderColumns={filterHandlers.onSetOrderColumns}
            onResetOrderColumns={filterHandlers.onResetOrderColumns}
          />
        }
        rightActions={rightActions}
        onOpenDetails={onOpenDetails}
        onOpenKiotVietLogs={kiotviet.handleOpenKiotVietLogs}
        onOpenCreateKshipCodeModal={onOpenCreateKshipCodeModal}
        activeOrderId={activeOrderId}
        isLoading={isLoading}
        isFetching={isFetching}
        showTotals
      />

      <OrdersPagination
        rowsCount={rows.length}
        ordersPage={pagination.ordersPage}
        ordersPageSize={pagination.ordersPageSize}
        ordersHasNextPage={pagination.ordersHasNextPage}
        ordersTotalCount={ordersTotalCount}
        isLoading={isLoading}
        onPageSizeChange={filterUiHandlers.handlePageSizeChange}
        onPageChange={filterUiHandlers.handlePageChange}
      />
    </div>
  );
}
