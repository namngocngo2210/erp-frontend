import { useState } from "react";
import { Star } from "lucide-react";

import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

type Props = {
  /** Điểm 0..5, bước 0.5 — khớp thang điểm ads-crm. */
  value: number;
  onChange?: (value: number) => void;
  /** Chỉ hiển thị, không có nút bấm — dùng khi vẽ lại đánh giá đã có (của người khác). */
  readOnly?: boolean;
  className?: string;
};

const STARS = [1, 2, 3, 4, 5];

/** Phần trăm (0..100) ngôi sao thứ `index` (1-based) cần tô đầy ứng với `rating`. */
function fillPercent(rating: number, index: number): number {
  return Math.max(0, Math.min(1, rating - (index - 1))) * 100;
}

/**
 * Chấm sao có bước nửa sao (0/0.5/1/…/5), thay `<select>` điểm cũ để khớp mẫu
 * ads-crm. Mỗi sao chia đôi bằng 2 nút vô hình chồng lên ảnh minh hoạ: nửa trái
 * chọn `index - 0.5`, nửa phải chọn `index`. Nút "Xoá điểm" đưa điểm về 0 — API
 * chấp nhận rating=0 kèm ghi chú không rỗng nên cần đường quay lại 0 rõ ràng
 * (không thể bấm sao để về 0). `readOnly` bỏ hẳn phần tử tương tác.
 */
export function StarRating({ value, onChange, readOnly = false, className }: Props) {
  const { t } = useI18n();
  const [hover, setHover] = useState<number | null>(null);
  const interactive = !readOnly && Boolean(onChange);
  const display = interactive && hover != null ? hover : value;

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div
        className="inline-flex items-center"
        onMouseLeave={interactive ? () => setHover(null) : undefined}
      >
        {STARS.map((i) => (
          <span key={i} className="relative inline-block h-5 w-5">
            <Star className="absolute inset-0 h-5 w-5 text-muted-foreground" aria-hidden />
            <span
              className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden"
              style={{ width: `${fillPercent(display, i)}%` }}
              aria-hidden
            >
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            </span>
            {interactive ? (
              <>
                <button
                  type="button"
                  className="absolute inset-y-0 left-0 z-10 w-1/2"
                  aria-label={t("media.eval.starLabel").replace("{n}", String(i - 0.5))}
                  onMouseEnter={() => setHover(i - 0.5)}
                  onFocus={() => setHover(i - 0.5)}
                  onClick={() => onChange?.(i - 0.5)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 z-10 w-1/2"
                  aria-label={t("media.eval.starLabel").replace("{n}", String(i))}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onClick={() => onChange?.(i)}
                />
              </>
            ) : null}
          </span>
        ))}
      </div>
      <span className="text-sm tabular-nums text-muted-foreground">{value.toFixed(1)}</span>
      {interactive ? (
        <button
          type="button"
          className="text-xs text-muted-foreground underline decoration-dotted hover:text-foreground"
          onClick={() => onChange?.(0)}
        >
          {t("media.eval.clearRating")}
        </button>
      ) : null}
    </div>
  );
}
