import { Fragment, useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleTable } from "@/components/report/CollapsibleTable";
import { DonutChart } from "@/components/report/DonutChart";
import { ENTITY_PALETTE } from "@/features/dashboard/dashboard-constants";
import { useI18n } from "@/i18n";
import {
  type ChannelRevenueRow,
  type TopProductRow,
  buildChannelRevenueChartData,
  buildDonutSlices,
} from "../ads-report-selectors";
import {
  type DailyBreakdownRow,
  formatAdsCurrency as formatCurrency,
  formatRatioPct,
  sumCostByChannel,
} from "../report-grouping";

type ChannelProductRow = {
  product_id: number | null;
  product__sku: string | null;
  closed_orders: number;
  quantity: number;
  revenue: string;
  delivered_orders: number;
  delivered_revenue: string;
};

type Props = {
  channelRows: ChannelRevenueRow[];
  topProducts: TopProductRow[];
  dailyRows: DailyBreakdownRow[];
};

/** Số lát tối đa của donut — phần đuôi gộp thành lát "Khác" cho dễ đọc. */
const MAX_DONUT_SLICES = 8;

export function RevenueByChannelChart({ channelRows, topProducts, dailyRows }: Props) {
  const { t } = useI18n();
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());

  const donutSlices = useMemo(() => {
    const rows = buildChannelRevenueChartData(channelRows, dailyRows);
    return buildDonutSlices(
      rows.map((row) => ({ name: row.name, value: row.revenue })),
      MAX_DONUT_SLICES,
      t("adsReport.otherSlice", "Khác"),
    ).map((slice, idx) => ({
      ...slice,
      color: ENTITY_PALETTE[idx % ENTITY_PALETTE.length],
    }));
  }, [channelRows, dailyRows, t]);

  const productsByChannel = useMemo(() => {
    const map = new Map<string, ChannelProductRow[]>();
    for (const product of topProducts) {
      for (const channel of product.channels) {
        if (channel.channel_id == null) continue;
        const key = String(channel.channel_id);
        const list = map.get(key) ?? [];
        list.push({
          product_id: product.product_id,
          product__sku: product.product__sku,
          closed_orders: channel.closed_orders,
          quantity: channel.quantity ?? 0,
          revenue: channel.revenue,
          delivered_orders: channel.delivered_orders ?? 0,
          delivered_revenue: channel.delivered_revenue ?? "0",
        });
        map.set(key, list);
      }
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          b.closed_orders - a.closed_orders ||
          (a.product__sku || "").localeCompare(b.product__sku || ""),
      );
    }
    return map;
  }, [topProducts]);

  // SL bán theo kênh = tổng quantity các dòng SP của kênh (top_products trả đủ
  // mọi SP nên tổng này là tổng thật của kênh, không phải top-N).
  const quantityByChannel = useMemo(() => {
    const map = new Map<string, number>();
    for (const [key, list] of productsByChannel) {
      map.set(
        key,
        list.reduce((sum, product) => sum + product.quantity, 0),
      );
    }
    return map;
  }, [productsByChannel]);

  const totalChannelRevenue = useMemo(
    () => channelRows.reduce((sum, row) => sum + Number(row.revenue || 0), 0),
    [channelRows],
  );
  const totalChannelClosed = useMemo(
    () => channelRows.reduce((sum, row) => sum + (row.closed_orders || 0), 0),
    [channelRows],
  );
  const totalChannelQuantity = useMemo(
    () =>
      channelRows.reduce(
        (sum, row) =>
          sum + (row.channel_id != null ? (quantityByChannel.get(String(row.channel_id)) ?? 0) : 0),
        0,
      ),
    [channelRows, quantityByChannel],
  );
  const totalChannelDelivered = useMemo(
    () => channelRows.reduce((sum, row) => sum + (row.delivered_orders || 0), 0),
    [channelRows],
  );
  const totalChannelDeliveredRevenue = useMemo(
    () => channelRows.reduce((sum, row) => sum + Number(row.delivered_revenue || 0), 0),
    [channelRows],
  );

  // Chi phí theo kênh cả kỳ, cộng dồn từ daily_breakdown (revenue_by_channel
  // không có cost). channelRows đã gồm mọi kênh trong scope (backend zero-fill
  // cả kênh 0 đơn chốt) nên tổng chi phí khớp khối diễn biến ngày.
  const costByChannel = useMemo(() => sumCostByChannel(dailyRows), [dailyRows]);
  const totalChannelCost = useMemo(
    () =>
      channelRows.reduce(
        (sum, row) => sum + (row.channel_id != null ? (costByChannel.get(row.channel_id) ?? 0) : 0),
        0,
      ),
    [channelRows, costByChannel],
  );

  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t("adsReport.revenueByChannelTitle", "Đơn đã chốt & doanh thu theo kênh")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {channelRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("adsReport.empty", "Chưa có dữ liệu.")}
          </p>
        ) : (
          <>
            <DonutChart
              slices={donutSlices}
              centerValue={formatCurrency(totalChannelRevenue)}
              centerLabel={t("adsReport.kpi.revenue", "Tổng doanh thu")}
              formatValue={(value) => formatCurrency(value)}
            />

            <CollapsibleTable label={t("dashboard.showDetailTable", "Xem bảng chi tiết")}>
              <table data-slot="table" className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">
                      {t("adsReport.channelHeader", "Kênh")}
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      {t("adsReport.closedOrdersHeader", "Đơn đã chốt")}
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      {t("adsReport.quantityHeader", "Số lượng")}
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      {t("adsReport.deliveredOrdersHeader", "Đơn giao thành công")}
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      {t("adsReport.revenueHeader", "Doanh thu")}
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      {t("adsReport.costHeader", "Chi phí")}
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      {t("adsReport.ratioHeader", "% chi phí / doanh thu")}
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      {t("adsReport.deliveredRevenueHeader", "Doanh thu giao thành công")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {channelRows.map((row) => {
                    const rowKey = String(
                      row.channel_id ?? `${row.channel__code}-${row.channel__name}`,
                    );
                    const channelProducts =
                      row.channel_id != null
                        ? (productsByChannel.get(String(row.channel_id)) ?? [])
                        : [];
                    const isExpanded = expandedChannels.has(rowKey);
                    const cost =
                      row.channel_id != null ? (costByChannel.get(row.channel_id) ?? 0) : 0;
                    const revenueNum = Number(row.revenue || 0);
                    const ratioPct = revenueNum > 0 ? (cost / revenueNum) * 100 : null;
                    return (
                      <Fragment key={rowKey}>
                        <tr
                          className="cursor-pointer border-b border-border/60 last:border-b-0 hover:bg-muted/40"
                          onClick={() =>
                            setExpandedChannels((prev) => {
                              const next = new Set(prev);
                              if (next.has(rowKey)) next.delete(rowKey);
                              else next.add(rowKey);
                              return next;
                            })
                          }
                        >
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span
                                aria-hidden
                                className="inline-block text-xs text-muted-foreground"
                              >
                                {isExpanded ? "▾" : "▸"}
                              </span>
                              <div>
                                <div className="font-medium text-foreground">
                                  {row.channel__name || row.channel__code || "—"}
                                </div>
                                {row.channel__code && (
                                  <div className="text-xs text-muted-foreground">
                                    {row.channel__code}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center tabular-nums">
                            {row.closed_orders}
                          </td>
                          <td className="px-3 py-2 text-center tabular-nums">
                            {quantityByChannel.get(rowKey) ?? 0}
                          </td>
                          <td className="px-3 py-2 text-center tabular-nums">
                            {row.delivered_orders}
                          </td>
                          <td className="px-3 py-2 text-center tabular-nums">
                            {formatCurrency(row.revenue)}
                          </td>
                          <td className="px-3 py-2 text-center tabular-nums">
                            {formatCurrency(cost)}
                          </td>
                          <td className="px-3 py-2 text-center tabular-nums">
                            {formatRatioPct(ratioPct)}
                          </td>
                          <td className="px-3 py-2 text-center tabular-nums">
                            {formatCurrency(row.delivered_revenue)}
                          </td>
                        </tr>
                        {isExpanded &&
                          (channelProducts.length === 0 ? (
                            <tr className="border-b border-border/60 bg-muted/20 last:border-b-0">
                              <td
                                className="px-3 py-2 pl-9 text-xs text-muted-foreground"
                                colSpan={8}
                              >
                                {t("adsReport.empty", "Chưa có dữ liệu.")}
                              </td>
                            </tr>
                          ) : (
                            channelProducts.map((product, productIdx) => (
                              <tr
                                key={`${rowKey}-${
                                  product.product_id ?? `${product.product__sku}-${productIdx}`
                                }`}
                                className="border-b border-border/40 bg-muted/20 last:border-b-0"
                              >
                                <td className="px-3 py-1.5 pl-9 text-xs font-medium text-foreground">
                                  {product.product__sku || "—"}
                                </td>
                                <td className="px-3 py-1.5 text-center tabular-nums text-xs">
                                  {product.closed_orders}
                                </td>
                                <td className="px-3 py-1.5 text-center tabular-nums text-xs">
                                  {product.quantity}
                                </td>
                                <td className="px-3 py-1.5 text-center tabular-nums text-xs">
                                  {product.delivered_orders}
                                </td>
                                <td className="px-3 py-1.5 text-center tabular-nums text-xs">
                                  {formatCurrency(product.revenue)}
                                </td>
                                <td className="px-3 py-1.5 text-center tabular-nums text-xs">—</td>
                                <td className="px-3 py-1.5 text-center tabular-nums text-xs">—</td>
                                <td className="px-3 py-1.5 text-center tabular-nums text-xs">
                                  {formatCurrency(product.delivered_revenue)}
                                </td>
                              </tr>
                            ))
                          ))}
                      </Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border font-semibold">
                    <td className="px-3 py-2">{t("adsReport.totalRow", "Tổng")}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{totalChannelClosed}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{totalChannelQuantity}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{totalChannelDelivered}</td>
                    <td className="px-3 py-2 text-center tabular-nums">
                      {formatCurrency(totalChannelRevenue)}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums">
                      {formatCurrency(totalChannelCost)}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums">
                      {formatRatioPct(
                        totalChannelRevenue > 0
                          ? (totalChannelCost / totalChannelRevenue) * 100
                          : null,
                      )}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums">
                      {formatCurrency(totalChannelDeliveredRevenue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CollapsibleTable>
          </>
        )}
      </CardContent>
    </Card>
  );
}
