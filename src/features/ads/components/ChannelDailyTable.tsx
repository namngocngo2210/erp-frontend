import { Fragment, useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n";
import {
  type ChannelDayRow,
  type DailyBreakdownRow,
  computeDailyTotals,
  formatAdsCurrency,
  formatMonthLabel,
  formatRatioPct,
  groupChannelDaysByMonth,
} from "../report-grouping";

type ChannelDailyTableProps = {
  dailyRows: DailyBreakdownRow[];
  /** Khoảng lọc dài: kênh xổ ra theo tháng, click tháng xổ tiếp ra ngày. */
  groupByMonth: boolean;
  /** Bỏ Card/tiêu đề bao ngoài — dùng khi nhúng vào khối "Xem bảng chi tiết" của chart. */
  bare?: boolean;
};

type ChannelDailyRow = {
  key: string;
  channel_id: number | null;
  channel__code: string | null;
  channel__name: string | null;
  revenue: number;
  cost: number;
  ratio_pct: number | null;
  days: ChannelDayRow[];
};

function toggleKey(prev: Set<string>, key: string): Set<string> {
  const next = new Set(prev);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

function DayRow({ day, indent }: { day: ChannelDayRow; indent: "pl-9" | "pl-14" }) {
  const bg = indent === "pl-9" ? "bg-muted/20" : "bg-muted/30";
  return (
    <tr className={`border-b border-border/40 ${bg} last:border-b-0`}>
      <td className={`px-3 py-1.5 ${indent} text-xs font-medium text-foreground`}>{day.date}</td>
      <td className="px-3 py-1.5 text-center tabular-nums text-xs">
        {formatAdsCurrency(day.revenue)}
      </td>
      <td className="px-3 py-1.5 text-center tabular-nums text-xs">
        {formatAdsCurrency(day.cost)}
      </td>
      <td className="px-3 py-1.5 text-center tabular-nums text-xs">
        {formatRatioPct(day.ratio_pct)}
      </td>
    </tr>
  );
}

/**
 * Bảng admin "Doanh thu / chi phí theo kênh" của Báo cáo ads. Pivot dữ liệu
 * theo-ngày sang theo-kênh; mỗi kênh gồm tổng doanh thu/chi phí trong kỳ và
 * mảng days[] CHỈ gồm ngày kênh đó thực sự phát sinh, ngày gần nhất lên đầu.
 * - Chế độ theo ngày: kênh → ngày.
 * - Chế độ gộp tháng: kênh → tháng → ngày (tránh xổ ra hàng trăm dòng ngày).
 */
export function ChannelDailyTable({
  dailyRows,
  groupByMonth,
  bare = false,
}: ChannelDailyTableProps) {
  const { t } = useI18n();
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const channelRows = useMemo<ChannelDailyRow[]>(() => {
    if (dailyRows.length === 0) return [];
    type Acc = {
      channel_id: number | null;
      channel__code: string | null;
      channel__name: string | null;
      byDate: Map<string, { revenue: number; cost: number }>;
    };
    const map = new Map<string, Acc>();
    for (const row of dailyRows) {
      for (const channel of row.channels) {
        const key = String(
          channel.channel_id ?? `${channel.channel__code}-${channel.channel__name}`,
        );
        const acc =
          map.get(key) ??
          ({
            channel_id: channel.channel_id,
            channel__code: channel.channel__code,
            channel__name: channel.channel__name,
            byDate: new Map<string, { revenue: number; cost: number }>(),
          } satisfies Acc);
        const bucket = acc.byDate.get(row.date) ?? { revenue: 0, cost: 0 };
        bucket.revenue += Number(channel.revenue || 0);
        bucket.cost += Number(channel.cost || 0);
        acc.byDate.set(row.date, bucket);
        map.set(key, acc);
      }
    }
    const result: ChannelDailyRow[] = [];
    for (const [key, acc] of map) {
      // Chỉ ngày kênh này có phát sinh (doanh thu hoặc chi phí), gần nhất lên đầu.
      const days: ChannelDayRow[] = Array.from(acc.byDate, ([date, bucket]) => ({
        date,
        revenue: bucket.revenue,
        cost: bucket.cost,
        ratio_pct: bucket.revenue > 0 ? (bucket.cost / bucket.revenue) * 100 : null,
      }))
        .filter((day) => day.revenue !== 0 || day.cost !== 0)
        .sort((a, b) => b.date.localeCompare(a.date));
      const revenue = days.reduce((sum, d) => sum + d.revenue, 0);
      const cost = days.reduce((sum, d) => sum + d.cost, 0);
      result.push({
        key,
        channel_id: acc.channel_id,
        channel__code: acc.channel__code,
        channel__name: acc.channel__name,
        revenue,
        cost,
        ratio_pct: revenue > 0 ? (cost / revenue) * 100 : null,
        days,
      });
    }
    result.sort((a, b) => b.revenue - a.revenue);
    return result;
  }, [dailyRows]);

  const totals = useMemo(() => computeDailyTotals(dailyRows), [dailyRows]);

  const body =
    channelRows.length === 0 ? (
      <p className="text-sm text-muted-foreground">{t("adsReport.empty", "Chưa có dữ liệu.")}</p>
    ) : (
      <div className="overflow-x-auto">
        <table data-slot="table" className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">{t("adsReport.channelHeader", "Kênh")}</th>
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
            {channelRows.map((row) => {
              const isExpanded = expandedChannels.has(row.key);
              return (
                <Fragment key={row.key}>
                  <tr
                    className="cursor-pointer border-b border-border/60 last:border-b-0 hover:bg-muted/40"
                    onClick={() => setExpandedChannels((prev) => toggleKey(prev, row.key))}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span aria-hidden className="inline-block text-xs text-muted-foreground">
                          {isExpanded ? "▾" : "▸"}
                        </span>
                        <div>
                          <div className="font-medium text-foreground">
                            {row.channel__name || row.channel__code || "—"}
                          </div>
                          {row.channel__code && (
                            <div className="text-xs text-muted-foreground">{row.channel__code}</div>
                          )}
                        </div>
                      </div>
                    </td>
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
                  {isExpanded &&
                    (row.days.length === 0 ? (
                      <tr className="border-b border-border/60 bg-muted/20 last:border-b-0">
                        <td className="px-3 py-2 pl-9 text-xs text-muted-foreground" colSpan={4}>
                          {t("adsReport.empty", "Chưa có dữ liệu.")}
                        </td>
                      </tr>
                    ) : groupByMonth ? (
                      groupChannelDaysByMonth(row.days).map((month) => {
                        const monthKey = `${row.key}:${month.month}`;
                        const isMonthExpanded = expandedMonths.has(monthKey);
                        return (
                          <Fragment key={monthKey}>
                            <tr
                              className="cursor-pointer border-b border-border/40 bg-muted/20 last:border-b-0 hover:bg-muted/40"
                              onClick={() => setExpandedMonths((prev) => toggleKey(prev, monthKey))}
                            >
                              <td className="px-3 py-1.5 pl-9 text-xs font-medium text-foreground">
                                <span className="flex items-center gap-2">
                                  <span aria-hidden className="inline-block text-muted-foreground">
                                    {isMonthExpanded ? "▾" : "▸"}
                                  </span>
                                  {formatMonthLabel(month.month)}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 text-center tabular-nums text-xs">
                                {formatAdsCurrency(month.revenue)}
                              </td>
                              <td className="px-3 py-1.5 text-center tabular-nums text-xs">
                                {formatAdsCurrency(month.cost)}
                              </td>
                              <td className="px-3 py-1.5 text-center tabular-nums text-xs">
                                {formatRatioPct(month.ratio_pct)}
                              </td>
                            </tr>
                            {isMonthExpanded &&
                              month.days.map((day) => (
                                <DayRow key={`${monthKey}-${day.date}`} day={day} indent="pl-14" />
                              ))}
                          </Fragment>
                        );
                      })
                    ) : (
                      row.days.map((day) => (
                        <DayRow key={`${row.key}-${day.date}`} day={day} indent="pl-9" />
                      ))
                    ))}
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
          {t("adsReport.revenueCostByChannelTitle", "Doanh thu / chi phí theo kênh")}
        </CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
