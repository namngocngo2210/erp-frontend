import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent, safePercent } from "@/lib/metrics";

import { closeRateDenominator, resolveDisplayName } from "../../dashboard-utils";
import { CloseRateChart } from "../DashboardCharts";
import { CollapsibleTable, KpiHero } from "../DashboardPrimitives";
import { EmptyCard, type Derived, type Translate } from "./section-shared";
import { formatNumber } from "@/lib/format";

export function CloseRateSection({
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
          {t("dashboard.closeRateTotalTitle", "Nhóm 1 — Tỷ lệ chốt trên tổng data")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t(
            "dashboard.closeRateTotalHint",
            "Tổng chốt = Đã chốt + Đã chốt/Hỏa tốc + Đã chốt hẹn lịch + Đã lên đơn. Mẫu số: tổng đơn của staff Sale ở các kênh sale (chưa huỷ, không tính Khách bị bệnh nền và Khách muốn đến cửa hàng).",
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {performanceRows.length === 0 ? (
          <EmptyCard t={t} />
        ) : (
          <>
            {(() => {
              // Mẫu số loại "Khách bị bệnh nền" (chống chỉ định, không thể bán)
              // và "Khách muốn đến cửa hàng" (chốt ngoài tầm sale online).
              const denom = closeRateDenominator(performanceTotals);
              const excluded =
                performanceTotals.unreached + performanceTotals.dirty + performanceTotals.warranty;
              const other = Math.max(0, denom - performanceTotals.closed - excluded);
              const ratePct = safePercent(performanceTotals.closed, denom);
              const formula = `= (Đã chốt + Hỏa tốc + Hẹn lịch + Lên đơn) / Tổng data (trừ bệnh nền, đến cửa hàng)\n= ${formatNumber(performanceTotals.closed)} / ${formatNumber(denom)} = ${ratePct.toFixed(1)}%`;
              return (
                <KpiHero
                  bigValue={`${ratePct.toFixed(1)}%`}
                  bigLabel={t("dashboard.closeRateColumn", "% chốt")}
                  bigTone={ratePct >= 80 ? "success" : ratePct >= 60 ? "warning" : "danger"}
                  formula={formula}
                  breakdown={[
                    {
                      label: t("dashboard.totalDataColumn", "Tổng data"),
                      value: formatNumber(denom),
                    },
                    {
                      label: t("dashboard.underlyingConditionLabel", "Bệnh nền (không tính)"),
                      value: formatNumber(performanceTotals.underlying_condition),
                    },
                    {
                      label: t("dashboard.wantsStoreVisitLabel", "Đến cửa hàng (không tính)"),
                      value: formatNumber(performanceTotals.wants_store_visit),
                    },
                    {
                      label: t("dashboard.totalClosedColumn", "Đã chốt / lên đơn"),
                      value: formatNumber(performanceTotals.closed),
                      tone: "success",
                    },
                    {
                      label: t("dashboard.excludedLabel", "Loại trừ"),
                      value: formatNumber(excluded),
                      tone: "danger",
                    },
                    {
                      label: t("dashboard.otherLabel", "Chưa chốt (nurture / từ chối / KNM 1+2)"),
                      value: formatNumber(other),
                      tone: "warning",
                    },
                  ]}
                />
              );
            })()}
            <CloseRateChart
              rows={performanceRows}
              fallback={unknownStaffLabel}
              labels={{
                rate: t("dashboard.closeRateColumn", "% chốt"),
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
                      {t("dashboard.totalDataColumn", "Tổng data")}
                    </th>
                    <th className="py-2 pr-4 text-right font-medium">
                      {t("dashboard.totalClosedColumn", "Tổng chốt")}
                    </th>
                    <th className="py-2 text-right font-medium">
                      {t("dashboard.closeRateColumn", "% chốt")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {performanceRows.map((row) => {
                    const rowDenom = closeRateDenominator(row);
                    return (
                      <tr
                        key={String(row.staff_id ?? "unknown")}
                        className="border-b border-border/60 transition-colors hover:bg-muted/50"
                      >
                        <td className="py-2 pr-4 text-foreground">
                          {resolveDisplayName(row, unknownStaffLabel)}
                        </td>
                        <td className="py-2 pr-4 text-right text-foreground">{rowDenom}</td>
                        <td className="py-2 pr-4 text-right text-foreground">{row.closed}</td>
                        <td className="py-2 text-right font-semibold text-foreground">
                          {formatPercent(row.closed, rowDenom)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td className="py-2 pr-4 text-sm font-semibold text-foreground">
                      {t("dashboard.totalRow", "Tổng")}
                    </td>
                    <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                      {closeRateDenominator(performanceTotals)}
                    </td>
                    <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                      {performanceTotals.closed}
                    </td>
                    <td className="py-2 text-right text-sm font-semibold text-foreground">
                      {formatPercent(
                        performanceTotals.closed,
                        closeRateDenominator(performanceTotals),
                      )}
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
