/**
 * Selector thuần cho 2 tab "Báo cáo theo sale" và "Báo cáo chi tiết theo sale".
 *
 * Backend trả hàng phẳng (ngày, nhân viên); ở đây gộp theo nhân viên (tab tổng
 * hợp) hoặc theo ngày của một nhân viên (tab chi tiết). Cùng một shape hàng để
 * hai bảng dùng chung component render.
 */

import { enumerateDates } from "@/features/ads/report-grouping";
import { type SaleStaffDailyRow } from "./queries";

export type SaleMetricRow = {
  key: string;
  label: string;
  /** Doanh thu tổng — tiền các đơn đã chốt / đã lên đơn (= xác nhận + chốt). */
  totalRevenue: number;
  /** Doanh thu chốt đơn — phần sale tư vấn thêm (giá trị cuối − tiền khách tự đăng ký). */
  closedRevenue: number;
  /** Doanh thu xác nhận đơn — tiền khách TỰ đăng ký trên landing lúc đơn đổ về. */
  confirmedRevenue: number;
  /** Tỉ lệ chốt đơn = số đơn / số data nhận (%). */
  closeRatePct: number | null;
  dataCount: number;
  orders: number;
  /** AOV = giá trị thực đơn chốt (xác nhận + chốt) / số đơn — cùng tập đơn nên không lệch. */
  aov: number | null;
  /** Tử số lead time: tổng giây xử lý của các đơn đã có mốc tác nghiệp. */
  leadTimeSeconds: number;
  /** Tử số thời gian chờ chia: tổng giây data nằm chờ, CÙNG tập đơn với lead time. */
  queueWaitSeconds: number;
  /** Mẫu số DÙNG CHUNG — data còn treo không nằm ở cả tử lẫn mẫu của cả hai cột. */
  leadTimeOrders: number;
  /**
   * Lead time xử lý data (giây, trung bình): từ lúc data ĐƯỢC CHIA cho sale tới
   * lần ĐẦU sale nhập kết quả tác nghiệp — thời gian data nằm chờ chia KHÔNG
   * tính vào đây. `null` nghĩa là chưa đơn nào trong hàng được xử lý.
   */
  avgLeadTimeSeconds: number | null;
  /**
   * Thời gian chờ chia data (giây, trung bình): từ lúc đơn đổ về tới lúc data
   * đến tay sale. Cùng mẫu số với `avgLeadTimeSeconds` nên cộng hai số ra đúng
   * tổng thời gian từ lúc đơn đổ về tới lúc tác nghiệp.
   */
  avgQueueWaitSeconds: number | null;
};

type Accumulator = {
  totalRevenue: number;
  closedRevenue: number;
  confirmedRevenue: number;
  dataCount: number;
  orders: number;
  leadTimeSeconds: number;
  queueWaitSeconds: number;
  leadTimeOrders: number;
};

const EMPTY: Accumulator = {
  totalRevenue: 0,
  closedRevenue: 0,
  confirmedRevenue: 0,
  dataCount: 0,
  orders: 0,
  leadTimeSeconds: 0,
  queueWaitSeconds: 0,
  leadTimeOrders: 0,
};

function divide(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

function toRow(key: string, label: string, acc: Accumulator): SaleMetricRow {
  const closeRate = divide(acc.orders, acc.dataCount);
  return {
    key,
    label,
    totalRevenue: acc.totalRevenue,
    closedRevenue: acc.closedRevenue,
    confirmedRevenue: acc.confirmedRevenue,
    closeRatePct: closeRate === null ? null : closeRate * 100,
    dataCount: acc.dataCount,
    orders: acc.orders,
    aov: divide(acc.confirmedRevenue + acc.closedRevenue, acc.orders),
    leadTimeSeconds: acc.leadTimeSeconds,
    queueWaitSeconds: acc.queueWaitSeconds,
    leadTimeOrders: acc.leadTimeOrders,
    // Chia SAU khi cộng: backend trả tổng + mẫu số nên hàng "Tổng" và hàng gộp
    // theo nhân viên đều là trung bình thật, không phải trung bình của trung bình.
    avgLeadTimeSeconds: divide(acc.leadTimeSeconds, acc.leadTimeOrders),
    avgQueueWaitSeconds: divide(acc.queueWaitSeconds, acc.leadTimeOrders),
  };
}

function add(acc: Accumulator, row: SaleStaffDailyRow): Accumulator {
  acc.totalRevenue += Number(row.total_revenue || 0);
  acc.closedRevenue += Number(row.closed_revenue || 0);
  acc.confirmedRevenue += Number(row.confirmed_revenue || 0);
  acc.dataCount += row.data_count || 0;
  acc.orders += row.orders || 0;
  acc.leadTimeSeconds += row.lead_time_seconds || 0;
  acc.queueWaitSeconds += row.queue_wait_seconds || 0;
  acc.leadTimeOrders += row.lead_time_orders || 0;
  return acc;
}

/**
 * Giây -> chuỗi người đọc được: `<1p` / `42p` / `5h 12p` / `2n 3h`. Bỏ hẳn đơn vị
 * nhỏ khi nó bằng 0 để cột không bị dài. `null` (chưa đơn nào được xử lý) -> "—".
 */
export function formatLeadTime(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return "—";
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return "<1p";
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes}p`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const restMinutes = minutes % 60;
    return restMinutes === 0 ? `${hours}h` : `${hours}h ${restMinutes}p`;
  }
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours === 0 ? `${days}n` : `${days}n ${restHours}h`;
}

/** Phần định danh nhân viên mà cả báo cáo sale lẫn báo cáo resale đều có. */
export type StaffIdentity = {
  staff_id: number | null;
  staff__username: string | null;
  staff__display_name: string | null;
};

/** Khoá gộp của một nhân viên; staff_id null (đơn chưa gán) gom về một khoá riêng. */
export function saleKey(row: StaffIdentity): string {
  return row.staff_id != null ? String(row.staff_id) : "__unassigned__";
}

export function saleLabel(row: StaffIdentity, unknownLabel: string): string {
  return row.staff__display_name || row.staff__username || unknownLabel;
}

/** Một hàng cho mỗi nhân viên sale, sắp xếp doanh thu tổng giảm dần. */
export function buildSaleStaffRows(
  rows: readonly SaleStaffDailyRow[],
  unknownLabel: string,
): SaleMetricRow[] {
  const byStaff = new Map<string, Accumulator & { label: string }>();
  for (const row of rows) {
    const key = saleKey(row);
    let acc = byStaff.get(key);
    if (!acc) {
      acc = { ...EMPTY, label: saleLabel(row, unknownLabel) };
      byStaff.set(key, acc);
    }
    add(acc, row);
  }
  return Array.from(byStaff, ([key, acc]) => toRow(key, acc.label, acc)).sort(
    (a, b) => b.totalRevenue - a.totalRevenue || a.label.localeCompare(b.label),
  );
}

/** Danh sách nhân viên để đổ vào ô chọn của tab chi tiết (theo tên A→Z). */
export function listSaleOptions(
  rows: readonly SaleStaffDailyRow[],
  unknownLabel: string,
): Array<{ value: string; label: string }> {
  const options = new Map<string, string>();
  for (const row of rows) options.set(saleKey(row), saleLabel(row, unknownLabel));
  return Array.from(options, ([value, label]) => ({ value, label })).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

/**
 * Một hàng cho mỗi ngày của MỘT nhân viên. `from`/`to` trải đủ tháng đang chọn
 * để ngày không phát sinh vẫn hiện hàng 0.
 */
export function buildSaleDailyRows(
  rows: readonly SaleStaffDailyRow[],
  staffKey: string,
  from?: string,
  to?: string,
): SaleMetricRow[] {
  const byDate = new Map<string, Accumulator>();
  for (const row of rows) {
    if (saleKey(row) !== staffKey) continue;
    byDate.set(row.date, add(byDate.get(row.date) ?? { ...EMPTY }, row));
  }
  const dates = enumerateDates(from, to);
  const dateList = dates.length > 0 ? dates : Array.from(byDate.keys()).sort();
  return dateList.map((date) => toRow(date, date, byDate.get(date) ?? { ...EMPTY }));
}

/** Hàng "Tổng" của tfoot — cộng lại từ hàng đã dựng để luôn khớp phần thân bảng. */
export function sumSaleRows(rows: readonly SaleMetricRow[], label: string): SaleMetricRow {
  const acc = rows.reduce<Accumulator>(
    (sum, row) => ({
      totalRevenue: sum.totalRevenue + row.totalRevenue,
      closedRevenue: sum.closedRevenue + row.closedRevenue,
      confirmedRevenue: sum.confirmedRevenue + row.confirmedRevenue,
      dataCount: sum.dataCount + row.dataCount,
      orders: sum.orders + row.orders,
      // Cộng tử và mẫu rồi mới chia — cộng thẳng `avgLeadTimeSeconds` sẽ ra trung
      // bình của trung bình và lệch khi các hàng có mẫu số khác nhau.
      leadTimeSeconds: sum.leadTimeSeconds + row.leadTimeSeconds,
      queueWaitSeconds: sum.queueWaitSeconds + row.queueWaitSeconds,
      leadTimeOrders: sum.leadTimeOrders + row.leadTimeOrders,
    }),
    { ...EMPTY },
  );
  return toRow("__total__", label, acc);
}
