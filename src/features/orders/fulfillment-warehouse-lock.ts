/**
 * Đơn ĐÃ xuất kho thì không đổi được kho xuất nữa — mirror của guard phía BE trong
 * `OrderServiceCommands.update_order_inline` (nguồn chân lý; đây chỉ là lớp UX để user
 * không bấm rồi ăn 400).
 *
 * Lý do khoá: tồn chỉ bị trừ khi trạng thái giao vận chuyển sang `dispatched`, và chỉ
 * được hoàn khi mã quay về "" / "warehouse_processing" (un-dispatch). Đổi kho sau khi đã
 * trừ tồn sẽ để kho cũ giữ nguyên phần đã trừ còn kho mới không bị trừ → lệch sổ tồn.
 *
 * Vì vậy "đã trừ tồn" = mã giao vận KHÔNG thuộc nhóm trước xuất kho. Danh sách mã lấy từ
 * `DELIVERY_BUSINESS_STATUS_OPTIONS` (backend/apps/orders/crm_catalog.py).
 */
import type { OrderRow } from "@/features/orders/order-types";

/** Câu giải thích dùng chung cho tooltip khi ô kho bị khoá. */
export const FULFILLMENT_WAREHOUSE_LOCK_HINT =
  "Đơn đã xuất kho — không đổi được kho xuất (tồn đã trừ ở kho hiện tại).";

/**
 * Mã trạng thái giao vận mà đơn CHƯA trừ tồn. Mọi mã khác (`dispatched`, `received`,
 * `not_received`, `stalled_complaint`, `post_office_lost`) đều nằm sau bước xuất kho.
 */
export const PRE_DISPATCH_DELIVERY_CODES: ReadonlySet<string> = new Set([
  "",
  "warehouse_processing",
]);

/** Đơn đã qua bước xuất kho → khoá ô chọn kho. */
export function isFulfillmentWarehouseLocked(row: Pick<OrderRow, "crm">): boolean {
  const code = String(row.crm?.delivery_business_status_code ?? "").trim();
  return !PRE_DISPATCH_DELIVERY_CODES.has(code);
}
