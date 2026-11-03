/**
 * Selector thuần cho 2 tab "Báo cáo theo digital" và "Báo cáo chi tiết theo
 * digital" của trang Báo cáo ads.
 *
 * "Digital" = kênh bán hàng có NV phòng Ads phụ trách (phạm vi sẵn có của báo
 * cáo ads). Cả hai bảng dùng chung một hàng chỉ số `DigitalMetricRow`; khác
 * nhau ở chiều gộp: theo kênh (tab tổng hợp) hay theo ngày của một kênh (tab
 * chi tiết).
 *
 * Mọi chỉ số dẫn xuất được tính ở đây thay vì trong component để unit test
 * không cần render.
 */

import { type DailyBreakdownRow } from "./report-grouping";

export type DigitalMetricRow = {
  /** Khóa React ổn định — id kênh (tab tổng hợp) hoặc ngày (tab chi tiết). */
  key: string;
  /** Nhãn cột đầu: tên kênh hoặc ngày. */
  label: string;
  /** Dòng phụ dưới nhãn (mã kênh); rỗng ở bảng theo ngày. */
  sublabel: string;
  revenue: number;
  cost: number;
  /** ME/RE = chi phí / doanh thu (%). null khi doanh thu = 0. */
  meRePct: number | null;
  /** Số data = mọi lead nhận trong kỳ. */
  leads: number;
  /** CPL = chi phí / số data. null khi chưa có data. */
  cpl: number | null;
  orders: number;
  /** AOV = doanh thu / số đơn. null khi chưa có đơn. */
  aov: number | null;
  /** Tỉ lệ chốt = số đơn / số data (%). null khi chưa có data. */
  closeRatePct: number | null;
};

type Accumulator = {
  revenue: number;
  cost: number;
  leads: number;
  orders: number;
};

const EMPTY: Accumulator = { revenue: 0, cost: 0, leads: 0, orders: 0 };

function divide(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

function toRow(key: string, label: string, sublabel: string, acc: Accumulator): DigitalMetricRow {
  const meRe = divide(acc.cost, acc.revenue);
  const closeRate = divide(acc.orders, acc.leads);
  return {
    key,
    label,
    sublabel,
    revenue: acc.revenue,
    cost: acc.cost,
    meRePct: meRe === null ? null : meRe * 100,
    leads: acc.leads,
    cpl: divide(acc.cost, acc.leads),
    orders: acc.orders,
    aov: divide(acc.revenue, acc.orders),
    closeRatePct: closeRate === null ? null : closeRate * 100,
  };
}

/** Khóa gộp của một kênh: ưu tiên id, fallback code/name khi backend trả null. */
export function digitalKey(channel: {
  channel_id: number | null;
  channel__code: string | null;
  channel__name: string | null;
}): string {
  return channel.channel_id != null
    ? String(channel.channel_id)
    : `${channel.channel__code ?? ""}-${channel.channel__name ?? ""}`;
}

/** Một hàng cho mỗi kênh trong kỳ, sắp xếp doanh thu giảm dần. */
export function buildDigitalRows(rows: readonly DailyBreakdownRow[]): DigitalMetricRow[] {
  const byChannel = new Map<string, Accumulator & { label: string; sublabel: string }>();
  for (const day of rows) {
    for (const channel of day.channels) {
      const key = digitalKey(channel);
      const acc = byChannel.get(key) ?? {
        ...EMPTY,
        label: channel.channel__name || channel.channel__code || "—",
        sublabel: channel.channel__code ?? "",
      };
      acc.revenue += Number(channel.revenue || 0);
      acc.cost += Number(channel.cost || 0);
      acc.leads += channel.leads || 0;
      acc.orders += channel.closed_orders || 0;
      byChannel.set(key, acc);
    }
  }
  return Array.from(byChannel, ([key, acc]) => toRow(key, acc.label, acc.sublabel, acc)).sort(
    (a, b) => b.revenue - a.revenue || a.label.localeCompare(b.label),
  );
}

/** Danh sách kênh để đổ vào ô chọn của tab chi tiết (theo tên A→Z). */
export function listDigitalOptions(
  rows: readonly DailyBreakdownRow[],
): Array<{ value: string; label: string }> {
  const options = new Map<string, string>();
  for (const day of rows) {
    for (const channel of day.channels) {
      options.set(digitalKey(channel), channel.channel__name || channel.channel__code || "—");
    }
  }
  return Array.from(options, ([value, label]) => ({ value, label })).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

/**
 * Một hàng cho mỗi ngày của MỘT kênh. Chỉ liệt kê ngày CÓ phát sinh (doanh thu,
 * chi phí, data hoặc đơn), ngày gần nhất lên đầu — trước đây bảng trải đủ tháng
 * nên nửa cuối tháng toàn hàng 0, đọc như dữ liệu rỗng.
 */
export function buildDigitalDailyRows(
  rows: readonly DailyBreakdownRow[],
  channelKey: string,
): DigitalMetricRow[] {
  const byDate = new Map<string, Accumulator>();
  for (const day of rows) {
    for (const channel of day.channels) {
      if (digitalKey(channel) !== channelKey) continue;
      const acc = byDate.get(day.date) ?? { ...EMPTY };
      acc.revenue += Number(channel.revenue || 0);
      acc.cost += Number(channel.cost || 0);
      acc.leads += channel.leads || 0;
      acc.orders += channel.closed_orders || 0;
      byDate.set(day.date, acc);
    }
  }
  return Array.from(byDate)
    .filter(([, acc]) => acc.revenue !== 0 || acc.cost !== 0 || acc.leads !== 0 || acc.orders !== 0)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, acc]) => toRow(date, date, "", acc));
}

/** Một dòng con theo sản phẩm, đúng shape backend trả ở `reports/ads/products`. */
export type DigitalProductApiRow = {
  /** null khi gọi ở chế độ gộp cả kỳ (`group=channel`). */
  date: string | null;
  channel_id: number;
  product_id: number;
  product__sku: string | null;
  product__name: string | null;
  revenue: string;
  cost: string;
  closed_orders: number;
  leads: number;
};

export type DigitalProductExpansion = {
  /** Các dòng SP + dòng "Chưa gán chiến dịch" ở cuối (nếu còn chi phí chưa quy được). */
  rows: DigitalMetricRow[];
  /**
   * Doanh thu của dòng cha KHÔNG nằm ở dòng con nào — vì tập SP chỉ gồm SP có chiến
   * dịch (chốt 2026-08-24). Khác 0 thì UI phải nói ra, không để người xem tự cộng
   * rồi tưởng báo cáo sai.
   */
  revenueGap: number;
};

/** Dưới ngưỡng này coi như 0: chi phí là số thập phân sau khi chia đều theo kênh. */
const COST_EPSILON = 1;

/**
 * Dựng phần bung của MỘT hàng digital.
 *
 * `filter.date` bỏ trống = tab tổng hợp (gộp cả kỳ theo kênh); có ngày = tab chi
 * tiết (bung đúng hàng ngày đó).
 *
 * Dòng "Chưa gán chiến dịch" tính bằng PHÉP TRỪ `chi phí dòng cha − tổng dòng con`
 * chứ không do backend trả: chi tiêu đọc ở grain ad/campaign không khớp tuyệt đối
 * grain account, và phần chênh grain đó đúng là chưa quy được về sản phẩm nào. Nhờ
 * vậy tổng chi phí dòng con LUÔN khớp dòng cha.
 */
export function buildDigitalProductRows(
  productRows: readonly DigitalProductApiRow[],
  parent: DigitalMetricRow,
  filter: { channelKey: string; date?: string },
  unassignedLabel: string,
): DigitalProductExpansion {
  const matched = productRows.filter(
    (row) =>
      String(row.channel_id) === filter.channelKey &&
      (filter.date === undefined || row.date === filter.date),
  );
  const rows = matched
    .map((row) =>
      // Chỉ hiện SKU: tên sản phẩm ở hệ này là cả đoạn mô tả kỹ thuật, nhét vào
      // dòng con làm bảng cao gấp ba mà không thêm thông tin nào.
      toRow(`${parent.key}-p${row.product_id}`, row.product__sku || row.product__name || "—", "", {
        revenue: Number(row.revenue || 0),
        cost: Number(row.cost || 0),
        leads: row.leads || 0,
        orders: row.closed_orders || 0,
      }),
    )
    .sort((a, b) => b.revenue - a.revenue || b.cost - a.cost || a.label.localeCompare(b.label));

  const childCost = rows.reduce((sum, row) => sum + row.cost, 0);
  const unassignedCost = parent.cost - childCost;
  if (unassignedCost > COST_EPSILON) {
    rows.push(
      toRow(`${parent.key}-unassigned`, unassignedLabel, "", {
        revenue: 0,
        cost: unassignedCost,
        leads: 0,
        orders: 0,
      }),
    );
  }
  const revenueGap = parent.revenue - rows.reduce((sum, row) => sum + row.revenue, 0);
  return { rows, revenueGap: revenueGap > COST_EPSILON ? revenueGap : 0 };
}

/** Hàng "Tổng" của tfoot — cộng lại từ hàng đã dựng để luôn khớp phần thân bảng. */
export function sumDigitalRows(rows: readonly DigitalMetricRow[], label: string): DigitalMetricRow {
  const acc = rows.reduce<Accumulator>(
    (sum, row) => ({
      revenue: sum.revenue + row.revenue,
      cost: sum.cost + row.cost,
      leads: sum.leads + row.leads,
      orders: sum.orders + row.orders,
    }),
    { ...EMPTY },
  );
  return toRow("__total__", label, "", acc);
}

/** Mốc đầu/cuối của tháng "YYYY-MM" theo giờ địa phương. */
export function monthRange(month: string): { from: string; to: string } {
  const [year, monthPart] = month.split("-").map(Number);
  const last = new Date(year, monthPart, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}
