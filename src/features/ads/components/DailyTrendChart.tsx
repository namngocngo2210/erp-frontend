import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleTable } from "@/components/report/CollapsibleTable";
import { ChartTooltip } from "@/features/dashboard/components/DashboardPrimitives";
import { CHART_COLORS, PERCENT_AXIS_DOMAIN } from "@/features/dashboard/dashboard-constants";
import { useI18n } from "@/i18n";
import { buildDailyTrendChartData } from "../ads-report-selectors";
import {
  type DailyBreakdownRow,
  formatAdsCurrency as formatCurrency,
  formatRatioPct,
} from "../report-grouping";
import { DailyBreakdownTable } from "./DailyBreakdownTable";

export function DailyTrendChart({
  rows,
  groupByMonth,
}: {
  rows: DailyBreakdownRow[];
  groupByMonth: boolean;
}) {
  const { t } = useI18n();
  const data = useMemo(() => buildDailyTrendChartData(rows, groupByMonth), [rows, groupByMonth]);

  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t("adsReport.trendTitle", "Diễn biến doanh thu / chi phí")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("adsReport.empty", "Chưa có dữ liệu.")}
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke="var(--border)"
                  strokeOpacity={0.55}
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  stroke="var(--border)"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="money"
                  tickFormatter={(v) => formatCurrency(Number(v))}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  stroke="var(--border)"
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <YAxis
                  yAxisId="ratio"
                  orientation="right"
                  domain={PERCENT_AXIS_DOMAIN}
                  unit="%"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  stroke="var(--border)"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      formatter={(entry) =>
                        entry.dataKey === "ratioPct"
                          ? formatRatioPct(entry.value == null ? null : Number(entry.value))
                          : formatCurrency(Number(entry.value))
                      }
                    />
                  }
                />
                <Bar
                  yAxisId="money"
                  dataKey="revenue"
                  name={t("adsReport.revenueHeader", "Doanh thu")}
                  fill={CHART_COLORS.blue}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="money"
                  dataKey="cost"
                  name={t("adsReport.costHeader", "Chi phí")}
                  fill={CHART_COLORS.amber}
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="ratio"
                  type="monotone"
                  dataKey="ratioPct"
                  name={t("adsReport.ratioHeader", "% chi phí / doanh thu")}
                  stroke={CHART_COLORS.red}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>

            <CollapsibleTable label={t("dashboard.showDetailTable", "Xem bảng chi tiết")}>
              <DailyBreakdownTable rows={rows} groupByMonth={groupByMonth} bare />
            </CollapsibleTable>
          </>
        )}
      </CardContent>
    </Card>
  );
}
