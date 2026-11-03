import type { FoxiaReportRow } from "@/lib/api/foxia-report";

import { formatCount, formatMoney, formatPct, formatRoas } from "../foxia-selectors";

type Tile = { label: string; value: string; hint?: string };

/**
 * Hàng KPI của báo cáo Foxia.
 *
 * `showSpend=false` khi lát cắt không quy được chi phí (theo nhân viên/chi
 * nhánh/thương hiệu): ẩn hẳn ô chi phí thay vì hiện 0 — 0 đọc như "không tốn
 * đồng nào", còn sự thật là "không quy được".
 */
export function FoxiaKpiRow({ totals, showSpend }: { totals: FoxiaReportRow; showSpend: boolean }) {
  const tiles: Tile[] = [
    { label: "Đơn chốt", value: formatCount(totals.orders) },
    { label: "Đơn giao thành công", value: formatCount(totals.delivered) },
    { label: "Tỉ lệ giao TC", value: formatPct(totals.delivery_rate) },
    { label: "Doanh thu", value: formatMoney(totals.revenue) },
    {
      label: "Đã thu",
      value: formatMoney(totals.collected),
      hint: "Tại thời điểm đồng bộ, chưa trừ khấu trừ và tiền hoàn",
    },
  ];
  if (showSpend) {
    tiles.push(
      { label: "Chi phí ads", value: formatMoney(totals.spend) },
      { label: "CPO", value: formatMoney(totals.cpo) },
      { label: "ROAS", value: formatRoas(totals.roas) },
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-xl border border-border bg-card p-4">
          <div className="text-xl font-semibold tabular-nums text-foreground">{tile.value}</div>
          <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
            {tile.label}
          </div>
          {tile.hint ? (
            <div className="mt-1 text-xs leading-tight text-muted-foreground/80">{tile.hint}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
