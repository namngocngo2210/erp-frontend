import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent, percentValue, safePercent } from "@/lib/metrics";

import { PERCENT_AXIS_DOMAIN, RETURN_RATE_WARNING_THRESHOLD } from "../../dashboard-constants";
import { VerticalRateBar } from "../DashboardCharts";
import { CollapsibleTable, KpiHero } from "../DashboardPrimitives";
import { EmptyCard, type Derived, type Translate } from "./section-shared";
import { formatNumber } from "@/lib/format";

export function ReturnByProductSection({
  t,
  returnByProductRows,
  deliveryStaffTotals,
}: {
  t: Translate;
  returnByProductRows: Derived["returnByProductRows"];
  deliveryStaffTotals: Derived["deliveryStaffTotals"];
}) {
  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t("dashboard.returnByProductTitle", "Nhóm 7 — Tỷ lệ hoàn theo sản phẩm")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t(
            "dashboard.returnByProductHint",
            "% hoàn = Đơn hoàn / Đơn đã gửi, gom theo sản phẩm. Đơn hoàn gồm cả đơn đang trên đường hoàn: Đang chuyển hoàn, Chờ chuyển hoàn lại, Chờ xác nhận hoàn và Đã chuyển hoàn. Chỉ tính các đơn có dòng sản phẩm khớp danh mục (đơn SKU lạ không vào báo cáo này).",
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {returnByProductRows.length === 0 ? (
          <EmptyCard t={t} />
        ) : (
          <>
            {(() => {
              const returnRatePct = safePercent(
                deliveryStaffTotals.returned,
                deliveryStaffTotals.sent,
              );
              return (
                <KpiHero
                  bigValue={`${returnRatePct.toFixed(1)}%`}
                  bigLabel={t("dashboard.returnRateColumn", "% hoàn")}
                  bigTone={returnRatePct <= RETURN_RATE_WARNING_THRESHOLD ? "success" : "danger"}
                  breakdown={[
                    {
                      label: t("dashboard.sentColumn", "Đơn gửi"),
                      value: formatNumber(deliveryStaffTotals.sent),
                    },
                    {
                      label: t("dashboard.returnedColumn", "Đơn hoàn"),
                      value: formatNumber(deliveryStaffTotals.returned),
                      tone: "danger",
                    },
                  ]}
                />
              );
            })()}
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="mb-2 text-sm font-semibold text-foreground">
                {t("dashboard.returnByProductChartTitle", "% hoàn theo sản phẩm")}
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                {t(
                  "dashboard.returnByProductChartHint",
                  `Cảnh báo đỏ khi vượt ${RETURN_RATE_WARNING_THRESHOLD}%.`,
                )}
              </p>
              <VerticalRateBar
                data={returnByProductRows.map((row) => ({
                  name: row.items__product__sku || t("dashboard.unknownProduct", "Không xác định"),
                  value: safePercent(row.returned, row.sent),
                }))}
                warningThreshold={RETURN_RATE_WARNING_THRESHOLD}
                domain={PERCENT_AXIS_DOMAIN}
              />
            </div>
            <CollapsibleTable label={t("dashboard.showDetailTable", "Xem bảng chi tiết")}>
              <table data-slot="table" className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">
                      {t("dashboard.productColumn", "Sản phẩm")}
                    </th>
                    <th className="py-2 pr-4 text-right font-medium">
                      {t("dashboard.sentColumn", "Đơn gửi")}
                    </th>
                    <th className="py-2 pr-4 text-right font-medium">
                      {t("dashboard.returnedColumn", "Đơn hoàn")}
                    </th>
                    <th className="py-2 text-right font-medium">
                      {t("dashboard.returnRateColumn", "% hoàn")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {returnByProductRows.map((row) => {
                    const ratePct = percentValue(row.returned, row.sent);
                    const isWarning = ratePct !== null && ratePct > RETURN_RATE_WARNING_THRESHOLD;
                    const productLabel =
                      row.items__product__sku || t("dashboard.unknownProduct", "Không xác định");
                    return (
                      <tr
                        key={String(row.items__product ?? "unknown")}
                        className="border-b border-border/60 transition-colors hover:bg-muted/50"
                      >
                        <td className="py-2 pr-4 text-foreground">
                          <div className="font-medium text-foreground">{productLabel}</div>
                        </td>
                        <td className="py-2 pr-4 text-right text-foreground">{row.sent}</td>
                        <td className="py-2 pr-4 text-right text-foreground">{row.returned}</td>
                        <td
                          className={`py-2 text-right font-semibold ${
                            isWarning ? "text-destructive" : "text-foreground"
                          }`}
                        >
                          {formatPercent(row.returned, row.sent)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CollapsibleTable>
          </>
        )}
      </CardContent>
    </Card>
  );
}
