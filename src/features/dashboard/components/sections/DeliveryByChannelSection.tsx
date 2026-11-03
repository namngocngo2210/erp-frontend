import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/metrics";

import { ENTITY_PALETTE } from "../../dashboard-constants";
import { settledDeliveries } from "../../dashboard-utils";
import { DeliveryQualityChart, DistributionDonut } from "../DashboardCharts";
import { CollapsibleTable } from "../DashboardPrimitives";
import { EmptyCard, type Derived, type Translate } from "./section-shared";
import { formatNumber } from "@/lib/format";

export function DeliveryByChannelSection({
  t,
  deliveryByChannelRows,
  deliveryChannelTotals,
  unknownChannelLabel,
}: {
  t: Translate;
  deliveryByChannelRows: Derived["deliveryByChannelRows"];
  deliveryChannelTotals: Derived["deliveryChannelTotals"];
  unknownChannelLabel: string;
}) {
  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t("dashboard.deliveryByChannelTitle", "Nhóm 5b — Hiệu quả giao hàng theo Kênh")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t(
            "dashboard.deliveryHint",
            "% giao TC = Đơn giao thành công / Tổng data. % bom = Đơn bom / (Đơn bom + Đơn giao thành công), tức chỉ tính trên các đơn đã có kết quả cuối. % tồn giao = đơn chưa kết thúc hành trình & tạo > 7 ngày / Tổng data.",
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {deliveryByChannelRows.length === 0 ? (
          <EmptyCard t={t} />
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="mb-2 text-sm font-semibold text-foreground">
                  {t("dashboard.channelSentDistTitle", "Phân bố đơn gửi theo kênh")}
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  {t("dashboard.channelSentDistHint", "Tỷ trọng đơn đã gửi của mỗi kênh.")}
                </p>
                <DistributionDonut
                  data={deliveryByChannelRows.map((row, idx) => ({
                    name: row.channel__name?.trim() || row.channel__code || unknownChannelLabel,
                    value: row.sent,
                    color: ENTITY_PALETTE[idx % ENTITY_PALETTE.length],
                  }))}
                  centerValue={formatNumber(deliveryChannelTotals.sent)}
                  centerLabel={t("dashboard.sentColumn", "Đơn gửi")}
                />
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="mb-2 text-sm font-semibold text-foreground">
                  {t("dashboard.channelOutcomeTitle", "Kết quả giao theo kênh")}
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  {t("dashboard.channelOutcomeHint", "Stack: Giao TC + Bom + Tồn (số tuyệt đối).")}
                </p>
                <DeliveryQualityChart
                  rows={deliveryByChannelRows.map((row) => ({
                    name: row.channel__name?.trim() || row.channel__code || unknownChannelLabel,
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
              </div>
            </div>
            <CollapsibleTable label={t("dashboard.showDetailTable", "Xem bảng chi tiết")}>
              <table data-slot="table" className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">
                      {t("dashboard.channelColumn", "Kênh")}
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
                  {deliveryByChannelRows.map((row) => {
                    const channelLabel =
                      row.channel__name?.trim() || row.channel__code || unknownChannelLabel;
                    return (
                      <tr
                        key={String(row.channel_id ?? "unknown")}
                        className="border-b border-border/60 transition-colors hover:bg-muted/50"
                      >
                        <td className="py-2 pr-4 text-foreground">
                          <div className="font-medium text-foreground">{channelLabel}</div>
                          {row.channel__code && row.channel__code !== channelLabel && (
                            <div className="text-xs text-muted-foreground">{row.channel__code}</div>
                          )}
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
                    );
                  })}
                  <tr>
                    <td className="py-2 pr-4 text-sm font-semibold text-foreground">
                      {t("dashboard.totalRow", "Tổng")}
                    </td>
                    <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                      {deliveryChannelTotals.total}
                    </td>
                    <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                      {deliveryChannelTotals.in_delivery}
                    </td>
                    <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                      {deliveryChannelTotals.bomb}
                    </td>
                    <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                      {formatPercent(
                        deliveryChannelTotals.bomb,
                        settledDeliveries(deliveryChannelTotals),
                      )}
                    </td>
                    <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                      {deliveryChannelTotals.delivered}
                    </td>
                    <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                      {formatPercent(deliveryChannelTotals.delivered, deliveryChannelTotals.total)}
                    </td>
                    <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                      {deliveryChannelTotals.pending_over_threshold}
                    </td>
                    <td className="py-2 text-right text-sm font-semibold text-foreground">
                      {formatPercent(
                        deliveryChannelTotals.pending_over_threshold,
                        deliveryChannelTotals.total,
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
