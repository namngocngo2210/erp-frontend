/**
 * Đơn đã có mã hoá đơn thì không sửa SẢN PHẨM và TÀI CHÍNH được nữa — mirror của
 * `backend/apps/orders/invoice_lock.py` (nguồn chân lý; đây chỉ là lớp UX để không cho
 * user bấm rồi ăn 403).
 *
 * Đúng hai khối trên trang chi tiết đơn bị khoá: "Sản phẩm & thông số hàng hoá" và
 * "Tài chính". Khách, địa chỉ, kênh/sale/chi nhánh, phí vận chuyển, mã đơn/hoá đơn/vận
 * đơn, trạng thái, CRM, thu hồi, VAT... vẫn sửa được.
 *
 * Không có phần "cột bảng đơn" ở đây: bảng đơn chỉ HIỂN THỊ các field này, không sửa
 * inline. `BlockProducts` + `BlockFinancials` (trang chi tiết) là hai surface duy nhất
 * sửa được nhóm này.
 *
 * Xem docs/invoice-code-edit-lock.md.
 */
import type { OrderRow } from "@/features/orders/order-types";

/** Câu giải thích dùng chung cho tooltip/toast/banner khi ô bị khoá. */
export const INVOICE_LOCK_HINT =
  "Đơn đã có mã hóa đơn — không sửa được sản phẩm và tài chính của đơn.";

/** Key trong payload PATCH bị khoá. Mirror `INVOICE_LOCKED_FIELD_LABELS` phía BE. */
export const INVOICE_LOCKED_PATCH_FIELDS: ReadonlySet<string> = new Set([
  // Khối "Sản phẩm & thông số hàng hoá"
  "items",
  "sku",
  "quantity",
  "weight",
  "dimensions",
  // Khối "Tài chính"
  "total_amount",
  "discount_amount",
  "booking_voucher_discount",
  "other_price",
  "customer_prepaid",
  "total_after_discount",
]);

/**
 * Cờ do BE tính (`is_invoice_locked`). Fallback về `invoice_code` cho row đến từ cache
 * cũ / event realtime chưa có cờ — thiếu fallback thì đơn cũ trong cache lại mở ô sửa
 * rồi ăn 403.
 */
export function isInvoiceLocked(row: Pick<OrderRow, "is_invoice_locked" | "invoice_code">) {
  if (typeof row.is_invoice_locked === "boolean") return row.is_invoice_locked;
  return !!String(row.invoice_code ?? "").trim();
}

/** Các key bị khoá đang có trong payload — dùng để dựng câu cảnh báo. */
export function pickInvoiceLockedFields(payload: object): string[] {
  return Object.keys(payload).filter((key) => INVOICE_LOCKED_PATCH_FIELDS.has(key));
}
