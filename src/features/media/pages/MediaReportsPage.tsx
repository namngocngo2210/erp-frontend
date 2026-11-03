import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { DateFilter, type DateFilterValue, getDateRange } from "@/components/ui/date-filter";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { PageHeader } from "@/components/ui/page-header";
import { useI18n } from "@/i18n";

import { MediaAccessGate } from "../components/MediaAccessGate";
import { ReportKpiRow } from "../components/ReportKpiRow";
import { ReportTables } from "../components/ReportTables";
import { useContentQuality, useRatingsByChannel, useReportOverview } from "../queries";

const DEFAULT_RANGE = getDateRange("last_30_days");
const DEFAULT_DATE_FILTER: DateFilterValue = {
  option: "last_30_days",
  from: DEFAULT_RANGE.from,
  to: DEFAULT_RANGE.to,
};

/** Trang Báo cáo Media: KPI tổng quan + theo loại + rating theo kênh + chất lượng dữ liệu. */
export default function MediaReportsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(DEFAULT_DATE_FILTER);

  // uploaded_from phải đứng trước uploaded_to trong query string (test kiểm tra thứ tự này).
  const sp = useMemo(() => {
    const params = new URLSearchParams();
    params.set("uploaded_from", dateFilter.from ?? "");
    params.set("uploaded_to", dateFilter.to ?? "");
    return params;
  }, [dateFilter.from, dateFilter.to]);

  const overview = useReportOverview(sp);
  const ratings = useRatingsByChannel(sp);
  const quality = useContentQuality(sp);

  // Chờ theo isLoading — không chờ theo .data, kẻo một endpoint lỗi vĩnh viễn
  // (vd ratings-by-channel) sẽ khoá cả trang ở spinner dù 2 endpoint kia đã có
  // dữ liệu (mirror FoxiaReportPage).
  const loading = overview.isLoading || ratings.isLoading || quality.isLoading;
  const errorEntries: Array<readonly [string, Error | null]> = [
    ["overview", overview.error],
    ["ratings", ratings.error],
    ["quality", quality.error],
  ];
  const errors = errorEntries.filter(
    (entry): entry is readonly [string, Error] => entry[1] != null,
  );

  return (
    <div className="space-y-4">
      <MediaAccessGate>
        {() => (
          <>
            <PageHeader title={t("topnav.tabs.mediaReports")} />
            <Card>
              <CardContent className="flex flex-wrap items-end gap-3 pt-6">
                <DateFilter value={dateFilter} onChange={setDateFilter} />
              </CardContent>
            </Card>

            {errors.map(([key, err]) => (
              <div
                key={key}
                className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {err.message}
              </div>
            ))}

            {loading ? (
              <div className="flex justify-center py-16">
                <LogoSpinner />
              </div>
            ) : null}

            {!loading && overview.data ? <ReportKpiRow overview={overview.data} /> : null}
            {!loading ? (
              <ReportTables
                overview={overview.data}
                ratings={ratings.data}
                quality={quality.data}
                onOpenContent={(id) => navigate(`/media/contents/${id}`)}
              />
            ) : null}
          </>
        )}
      </MediaAccessGate>
    </div>
  );
}
