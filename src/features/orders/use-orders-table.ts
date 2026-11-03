import { useRef } from "react";

import type {
  FilterScopeAccess,
  UseOrdersFiltersReturn,
} from "@/features/orders/use-orders-filters";

import { type FetchJson, type LoadOrdersFn, type OrdersModeAccess } from "./orders-table/shared";
import { useOrdersFilterMirror } from "./orders-table/use-filter-mirror";
import { useLoadOrders } from "./orders-table/use-load-orders";
import { useOrdersRealtimeUpdates } from "./orders-table/use-realtime-updates";
import { useOrdersTableState } from "./orders-table/use-table-state";

// Re-export cho các call site cũ (OrdersPage, use-orders-data, use-orders-filters)
// — định nghĩa thật nằm ở orders-table/shared.ts.
export { clampOrdersPageSize } from "./orders-table/shared";
export type { LoadOrdersOverrides, OrdersModeAccess, OrdersSortValue } from "./orders-table/shared";

type UseOrdersTableDeps = {
  fetchJson: FetchJson;
  filters: UseOrdersFiltersReturn;
  /** Chỉ đọc — dùng để chọn endpoint sheet 1/2/3 của trang Landing. */
  scope: FilterScopeAccess;
  modes: OrdersModeAccess;
  /**
   * Xoá dấu "đơn user vừa tự thao tác" khi có danh sách mới từ server (nguồn chân
   * lý). Set do `useOrdersData` sở hữu vì realtime handler cũng đọc nó.
   */
  clearSelfActionOrders: () => void;
};

/**
 * Sở hữu BẢNG đơn hàng: danh sách rows, phân trang, sort, các bộ đếm
 * (`status_counts` / `sales_status_counts` / `temperature_counts` / `sheet_stats`),
 * và toàn bộ luồng `loadOrders` (chống race bằng seq, chế độ counts-only debounced).
 *
 * Kèm theo là lớp cập nhật TẠI CHỖ cho realtime (`applyOrderPatchInMemory` /
 * `applyOrderUpsertInMemory`) cùng `rowPassesActiveFilters` — mirror phía client của
 * bộ lọc server để đơn đến qua WebSocket không lọt/không rò filter.
 *
 * Từ 08/2026 hook này chỉ còn là COMPOSITION — logic nằm ở orders-table/:
 * - use-table-state.ts    : state hiển thị (rows/loading/phân trang/sort/bộ đếm) + latest-refs
 * - use-filter-mirror.ts  : snapshot bộ lọc + rowPassesActiveFilters (mirror filter server)
 * - use-realtime-updates.ts: patch/upsert/broadcast tại chỗ + revalidate counts debounced
 * - use-load-orders.ts    : loadOrders (seq chống race) + phân trang + snapshot xuất Excel
 *
 * Chữ ký trả về giữ NGUYÊN so với trước khi tách.
 */
export function useOrdersTable({
  fetchJson,
  filters,
  scope,
  modes,
  clearSelfActionOrders,
}: UseOrdersTableDeps) {
  const state = useOrdersTableState();
  const { rowPassesActiveFilters } = useOrdersFilterMirror(filters);

  // Latest-ref cho scheduleStatusCountsRefresh (bên use-realtime-updates, chạy TRƯỚC
  // useLoadOrders) gọi được loadOrders mà không kéo nó vào dependency chain.
  const loadOrdersRef = useRef<LoadOrdersFn | null>(null);

  const {
    applyOrderPatchInMemory,
    applyOrderUpsertInMemory,
    applyBroadcastRowsInMemory,
    removeOrderFromMemory,
  } = useOrdersRealtimeUpdates({
    modes,
    loadOrdersRef,
    rows: state.rows,
    ordersSortRef: state.ordersSortRef,
    setRows: state.setRows,
    setStatusCounts: state.setStatusCounts,
    rowPassesActiveFilters,
  });

  const {
    loadOrders,
    goToOrdersPage,
    changeOrdersPageSize,
    refreshOrders,
    getOrdersExportFilters,
  } = useLoadOrders({
    fetchJson,
    filters,
    scope,
    modes,
    clearSelfActionOrders,
    state,
  });
  loadOrdersRef.current = loadOrders;

  return {
    rows: state.rows,
    ordersLoading: state.ordersLoading,
    ordersFetching: state.ordersFetching,
    ordersPage: state.ordersPage,
    ordersPageSize: state.ordersPageSize,
    ordersSort: state.ordersSort,
    ordersHasNextPage: state.ordersHasNextPage,
    ordersTotalCount: state.ordersTotalCount,
    salesStatusCounts: state.salesStatusCounts,
    statusCounts: state.statusCounts,
    temperatureCounts: state.temperatureCounts,
    sheetStats: state.sheetStats,
    setOrdersSort: state.setOrdersSort,
    // Lộ ra cho `clearFilters` (bên useOrdersData) đưa bảng về trang đầu khi xoá lọc.
    setOrdersPage: state.setOrdersPage,
    loadOrders,
    applyOrderPatchInMemory,
    applyOrderUpsertInMemory,
    applyBroadcastRowsInMemory,
    removeOrderFromMemory,
    goToOrdersPage,
    changeOrdersPageSize,
    refreshOrders,
    clearOrdersCache: state.clearOrdersCache,
    getOrdersExportFilters,
    resetTable: state.resetTable,
  };
}
