import {
  useRef,
  type ClipboardEvent,
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
} from "react";

import { Input } from "@/components/ui/input";
import { parseDimensions } from "@/features/orders/order-normalizers";
import { type CreateOrderPayload } from "@/features/orders/use-orders-data";

import { buildDimensions, normalizeDimensionPart } from "./order-form-helpers";

/**
 * Bộ 3 ô Dài × Rộng × Cao. Component tự giữ ref của 3 ô để nhảy focus (gõ đủ 3 ký
 * tự, gõ "x", Enter, Backspace) — ref phải được tạo ngay tại đây vì React Compiler
 * không cho phép ghi vào ref nhận từ component cha.
 *
 * Giá trị vẫn do form ở tầng trên sở hữu (`dimensionParts`) vì khi chọn sản phẩm /
 * đổi số lượng thì bậc đóng gói sẽ ghi đè kích thước.
 */
export function OrderFormDimensionsInput({
  dimensionParts,
  setDimensionParts,
  setForm,
  disabled = false,
}: {
  dimensionParts: [string, string, string];
  setDimensionParts: Dispatch<SetStateAction<[string, string, string]>>;
  setForm: Dispatch<SetStateAction<CreateOrderPayload>>;
  /** Khoá cả 3 ô khi thiếu quyền sửa-theo-field (field "dimensions"). */
  disabled?: boolean;
}) {
  const dimensionInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const handleDimensionPartChange = (index: 0 | 1 | 2, rawValue: string) => {
    const nextValue = normalizeDimensionPart(rawValue);
    setDimensionParts((prev) => {
      const next: [string, string, string] = [...prev] as [string, string, string];
      next[index] = nextValue;
      setForm((prevForm) => ({ ...prevForm, dimensions: buildDimensions(next) }));
      return next;
    });

    if (nextValue.length >= 3 && index < 2) {
      const nextInput = dimensionInputRefs.current[index + 1];
      nextInput?.focus();
      nextInput?.select();
    }
  };

  const handleDimensionKeyDown = (index: 0 | 1 | 2, event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.key === "x" || event.key === "X" || event.key === "Enter") && index < 2) {
      event.preventDefault();
      const nextInput = dimensionInputRefs.current[index + 1];
      nextInput?.focus();
      nextInput?.select();
      return;
    }

    if (event.key === "Backspace" && !dimensionParts[index] && index > 0) {
      const prevInput = dimensionInputRefs.current[index - 1];
      prevInput?.focus();
      prevInput?.select();
    }
  };

  const handleDimensionPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text");
    if (!/(x|X|×|\*)/.test(pasted)) return;
    event.preventDefault();
    const parsed = parseDimensions(pasted);
    setDimensionParts(parsed);
    setForm((prev) => ({ ...prev, dimensions: buildDimensions(parsed) }));
    const firstEmptyIndex = parsed.findIndex((item) => !item);
    const focusIndex = firstEmptyIndex === -1 ? 2 : Math.max(0, firstEmptyIndex);
    const target = dimensionInputRefs.current[focusIndex];
    target?.focus();
    target?.select();
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        ref={(el) => {
          dimensionInputRefs.current[0] = el;
        }}
        value={dimensionParts[0]}
        inputMode="decimal"
        maxLength={6}
        placeholder="Dài"
        disabled={disabled}
        onChange={(e) => handleDimensionPartChange(0, e.target.value)}
        onKeyDown={(e) => handleDimensionKeyDown(0, e)}
        onPaste={handleDimensionPaste}
      />
      <span className="text-muted-foreground">x</span>
      <Input
        ref={(el) => {
          dimensionInputRefs.current[1] = el;
        }}
        value={dimensionParts[1]}
        inputMode="decimal"
        maxLength={6}
        placeholder="Rộng"
        disabled={disabled}
        onChange={(e) => handleDimensionPartChange(1, e.target.value)}
        onKeyDown={(e) => handleDimensionKeyDown(1, e)}
      />
      <span className="text-muted-foreground">x</span>
      <Input
        ref={(el) => {
          dimensionInputRefs.current[2] = el;
        }}
        value={dimensionParts[2]}
        inputMode="decimal"
        maxLength={6}
        placeholder="Cao"
        disabled={disabled}
        onChange={(e) => handleDimensionPartChange(2, e.target.value)}
        onKeyDown={(e) => handleDimensionKeyDown(2, e)}
      />
    </div>
  );
}
