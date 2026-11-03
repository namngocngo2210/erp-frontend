import { useI18n } from "@/i18n";
import { formatCurrency } from "@/lib/format";

import { type ResaleBuckets } from "../resale-selectors";

function money(value: number): string {
  return formatCurrency(value, { fallback: "0", onInvalid: "fallback", maximumFractionDigits: 0 });
}

function Tile({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "danger";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center">
      <div
        className={`text-xl font-semibold tabular-nums ${
          tone === "danger" ? "text-action-danger" : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      {sub ? <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

/**
 * Hàng KPI của tab Resale — bám khuôn `OverviewKpiTiles` của Báo cáo tổng.
 *
 * Quan hệ số học KHÔNG nhìn thấy được từ layout, phải nhớ: Giao thành công +
 * Chờ giao + Hoàn + Rủi ro hoàn = Tổng doanh thu, đúng cả tiền lẫn số đơn.
 * Hai ô cuối mang `tone="danger"` vì đó là tiền đang mất hoặc sắp mất.
 */
export function ResaleKpiTiles({ kpis }: { kpis: ResaleBuckets }) {
  const { t } = useI18n();
  const unit = t("saleReport.ordersUnit", "đơn");
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Tile
        label={t("saleReport.kpi.totalRevenue", "Tổng doanh thu")}
        value={money(kpis.totalRevenue)}
        sub={`${kpis.totalOrders} ${unit}`}
      />
      <Tile
        label={t("saleReport.kpi.delivered", "Giao thành công")}
        value={money(kpis.deliveredRevenue)}
        sub={`${kpis.deliveredOrders} ${unit}`}
      />
      <Tile
        label={t("saleReport.kpi.awaiting", "Chờ giao")}
        value={money(kpis.awaitingRevenue)}
        sub={`${kpis.awaitingOrders} ${unit}`}
      />
      <Tile
        label={t("saleReport.kpi.returned", "Hoàn")}
        value={money(kpis.returnedRevenue)}
        sub={`${kpis.returnedOrders} ${unit}`}
        tone="danger"
      />
      <Tile
        label={t("saleReport.kpi.returnRisk", "Rủi ro hoàn")}
        value={money(kpis.returnRiskRevenue)}
        sub={`${kpis.returnRiskOrders} ${unit}`}
        tone="danger"
      />
    </div>
  );
}
