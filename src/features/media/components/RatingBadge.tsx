import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import type { OverallRating } from "@/lib/api/media";

const TONE: Record<OverallRating, string> = {
  good: "bg-action-success/15 text-action-success",
  average: "bg-action-warning/15 text-action-warning",
  bad: "bg-action-danger/15 text-action-danger",
  unknown: "bg-muted text-muted-foreground",
};

/**
 * Badge rating tổng (good/average/bad/unknown) kèm điểm số trung bình.
 * Nhãn + điểm số gộp chung một cụm text thay vì tách <span> riêng: cụm chữ
 * ("Tốt 4.25") nhờ vậy khác với nhãn nút lọc rating cùng chữ ("Tốt") khi so
 * khớp theo text thuần trong bảng — tránh trùng lặp phần tử khi truy vấn.
 */
export function RatingBadge({ rating, score }: { rating: OverallRating; score?: number | null }) {
  const { t } = useI18n();
  const label = t(`media.rating.${rating}`);
  const scoreText = score != null && rating !== "unknown" ? ` ${score.toFixed(2)}` : "";
  return (
    <Badge variant="outline" className={`border-transparent tabular-nums ${TONE[rating]}`}>
      {label}
      {scoreText}
    </Badge>
  );
}
