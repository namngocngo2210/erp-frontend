import { useId } from "react";

import { Input } from "./input";

type MonthPickerProps = {
  /** Tháng đang chọn, dạng "YYYY-MM". */
  value: string;
  onChange: (month: string) => void;
  label: string;
  id?: string;
  className?: string;
};

/** Tháng hiện tại dạng "YYYY-MM" (giờ địa phương). */
export function currentMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Ô chọn tháng cho các tab báo cáo chi tiết. Dùng `input[type=month]` của trình
 * duyệt thay vì tự dựng lịch: giá trị đã đúng định dạng "YYYY-MM", có sẵn bàn
 * phím + a11y, không thêm phụ thuộc.
 */
export function MonthPicker({ value, onChange, label, id, className = "" }: MonthPickerProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Input
        id={inputId}
        type="month"
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          // Xoá trắng ô (hoặc trình duyệt trả giá trị dở dang) không được đẩy
          // lên state — bảng sẽ mất khoảng ngày và hiện rỗng.
          if (next) onChange(next);
        }}
        className="w-full sm:w-48"
      />
    </div>
  );
}
