import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { normalizeTime24, type SecondsFill } from "@/lib/time24";

type TimeField24Props = {
  value: string;
  onChange: (value: string) => void;
  /** Điền giây khi người dùng không gõ: "floor" → :00 (giờ bắt đầu), "ceil" → :59 (giờ kết thúc). */
  fillSeconds?: SecondsFill;
  className?: string;
  "aria-label"?: string;
};

/**
 * Ô nhập giờ 24h (HH:MM:SS) không phụ thuộc locale trình duyệt (khác với
 * <input type="time"> vốn hiển thị 12h/24h theo ngôn ngữ trình duyệt).
 * Chuẩn hoá khi blur/Enter; giây bỏ trống được điền theo ``fillSeconds``.
 */
export function TimeField24({
  value,
  onChange,
  fillSeconds = "floor",
  className,
  ...rest
}: TimeField24Props) {
  const [text, setText] = useState(value);

  // Đồng bộ khi giá trị từ ngoài đổi (nạp lại khung giờ, reset...).
  useEffect(() => {
    setText(value);
  }, [value]);

  const commit = () => {
    const normalized = normalizeTime24(text, { fillSeconds });
    setText(normalized);
    if (normalized !== value) onChange(normalized);
  };

  return (
    <Input
      type="text"
      inputMode="numeric"
      placeholder="HH:MM:SS"
      maxLength={8}
      className={className}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
      }}
      {...rest}
    />
  );
}
