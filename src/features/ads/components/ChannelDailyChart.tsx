import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleTable } from "@/components/report/CollapsibleTable";
import { ChartTooltip } from "@/features/dashboard/components/DashboardPrimitives";
import { ENTITY_PALETTE } from "@/features/dashboard/dashboard-constants";
import { useI18n } from "@/i18n";
import { buildChannelStackChartData } from "../ads-report-selectors";
import { type DailyBreakdownRow, formatAdsCurrency as formatCurrency } from "../report-grouping";
import { ChannelDailyTable } from "./ChannelDailyTable";

export function ChannelDailyChart({
  dailyRows,
  groupByMonth,
}: {
  dailyRows: DailyBreakdownRow[];
  groupByMonth: boolean;
}) {
  const { t } = useI18n();
  const { data, series } = useMemo(
    () => buildChannelStackChartData(dailyRows, groupByMonth),
    [dailyRows, groupByMonth],
  );

  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t("adsReport.channelDailyTitle", "Doanh thu theo kênh & thời gian")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {dailyRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("adsReport.empty", "Chưa có dữ liệu.")}
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
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
                  tickFormatter={(v) => formatCurrency(Number(v))}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  stroke="var(--border)"
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip
                  content={
                    <ChartTooltip formatter={(entry) => formatCurrency(Number(entry.value))} />
                  }
                />
                {series.map((s, idx) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.name}
                    stackId="rev"
                    fill={ENTITY_PALETTE[idx % ENTITY_PALETTE.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>

            <CollapsibleTable label={t("dashboard.showDetailTable", "Xem bảng chi tiết")}>
              <ChannelDailyTable dailyRows={dailyRows} groupByMonth={groupByMonth} bare />
            </CollapsibleTable>
          </>
        )}
      </CardContent>
    </Card>
  );
}
