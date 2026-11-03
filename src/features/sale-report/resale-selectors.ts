/**
 * Selector thuần cho tab "Resale".
 *
 * Backend trả `{kpis, by_staff}` với tiền dạng chuỗi decimal. Ở đây parse sang
 * số và tính % giao thành công. Bốn rổ (giao xong / chờ giao / hoàn / rủi ro
 * hoàn) cộng lại đúng bằng tổng — quan hệ đó do backend bảo đảm, FE chỉ cộng
 * ngang các hàng nên không phá được.
 */

import { type ResaleBucketsApi, type ResaleStaffApiRow } from "./queries";
import { saleKey, saleLabel } from "./sale-report-selectors";

export type ResaleBuckets = {
  totalRevenue: number;
  totalOrders: number;
  deliveredRevenue: number;
  deliveredOrders: number;
  awaitingRevenue: number;
  awaitingOrders: number;
  returnedRevenue: number;
  returnedOrders: number;
  returnRiskRevenue: number;
  returnRiskOrders: number;
  /** Doanh thu giao thành công / tổng doanh thu (%); `null` khi tổng = 0. */
  deliveredPct: number | null;
};

export type ResaleStaffRow = ResaleBuckets & {
  key: string;
  label: string;
};

/** Chuỗi rỗng / rác -> 0, không để lọt NaN vào phép cộng của dòng tổng. */
function toNumber(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function divide(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

type Sums = Omit<ResaleBuckets, "deliveredPct">;

const EMPTY_SUMS: Sums = {
  totalRevenue: 0,
  totalOrders: 0,
  deliveredRevenue: 0,
  deliveredOrders: 0,
  awaitingRevenue: 0,
  awaitingOrders: 0,
  returnedRevenue: 0,
  returnedOrders: 0,
  returnRiskRevenue: 0,
  returnRiskOrders: 0,
};

function parse(api: ResaleBucketsApi | undefined): Sums {
  if (!api) return { ...EMPTY_SUMS };
  return {
    totalRevenue: toNumber(api.total_revenue),
    totalOrders: api.total_orders || 0,
    deliveredRevenue: toNumber(api.delivered_revenue),
    deliveredOrders: api.delivered_orders || 0,
    awaitingRevenue: toNumber(api.awaiting_revenue),
    awaitingOrders: api.awaiting_orders || 0,
    returnedRevenue: toNumber(api.returned_revenue),
    returnedOrders: api.returned_orders || 0,
    returnRiskRevenue: toNumber(api.return_risk_revenue),
    returnRiskOrders: api.return_risk_orders || 0,
  };
}

function withPct(sums: Sums): ResaleBuckets {
  const share = divide(sums.deliveredRevenue, sums.totalRevenue);
  return { ...sums, deliveredPct: share === null ? null : share * 100 };
}

/** Hàng KPI của tab. `undefined` (chưa tải xong) -> mọi ô 0, % là `null`. */
export function buildResaleKpis(kpis: ResaleBucketsApi | undefined): ResaleBuckets {
  return withPct(parse(kpis));
}

/** Một hàng cho mỗi nhân viên, sắp doanh thu GIAO THÀNH CÔNG giảm dần. */
export function buildResaleRows(
  rows: readonly ResaleStaffApiRow[],
  unknownLabel: string,
): ResaleStaffRow[] {
  return rows
    .map((row) => ({
      key: saleKey(row),
      label: saleLabel(row, unknownLabel),
      ...withPct(parse(row)),
    }))
    .sort((left, right) => right.deliveredRevenue - left.deliveredRevenue);
}

/**
 * Dòng tổng. `deliveredPct` được tính LẠI từ tổng chứ không cộng ngang —
 * cộng phần trăm của các hàng có mẫu số khác nhau là sai.
 */
export function sumResaleRows(rows: readonly ResaleStaffRow[], totalLabel: string): ResaleStaffRow {
  const sums = rows.reduce<Sums>(
    (acc, row) => ({
      totalRevenue: acc.totalRevenue + row.totalRevenue,
      totalOrders: acc.totalOrders + row.totalOrders,
      deliveredRevenue: acc.deliveredRevenue + row.deliveredRevenue,
      deliveredOrders: acc.deliveredOrders + row.deliveredOrders,
      awaitingRevenue: acc.awaitingRevenue + row.awaitingRevenue,
      awaitingOrders: acc.awaitingOrders + row.awaitingOrders,
      returnedRevenue: acc.returnedRevenue + row.returnedRevenue,
      returnedOrders: acc.returnedOrders + row.returnedOrders,
      returnRiskRevenue: acc.returnRiskRevenue + row.returnRiskRevenue,
      returnRiskOrders: acc.returnRiskOrders + row.returnRiskOrders,
    }),
    { ...EMPTY_SUMS },
  );
  return { key: "__total__", label: totalLabel, ...withPct(sums) };
}
