import { useState } from "react";

import { Input } from "@/components/ui/input";
import { normalizeDecimalInput as normalizeNumericInput } from "@/features/orders/order-normalizers";

import {
  formatAmountValue,
  formatNumericDisplay,
  isPercentDiscount,
  parseAmount,
  type EditableOrderItem,
} from "./order-form-helpers";

export type LineDiscountValue = Pick<
  EditableOrderItem,
  "unit_price" | "discount" | "discount_percent"
>;

/**
 * Ô "Giảm giá" của một dòng hàng + cặp nút ₫/% — dùng chung cho form tạo/sửa đơn
 * và bảng sản phẩm ở trang chi tiết. Chế độ tiền: số nhập là tiền giảm cho MỖI
 * sản phẩm; chế độ %: tiền giảm suy từ đơn giá (xem `lineUnitDiscount`).
 *
 * Chuyển ₫ ↔ % thì xoá số đang nhập: 10 000 ₫ và 10 % là hai con số khác nhau,
 * không tự quy đổi cho nhau.
 */
export function LineDiscountInput({
  value,
  disabled,
  onChange,
  onBlur,
  labels,
  className,
  inputClassName,
}: {
  value: LineDiscountValue;
  disabled?: boolean;
  onChange: (next: Pick<EditableOrderItem, "discount" | "discount_percent">) => void;
  /** Gọi sau khi rời ô số (trang chi tiết dùng để PATCH một lần thay vì mỗi phím). */
  onBlur?: () => void;
  labels: { input: string; byAmount: string; byPercent: string };
  className?: string;
  inputClassName?: string;
}) {
  // Đang focus thì hiện số thô để gõ, blur mới format có dấu phẩy (như ô đơn giá).
  const [focused, setFocused] = useState(false);
  const percentMode = isPercentDiscount(value);
  const raw = percentMode ? (value.discount_percent ?? "") : (value.discount ?? "");
  // Blur: % bỏ số 0 thừa ("5.00" → "5"), tiền thêm dấu phẩy hàng nghìn.
  const display = focused
    ? normalizeNumericInput(String(raw))
    : raw === ""
      ? ""
      : percentMode
        ? formatAmountValue(parseAmount(raw))
        : formatNumericDisplay(formatAmountValue(parseAmount(raw)));

  return (
    <div
      className={`flex items-stretch rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring ${className ?? "h-10"}`}
    >
      <Input
        aria-label={labels.input}
        className={`h-full min-w-0 flex-1 border-0 shadow-none focus-visible:ring-0 ${inputClassName ?? ""}`}
        value={display}
        disabled={disabled}
        inputMode="decimal"
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        onChange={(e) => {
          const next = normalizeNumericInput(e.target.value);
          onChange(
            percentMode
              ? { discount: "", discount_percent: next }
              : { discount: next, discount_percent: null },
          );
        }}
      />
      {(["amount", "percent"] as const).map((mode) => {
        const active = mode === "percent" ? percentMode : !percentMode;
        return (
          <button
            key={mode}
            type="button"
            disabled={disabled}
            title={mode === "percent" ? labels.byPercent : labels.byAmount}
            aria-pressed={active}
            className={`px-2 text-xs font-medium transition-colors ${
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            } ${mode === "percent" ? "rounded-r-md" : ""}`}
            onClick={() => {
              if (active) return;
              onChange(
                mode === "percent"
                  ? { discount: "", discount_percent: "" }
                  : { discount: "", discount_percent: null },
              );
            }}
          >
            {mode === "percent" ? "%" : "₫"}
          </button>
        );
      })}
    </div>
  );
}
