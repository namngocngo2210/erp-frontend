import { useMemo } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { useI18n } from "@/i18n";
import { useSaleStaffReport } from "../queries";
import { buildSaleStaffRows } from "../sale-report-selectors";
import { SaleMetricTable } from "./SaleMetricTable";

type SaleStaffReportTabProps = {
  dateFrom?: string;
  dateTo?: string;
};

/**
 * Tab "Báo cáo theo sale" — mỗi hàng một nhân viên, dùng bộ lọc ngày của trang.
 * `Tabs` chỉ mount panel đang mở nên query chỉ chạy khi người dùng vào tab này.
 */
export function SaleStaffReportTab({ dateFrom, dateTo }: SaleStaffReportTabProps) {
  const { t } = useI18n();
  const query = useSaleStaffReport({ dateFrom, dateTo });
  const unknownLabel = t("dashboard.unknownStaff", "Không xác định");

  const rows = useMemo(
    () => buildSaleStaffRows(query.isError ? [] : (query.data?.by_staff_daily ?? []), unknownLabel),
    [query.isError, query.data, unknownLabel],
  );

  const error = query.error
    ? query.error instanceof Error
      ? query.error.message
      : String(query.error)
    : null;

  return (
    <div className="space-y-4">
      {error && (
        <Card className="rounded-xl border-destructive/50 bg-destructive/10">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}
      <Card className="rounded-xl border-border bg-card">
        <CardContent className="pt-6">
          {query.isLoading ? (
            <div className="flex min-h-40 items-center justify-center">
              <LogoSpinner size={36} />
            </div>
          ) : (
            <SaleMetricTable rows={rows} firstColumnHeader={t("saleReport.staffHeader", "Sale")} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
