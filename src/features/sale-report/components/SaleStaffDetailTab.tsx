import { useEffect, useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { MonthPicker, currentMonth } from "@/components/ui/month-picker";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { monthRange } from "@/features/ads/digital-report-selectors";
import { useI18n } from "@/i18n";
import { useSaleStaffReport } from "../queries";
import { buildSaleDailyRows, listSaleOptions } from "../sale-report-selectors";
import { SaleMetricTable } from "./SaleMetricTable";

/**
 * Tab "Báo cáo chi tiết theo sale" — chọn 1 nhân viên + 1 tháng, mỗi hàng là
 * một ngày trong tháng. Bộ lọc tháng độc lập với `DateFilter` của trang.
 */
export function SaleStaffDetailTab() {
  const { t } = useI18n();
  const [month, setMonth] = useState<string>(() => currentMonth());
  const [staffKey, setStaffKey] = useState<string>("");

  const range = useMemo(() => monthRange(month), [month]);
  const query = useSaleStaffReport({ dateFrom: range.from, dateTo: range.to });
  const dailyRows = useMemo(
    () => (query.isError ? [] : (query.data?.by_staff_daily ?? [])),
    [query.isError, query.data],
  );

  const unknownLabel = t("dashboard.unknownStaff", "Không xác định");
  const options = useMemo(
    () => listSaleOptions(dailyRows, unknownLabel),
    [dailyRows, unknownLabel],
  );
  // Chọn sẵn nhân viên đầu tiên; giữ lựa chọn cũ nếu vẫn có mặt trong tháng mới.
  useEffect(() => {
    if (options.length === 0) return;
    setStaffKey((prev) =>
      prev && options.some((o) => o.value === prev) ? prev : options[0].value,
    );
  }, [options]);

  const rows = useMemo(
    () => (staffKey ? buildSaleDailyRows(dailyRows, staffKey, range.from, range.to) : []),
    [dailyRows, staffKey, range.from, range.to],
  );

  const error = query.error
    ? query.error instanceof Error
      ? query.error.message
      : String(query.error)
    : null;

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border-border bg-card">
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-end">
          <MonthPicker
            id="sale-detail-month"
            value={month}
            onChange={setMonth}
            label={t("saleReport.monthLabel", "Tháng")}
          />
          <div className="flex flex-1 flex-col gap-1">
            <label
              htmlFor="sale-detail-staff"
              className="text-xs font-medium text-muted-foreground"
            >
              {t("saleReport.staffHeader", "Sale")}
            </label>
            <SearchableSelect
              options={options}
              value={staffKey}
              onChange={setStaffKey}
              placeholder={t("saleReport.staffPlaceholder", "Chọn nhân viên sale")}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

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
            <SaleMetricTable rows={rows} firstColumnHeader={t("saleReport.dayHeader", "Ngày")} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
