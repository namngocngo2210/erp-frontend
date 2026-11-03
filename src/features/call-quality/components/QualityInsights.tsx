import { CheckCircle2, ListChecks, TrendingDown } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QualitySummary } from "@/lib/api/call-quality";

type Props = { summary: QualitySummary };

/**
 * Ba khối đọc nhanh: đang làm tốt / cần cải thiện / việc nên làm.
 *
 * Nội dung suy ra bằng ngưỡng cố định trên điểm trung bình từng tiêu chí
 * (>= 1.5 là tốt, < 1.0 là yếu), và khuyến nghị lấy từ bảng viết sẵn trong
 * rubric — KHÔNG hỏi AI. Cùng một điểm yếu phải ra cùng một khuyến nghị, và nội
 * dung đào tạo là thứ team sale duyệt được, không để model tự chế mỗi lần một kiểu.
 */
export function QualityInsights({ summary }: Props) {
  const hasData = summary.total_calls > 0;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <CheckCircle2 className="h-4 w-4 text-action-success" />
            Đang làm tốt
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {summary.strengths.length ? (
            <ul className="space-y-1.5">
              {summary.strengths.slice(0, 5).map((item) => (
                <li key={item.code} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{item.label}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {item.avg_score.toFixed(1)}/2 · {item.call_count} cuộc
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {hasData
                ? "Chưa tiêu chí nào đạt mức tốt (≥ 1.5/2)."
                : "Chưa có cuộc gọi nào được chấm."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <TrendingDown className="h-4 w-4 text-action-danger" />
            Cần cải thiện
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {summary.weaknesses.length ? (
            <ul className="space-y-1.5">
              {summary.weaknesses.slice(0, 5).map((item) => (
                <li key={item.code} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{item.label}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {item.avg_score.toFixed(1)}/2 · {item.call_count} cuộc
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {hasData ? "Không tiêu chí nào dưới 1.0/2." : "Chưa có cuộc gọi nào được chấm."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <ListChecks className="h-4 w-4 text-action-info" />
            Hành động nên thực hiện
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {summary.actions.length ? (
            <ol className="space-y-2">
              {summary.actions.map((item, index) => (
                <li key={item.code} className="text-sm">
                  <span className="mr-1.5 font-semibold text-muted-foreground">{index + 1}.</span>
                  {item.action}
                  <span className="block pl-5 text-xs text-muted-foreground">({item.label})</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">
              {hasData ? "Không có tiêu chí nào cần can thiệp gấp." : "Chưa có dữ liệu."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
