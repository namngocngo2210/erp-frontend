/**
 * Helper thuần cho báo cáo ads: quyết định khi nào gộp danh sách theo tháng và
 * nhóm dữ liệu `daily_breakdown` (theo ngày, sort tăng dần từ backend) thành
 * cấu trúc tháng → ngày dùng cho 2 bảng trên trang Báo cáo ads.
 *
 * Quy ước hiển thị của MỌI bảng theo ngày trên trang: ngày gần nhất lên đầu và
 * ngày không phát sinh gì thì không liệt kê. Chart thì NGƯỢC LẠI — vẫn giữ trục
 * thời gian tăng dần, nên phần sort giảm dần chỉ nằm ở helper của bảng.
 */

import { formatCurrency as formatCurrencyShared } from "@/lib/format";

export type DailyChannelRow = {
  channel_id: number | null;
  channel__code: string | null;
  channel__name: string | null;
  revenue: string;
  cost: string;
  closed_orders: number;
  /** Số data (mọi lead trong ngày, không chỉ đơn chốt) — mẫu số CPL / tỉ lệ chốt. */
  leads: number;
  ratio_pct: number | null;
};

export type DailyBreakdownRow = {
  date: string;
  revenue: string;
  cost: string;
  closed_orders: number;
  leads: number;
  ratio_pct: number | null;
  channels: DailyChannelRow[];
};

export type MonthlyBreakdownRow = {
  month: string; // YYYY-MM
  revenue: number;
  cost: number;
  closed_orders: number;
  ratio_pct: number | null;
  days: DailyBreakdownRow[];
};

/** Một ngày trong pivot theo kênh (bảng admin). */
export type ChannelDayRow = {
  date: string;
  revenue: number;
  cost: number;
  ratio_pct: number | null;
};

export type ChannelMonthRow = {
  month: string; // YYYY-MM
  revenue: number;
  cost: number;
  ratio_pct: number | null;
  days: ChannelDayRow[];
};

/**
 * Khoảng lọc dài hơn ngưỡng này (~2 tháng) thì danh sách gộp theo tháng thay vì
 * liệt kê từng ngày — chọn quý/năm tự rơi vào nhóm gộp, tuần/tháng giữ theo ngày.
 */
export const MONTHLY_GROUPING_THRESHOLD_DAYS = 62;

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Số ngày (bao gồm 2 đầu) của khoảng from→to; null nếu thiếu/không hợp lệ. */
function rangeSpanDays(from: string | undefined, to: string | undefined): number | null {
  const start = parseDate(from);
  const end = parseDate(to);
  if (!start || !end || start > end) return null;
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
}

/**
 * Gộp theo tháng khi khoảng lọc > 62 ngày. Custom thiếu mốc thì tính span từ
 * min/max ngày có trong dữ liệu (rows đã sort tăng dần từ backend).
 */
export function shouldGroupByMonth(
  from: string | undefined,
  to: string | undefined,
  rows: readonly { date: string }[],
): boolean {
  let span = rangeSpanDays(from, to);
  if (span === null && rows.length > 0) {
    const dates = rows.map((row) => row.date).sort();
    span = rangeSpanDays(dates[0], dates[dates.length - 1]);
  }
  return span !== null && span > MONTHLY_GROUPING_THRESHOLD_DAYS;
}

/** "YYYY-MM" → "MM/YYYY" để hiển thị. */
export function formatMonthLabel(month: string): string {
  const [year, monthPart] = month.split("-");
  return `${monthPart}/${year}`;
}

function ratioPct(revenue: number, cost: number): number | null {
  return revenue > 0 ? (cost / revenue) * 100 : null;
}

/** Ngày có phát sinh: có doanh thu, chi phí, đơn chốt hoặc data. */
export function hasDailyActivity(row: DailyBreakdownRow): boolean {
  return (
    Number(row.revenue || 0) !== 0 ||
    Number(row.cost || 0) !== 0 ||
    (row.closed_orders || 0) !== 0 ||
    (row.leads || 0) !== 0
  );
}

/**
 * Chuẩn bị dòng ngày cho bảng: bỏ ngày trống, ngày gần nhất lên đầu. Không sửa
 * mảng gốc vì `rows` còn được chart dùng theo chiều tăng dần.
 */
export function prepareDailyRowsForTable(rows: readonly DailyBreakdownRow[]): DailyBreakdownRow[] {
  return rows.filter(hasDailyActivity).sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Nhóm các dòng ngày thành dòng tháng, GIỮ NGUYÊN thứ tự xuất hiện của `rows`:
 * chart truyền vào mảng tăng dần, bảng truyền vào mảng đã đảo giảm dần. Đừng
 * sort cứng ở đây — làm vậy là kéo trục thời gian của chart chạy ngược.
 */
export function groupDailyRowsByMonth(rows: readonly DailyBreakdownRow[]): MonthlyBreakdownRow[] {
  const byMonth = new Map<string, MonthlyBreakdownRow>();
  for (const row of rows) {
    const month = row.date.slice(0, 7);
    let acc = byMonth.get(month);
    if (!acc) {
      acc = { month, revenue: 0, cost: 0, closed_orders: 0, ratio_pct: null, days: [] };
      byMonth.set(month, acc);
    }
    acc.revenue += Number(row.revenue || 0);
    acc.cost += Number(row.cost || 0);
    acc.closed_orders += row.closed_orders || 0;
    acc.days.push(row);
  }
  const result = Array.from(byMonth.values());
  for (const month of result) {
    month.ratio_pct = ratioPct(month.revenue, month.cost);
  }
  return result;
}

/** Nhóm days của một kênh (pivot bảng admin) theo tháng — cũng giữ thứ tự đầu vào. */
export function groupChannelDaysByMonth(days: readonly ChannelDayRow[]): ChannelMonthRow[] {
  const byMonth = new Map<string, ChannelMonthRow>();
  for (const day of days) {
    const month = day.date.slice(0, 7);
    let acc = byMonth.get(month);
    if (!acc) {
      acc = { month, revenue: 0, cost: 0, ratio_pct: null, days: [] };
      byMonth.set(month, acc);
    }
    acc.revenue += day.revenue;
    acc.cost += day.cost;
    acc.days.push(day);
  }
  const result = Array.from(byMonth.values());
  for (const month of result) {
    month.ratio_pct = ratioPct(month.revenue, month.cost);
  }
  return result;
}

/**
 * Tổng chi phí theo channel_id trong cả kỳ, cộng dồn từ daily_breakdown — dùng
 * cho cột "Chi phí" của bảng "Đơn đã chốt & doanh thu theo kênh" (backend không
 * trả cost trong revenue_by_channel).
 */
export function sumCostByChannel(rows: readonly DailyBreakdownRow[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const row of rows) {
    for (const channel of row.channels) {
      if (channel.channel_id == null) continue;
      map.set(channel.channel_id, (map.get(channel.channel_id) ?? 0) + Number(channel.cost || 0));
    }
  }
  return map;
}

/** Tổng doanh thu/chi phí toàn kỳ cho dòng "Tổng" (tfoot) của 2 bảng. */
export function computeDailyTotals(rows: readonly DailyBreakdownRow[]): {
  totalRevenue: number;
  totalCost: number;
  totalRatioPct: number | null;
} {
  const totalRevenue = rows.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
  const totalCost = rows.reduce((sum, row) => sum + Number(row.cost || 0), 0);
  return { totalRevenue, totalCost, totalRatioPct: ratioPct(totalRevenue, totalCost) };
}

/** Định dạng tiền chung của trang Báo cáo ads (0 lẻ, invalid → "0"). */
export function formatAdsCurrency(value: string | number): string {
  return formatCurrencyShared(value, {
    fallback: "0",
    onInvalid: "fallback",
    maximumFractionDigits: 0,
  });
}

/** Hiển thị % chi phí / doanh thu; null → "—". */
export function formatRatioPct(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

// Sinh danh sách ngày (YYYY-MM-DD) liên tục từ `from` đến `to`, bao gồm 2 đầu.
export function enumerateDates(from: string | undefined, to: string | undefined): string[] {
  const start = parseDate(from);
  const end = parseDate(to);
  if (!start || !end || start > end) return [];
  const dates: string[] = [];
  const cursor = new Date(start);
  // Giới hạn an toàn 1 năm để tránh vòng lặp quá dài nếu khoảng ngày bất thường.
  for (let guard = 0; cursor <= end && guard < 366; guard += 1) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
