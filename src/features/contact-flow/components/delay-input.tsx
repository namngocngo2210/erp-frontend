import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { type DelayUnit, minutesToParts, partsToMinutes } from "../delay-utils";

// Re-export for backward compatibility
export type { DelayUnit };

const UNIT_LABELS: Record<DelayUnit, string> = {
  phut: "Phút",
  gio: "Giờ",
  ngay: "Ngày",
};

type Props = {
  /** Số phút hiện tại (null = chưa nhập / không áp dụng). */
  minutes: number | null;
  onChange: (minutes: number | null) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Ô nhập độ trễ chuyển bước: number input + select đơn vị (phút/giờ/ngày).
 * Nội bộ giữ {value, unit} tách rời để người dùng gõ "2" + chọn "Ngày" thay vì
 * phải tự nhẩm ra 2880 phút; giá trị gửi ra ngoài luôn quy đổi về phút.
 */
export function DelayInput({ minutes, onChange, disabled, className }: Props) {
  const { value, unit } = minutesToParts(minutes);

  const handleValueChange = (nextValueRaw: string) => {
    const nextValue = Number(nextValueRaw);
    if (!nextValueRaw || Number.isNaN(nextValue) || nextValue < 0) {
      onChange(null);
      return;
    }
    onChange(partsToMinutes(nextValue, unit));
  };

  const handleUnitChange = (nextUnit: string) => {
    onChange(partsToMinutes(value, nextUnit as DelayUnit));
  };

  return (
    <div className={className ? `flex items-center gap-2 ${className}` : "flex items-center gap-2"}>
      <Input
        type="number"
        min={0}
        value={value || ""}
        onChange={(e) => handleValueChange(e.target.value)}
        disabled={disabled}
        className="w-24"
        placeholder="0"
      />
      <Select value={unit} onValueChange={handleUnitChange} disabled={disabled}>
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(UNIT_LABELS) as DelayUnit[]).map((u) => (
            <SelectItem key={u} value={u}>
              {UNIT_LABELS[u]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
