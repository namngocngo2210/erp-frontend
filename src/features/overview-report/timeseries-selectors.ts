import type { OverviewTimeseriesPoint } from "@/lib/api/overview-report";
import { saleChannelSeriesFor } from "./sale-channels";

/** Ba mức của biểu đồ diễn biến. Khớp key của `revenue_timeseries` ở BE. */
export const TIMESERIES_GRAINS = ["by_day", "by_hour", "by_weekday"] as const;
export type TimeseriesGrain = (typeof TIMESERIES_GRAINS)[number];

/** Khóa của line tổng cột — KHÔNG trùng với khóa nhóm kênh bán nào. */
export const TIMESERIES_TOTAL_KEY = "total";

/**
 * Một cột của biểu đồ: nhãn trục X, một field số cho mỗi nhóm kênh bán, cộng
 * `total` (tổng các nhóm — nuôi line xu hướng) và `changePct` (tăng/giảm so với
 * cột liền trước, để tooltip nói "+12% so với cột trước").
 */
export type TimeseriesBar = {
  bucket: string;
  label: string;
  total: number;
  changePct: number | null;
} & Record<string, number | string | null>;

export type TimeseriesChart = {
  bars: TimeseriesBar[];
  /** Khóa nhóm theo đúng thứ tự xếp chồng, dưới lên trên. */
  series: string[];
};

const WEEKDAY_LABELS: Record<string, string> = {
  "1": "Thứ 2",
  "2": "Thứ 3",
  "3": "Thứ 4",
  "4": "Thứ 5",
  "5": "Thứ 6",
  "6": "Thứ 7",
  "7": "Chủ nhật",
};

/**
 * Liệt kê mọi ngày trong khoảng, dạng "YYYY-MM-DD".
 *
 * Dựng mốc bằng `new Date(y, m - 1, d)` chứ KHÔNG `new Date("2026-08-01")`:
 * chuỗi ISO chỉ có ngày được parse theo UTC, nên ở múi +7 nó lùi về 07:00 hôm
 * trước và cả trục ngày lệch một ô. Cùng lý do, ghép chuỗi lại bằng getFullYear
 * /getMonth/getDate (giờ địa phương) thay vì toISOString().
 */
function enumerateDays(dateFrom?: string, dateTo?: string): string[] {
  if (!dateFrom || !dateTo) return [];
  const [fy, fm, fd] = dateFrom.split("-").map(Number);
  const [ty, tm, td] = dateTo.split("-").map(Number);
  if (![fy, fm, fd, ty, tm, td].every(Number.isFinite)) return [];
  const cursor = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  const out: string[] = [];
  // Trần 400 ô: kỳ dài bất thường thì cắt thay vì treo trình duyệt.
  while (cursor <= end && out.length < 400) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/** Nhãn trục X: ngày hiện "DD", giờ hiện "07h", thứ hiện tên tiếng Việt. */
function labelFor(grain: TimeseriesGrain, bucket: string): string {
  if (grain === "by_hour") return `${bucket.padStart(2, "0")}h`;
  if (grain === "by_weekday") return WEEKDAY_LABELS[bucket] ?? bucket;
  return bucket.slice(8) || bucket;
}

function axisFor(grain: TimeseriesGrain, dateFrom?: string, dateTo?: string): string[] {
  if (grain === "by_hour") return Array.from({ length: 24 }, (_, i) => String(i));
  if (grain === "by_weekday") return Array.from({ length: 7 }, (_, i) => String(i + 1));
  return enumerateDays(dateFrom, dateTo);
}

/**
 * Payload → dữ liệu biểu đồ cột xếp chồng.
 *
 * BE chỉ trả bucket CÓ dữ liệu, nên trục do FE dựng: 24 giờ, 7 thứ, hoặc mọi
 * ngày trong khoảng đang lọc. Thiếu bucket mà không điền 0 thì trục ngày nhảy
 * cóc qua ngày không có đơn — người đọc tưởng kỳ ngắn hơn thực tế.
 *
 * `series` lấy theo thứ tự tầng của bộ lọc (`saleChannelSeriesFor` — đang lọc ô
 * "Kênh bán" thì chỉ còn một nhóm), và chỉ giữ
 * nhóm THỰC SỰ có số — nhóm rỗng mà vẫn vào legend là một mục không bao giờ
 * xuất hiện trên biểu đồ.
 *
 * Nếu trục ngày rỗng (chưa có khoảng lọc) thì rơi về đúng các bucket BE trả, để
 * biểu đồ vẫn vẽ được thay vì trắng.
 */
export function buildRevenueTimeseries(
  points: readonly OverviewTimeseriesPoint[] | undefined,
  grain: TimeseriesGrain,
  saleChannel: string,
  saleChannelGroup: string,
  dateFrom?: string,
  dateTo?: string,
): TimeseriesChart {
  const rows = points ?? [];
  const byBucket = new Map<string, Map<string, number>>();
  const seen = new Set<string>();
  for (const row of rows) {
    const revenue = Number(row.revenue || 0);
    if (!Number.isFinite(revenue)) continue;
    seen.add(row.sale_channel);
    const bucket = byBucket.get(row.bucket) ?? new Map<string, number>();
    bucket.set(row.sale_channel, (bucket.get(row.sale_channel) ?? 0) + revenue);
    byBucket.set(row.bucket, bucket);
  }

  const series = saleChannelSeriesFor(saleChannel, saleChannelGroup).filter((key) => seen.has(key));
  let axis = axisFor(grain, dateFrom, dateTo);
  if (axis.length === 0) axis = [...byBucket.keys()].sort();

  let previousTotal: number | null = null;
  const bars = axis.map((bucket) => {
    const values = byBucket.get(bucket);
    const bar: TimeseriesBar = {
      bucket,
      label: labelFor(grain, bucket),
      total: 0,
      changePct: null,
    };
    let total = 0;
    for (const key of series) {
      const value = values?.get(key) ?? 0;
      bar[key] = value;
      total += value;
    }
    bar.total = total;
    // So với cột LIỀN TRƯỚC trên trục (kể cả cột 0 do FE điền): cột đầu và cột
    // sau một cột 0 không có % (chia 0) — tooltip bỏ dòng đó thay vì hiện ∞.
    bar.changePct =
      previousTotal !== null && previousTotal > 0
        ? ((total - previousTotal) / previousTotal) * 100
        : null;
    previousTotal = total;
    return bar;
  });

  return { bars, series };
}

/** Tổng doanh thu của cả biểu đồ — phải khớp ô KPI "Doanh thu thuần". */
export function sumTimeseries(chart: TimeseriesChart): number {
  return chart.bars.reduce(
    (total, bar) => total + chart.series.reduce((sum, key) => sum + Number(bar[key] || 0), 0),
    0,
  );
}

/** "+12,3%" / "−4,0%" — dấu trừ thật (U+2212) để không lẫn với gạch nối. */
export function formatChangePct(changePct: number): string {
  const sign = changePct > 0 ? "+" : changePct < 0 ? "\u2212" : "";
  return `${sign}${Math.abs(changePct).toFixed(1).replace(".", ",")}%`;
}
