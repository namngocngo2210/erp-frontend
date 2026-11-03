import type { FoxiaReportRow } from "@/lib/api/foxia-report";

import { formatCount, formatMoney, formatPct, formatRoas, sortRows } from "../foxia-selectors";

const HEAD_CLASS = "px-3 py-2 text-right text-xs font-medium text-muted-foreground";
const CELL_CLASS = "px-3 py-2 text-right tabular-nums";

export function FoxiaReportTable({
  rows,
  totals,
  showSpend,
  groupLabel,
}: {
  rows: FoxiaReportRow[];
  totals: FoxiaReportRow;
  showSpend: boolean;
  groupLabel: string;
}) {
  const ordered = sortRows(rows);

  return (
    // Bảng rộng phải tự cuộn TRONG khung của nó — thân trang không được cuộn ngang.
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="border-b border-border bg-muted/40">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
              {groupLabel}
            </th>
            <th className={HEAD_CLASS}>Đơn chốt</th>
            <th className={HEAD_CLASS}>Giao TC</th>
            <th className={HEAD_CLASS}>Tỉ lệ giao</th>
            <th className={HEAD_CLASS}>Hoàn</th>
            <th className={HEAD_CLASS}>Doanh thu</th>
            <th className={HEAD_CLASS}>Đã thu</th>
            <th className={HEAD_CLASS}>Phí ship</th>
            {showSpend ? (
              <>
                <th className={HEAD_CLASS}>Chi phí ads</th>
                <th className={HEAD_CLASS}>CPO</th>
                <th className={HEAD_CLASS}>CPS</th>
                <th className={HEAD_CLASS}>ROAS</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {ordered.map((row) => (
            <tr key={row.key} className="border-b border-border/60 last:border-0">
              <td className="px-3 py-2 text-left">
                <span className={row.mapped ? "" : "text-muted-foreground italic"}>
                  {row.label}
                </span>
                {row.mapped ? null : (
                  <span className="ml-2 rounded bg-action-warning/10 px-1.5 py-0.5 text-xs text-action-warning">
                    chưa gán kênh
                  </span>
                )}
              </td>
              <td className={CELL_CLASS}>{formatCount(row.orders)}</td>
              <td className={CELL_CLASS}>{formatCount(row.delivered)}</td>
              <td className={CELL_CLASS}>{formatPct(row.delivery_rate)}</td>
              <td className={CELL_CLASS}>{formatCount(row.returned)}</td>
              <td className={CELL_CLASS}>{formatMoney(row.revenue)}</td>
              <td className={CELL_CLASS}>{formatMoney(row.collected)}</td>
              <td className={CELL_CLASS}>{formatMoney(row.ship_fee)}</td>
              {showSpend ? (
                <>
                  <td className={CELL_CLASS}>{formatMoney(row.spend)}</td>
                  <td className={CELL_CLASS}>{formatMoney(row.cpo)}</td>
                  <td className={CELL_CLASS}>{formatMoney(row.cps)}</td>
                  <td className={CELL_CLASS}>{formatRoas(row.roas)}</td>
                </>
              ) : null}
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-border bg-muted/30 font-medium">
          <tr>
            <td className="px-3 py-2 text-left">Tổng</td>
            <td className={CELL_CLASS}>{formatCount(totals.orders)}</td>
            <td className={CELL_CLASS}>{formatCount(totals.delivered)}</td>
            <td className={CELL_CLASS}>{formatPct(totals.delivery_rate)}</td>
            <td className={CELL_CLASS}>{formatCount(totals.returned)}</td>
            <td className={CELL_CLASS}>{formatMoney(totals.revenue)}</td>
            <td className={CELL_CLASS}>{formatMoney(totals.collected)}</td>
            <td className={CELL_CLASS}>{formatMoney(totals.ship_fee)}</td>
            {showSpend ? (
              <>
                <td className={CELL_CLASS}>{formatMoney(totals.spend)}</td>
                <td className={CELL_CLASS}>{formatMoney(totals.cpo)}</td>
                <td className={CELL_CLASS}>{formatMoney(totals.cps)}</td>
                <td className={CELL_CLASS}>{formatRoas(totals.roas)}</td>
              </>
            ) : null}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
