import { type ComponentProps, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartTooltip } from "@/features/dashboard/components/DashboardPrimitives";
import { useI18n } from "@/i18n";
import { formatCurrency } from "@/lib/format";
import type { OverviewRevenueTimeseries } from "@/lib/api/overview-report";
import { colorForSaleChannel, labelForSaleChannel } from "../sale-channels";
import {
  TIMESERIES_TOTAL_KEY,
  type TimeseriesBar,
  type TimeseriesGrain,
  buildRevenueTimeseries,
  formatChangePct,
  sumTimeseries,
} from "../timeseries-selectors";

function money(value: number): string {
  return formatCurrency(value, { fallback: "0", onInvalid: "fallback", maximumFractionDigits: 0 });
}

/** "so với ngày trước" / "giờ trước" / "thứ trước" — theo tab đang xem. */
const CHANGE_LABELS: Record<TimeseriesGrain, string> = {
  by_day: "so với ngày trước",
  by_hour: "so với giờ trước",
  by_weekday: "so với thứ trước",
};

/**
 * Tooltip của biểu đồ này: dòng đầu là TỔNG doanh thu của cột đang trỏ, KHÔNG
 * phải nhãn trục X (user chốt 2026-08-23) — biết đang trỏ ngày/giờ nào thì nhìn
 * vị trí con trỏ, còn con số cần đọc là tổng cột. Kèm theo là tăng/giảm so với
 * cột liền trước (user chốt 2026-09-03), bỏ qua khi không tính được (cột đầu
 * kỳ, cột trước = 0).
 *
 * Mục của LINE tổng bị lọc khỏi danh sách: nó bằng đúng tổng các cột nên vừa
 * thừa, vừa làm phép cộng ở dòng đầu đội lên gấp đôi.
 *
 * Bọc `ChartTooltip` thay vì sửa thẳng nó: component đó dùng chung với Báo cáo
 * Ads, đổi ở đó là đổi luôn tooltip của trang khác.
 */
export function ColumnTotalTooltip({
  grain = "by_day",
  ...props
}: ComponentProps<typeof ChartTooltip> & { grain?: TimeseriesGrain }) {
  const payload = (props.payload ?? []).filter((entry) => entry.dataKey !== TIMESERIES_TOTAL_KEY);
  const total = payload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);
  const bar = payload[0]?.payload as TimeseriesBar | undefined;
  const changePct = bar?.changePct ?? null;
  const label =
    changePct === null
      ? money(total)
      : `${money(total)} · ${formatChangePct(changePct)} ${CHANGE_LABELS[grain]}`;
  return (
    <ChartTooltip
      {...props}
      payload={payload}
      label={label}
      formatter={(entry) => money(Number(entry.value))}
    />
  );
}

/** Trục Y rút gọn: 536.000.000 → "536 tr". Số đầy đủ vẫn có ở tooltip và ô tổng. */
function shortMoney(value: number): string {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1_000_000_000) return `${Math.round(n / 100_000_000) / 10} tỷ`;
  if (Math.abs(n) >= 1_000_000) return `${Math.round(n / 1_000_000)} tr`;
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)} ng`;
  return String(n);
}

/**
 * Diễn biến DOANH THU THUẦN theo thời gian, cột xếp chồng theo nhóm kênh bán của
 * tầng đang lọc (xem `saleChannelSeriesFor`) — đang lọc ô "Kênh bán" thì chỉ còn
 * một nhóm, cột không còn xếp chồng.
 *
 * KHÔNG có bộ lọc kỳ riêng — dùng chung `DateFilter` của trang (user chốt
 * 2026-08-23). Ba tab chỉ đổi cách gộp CÙNG một tập đơn, nên tổng của cả ba mức
 * luôn bằng nhau và bằng ô KPI "Doanh thu thuần"; đổi tab không gọi lại API.
 *
 * Legend luôn hiện: ở tầng Ngoại sàn có 2 màu dưới 3:1 tương phản với nền, hợp
 * lệ chỉ khi còn kênh đọc khác (legend + tooltip) — bỏ đi là vi phạm chuẩn màu.
 *
 * LINE TỔNG đè lên cột (user chốt 2026-09-03): nối đỉnh các cột để thấy xu hướng
 * tăng/giảm giữa các mốc — cột xếp chồng đổi màu theo nhóm nên mắt khó so đỉnh
 * cột với nhau. Cùng trục tiền, KHÔNG có trục phụ; màu `--foreground` để không
 * tranh với màu nhóm kênh bán.
 */
export function RevenueTimeseriesCard({
  timeseries,
  saleChannel,
  saleChannelGroup,
  dateFrom,
  dateTo,
}: {
  timeseries: OverviewRevenueTimeseries | undefined;
  saleChannel: string;
  saleChannelGroup: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const { t } = useI18n();
  const [grain, setGrain] = useState<TimeseriesGrain>("by_day");

  const chart = useMemo(
    () =>
      buildRevenueTimeseries(
        timeseries?.[grain],
        grain,
        saleChannel,
        saleChannelGroup,
        dateFrom,
        dateTo,
      ),
    [timeseries, grain, saleChannel, saleChannelGroup, dateFrom, dateTo],
  );
  const total = useMemo(() => sumTimeseries(chart), [chart]);

  const tabs: { value: TimeseriesGrain; label: string }[] = [
    { value: "by_day", label: t("overviewReport.timeseries.byDay", "Theo ngày") },
    { value: "by_hour", label: t("overviewReport.timeseries.byHour", "Theo giờ") },
    { value: "by_weekday", label: t("overviewReport.timeseries.byWeekday", "Theo thứ") },
  ];

  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="text-base">
            {t("overviewReport.timeseries.title", "Doanh thu thuần theo thời gian")}
          </CardTitle>
          <span className="rounded-md bg-primary/10 px-2 py-1 text-sm font-semibold tabular-nums text-primary">
            {money(total)}
          </span>
        </div>
        {/* Segmented control cục bộ, KHÔNG dùng `components/ui/tabs`: component đó
            mang sẵn panel nội dung + `h-full`/`overflow-y-auto` cho trang full-height,
            nhồi biểu đồ vào bên trong Card là dính đúng bẫy layout đã ghi ở docs. */}
        <div role="tablist" className="flex shrink-0 gap-1">
          {tabs.map((tab) => {
            const isActive = tab.value === grain;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setGrain(tab.value)}
                className={[
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        {chart.series.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("overviewReport.empty", "Chưa có dữ liệu.")}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chart.bars} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="var(--border)"
                strokeOpacity={0.55}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                stroke="var(--border)"
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v) => shortMoney(Number(v))}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                stroke="var(--border)"
                tickLine={false}
                axisLine={false}
                width={70}
              />
              <Tooltip content={<ColumnTotalTooltip grain={grain} />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {chart.series.map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={labelForSaleChannel(key)}
                  stackId="net"
                  fill={colorForSaleChannel(key)}
                />
              ))}
              <Line
                type="monotone"
                dataKey={TIMESERIES_TOTAL_KEY}
                name={t("overviewReport.timeseries.totalLine", "Tổng")}
                stroke="var(--foreground)"
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 0, fill: "var(--foreground)" }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
