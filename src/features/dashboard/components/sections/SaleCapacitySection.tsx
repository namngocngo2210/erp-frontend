import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent, safePercent } from "@/lib/metrics";

import { ENTITY_PALETTE } from "../../dashboard-constants";
import { reachable, resolveDisplayName } from "../../dashboard-utils";
import type { PodiumEntry, SalePerformanceRow } from "../../types";
import { DistributionDonut, SaleCapacityChart } from "../DashboardCharts";
import { CollapsibleTable, KpiPodiumCards } from "../DashboardPrimitives";
import { EmptyCard, type Derived, type Translate } from "./section-shared";
import { formatNumber } from "@/lib/format";

export function SaleCapacitySection({
  t,
  performanceRows,
  performanceTotals,
  totalsReachable,
  unknownStaffLabel,
}: {
  t: Translate;
  performanceRows: Derived["performanceRows"];
  performanceTotals: Derived["performanceTotals"];
  totalsReachable: number;
  unknownStaffLabel: string;
}) {
  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t("dashboard.saleCapacityTitle", "Nhóm 2 — Năng lực Sale")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t(
            "dashboard.saleCapacityHint",
            "Mẫu số: data tiếp cận được = Đơn đã có đánh giá − (Không nghe máy lần 6 + Không liên hệ được + Spam + Lặp + Sai số + Data không chất lượng + Bảo hành + Khách muốn đến cửa hàng).",
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {performanceRows.length === 0 ? (
          <EmptyCard t={t} />
        ) : (
          <>
            {(() => {
              const byClosedDesc = [...performanceRows].sort((a, b) => b.closed - a.closed);
              const byRateDesc = [...performanceRows].sort(
                (a, b) => safePercent(b.closed, b.total) - safePercent(a.closed, a.total),
              );
              const byVolumeDesc = [...performanceRows].sort((a, b) => b.total - a.total);
              const topClosed = byClosedDesc[0];
              const topRate = byRateDesc.find((r) => r !== topClosed) ?? byRateDesc[0];
              const topVolume =
                byVolumeDesc.find((r) => r !== topClosed && r !== topRate) ?? byVolumeDesc[0];
              const buildEntry = (
                row: SalePerformanceRow,
                badge: string,
                badgeIcon: PodiumEntry["badgeIcon"],
              ): PodiumEntry => {
                const denom = reachable(row);
                const excluded = row.unreached + row.dirty + row.warranty + row.wants_store_visit;
                const ratePct = safePercent(row.closed, denom);
                return {
                  key: `${badge}-${row.staff_id ?? "unknown"}`,
                  badge,
                  badgeIcon,
                  title: resolveDisplayName(row, unknownStaffLabel),
                  bigValue: `${ratePct.toFixed(1)}%`,
                  bigTone: ratePct >= 80 ? "success" : ratePct >= 60 ? "warning" : "danger",
                  stats: [
                    {
                      label: t("dashboard.totalDataColumn", "Tổng data"),
                      value: formatNumber(row.total),
                    },
                    {
                      label: t("dashboard.excludedLabel", "Loại trừ"),
                      value: formatNumber(excluded),
                      tone: "danger",
                    },
                    {
                      label: t("dashboard.reachableColumn", "Tiếp cận"),
                      value: formatNumber(denom),
                    },
                    {
                      label: t("dashboard.closedColumn", "Đã chốt"),
                      value: formatNumber(row.closed),
                      tone: "success",
                    },
                  ],
                  bars: [
                    {
                      label: t("dashboard.closeRateColumn", "% chốt"),
                      value: safePercent(row.closed, denom),
                      tone: "success",
                    },
                    {
                      label: t("dashboard.refusalRateColumn", "% từ chối"),
                      value: safePercent(row.not_buying, denom),
                      tone: "danger",
                    },
                    {
                      label: t("dashboard.nurtureRateColumn", "% chăm sóc lại"),
                      value: safePercent(row.nurture, denom),
                      tone: "warning",
                    },
                  ],
                };
              };
              const entries: PodiumEntry[] = [];
              if (topClosed)
                entries.push(
                  buildEntry(topClosed, t("dashboard.podiumTopClosed", "Chốt cao nhất"), "trophy"),
                );
              if (topRate && topRate !== topClosed)
                entries.push(
                  buildEntry(topRate, t("dashboard.podiumBestRate", "Tỷ lệ tốt"), "target"),
                );
              if (topVolume && topVolume !== topClosed && topVolume !== topRate)
                entries.push(
                  buildEntry(
                    topVolume,
                    t("dashboard.podiumTopVolume", "Khối lượng lớn nhất"),
                    "trending",
                  ),
                );
              return <KpiPodiumCards entries={entries} />;
            })()}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="mb-2 text-sm font-semibold text-foreground">
                  {t("dashboard.saleCompareTitle", "So sánh tỷ lệ chốt & từ chối")}
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  {t("dashboard.saleCompareHint", "Tính trên data tiếp cận được.")}
                </p>
                <SaleCapacityChart
                  rows={performanceRows}
                  fallback={unknownStaffLabel}
                  labels={{
                    closed: t("dashboard.closeRateColumn", "% chốt"),
                    refusal: t("dashboard.refusalRateColumn", "% từ chối"),
                  }}
                />
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="mb-2 text-sm font-semibold text-foreground">
                  {t("dashboard.saleDistributionTitle", "Phân bố data theo sale")}
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  {t("dashboard.saleDistributionHint", "Tỷ trọng tổng data mỗi sale đảm nhận.")}
                </p>
                <DistributionDonut
                  data={performanceRows.map((row, idx) => ({
                    name: resolveDisplayName(row, unknownStaffLabel),
                    value: row.total,
                    color: ENTITY_PALETTE[idx % ENTITY_PALETTE.length],
                  }))}
                  centerValue={formatNumber(performanceTotals.total)}
                  centerLabel={t("dashboard.totalDataColumn", "Tổng data")}
                />
              </div>
            </div>
            <CollapsibleTable label={t("dashboard.showDetailTable", "Xem bảng chi tiết")}>
              <table data-slot="table" className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">
                      {t("dashboard.staffColumn", "Nhân viên")}
                    </th>
                    <th className="py-2 pr-4 text-right font-medium">
                      {t("dashboard.reachableColumn", "Data tiếp cận")}
                    </th>
                    <th className="py-2 pr-4 text-right font-medium">
                      {t("dashboard.closeRateColumn", "% chốt")}
                    </th>
                    <th className="py-2 pr-4 text-right font-medium">
                      {t("dashboard.refusalRateColumn", "% từ chối")}
                    </th>
                    <th className="py-2 pr-4 text-right font-medium">
                      {t("dashboard.nurtureRateColumn", "% nurture")}
                    </th>
                    <th className="py-2 text-right font-medium">
                      {t("dashboard.followUpConvColumn", "% follow-up convert")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {performanceRows.map((row) => {
                    const denom = reachable(row);
                    return (
                      <tr
                        key={String(row.staff_id ?? "unknown")}
                        className="border-b border-border/60 transition-colors hover:bg-muted/50"
                      >
                        <td className="py-2 pr-4 text-foreground">
                          {resolveDisplayName(row, unknownStaffLabel)}
                        </td>
                        <td className="py-2 pr-4 text-right text-foreground">{denom}</td>
                        <td className="py-2 pr-4 text-right font-semibold text-foreground">
                          {formatPercent(row.closed, denom)}
                        </td>
                        <td className="py-2 pr-4 text-right text-foreground">
                          {formatPercent(row.not_buying, denom)}
                        </td>
                        <td className="py-2 pr-4 text-right text-foreground">
                          {formatPercent(row.nurture, denom)}
                        </td>
                        <td className="py-2 text-right text-foreground">
                          {formatPercent(row.nurture_followup_closed, row.nurture_total_ever)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td className="py-2 pr-4 text-sm font-semibold text-foreground">
                      {t("dashboard.totalRow", "Tổng")}
                    </td>
                    <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                      {totalsReachable}
                    </td>
                    <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                      {formatPercent(performanceTotals.closed, totalsReachable)}
                    </td>
                    <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                      {formatPercent(performanceTotals.not_buying, totalsReachable)}
                    </td>
                    <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                      {formatPercent(performanceTotals.nurture, totalsReachable)}
                    </td>
                    <td className="py-2 text-right text-sm font-semibold text-foreground">
                      {formatPercent(
                        performanceTotals.nurture_followup_closed,
                        performanceTotals.nurture_total_ever,
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
