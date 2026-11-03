import { AlertTriangle, Gauge, PhoneCall, Target } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { QualitySummary } from "@/lib/api/call-quality";
import { formatNumber } from "@/lib/format";

type Props = { summary: QualitySummary };

/**
 * Bốn thẻ số tổng. Mỗi thẻ nói rõ mẫu số của nó — điểm trung bình mà không biết
 * tính trên bao nhiêu cuộc thì không đọc được (docs §5.2).
 */
export function QualitySummaryCards({ summary }: Props) {
  const redFlagTotal = summary.red_flags.reduce((sum, item) => sum + item.count, 0);

  const tiles = [
    {
      key: "calls",
      icon: PhoneCall,
      label: "Cuộc gọi đã chấm",
      value: formatNumber(summary.total_calls),
      hint: `${formatNumber(summary.coverage.transcribed)} cuộc có transcript trong kỳ`,
      tone: "text-action-info",
    },
    {
      key: "avg",
      icon: Gauge,
      label: "Điểm trung bình",
      value: summary.total_calls ? `${summary.avg_score.toFixed(1)}/100` : "—",
      hint: `trên ${formatNumber(summary.total_calls)} cuộc`,
      tone: "text-action-success",
    },
    {
      key: "pass",
      icon: Target,
      label: `Tỷ lệ đạt (≥ ${summary.pass_score})`,
      value: summary.total_calls ? `${(summary.pass_rate * 100).toFixed(0)}%` : "—",
      hint: `${formatNumber(Math.round(summary.pass_rate * summary.total_calls))} cuộc đạt`,
      tone: "text-indigo-600",
    },
    {
      key: "flags",
      icon: AlertTriangle,
      label: "Cờ đỏ tuân thủ",
      value: formatNumber(redFlagTotal),
      hint: redFlagTotal ? "cần xem ngay" : "không có vi phạm",
      tone: redFlagTotal ? "text-action-danger" : "text-slate-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <Card key={tile.key}>
            <CardContent className="flex items-start gap-3 p-4">
              <span className={`mt-0.5 ${tile.tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{tile.label}</p>
                <p className="text-2xl font-semibold tabular-nums">{tile.value}</p>
                <p className="truncate text-xs text-muted-foreground">{tile.hint}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
