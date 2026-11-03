import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent, percentValue, safePercent } from "@/lib/metrics";

import { ENTITY_PALETTE, UNREACHED_WARNING_THRESHOLD } from "../../dashboard-constants";
import { DistributionDonut, VerticalRateBar } from "../DashboardCharts";
import { CollapsibleTable } from "../DashboardPrimitives";
import { EmptyCard, type Derived, type Translate } from "./section-shared";
import { formatNumber } from "@/lib/format";

export function DataQualitySection({
  t,
  channelQualityRows,
  channelQualityTotals,
  unknownChannelLabel,
}: {
  t: Translate;
  channelQualityRows: Derived["channelQualityRows"];
  channelQualityTotals: Derived["channelQualityTotals"];
  unknownChannelLabel: string;
}) {
  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t("dashboard.dataQualityTitle", "Nhóm 3 — Chất lượng Data theo kênh")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t(
            "dashboard.dataQualityHint",
            "Tính trên tổng data Landing (order_source = Landing). % không tiếp cận > 30% sẽ tô đỏ — data có vấn đề.",
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {channelQualityRows.length === 0 ? (
          <EmptyCard t={t} />
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="mb-2 text-sm font-semibold text-foreground">
                  {t("dashboard.channelDistributionTitle", "Phân bố data theo kênh")}
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  {t("dashboard.channelDistributionHint", "Tỷ trọng tổng data của mỗi kênh.")}
                </p>
                <DistributionDonut
                  data={channelQualityRows.map((row, idx) => ({
                    name: row.channel__name?.trim() || row.channel__code || unknownChannelLabel,
                    value: row.total,
                    color: ENTITY_PALETTE[idx % ENTITY_PALETTE.length],
                  }))}
                  centerValue={formatNumber(channelQualityTotals.total)}
                  centerLabel={t("dashboard.totalDataColumn", "Tổng data")}
                />
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="mb-2 text-sm font-semibold text-foreground">
                  {t("dashboard.channelUnreachedTitle", "Tỷ lệ data không tiếp cận theo kênh")}
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  {t(
                    "dashboard.channelUnreachedHint",
                    "Cảnh báo đỏ khi vượt 30% — data có vấn đề.",
                  )}
                </p>
                <VerticalRateBar
                  data={channelQualityRows.map((row) => ({
                    name: row.channel__name?.trim() || row.channel__code || unknownChannelLabel,
                    value: safePercent(row.unreached, row.total),
                  }))}
                  warningThreshold={UNREACHED_WARNING_THRESHOLD}
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
                      {t("dashboard.unreachedRateColumn", "% không tiếp cận")}
                    </th>
                    <th className="py-2 pr-4 text-right font-medium">
                      {t("dashboard.dirtyRateColumn", "% data bẩn")}
                    </th>
                    <th className="py-2 text-right font-medium">
                      {t("dashboard.usefulRateColumn", "% data hữu dụng")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {channelQualityRows.map((row) => {
                    const useful = row.total - row.dirty;
                    const unreachedPct = percentValue(row.unreached, row.total);
                    const isWarning =
                      unreachedPct !== null && unreachedPct > UNREACHED_WARNING_THRESHOLD;
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
                        <td
                          className={`py-2 pr-4 text-right font-semibold ${
                            isWarning ? "text-destructive" : "text-foreground"
                          }`}
                        >
                          {formatPercent(row.unreached, row.total)}
                        </td>
                        <td className="py-2 pr-4 text-right text-foreground">
                          {formatPercent(row.dirty, row.total)}
                        </td>
                        <td className="py-2 text-right text-foreground">
                          {formatPercent(useful, row.total)}
                        </td>
                      </tr>
                    );
                  })}
                  {(() => {
                    const totalUseful = channelQualityTotals.total - channelQualityTotals.dirty;
                    const totalsUnreachedPct = percentValue(
                      channelQualityTotals.unreached,
                      channelQualityTotals.total,
                    );
                    const totalsWarning =
                      totalsUnreachedPct !== null &&
                      totalsUnreachedPct > UNREACHED_WARNING_THRESHOLD;
                    return (
                      <tr>
                        <td className="py-2 pr-4 text-sm font-semibold text-foreground">
                          {t("dashboard.totalRow", "Tổng")}
                        </td>
                        <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                          {channelQualityTotals.total}
                        </td>
                        <td
                          className={`py-2 pr-4 text-right text-sm font-semibold ${
                            totalsWarning ? "text-destructive" : "text-foreground"
                          }`}
                        >
                          {formatPercent(
                            channelQualityTotals.unreached,
                            channelQualityTotals.total,
                          )}
                        </td>
                        <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                          {formatPercent(channelQualityTotals.dirty, channelQualityTotals.total)}
                        </td>
                        <td className="py-2 text-right text-sm font-semibold text-foreground">
                          {formatPercent(totalUseful, channelQualityTotals.total)}
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </CollapsibleTable>
          </>
        )}
      </CardContent>
    </Card>
  );
}
