import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QualityCriterionAverage } from "@/lib/api/call-quality";

type Props = {
  criteria: QualityCriterionAverage[];
  /** Mở danh sách cuộc bị 0 điểm ở tiêu chí — ví dụ thật để mang đi đào tạo. */
  onDrillDown: (criterionCode: string) => void;
};

const BLOCK_LABELS: Record<string, string> = {
  A: "Mở đầu",
  B: "Khai thác",
  C: "Tư vấn",
  D: "Chốt đơn",
};

/** Màu theo mức đạt: dưới 50% thang là yếu, trên 75% là tốt. */
function toneFor(ratio: number): string {
  if (ratio < 0.5) return "bg-action-danger";
  if (ratio < 0.75) return "bg-action-warning";
  return "bg-action-success";
}

/**
 * Bảng 14 tiêu chí sắp theo điểm thấp dần — MÀN HÌNH CHÍNH của trang.
 * Dòng đầu bảng chính là nội dung buổi đào tạo tuần tới.
 *
 * `call_count` luôn hiện cạnh điểm: tiêu chí "na" bị loại khỏi mẫu số nên mỗi
 * dòng có mẫu số khác nhau, giấu đi là đọc sai (docs §5.2).
 */
export function CriteriaBreakdown({ criteria, onDrillDown }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Tiêu chí cần cải thiện</CardTitle>
        <p className="text-xs text-muted-foreground">
          Sắp theo điểm thấp dần. Dòng trên cùng là chỗ cả team đang yếu nhất.
        </p>
      </CardHeader>
      <CardContent className="space-y-1 p-3 pt-0">
        {criteria.map((item) => {
          const ratio = item.max_score ? item.avg_score / item.max_score : 0;
          const hasSample = item.call_count > 0;
          return (
            <div
              key={item.code}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-2 py-2 hover:bg-muted/50"
            >
              {/* Nhãn khối ẩn trên mobile — nó là ngữ cảnh phụ, tên tiêu chí mới
                  là thứ cần đọc. Giữ lại thì hàng vỡ 3 dòng trên màn 360px. */}
              <span className="hidden w-16 shrink-0 text-xs font-medium text-muted-foreground sm:block">
                {BLOCK_LABELS[item.block] ?? item.block}
              </span>
              <span className="min-w-[10rem] flex-1 truncate text-sm">{item.label}</span>
              <div className="hidden h-2 w-32 shrink-0 overflow-hidden rounded-full bg-muted sm:block">
                <div
                  className={`h-full ${toneFor(ratio)}`}
                  style={{ width: `${Math.round(ratio * 100)}%` }}
                />
              </div>
              {/* Điểm + mẫu số + nút đi chung một cụm: wrap xuống dòng thì cả ba
                  cùng xuống, không tách điểm khỏi số cuộc của nó. */}
              <div className="ml-auto flex shrink-0 items-center gap-3">
                <span className="w-16 text-right text-sm font-semibold tabular-nums">
                  {hasSample ? `${item.avg_score.toFixed(1)}/${item.max_score}` : "—"}
                </span>
                <span className="w-24 text-right text-xs text-muted-foreground tabular-nums">
                  {hasSample ? `${item.call_count} cuộc` : "chưa có mẫu"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!item.zero_count}
                  onClick={() => onDrillDown(item.code)}
                  title={
                    item.zero_count
                      ? `Xem ${item.zero_count} cuộc bị 0 điểm ở tiêu chí này`
                      : "Không có cuộc nào bị 0 điểm"
                  }
                >
                  <span className="tabular-nums">{item.zero_count}</span>
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
