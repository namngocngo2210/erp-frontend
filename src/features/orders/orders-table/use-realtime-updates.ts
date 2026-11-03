import { useCallback, useEffect, useRef } from "react";

import { mergeOrderRowPatch } from "@/features/orders/order-realtime-merge";
import { applyStatusCountsDelta, statusChipKeyFor } from "@/features/orders/order-status-counts";
import { type OrderRow } from "@/features/orders/order-types";

import { type LoadOrdersFn, type OrdersModeAccess } from "./shared";
import { type OrdersTableState } from "./use-table-state";

// Debounce cho revalidation statusCounts khi realtime event trỏ tới đơn KHÔNG nằm
// trên trang hiện tại (không có row để suy delta cục bộ) — trailing để một burst
// webhook chỉ tốn đúng 1 request counts-only.
const STATUS_COUNTS_REFRESH_DEBOUNCE_MS = 2500;

type UseOrdersRealtimeUpdatesDeps = {
  modes: OrdersModeAccess;
  /**
   * Latest-ref trỏ tới `loadOrders` (do composition gán sau khi useLoadOrders chạy)
   * — cho scheduleStatusCountsRefresh gọi được loadOrders mà không kéo nó vào
   * dependency chain. Chỉ đọc trong callback (event time), không đọc trong render.
   */
  loadOrdersRef: { current: LoadOrdersFn | null };
  rows: OrderRow[];
  ordersSortRef: OrdersTableState["ordersSortRef"];
  setRows: OrdersTableState["setRows"];
  setStatusCounts: OrdersTableState["setStatusCounts"];
  rowPassesActiveFilters: (row: OrderRow, isNewArrival?: boolean) => boolean;
};

/**
 * Lớp cập nhật TẠI CHỖ cho realtime: `applyOrderPatchInMemory` /
 * `applyOrderUpsertInMemory` / `applyBroadcastRowsInMemory` /
 * `removeOrderFromMemory`, kèm `scheduleStatusCountsRefresh` (revalidate
 * counts-only debounced khi event trỏ tới đơn ngoài trang hiện tại).
 *
 * Tách từ use-orders-table.ts (composition); hành vi giữ NGUYÊN từng dòng.
 */
export function useOrdersRealtimeUpdates({
  modes,
  loadOrdersRef,
  rows,
  ordersSortRef,
  setRows,
  setStatusCounts,
  rowPassesActiveFilters,
}: UseOrdersRealtimeUpdatesDeps) {
  // Snapshot rows mới nhất để applyOrderPatchInMemory/applyOrderUpsertInMemory đọc
  // "key cũ" (statusChipKeyFor) TRƯỚC khi gọi setRows — không được tính oldKey bên
  // trong updater rồi đọc lại ngay sau setRows(), vì React không đảm bảo updater chạy
  // đồng bộ tại thời điểm đó (nếu chạy trễ hơn, oldKey/newKey vẫn undefined lúc đọc →
  // statusCounts không bao giờ cập nhật — bug đã bắt được lúc viết test 7.1a).
  // Ref do hook này SỞ HỮU (không nhận qua param) để được ghi `.current` ngoài render
  // mà không phạm luật "không mutate hook argument" của React Compiler.
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  });
  // Realtime event trỏ tới đơn KHÔNG có trên trang hiện tại → không suy được delta
  // statusCounts cục bộ (không biết trạng thái cũ, và việc đơn có thuộc tập đếm hay
  // không là tri thức server-side). Lên lịch một lần revalidate counts-only qua
  // loadOrders({ statusCountsOnly: true }) — debounced trailing để burst webhook chỉ
  // tốn 1 request; KHÔNG reload rows nên không đụng keep-row-on-user-edit và không
  // gây nháy bảng. loadOrdersRef vì loadOrders được định nghĩa ở hook anh em.
  const statusCountsRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleStatusCountsRefresh = useCallback(() => {
    // Chip statusCounts chỉ tồn tại ở trang Đơn hàng + KOC (landing dùng
    // sales_status_counts) — tránh request thừa.
    if (modes.isLanding()) return;
    if (statusCountsRefreshTimerRef.current) clearTimeout(statusCountsRefreshTimerRef.current);
    statusCountsRefreshTimerRef.current = setTimeout(() => {
      statusCountsRefreshTimerRef.current = null;
      loadOrdersRef.current?.(undefined, { statusCountsOnly: true }).catch(() => null);
    }, STATUS_COUNTS_REFRESH_DEBOUNCE_MS);
  }, [loadOrdersRef, modes]);
  useEffect(
    () => () => {
      if (statusCountsRefreshTimerRef.current) clearTimeout(statusCountsRefreshTimerRef.current);
    },
    [],
  );

  const applyOrderPatchInMemory = useCallback(
    (id: number, payload: Partial<OrderRow>, revalidateFilter = false) => {
      // Chip lọc trạng thái hiển thị statusCounts snapshot từ lần loadOrders gần
      // nhất; patch/realtime đổi status hoặc invoice_status của MỘT đơn thì biết
      // chắc key cũ (rowsRef.current) và key mới (merged) nên điều chỉnh delta cục
      // bộ tại đây thay vì gọi lại loadOrders — tránh nháy toàn bảng. Tính oldKey/
      // newKey NGOÀI setRows (dùng rowsRef, không phải side-effect trong updater) vì
      // React không đảm bảo updater chạy đồng bộ ngay tại lệnh gọi setRows(). Xem
      // order-status-counts.ts và CONTRACT ở status_counts_for (backend).
      const prevRow = rowsRef.current.find((row) => row.id === id);
      if (!prevRow) {
        // Đơn không có trên trang hiện tại: không có row để merge nên không suy
        // được delta. Nếu patch đụng trục đếm (status/invoice_status) thì counts
        // trên server có thể đã đổi → revalidate counts-only (debounced).
        if ("status" in payload || "invoice_status" in payload) {
          scheduleStatusCountsRefresh();
        }
        return;
      }
      const merged = mergeOrderRowPatch(prevRow, payload);
      const oldKey = statusChipKeyFor(prevRow);
      // Cập nhật đến từ realtime (người/khâu khác): nếu sau khi merge row không còn
      // khớp bộ lọc đang bật thì loại khỏi list — tránh rò filter (ví dụ
      // status/invoice_status đổi từ xa mà row vẫn nằm lại). Với chỉnh sửa của chính
      // user (revalidateFilter=false) thì giữ row tại chỗ — xem chủ đích ở
      // filterSnapshotRef (use-filter-mirror.ts).
      const removedByFilter = revalidateFilter && !rowPassesActiveFilters(merged);
      const newKey = removedByFilter ? undefined : statusChipKeyFor(merged);

      setRows((prev) => {
        const idx = prev.findIndex((row) => row.id === id);
        if (idx < 0) return prev;
        if (removedByFilter) {
          return prev.filter((row) => row.id !== id);
        }
        const next = [...prev];
        // Tái dùng `merged` khi row chưa đổi giữa lúc tính (rowsRef) và lúc updater
        // chạy — tránh merge lần 2 vô ích; chỉ merge lại nếu prev[idx] đã khác.
        next[idx] = prev[idx] === prevRow ? merged : mergeOrderRowPatch(prev[idx], payload);
        return next;
      });
      // Đồng bộ rowsRef NGAY (effect chỉ chạy sau commit): burst realtime 2 update cho
      // CÙNG một đơn trong một batch render sẽ tính oldKey lần 2 từ snapshot cũ → delta
      // counts trừ 2 lần cho cùng một trạng thái.
      rowsRef.current = removedByFilter
        ? rowsRef.current.filter((row) => row.id !== id)
        : rowsRef.current.map((row) => (row.id === id ? merged : row));
      if (oldKey !== newKey) {
        setStatusCounts((prev) => applyStatusCountsDelta(prev, oldKey, newKey));
      }
    },
    [rowPassesActiveFilters, scheduleStatusCountsRefresh, setRows, setStatusCounts],
  );

  const applyOrderUpsertInMemory = useCallback(
    (payload: OrderRow, revalidateFilter = false) => {
      if (!payload || typeof payload !== "object") return;
      const id = Number(payload.id);
      if (!Number.isFinite(id) || id <= 0) return;

      // Trang landing chỉ chứa đơn có nguồn (order_source khác null, backend ép); WS có thể
      // gửi event của đơn không có nguồn — không thêm để tránh ô nhiễm danh sách.
      if (modes.isLanding() && !payload.order_source) return;

      // Xem chú thích tương tự ở applyOrderPatchInMemory: tính oldKey/newKey NGOÀI
      // setRows bằng rowsRef, không dựa vào side-effect bên trong updater.
      const existingRow = rowsRef.current.find((row) => row.id === id);
      let oldKey: string | undefined;
      let newKey: string | undefined;
      let removedByFilter = false;
      if (existingRow) {
        const merged = { ...existingRow, ...payload } as OrderRow;
        oldKey = statusChipKeyFor(existingRow);
        removedByFilter = revalidateFilter && !rowPassesActiveFilters(merged);
        newKey = removedByFilter ? undefined : statusChipKeyFor(merged);
      } else if (rowPassesActiveFilters(payload, true)) {
        newKey = statusChipKeyFor(payload);
      } else {
        // Đơn ngoài trang & không khớp filter panel: vẫn có thể thuộc tập đếm của
        // status_counts_for (server chỉ strip 2 trục status/invoice_status; việc
        // đơn có qua các filter còn lại hay không là tri thức server-side) →
        // revalidate counts-only (debounced).
        scheduleStatusCountsRefresh();
      }

      setRows((prev) => {
        const existingIndex = prev.findIndex((row) => row.id === id);
        if (existingIndex >= 0) {
          const merged = { ...prev[existingIndex], ...payload } as OrderRow;
          // Upsert realtime: nếu sau merge row không còn khớp filter thì loại bỏ
          // (giống nhánh đơn mới bên dưới) để không rò filter.
          if (revalidateFilter && !rowPassesActiveFilters(merged)) {
            return prev.filter((row) => row.id !== id);
          }
          const next = [...prev];
          next[existingIndex] = merged;
          return next;
        }
        // Đơn mới: chỉ thêm nếu phù hợp filter hiện tại (ví dụ đang đứng ở
        // tab "Đã hủy" thì đơn mới invoice_status=null không được hiện).
        if (!rowPassesActiveFilters(payload, true)) return prev;
        // New arrivals come in with the latest created_at, so place them where
        // the active sort would put them: at the end for oldest-first, else at
        // the start. Matches backend order_by in list_orders / list_landing_orders.
        return ordersSortRef.current === "oldest" ? [...prev, payload] : [payload, ...prev];
      });
      // Đồng bộ rowsRef ngay (xem chú thích ở applyOrderPatchInMemory): 2 event realtime
      // cho cùng đơn trong một batch render không được tính delta 2 lần từ snapshot cũ.
      if (existingRow) {
        const merged = { ...existingRow, ...payload } as OrderRow;
        rowsRef.current = removedByFilter
          ? rowsRef.current.filter((row) => row.id !== id)
          : rowsRef.current.map((row) => (row.id === id ? merged : row));
      } else if (newKey !== undefined) {
        rowsRef.current =
          ordersSortRef.current === "oldest"
            ? [...rowsRef.current, payload]
            : [payload, ...rowsRef.current];
      }
      if (oldKey !== newKey) {
        setStatusCounts((prev) => applyStatusCountsDelta(prev, oldKey, newKey));
      }
    },
    [
      modes,
      ordersSortRef,
      rowPassesActiveFilters,
      scheduleStatusCountsRefresh,
      setRows,
      setStatusCounts,
    ],
  );

  const applyBroadcastRowsInMemory = useCallback(
    (rowsIn: OrderRow[]) => {
      for (const row of rowsIn) {
        // Row từ payload WS không mang can_edit (per-user). Quyền sửa là
        // per-user-per-KÊNH nên suy từ một row cùng kênh đang có trên bảng
        // (đơn hủy luôn can_edit=false nên chỉ tin row can_edit=true). Không có
        // row cùng kênh thì để false an toàn — mở chi tiết sẽ fetch bản đầy đủ
        // có can_edit thật.
        const sameChannelEditable = rowsRef.current.some(
          (r) => r.channel_code === row.channel_code && r.can_edit,
        );
        applyOrderUpsertInMemory({ ...row, can_edit: sameChannelEditable }, true);
      }
    },
    [applyOrderUpsertInMemory],
  );

  const removeOrderFromMemory = useCallback(
    (id: number) => {
      setRows((prev) => prev.filter((row) => row.id !== id));
    },
    [setRows],
  );

  return {
    applyOrderPatchInMemory,
    applyOrderUpsertInMemory,
    applyBroadcastRowsInMemory,
    removeOrderFromMemory,
  };
}
