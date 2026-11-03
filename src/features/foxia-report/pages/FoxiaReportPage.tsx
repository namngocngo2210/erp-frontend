import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { DateFilter, type DateFilterValue, getDateRange } from "@/components/ui/date-filter";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { PageHeader } from "@/components/ui/page-header";
import type { FoxiaGroupBy } from "@/lib/api/foxia-report";

import { FoxiaKpiRow } from "../components/FoxiaKpiRow";
import { FoxiaReportTable } from "../components/FoxiaReportTable";
import { GROUP_BY_OPTIONS, hasSpendColumns } from "../foxia-selectors";
import { useFoxiaReport, useFoxiaSyncStatus } from "../queries";
import { formatNumber } from "@/lib/format";

const DEFAULT_RANGE = getDateRange("last_30_days");
const DEFAULT_DATE_FILTER: DateFilterValue = {
  option: "last_30_days",
  from: DEFAULT_RANGE.from,
  to: DEFAULT_RANGE.to,
};

export default function FoxiaReportPage() {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(DEFAULT_DATE_FILTER);
  const [groupBy, setGroupBy] = useState<FoxiaGroupBy>("source");

  const params = useMemo(
    () => ({ dateFrom: dateFilter.from, dateTo: dateFilter.to, groupBy }),
    [dateFilter.from, dateFilter.to, groupBy],
  );
  const { data, isLoading, error } = useFoxiaReport(params);
  const { data: syncStatus } = useFoxiaSyncStatus();

  const showSpend = hasSpendColumns(groupBy);
  const groupLabel = GROUP_BY_OPTIONS.find((option) => option.value === groupBy)?.label ?? "Nhóm";
  const authBroken = syncStatus?.connection != null && syncStatus.connection.auth_status !== "ok";

  return (
    <div className="space-y-4">
      <PageHeader title="Hiệu quả marketing (Foxia)" />

      {/* Khoá hỏng thì số liệu đứng im mà bảng vẫn hiển thị bình thường — phải
          nói ra, không để người đọc tưởng hôm nay không có đơn. */}
      {authBroken ? (
        <div className="rounded-lg border border-action-danger/30 bg-action-danger/10 px-4 py-3 text-sm text-action-danger">
          Kết nối Foxia đang lỗi ({syncStatus?.connection?.auth_status}). Số liệu bên dưới có thể đã
          cũ.
          {syncStatus?.connection?.auth_error ? (
            <span className="ml-1 opacity-80">{syncStatus.connection.auth_error}</span>
          ) : null}
        </div>
      ) : null}

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <DateFilter value={dateFilter} onChange={setDateFilter} />
          <div className="flex flex-col gap-1">
            <label htmlFor="foxia-group-by" className="text-xs font-medium text-muted-foreground">
              Nhóm theo
            </label>
            <select
              id="foxia-group-by"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={groupBy}
              onChange={(event) => setGroupBy(event.target.value as FoxiaGroupBy)}
            >
              {GROUP_BY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {!showSpend ? (
            <p className="max-w-md text-xs text-muted-foreground">
              Chi phí quảng cáo gắn với tài khoản Ads nên chỉ quy được về nguồn/kênh — lát cắt này
              không có cột chi phí.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error instanceof Error ? error.message : String(error)}
        </div>
      ) : null}

      {isLoading && !data ? (
        <div className="flex justify-center py-16">
          <LogoSpinner />
        </div>
      ) : null}

      {data ? (
        <>
          <FoxiaKpiRow totals={data.totals} showSpend={showSpend} />

          {data.unmapped_orders > 0 && showSpend ? (
            <div className="rounded-lg border border-action-warning/30 bg-action-warning/10 px-4 py-3 text-sm text-action-warning">
              {formatNumber(data.unmapped_orders)} đơn thuộc nguồn chưa gán kênh nội bộ — chúng vẫn
              được tính vào số đơn nhưng không có chi phí quảng cáo.
            </div>
          ) : null}

          <FoxiaReportTable
            rows={data.rows}
            totals={data.totals}
            showSpend={showSpend}
            groupLabel={groupLabel}
          />

          <p className="text-xs text-muted-foreground">
            “Đã thu” là số tại thời điểm đồng bộ, <strong>chưa trừ</strong> khấu trừ, tiền hoàn và
            phí vận chuyển thực tế — đối soát kế toán chưa nằm trong phạm vi kết nối hiện tại. “Đơn
            giao thành công” nhận biết bằng mốc ngày hoàn thành bên Foxia.
          </p>
        </>
      ) : null}
    </div>
  );
}
