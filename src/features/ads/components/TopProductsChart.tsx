import { Fragment, useEffect, useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TablePagination } from "@/components/ui/table-pagination";
import { CollapsibleTable } from "@/components/report/CollapsibleTable";
import { DonutChart } from "@/components/report/DonutChart";
import { ENTITY_PALETTE } from "@/features/dashboard/dashboard-constants";
import { useI18n } from "@/i18n";
import {
  type TopProductRow,
  buildDonutSlices,
  buildTopProductsChartData,
} from "../ads-report-selectors";
import { PAGE_SIZE_OPTIONS_STANDARD } from "@/lib/constants/pagination";
import { formatAdsCurrency as formatCurrency } from "../report-grouping";

/** Số SKU đưa vào donut trước khi gộp đuôi — đủ để thấy tỉ trọng, không vụn lát. */
const TOP_PRODUCTS_CHART_LIMIT = 15;
const MAX_DONUT_SLICES = 8;
const TOP_PRODUCTS_DEFAULT_PAGE_SIZE = 20;

export function TopProductsChart({ topProducts }: { topProducts: TopProductRow[] }) {
  const { t } = useI18n();
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [topProductsPage, setTopProductsPage] = useState(1);
  const [topProductsPageSize, setTopProductsPageSize] = useState<number>(
    TOP_PRODUCTS_DEFAULT_PAGE_SIZE,
  );

  const donutSlices = useMemo(() => {
    const rows = buildTopProductsChartData(topProducts, TOP_PRODUCTS_CHART_LIMIT);
    return buildDonutSlices(
      rows.map((row) => ({ name: row.name, value: row.revenue })),
      MAX_DONUT_SLICES,
      t("adsReport.otherSlice", "Khác"),
    ).map((slice, idx) => ({
      ...slice,
      color: ENTITY_PALETTE[idx % ENTITY_PALETTE.length],
    }));
  }, [topProducts, t]);

  const donutTotal = useMemo(
    () => donutSlices.reduce((sum, slice) => sum + slice.value, 0),
    [donutSlices],
  );

  const topProductsTotalPages = Math.max(1, Math.ceil(topProducts.length / topProductsPageSize));
  useEffect(() => {
    if (topProductsPage > topProductsTotalPages) {
      setTopProductsPage(topProductsTotalPages);
    }
  }, [topProductsPage, topProductsTotalPages]);
  const topProductsPageStart = (topProductsPage - 1) * topProductsPageSize;
  const pagedTopProducts = useMemo(
    () => topProducts.slice(topProductsPageStart, topProductsPageStart + topProductsPageSize),
    [topProducts, topProductsPageStart, topProductsPageSize],
  );

  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t("adsReport.topProductsTitle", "Sản phẩm bán chạy")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("adsReport.empty", "Chưa có dữ liệu.")}
          </p>
        ) : (
          <>
            <DonutChart
              slices={donutSlices}
              centerValue={formatCurrency(donutTotal)}
              centerLabel={t("adsReport.topProductsDonutCenter", "Doanh thu top SKU")}
              formatValue={(value) => formatCurrency(value)}
            />

            <CollapsibleTable label={t("dashboard.showDetailTable", "Xem bảng chi tiết")}>
              <table data-slot="table" className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium w-12">#</th>
                    <th className="px-3 py-2 font-medium">{t("adsReport.skuHeader", "SKU")}</th>
                    <th className="px-3 py-2 text-center font-medium">
                      {t("adsReport.closedOrdersHeader", "Đơn đã chốt")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedTopProducts.map((row, index) => {
                    const absoluteIndex = topProductsPageStart + index;
                    const rowKey = String(row.product_id ?? `${row.product__sku}-${absoluteIndex}`);
                    const isExpanded = expandedProducts.has(rowKey);
                    return (
                      <Fragment key={rowKey}>
                        <tr
                          className="cursor-pointer border-b border-border/60 last:border-b-0 hover:bg-muted/40"
                          onClick={() =>
                            setExpandedProducts((prev) => {
                              const next = new Set(prev);
                              if (next.has(rowKey)) next.delete(rowKey);
                              else next.add(rowKey);
                              return next;
                            })
                          }
                        >
                          <td className="px-3 py-2 text-muted-foreground">{absoluteIndex + 1}</td>
                          <td className="px-3 py-2 font-medium text-foreground">
                            {row.product__sku || "—"}
                          </td>
                          <td className="px-3 py-2 text-center tabular-nums">
                            {row.closed_orders}
                          </td>
                        </tr>
                        {isExpanded &&
                          (row.channels.length === 0 ? (
                            <tr className="border-b border-border/60 bg-muted/20 last:border-b-0">
                              <td
                                className="px-3 py-2 pl-9 text-xs text-muted-foreground"
                                colSpan={3}
                              >
                                {t("adsReport.empty", "Chưa có dữ liệu.")}
                              </td>
                            </tr>
                          ) : (
                            row.channels.map((channel, channelIdx) => (
                              <tr
                                key={`${rowKey}-${
                                  channel.channel_id ?? `${channel.channel__code}-${channelIdx}`
                                }`}
                                className="border-b border-border/40 bg-muted/20 last:border-b-0"
                              >
                                <td className="px-3 py-1.5"></td>
                                <td className="px-3 py-1.5 pl-6 text-xs font-medium text-foreground">
                                  {channel.channel__name || channel.channel__code || "—"}
                                </td>
                                <td className="px-3 py-1.5 text-center tabular-nums text-xs">
                                  {channel.closed_orders}
                                </td>
                              </tr>
                            ))
                          ))}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              <TablePagination
                className="mt-3 justify-end"
                summary={null}
                total={topProducts.length}
                page={topProductsPage}
                pageSize={topProductsPageSize}
                totalPages={topProductsTotalPages}
                pageSizeOptions={PAGE_SIZE_OPTIONS_STANDARD}
                pageSizeLabel={t("adsReport.pagination.pageSize", "Mỗi trang")}
                onPageSizeChange={(size) => {
                  setTopProductsPageSize(size);
                  setTopProductsPage(1);
                }}
                onPageChange={setTopProductsPage}
              />
            </CollapsibleTable>
          </>
        )}
      </CardContent>
    </Card>
  );
}
