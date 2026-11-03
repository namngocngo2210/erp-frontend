import { Fragment, useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n";
import {
  type DailyBreakdownRow,
  computeDailyTotals,
  formatAdsCurrency,
  formatMonthLabel,
  formatRatioPct,
  groupDailyRowsByMonth,
  prepareDailyRowsForTable,
} from "../report-grouping";

type DailyBreakdownTableProps = {
  rows: DailyBreakdownRow[];
  /** Khoảng lọc dài (> ~2 tháng): gộp dòng theo tháng, click tháng xổ ra ngày. */
  groupByMonth: boolean;
  /** Bỏ Card/tiêu đề bao ngoài — dùng khi nhúng vào khối "Xem bảng chi tiết" của chart. */
  bare?: boolean;
};

function toggleKey(prev: Set<string>, key: string): Set<string> {
  const next = new Set(prev);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

/** Breakdown theo kênh của 1 ngày — dùng ở cả 2 chế độ với mức thụt khác nhau. */
function ChannelSubRows({ row, indent }: { row: DailyBreakdownRow; indent: "pl-9" | "pl-14" }) {
  const { t } = useI18n();
  const bg = indent === "pl-9" ? "bg-muted/20" : "bg-muted/30";
  if (row.channels.length === 0) {
    return (
      <tr className={`border-b border-border/60 ${bg} last:border-b-0`}>
        <td className={`px-3 py-2 ${indent} text-xs text-muted-foreground`} colSpan={4}>
          {t("adsReport.empty", "Chưa có dữ liệu.")}
        </td>
      </tr>
    );
  }
  return (
    <>
      {row.channels.map((channel, channelIdx) => (
        <tr
          key={`${row.date}-${channel.channel_id ?? `${channel.channel__code}-${channelIdx}`}`}
          className={`border-b border-border/40 ${bg} last:border-b-0`}
        >
          <td className={`px-3 py-1.5 ${indent} text-xs font-medium text-foreground`}>
            {channel.channel__name || channel.channel__code || "—"}
          </td>
          <td className="px-3 py-1.5 text-center tabular-nums text-xs">
            {formatAdsCurrency(channel.revenue)}
          </td>
          <td className="px-3 py-1.5 text-center tabular-nums text-xs">
            {formatAdsCurrency(channel.cost)}
          </td>
          <td className="px-3 py-1.5 text-center tabular-nums text-xs">
            {formatRatioPct(channel.ratio_pct)}
          </td>
        </tr>
      ))}
    </>
  );
}

/**
 * Bảng "Doanh thu / chi phí theo ngày" của Báo cáo ads.
 * - Chế độ theo ngày: mỗi dòng 1 ngày, click xổ breakdown theo kênh (như cũ).
 * - Chế độ gộp tháng: tháng → ngày → kênh (3 cấp).
 */
export function DailyBreakdownTable({
  rows,
  groupByMonth,
  bare = false,
}: DailyBreakdownTableProps) {
  const { t } = useI18n();
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Bảng chỉ liệt kê ngày CÓ phát sinh, gần nhất lên đầu; `rows` gốc giữ chiều
  // tăng dần cho chart nhúng cùng card.
  const tableRows = useMemo(() => prepareDailyRowsForTable(rows), [rows]);
  const monthRows = useMemo(
    () => (groupByMonth ? groupDailyRowsByMonth(tableRows) : []),
    [groupByMonth, tableRows],
  );
  const totals = useMemo(() => computeDailyTotals(tableRows), [tableRows]);

  const body =
    tableRows.length === 0 ? (
      <p className="text-sm text-muted-foreground">{t("adsReport.empty", "Chưa có dữ liệu.")}</p>
    ) : (
      <div className="overflow-x-auto">
        <table data-slot="table" className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">
                {groupByMonth
                  ? t("adsReport.monthHeader", "Tháng")
                  : t("adsReport.dateHeader", "Ngày")}
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
            </tr>
          </thead>
          <tbody>
            <tr className="border-b-2 border-border bg-muted/40 font-semibold">
              <td className="px-3 py-2">{t("adsReport.totalRow", "Tổng")}</td>
              <td className="px-3 py-2 text-center tabular-nums">
                {formatAdsCurrency(totals.totalRevenue)}
              </td>
              <td className="px-3 py-2 text-center tabular-nums">
                {formatAdsCurrency(totals.totalCost)}
              </td>
              <td className="px-3 py-2 text-center tabular-nums">
                {formatRatioPct(totals.totalRatioPct)}
              </td>
            </tr>
            {groupByMonth
              ? monthRows.map((month) => {
                  const isExpanded = expandedMonths.has(month.month);
                  return (
                    <Fragment key={month.month}>
                      <tr
                        className="cursor-pointer border-b border-border/60 last:border-b-0 hover:bg-muted/40"
                        onClick={() => setExpandedMonths((prev) => toggleKey(prev, month.month))}
                      >
                        <td className="px-3 py-2 font-medium text-foreground">
                          <span className="flex items-center gap-2">
                            <span
                              aria-hidden
                              className="inline-block text-xs text-muted-foreground"
                            >
                              {isExpanded ? "▾" : "▸"}
                            </span>
                            {formatMonthLabel(month.month)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          {formatAdsCurrency(month.revenue)}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          {formatAdsCurrency(month.cost)}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          {formatRatioPct(month.ratio_pct)}
                        </td>
                      </tr>
                      {isExpanded &&
                        month.days.map((row) => {
                          const isDayExpanded = expandedDates.has(row.date);
                          return (
                            <Fragment key={row.date}>
                              <tr
                                className="cursor-pointer border-b border-border/40 bg-muted/20 last:border-b-0 hover:bg-muted/40"
                                onClick={() =>
                                  setExpandedDates((prev) => toggleKey(prev, row.date))
                                }
                              >
                                <td className="px-3 py-1.5 pl-9 text-xs font-medium text-foreground">
                                  <span className="flex items-center gap-2">
                                    <span
                                      aria-hidden
                                      className="inline-block text-muted-foreground"
                                    >
                                      {isDayExpanded ? "▾" : "▸"}
                                    </span>
                                    {row.date}
                                  </span>
                                </td>
                                <td className="px-3 py-1.5 text-center tabular-nums text-xs">
                                  {formatAdsCurrency(row.revenue)}
                                </td>
                                <td className="px-3 py-1.5 text-center tabular-nums text-xs">
                                  {formatAdsCurrency(row.cost)}
                                </td>
                                <td className="px-3 py-1.5 text-center tabular-nums text-xs">
                                  {formatRatioPct(row.ratio_pct)}
                                </td>
                              </tr>
                              {isDayExpanded && <ChannelSubRows row={row} indent="pl-14" />}
                            </Fragment>
                          );
                        })}
                    </Fragment>
                  );
                })
              : tableRows.map((row) => {
                  const isExpanded = expandedDates.has(row.date);
                  return (
                    <Fragment key={row.date}>
                      <tr
                        className="cursor-pointer border-b border-border/60 last:border-b-0 hover:bg-muted/40"
                        onClick={() => setExpandedDates((prev) => toggleKey(prev, row.date))}
                      >
                        <td className="px-3 py-2 font-medium text-foreground">{row.date}</td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          {formatAdsCurrency(row.revenue)}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          {formatAdsCurrency(row.cost)}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          {formatRatioPct(row.ratio_pct)}
                        </td>
                      </tr>
                      {isExpanded && <ChannelSubRows row={row} indent="pl-9" />}
                    </Fragment>
                  );
                })}
          </tbody>
        </table>
      </div>
    );

  if (bare) return body;

  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {groupByMonth
            ? t("adsReport.monthlyBreakdownTitle", "Doanh thu / chi phí theo tháng")
            : t("adsReport.dailyBreakdownTitle", "Doanh thu / chi phí theo ngày")}
        </CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
