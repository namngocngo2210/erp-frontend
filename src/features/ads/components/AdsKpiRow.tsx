import { useI18n } from "@/i18n";
import { formatAdsCurrency, formatRatioPct } from "../report-grouping";
import type { AdsKpis } from "../ads-report-selectors";

type Tile = { label: string; value: string; tone?: "default" | "danger" };

export function AdsKpiRow({ kpis }: { kpis: AdsKpis }) {
  const { t } = useI18n();
  const tiles: Tile[] = [
    {
      label: t("adsReport.kpi.revenue", "Tổng doanh thu"),
      value: formatAdsCurrency(kpis.totalRevenue),
    },
    { label: t("adsReport.kpi.cost", "Tổng chi phí"), value: formatAdsCurrency(kpis.totalCost) },
    {
      label: t("adsReport.kpi.ratio", "% chi phí / doanh thu"),
      value: formatRatioPct(kpis.ratioPct),
      tone: "danger",
    },
    { label: t("adsReport.kpi.closed", "Đơn đã chốt"), value: String(kpis.closedOrders) },
    {
      label: t("adsReport.kpi.delivered", "Đơn giao thành công"),
      value: String(kpis.deliveredOrders),
    },
    {
      label: t("adsReport.kpi.deliveredRevenue", "Doanh thu giao thành công"),
      value: formatAdsCurrency(kpis.deliveredRevenue),
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-xl border border-border bg-card p-4">
          <div
            className={`text-xl font-semibold tabular-nums ${
              tile.tone === "danger" ? "text-action-danger" : "text-foreground"
            }`}
          >
            {tile.value}
          </div>
          <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
            {tile.label}
          </div>
        </div>
      ))}
    </div>
  );
}
