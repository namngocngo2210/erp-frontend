/**
 * Khi đổi loại đơn trong chế độ KOC, đơn "không trả lại" (no_return) được coi như
 * đã thanh toán đủ → trả về giá trị customer_prepaid cần set (= total_after_discount,
 * fallback total_amount). Trả về null nếu không cần đổi prepaid.
 */
export function kocPrepaidOnOrderTypeChange(
  orderType: string,
  kocMode: boolean,
  totalAfterDiscount: string | number | undefined,
  totalAmount: string | number | undefined,
): string | null {
  if (!kocMode || orderType !== "no_return") {
    return null;
  }
  const value = totalAfterDiscount || totalAmount || "0";
  return String(value);
}
