import type { OrderRow } from "@/features/orders/order-types";

/**
 * Key mã hoá chip "Đã hủy" trên thanh chip lọc trạng thái đơn (khớp
 * `OrderRepository.status_counts_for` ở backend: cancelled = status=6 OR
 * invoice_status=2, tách biệt hoàn toàn khỏi các key lifecycle 0..5).
 *
 * LƯU Ý: đây là key của object `statusCounts` ("6"), KHÁC với
 * `CANCELLED_INVOICE_STATUS_VALUE` ("2") bên dưới — hằng số đó là GIÁ TRỊ của
 * filter `invoice_status`, không phải key đếm.
 */
export const CANCELLED_STATUS_CHIP_KEY = "6";

/** Giá trị filter `invoice_status` ứng với "đã hủy" (khớp CANCELLED_ORDER_Q backend). */
export const CANCELLED_INVOICE_STATUS_VALUE = "2";

/**
 * Suy ra key statusCounts (0..5 hoặc "6") mà một order row đang thuộc về, để
 * điều chỉnh delta cục bộ sau patch/upsert realtime mà không phải gọi lại
 * toàn bộ danh sách — xem [[orders-list-realtime-race]] và CONTRACT ở
 * `status_counts_for` (backend/apps/orders/repositories.py).
 */
export function statusChipKeyFor(
  row: Pick<OrderRow, "status" | "invoice_status"> | null | undefined,
): string | undefined {
  if (!row) return undefined;
  const isCancelled = row.status === 6 || String(row.invoice_status ?? "") === "2";
  return isCancelled ? CANCELLED_STATUS_CHIP_KEY : String(row.status);
}

/**
 * Điều chỉnh statusCounts cục bộ khi một order chuyển từ key cũ sang key mới
 * (hoặc được thêm mới / bị loại khỏi danh sách đang hiện). Chỉ dùng khi biết
 * chắc key cũ (patchOrder/realtime upsert của MỘT đơn) — không dùng cho biến
 * động hàng loạt vì có thể lệch so với số thật trên server.
 */
export function applyStatusCountsDelta(
  counts: Record<string, number>,
  oldKey: string | undefined,
  newKey: string | undefined,
): Record<string, number> {
  if (oldKey === newKey) return counts;
  const next = { ...counts };
  if (oldKey !== undefined) {
    next[oldKey] = Math.max(0, (next[oldKey] ?? 0) - 1);
  }
  if (newKey !== undefined) {
    next[newKey] = (next[newKey] ?? 0) + 1;
  }
  return next;
}

/**
 * Tổng hiển thị trên chip "Tất cả" của thanh chip lọc trạng thái đơn. Loại key
 * "6" (đã hủy) khỏi tổng vì bấm "Tất cả" chỉ trả về đơn lifecycle (status !=
 * 6, invoice_status != 2) — cộng cả "6" vào sẽ ra số lớn hơn số dòng thực trả
 * về sau khi bấm (bug 7.1b).
 */
export function computeStatusChipTotal(statusCounts: Record<string, number>): number {
  return Object.entries(statusCounts).reduce(
    (sum, [key, n]) => (key === CANCELLED_STATUS_CHIP_KEY ? sum : sum + (n || 0)),
    0,
  );
}

export type StatusChipFilterState = {
  status: string[];
  invoiceStatus: string[];
};

/**
 * `invoice_status` mà panel filter đang áp, sau khi bỏ giá trị "đã hủy". Chip
 * "Đã hủy" luôn cộng/bỏ đúng giá trị này, không đụng các invoice_status khác
 * đang được panel lọc.
 */
export function invoiceStatusWithoutCancelled(invoiceStatus: string[]): string[] {
  return invoiceStatus.filter((v) => v !== CANCELLED_INVOICE_STATUS_VALUE);
}

/**
 * Filter kế tiếp khi bấm 1 chip lifecycle (bao gồm "Tất cả", `chipKey`
 * undefined). `status_counts_for` (backend) strip TOÀN BỘ 2 trục
 * status/invoice_status khi đếm key lifecycle — nên FE phải xoá sạch
 * `invoice_status` (không chỉ bỏ giá trị "2") để số trên chip khớp số dòng
 * trả về sau khi bấm (bug 7.1c, xem docs/audit-followups-2026-07-13.md).
 */
export function nextFilterForLifecycleChip(
  currentStatus: string[],
  chipKey?: string,
): StatusChipFilterState {
  if (chipKey === undefined) return { status: [], invoiceStatus: [] };
  const active = currentStatus.includes(chipKey);
  const nextStatus = active
    ? currentStatus.filter((v) => v !== chipKey)
    : [...currentStatus, chipKey];
  return { status: nextStatus, invoiceStatus: [] };
}

/**
 * Filter kế tiếp khi bấm chip "Đã hủy" — GIỮ NGUYÊN hành vi trước Task 7 (chỉ
 * đổi trục invoice_status, không đụng các invoice_status khác đang lọc),
 * theo quyết định ghi ở docs/audit-followups-2026-07-13.md (Task 7 chip
 * semantics).
 */
export function nextFilterForCancelledChip(
  currentStatus: string[],
  currentInvoiceStatus: string[],
  isActive: boolean,
): StatusChipFilterState {
  const withoutCancelled = invoiceStatusWithoutCancelled(currentInvoiceStatus);
  if (isActive) {
    return { status: currentStatus, invoiceStatus: withoutCancelled };
  }
  return {
    status: [],
    invoiceStatus: [...withoutCancelled, CANCELLED_INVOICE_STATUS_VALUE],
  };
}
