import type { OrderRow } from "@/features/orders/order-types";

/** Cột được cộng dồn ở chân bảng đơn. */
export const TOTALS_COLUMN_KEY = "total_after_discount" as const;

/**
 * Tổng "sau giảm giá" của các dòng ĐANG HIỂN THỊ (trang hiện tại). Cộng theo đơn
 * vị xu (×100, làm tròn) để tránh sai số dấu phẩy động khi cộng chuỗi "123.45";
 * giá trị rỗng/hỏng tính là 0.
 */
export function sumPageAmountAfterDiscount(rows: ReadonlyArray<OrderRow>): number {
  let cents = 0;
  for (const row of rows) {
    const value = Number(row.total_after_discount);
    if (Number.isFinite(value)) cents += Math.round(value * 100);
  }
  return cents / 100;
}
