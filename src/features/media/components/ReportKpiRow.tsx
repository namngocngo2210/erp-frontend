import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n";
import type { MediaReportOverview } from "@/lib/api/media";

/** 3 ô KPI tổng quan (tổng nội dung, thiếu tag, thiếu đánh giá) cho trang Báo cáo Media. */
export function ReportKpiRow({ overview }: { overview: MediaReportOverview }) {
  const { t } = useI18n();
  const tiles = [
    ["media.reports.kpi.total", overview.total_contents],
    ["media.reports.kpi.missingTags", overview.missing_tags],
    ["media.reports.kpi.missingEvaluations", overview.missing_evaluations],
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {tiles.map(([key, value]) => (
        <Card key={key}>
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-muted-foreground">{t(key)}</p>
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
