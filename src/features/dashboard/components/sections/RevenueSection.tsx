import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { formatCurrency, resolveDisplayName } from "../../dashboard-utils";
import { RevenueChart } from "../DashboardCharts";
import { CollapsibleTable, KpiHero } from "../DashboardPrimitives";
import { EmptyCard, type Derived, type Translate } from "./section-shared";
import { formatNumber } from "@/lib/format";

export function RevenueSection({
  t,
  performanceRows,
  performanceTotals,
  unknownStaffLabel,
}: {
  t: Translate;
  performanceRows: Derived["performanceRows"];
  performanceTotals: Derived["performanceTotals"];
  unknownStaffLabel: string;
}) {
  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t("dashboard.revenueByStaffTitle", "Nhóm 4 — Doanh thu giao thành công theo Sale")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t(
            "dashboard.revenueByStaffHint",
            "Chỉ tính các đơn đã giao thành công (status = Đã giao). Doanh thu = tổng total_after_discount của các đơn giao TC theo từng nhân viên.",
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {performanceRows.length === 0 ? (
          <EmptyCard t={t} />
        ) : (
          <>
            {(() => {
              const aov =
                performanceTotals.delivered_count > 0
                  ? performanceTotals.revenue / performanceTotals.delivered_count
                  : 0;
              return (
                <KpiHero
                  bigValue={formatCurrency(performanceTotals.revenue)}
                  bigLabel={t("dashboard.revenueColumn", "Doanh thu")}
                  bigTone="success"
                  breakdown={[
                    {
                      label: t("dashboard.deliveredOrdersColumn", "Đơn giao TC"),
                      value: formatNumber(performanceTotals.delivered_count),
                      tone: "success",
                    },
                    {
                      label: t("dashboard.aovLabel", "Doanh thu / đơn (AOV)"),
                      value: formatCurrency(aov),
                    },
                    {
                      label: t("dashboard.totalDataColumn", "Tổng data"),
                      value: formatNumber(performanceTotals.total),
                      tone: "muted",
                    },
                  ]}
                />
              );
            })()}
            <RevenueChart
              rows={performanceRows}
              fallback={unknownStaffLabel}
              labels={{
                revenue: t("dashboard.revenueColumn", "Doanh thu"),
              }}
            />
            <CollapsibleTable label={t("dashboard.showDetailTable", "Xem bảng chi tiết")}>
              <table data-slot="table" className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">
                      {t("dashboard.staffColumn", "Nhân viên")}
                    </th>
                    <th className="py-2 pr-4 text-right font-medium">
                      {t("dashboard.deliveredOrdersColumn", "Đơn giao TC")}
                    </th>
                    <th className="py-2 text-right font-medium">
                      {t("dashboard.revenueColumn", "Doanh thu")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {performanceRows.map((row) => (
                    <tr
                      key={String(row.staff_id ?? "unknown")}
                      className="border-b border-border/60 transition-colors hover:bg-muted/50"
                    >
                      <td className="py-2 pr-4 text-foreground">
                        {resolveDisplayName(row, unknownStaffLabel)}
                      </td>
                      <td className="py-2 pr-4 text-right text-foreground">
                        {row.delivered_count ?? 0}
                      </td>
                      <td className="py-2 text-right font-semibold text-foreground">
                        {formatCurrency(row.revenue)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2 pr-4 text-sm font-semibold text-foreground">
                      {t("dashboard.totalRow", "Tổng")}
                    </td>
                    <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                      {performanceTotals.delivered_count}
                    </td>
                    <td className="py-2 text-right text-sm font-semibold text-foreground">
                      {formatCurrency(performanceTotals.revenue)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CollapsibleTable>
          </>
        )}
      </CardContent>
    </Card>
  );
}
