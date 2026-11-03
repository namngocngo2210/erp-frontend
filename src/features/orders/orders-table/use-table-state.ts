import { useCallback, useEffect, useRef, useState } from "react";

import { type OrderRow } from "@/features/orders/order-types";

import { ORDERS_FETCH_LIMIT, type OrdersSortValue } from "./shared";

/**
 * Sở hữu toàn bộ STATE hiển thị của bảng đơn hàng: rows, loading/fetching,
 * phân trang, sort và các bộ đếm (`status_counts` / `sales_status_counts` /
 * `temperature_counts` / `sheet_stats`) — kèm các latest-ref (`rowsRef`,
 * `rowsCountRef`, `ordersSortRef`) để các hook anh em đọc ngoài render.
 *
 * Tách từ use-orders-table.ts (composition); hành vi giữ NGUYÊN từng dòng.
 */
export function useOrdersTableState() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  // Latest-ref cho loadOrders đọc số dòng hiện có mà không đưa `rows` vào deps
  // (tránh đổi identity loadOrders mỗi khi list thay đổi → refire effect phụ thuộc).
  // (Snapshot rows đầy đủ — rowsRef — do use-realtime-updates.ts sở hữu vì chỉ lớp
  // realtime đọc/ghi nó ngoài render.)
  const rowsCountRef = useRef(rows.length);
  useEffect(() => {
    rowsCountRef.current = rows.length;
  });
  const [ordersLoading, setOrdersLoading] = useState(false);
  // ordersFetching: true trong SUỐT mọi request loadOrders (kể cả khi bảng đang
  // có dữ liệu) → dùng cho lớp phủ LogoSpinner ở mọi thao tác query. Khác với
  // ordersLoading (chỉ bật khi bảng trống, hiển thị spinner toàn khung).
  const [ordersFetching, setOrdersFetching] = useState(false);
  const [ordersPage, setOrdersPage] = useState(0);
  const [ordersPageSize, setOrdersPageSize] = useState(ORDERS_FETCH_LIMIT);
  const [ordersSort, setOrdersSort] = useState<OrdersSortValue>("newest");
  const [ordersHasNextPage, setOrdersHasNextPage] = useState(false);
  const [ordersTotalCount, setOrdersTotalCount] = useState(0);
  const [salesStatusCounts, setSalesStatusCounts] = useState<Record<string, number>>({});
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [temperatureCounts, setTemperatureCounts] = useState<Record<string, number>>({});
  const [sheetStats, setSheetStats] = useState<Record<string, number>>({});
  const ordersSortRef = useRef<OrdersSortValue>(ordersSort);
  ordersSortRef.current = ordersSort;

  const clearOrdersCache = useCallback(() => {
    // No-op: orders cache removed
  }, []);

  // Phần bảng của `resetOrdersData`: dọn rows, phân trang, sort và bộ đếm.
  const resetTable = useCallback(() => {
    setRows([]);
    setOrdersPage(0);
    setOrdersPageSize(ORDERS_FETCH_LIMIT);
    setOrdersSort("newest");
    setOrdersHasNextPage(false);
    setSalesStatusCounts({});
    clearOrdersCache();
  }, [clearOrdersCache]);

  return {
    rows,
    setRows,
    rowsCountRef,
    ordersLoading,
    setOrdersLoading,
    ordersFetching,
    setOrdersFetching,
    ordersPage,
    setOrdersPage,
    ordersPageSize,
    setOrdersPageSize,
    ordersSort,
    setOrdersSort,
    ordersSortRef,
    ordersHasNextPage,
    setOrdersHasNextPage,
    ordersTotalCount,
    setOrdersTotalCount,
    salesStatusCounts,
    setSalesStatusCounts,
    statusCounts,
    setStatusCounts,
    temperatureCounts,
    setTemperatureCounts,
    sheetStats,
    setSheetStats,
    clearOrdersCache,
    resetTable,
  };
}

export type OrdersTableState = ReturnType<typeof useOrdersTableState>;
