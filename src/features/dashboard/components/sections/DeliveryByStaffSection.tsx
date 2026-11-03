import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent, safePercent } from "@/lib/metrics";

import { resolveDisplayName, settledDeliveries } from "../../dashboard-utils";
import { DeliveryQualityChart } from "../DashboardCharts";
import { CollapsibleTable, KpiHero } from "../DashboardPrimitives";
import { EmptyCard, type Derived, type Translate } from "./section-shared";
import { formatNumber } from "@/lib/format";

export function DeliveryByStaffSection({
  t,
  deliveryByStaffRows,
  deliveryStaffTotals,
  unknownStaffLabel,
}: {
  t: Translate;
  deliveryByStaffRows: Derived["deliveryByStaffRows"];
  deliveryStaffTotals: Derived["deliveryStaffTotals"];
  unknownStaffLabel: string;
}) {
  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t("dashboard.deliveryByStaffTitle", "Nhóm 5a — Hiệu quả giao hàng theo Sale")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t(
            "dashboard.deliveryHint",
            "% giao TC = Đơn giao thành công / Tổng data. % bom = Đơn bom / (Đơn bom + Đơn giao thành công), tức chỉ tính trên các đơn đã có kết quả cuối. % tồn giao = đơn chưa kết thúc hành trình & tạo > 7 ngày / Tổng data.",
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {deliveryByStaffRows.length === 0 ? (
          <EmptyCard t={t} />
        ) : (
          <>
            {(() => {
              const deliveredRatePct = safePercent(
                deliveryStaffTotals.delivered,
                deliveryStaffTotals.total,
              );
              return (
                <KpiHero
                  bigValue={`${deliveredRatePct.toFixed(1)}%`}
                  bigLabel={t("dashboard.deliveredRateColumn", "% giao TC")}
                  bigTone={
                    deliveredRatePct >= 80
                      ? "success"
                      : deliveredRatePct >= 60
                        ? "warning"
                        : "danger"
                  }
                  breakdown={[
                    {
                      label: t("dashboard.totalDataColumn", "Tổng data"),
                      value: formatNumber(deliveryStaffTotals.total),
                    },
                    {
                      label: t("dashboard.inDeliveryColumn", "Đơn đang giao"),
                      value: formatNumber(deliveryStaffTotals.in_delivery),
                    },
                    {
                      label: t("dashboard.deliveredColumn", "Đơn TC"),
                      value: formatNumber(deliveryStaffTotals.delivered),
                      tone: "success",
                    },
                    {
                      label: t("dashboard.bombColumn", "Đơn bom"),
                      value: formatNumber(deliveryStaffTotals.bomb),
                      tone: "danger",
                    },
                    {
                      label: t("dashboard.pendingDeliveryColumn", "Đơn tồn (>7d)"),
                      value: formatNumber(deliveryStaffTotals.pending_over_threshold),
                      tone: "warning",
                    },
                  ]}
                />
              );
            })()}
            <DeliveryQualityChart
              rows={deliveryByStaffRows.map((row) => ({
                name: resolveDisplayName(row, unknownStaffLabel),
                delivered: row.delivered,
                bomb: row.bomb,
                pending: row.pending_over_threshold,
              }))}
              labels={{
                delivered: t("dashboard.deliveredColumn", "Đơn TC"),
                bomb: t("dashboard.bombColumn", "Đơn bom"),
                pending: t("dashboard.pendingDeliveryColumn", "Đơn tồn (>7d)"),
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
                      {t("dashboard.inDeliveryColumn", "Đơn đang giao")}
                    </th>
                    <th className="py-2 pr-4 text-right font-medium">
                      {t("dashboard.bombColumn", "Đơn bom")}
                    </th>
                    <th className="py-2 pr-4 text-right font-medium">
                      {t("dashboard.bombRateColumn", "% bom")}
                    </th>
                    <th className="py-2 pr-4 text-right font-medium">
                      {t("dashboard.deliveredColumn", "Đơn TC")}
                    </th>
                    <th className="py-2 pr-4 text-right font-medium">
                      {t("dashboard.deliveredRateColumn", "% giao TC")}
                    </th>
                    <th className="py-2 pr-4 text-right font-medium">
                      {t("dashboard.pendingDeliveryColumn", "Đơn tồn (>7d)")}
                    </th>
                    <th className="py-2 text-right font-medium">
                      {t("dashboard.pendingDeliveryRateColumn", "% tồn giao")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryByStaffRows.map((row) => (
                    <tr
                      key={String(row.staff_id ?? "unknown")}
                      className="border-b border-border/60 transition-colors hover:bg-muted/50"
                    >
                      <td className="py-2 pr-4 text-foreground">
                        {resolveDisplayName(row, unknownStaffLabel)}
                      </td>
                      <td className="py-2 pr-4 text-right text-foreground">{row.total}</td>
                      <td className="py-2 pr-4 text-right text-foreground">{row.in_delivery}</td>
                      <td className="py-2 pr-4 text-right text-foreground">{row.bomb}</td>
                      <td className="py-2 pr-4 text-right font-semibold text-foreground">
                        {formatPercent(row.bomb, settledDeliveries(row))}
                      </td>
                      <td className="py-2 pr-4 text-right text-foreground">{row.delivered}</td>
                      <td className="py-2 pr-4 text-right font-semibold text-foreground">
                        {formatPercent(row.delivered, row.total)}
                      </td>
                      <td className="py-2 pr-4 text-right text-foreground">
                        {row.pending_over_threshold}
                      </td>
                      <td className="py-2 text-right font-semibold text-foreground">
                        {formatPercent(row.pending_over_threshold, row.total)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2 pr-4 text-sm font-semibold text-foreground">
                      {t("dashboard.totalRow", "Tổng")}
                    </td>
                    <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                      {deliveryStaffTotals.total}
                    </td>
                    <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                      {deliveryStaffTotals.in_delivery}
                    </td>
                    <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                      {deliveryStaffTotals.bomb}
                    </td>
                    <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                      {formatPercent(
                        deliveryStaffTotals.bomb,
                        settledDeliveries(deliveryStaffTotals),
                      )}
                    </td>
                    <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                      {deliveryStaffTotals.delivered}
                    </td>
                    <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                      {formatPercent(deliveryStaffTotals.delivered, deliveryStaffTotals.total)}
                    </td>
                    <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                      {deliveryStaffTotals.pending_over_threshold}
                    </td>
                    <td className="py-2 text-right text-sm font-semibold text-foreground">
                      {formatPercent(
                        deliveryStaffTotals.pending_over_threshold,
                        deliveryStaffTotals.total,
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
