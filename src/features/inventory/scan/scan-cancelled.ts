import type { LookupOrder } from "./scan-types";

/** OrderStatus.CANCELLED (backend apps/orders/models.py) — đơn đã hủy. */
export const ORDER_STATUS_CANCELLED = 6;
/** KiotViet invoice status = 2 → hóa đơn đã hủy. */
export const INVOICE_STATUS_CANCELLED = 2;

/**
 * Đơn đã hủy theo DB. Backend còn xác minh realtime với KiotViet (409) cho luồng
 * xuất giao; hàm này là lớp chặn phụ, dùng cho đơn ngoài KiotViet / khi kill-switch tắt.
 */
export function isCancelledOrder(order: Pick<LookupOrder, "status" | "invoice_status">): boolean {
  return (
    order.status === ORDER_STATUS_CANCELLED || order.invoice_status === INVOICE_STATUS_CANCELLED
  );
}

/** Toast khi chặn mã của đơn đã hủy. */
export function cancelledScanMessage(order: Pick<LookupOrder, "order_code">): string {
  return `Đơn ${order.order_code} đã hủy — không thể xuất kho.`;
}
