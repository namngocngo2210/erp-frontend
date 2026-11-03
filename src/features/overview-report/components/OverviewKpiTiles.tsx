import { useI18n } from "@/i18n";
import { formatCurrency } from "@/lib/format";
import type { OverviewKpis } from "../overview-selectors";

function money(value: number): string {
  return formatCurrency(value, { fallback: "0", onInvalid: "fallback", maximumFractionDigits: 0 });
}

function pct(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`;
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
 * Hàng KPI của trang: 8 ô chia HAI dòng, mỗi dòng 4 ô (user chốt 2026-08-22).
 *
 * - Dòng 1 — tiền vào: Tổng doanh thu · Doanh thu thuần · Giao thành công · Chờ
 *   giao.
 * - Dòng 2 — tiền mất và tiền chi: Hoàn · Rủi ro hoàn · Chi phí Facebook Ads ·
 *   Chi phí Google Ads. Đúng 4 ô mang `tone="danger"`, nên ranh giới hai dòng
 *   trùng luôn ranh giới màu — thêm ô đỏ mới thì xếp xuống dòng 2.
 *
 * Quan hệ số học KHÔNG nhìn thấy được từ layout, phải nhớ:
 *
 * - Giao thành công + Chờ giao + Hoàn + Rủi ro hoàn = Tổng doanh thu (cả tiền
 *   lẫn số đơn). Bốn số % thì KHÔNG cộng thành 100%: hai ô hoàn chia cho
 *   `settledRevenue` (doanh thu đã có kết quả giao), các ô còn lại chia cho tổng.
 * - Doanh thu thuần = Tổng − Hoàn, KHÔNG trừ Rủi ro hoàn (hàng chưa về kho nên
 *   KiotViet chưa lập phiếu trả). Đây cũng là cơ sở của 2 khối địa lý bên dưới,
 *   trong khi 3 khối theo kênh bán dùng cơ sở tổng.
 * - Hai ô chi phí Ads đứng NGOÀI phép cộng, lấy tổng doanh thu làm mẫu số; BE
 *   trả 0 cho cả hai khi không lọc ngoại sàn nên chúng vẫn giữ chỗ trong lưới
 *   thay vì biến mất (đổi filter không làm hàng KPI nhảy cột).
 *
 * Trang TỪNG có 2 dòng chú thích ngay dưới các ô giải thích hai điều đầu và lý
 * do số "thuần" vẫn cao hơn KiotViet; user cho bỏ 2026-08-22 để màn gọn. Phần
 * giải thích giữ nguyên trong `docs/overview-report.md` — hỏi lại thì tra ở đó.
 */
export function OverviewKpiTiles({ kpis }: { kpis: OverviewKpis }) {
  const { t } = useI18n();
  const ordersUnit = t("overviewReport.kpi.ordersUnit", "đơn");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label={t("overviewReport.kpi.totalRevenue", "Tổng doanh thu")}
          value={money(kpis.totalRevenue)}
          sub={`${kpis.totalOrders} ${ordersUnit}`}
        />
        <Tile
          label={t("overviewReport.kpi.netRevenue", "Doanh thu thuần")}
          value={money(kpis.netRevenue)}
          sub={`${pct(kpis.netPct)} · ${kpis.netOrders} ${ordersUnit}`}
        />
        <Tile
          label={t("overviewReport.kpi.deliveredRevenue", "Doanh thu giao thành công")}
          value={money(kpis.deliveredRevenue)}
          sub={`${pct(kpis.deliveredPct)} · ${kpis.deliveredOrders} ${ordersUnit}`}
        />
        <Tile
          label={t("overviewReport.kpi.awaitingRevenue", "Doanh thu chờ giao")}
          value={money(kpis.awaitingRevenue)}
          sub={`${pct(kpis.awaitingPct)} · ${kpis.awaitingOrders} ${ordersUnit}`}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label={t("overviewReport.kpi.returned", "Hoàn")}
          value={money(kpis.returnedRevenue)}
          sub={`${pct(kpis.returnedPct)} · ${kpis.returnedOrders} ${ordersUnit}`}
          tone="danger"
        />
        <Tile
          label={t("overviewReport.kpi.returnRisk", "Rủi ro hoàn")}
          value={money(kpis.returnRiskRevenue)}
          sub={`${pct(kpis.returnRiskPct)} · ${kpis.returnRiskOrders} ${ordersUnit}`}
          tone="danger"
        />
        <Tile
          label={t("overviewReport.kpi.adsCostFacebook", "Chi phí Facebook Ads")}
          value={money(kpis.adsCostFacebook)}
          sub={pct(kpis.adsCostFacebookPct)}
          tone="danger"
        />
        <Tile
          label={t("overviewReport.kpi.adsCostGoogle", "Chi phí Google Ads")}
          value={money(kpis.adsCostGoogle)}
          sub={pct(kpis.adsCostGooglePct)}
          tone="danger"
        />
      </div>
    </div>
  );
}
