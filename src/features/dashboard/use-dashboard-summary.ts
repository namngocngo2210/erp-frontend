import { useMemo } from "react";

import { reachable, sumDeliveryCounters } from "./dashboard-utils";
import type { DashboardSummary } from "./types";

/**
 * Mảng rỗng dùng chung làm fallback khi summary chưa có (hoặc thiếu nhánh).
 * Reference ổn định ở module-scope — nếu dùng `?? []` inline sẽ tạo mảng mới
 * mỗi render, phá memo identity của các `useMemo` tổng hợp bên dưới.
 */
const EMPTY_LIST: never[] = [];

/**
 * Derives the per-section row arrays and aggregated totals from the raw
 * dashboard summary. Pure transform of `summary` → memoised view models so the
 * orchestrator page only wires layout. Uses a stable module-scope empty-array
 * fallback so memo identity is preserved when a summary branch is absent.
 */
export function useDashboardSummary(summary: DashboardSummary | null) {
  const performanceRows = summary?.sale_performance_by_staff ?? EMPTY_LIST;
  const performanceTotals = useMemo(() => {
    return performanceRows.reduce(
      (acc, r) => ({
        total: acc.total + r.total,
        total_assessed: acc.total_assessed + r.total_assessed,
        closed: acc.closed + r.closed,
        not_buying: acc.not_buying + r.not_buying,
        nurture: acc.nurture + r.nurture,
        unreached: acc.unreached + r.unreached,
        dirty: acc.dirty + r.dirty,
        warranty: acc.warranty + r.warranty,
        underlying_condition: acc.underlying_condition + (r.underlying_condition || 0),
        wants_store_visit: acc.wants_store_visit + (r.wants_store_visit || 0),
        revenue: acc.revenue + Number(r.revenue || 0),
        closed_revenue: acc.closed_revenue + Number(r.closed_revenue || 0),
        closed_revenue_orders: acc.closed_revenue_orders + (r.closed_revenue_orders || 0),
        delivered_count: acc.delivered_count + (r.delivered_count || 0),
        nurture_total_ever: acc.nurture_total_ever + r.nurture_total_ever,
        nurture_followup_closed: acc.nurture_followup_closed + r.nurture_followup_closed,
      }),
      {
        total: 0,
        total_assessed: 0,
        closed: 0,
        not_buying: 0,
        nurture: 0,
        unreached: 0,
        dirty: 0,
        warranty: 0,
        underlying_condition: 0,
        wants_store_visit: 0,
        revenue: 0,
        closed_revenue: 0,
        closed_revenue_orders: 0,
        delivered_count: 0,
        nurture_total_ever: 0,
        nurture_followup_closed: 0,
      },
    );
  }, [performanceRows]);

  const totalsReachable = reachable(performanceTotals);

  const channelQualityRows = summary?.data_quality_by_channel ?? EMPTY_LIST;
  const channelQualityTotals = useMemo(() => {
    return channelQualityRows.reduce(
      (acc, r) => ({
        total: acc.total + r.total,
        unreached: acc.unreached + r.unreached,
        dirty: acc.dirty + r.dirty,
      }),
      { total: 0, unreached: 0, dirty: 0 },
    );
  }, [channelQualityRows]);

  const carrierRows = summary?.data_by_carrier ?? EMPTY_LIST;
  const carrierTotal = useMemo(
    () => carrierRows.reduce((acc, r) => acc + r.total, 0),
    [carrierRows],
  );

  const deliveryByStaffRows = summary?.delivery_quality_by_staff ?? EMPTY_LIST;
  const deliveryByChannelRows = summary?.delivery_quality_by_channel ?? EMPTY_LIST;
  const deliveryStaffTotals = useMemo(
    () => sumDeliveryCounters(deliveryByStaffRows),
    [deliveryByStaffRows],
  );
  const deliveryChannelTotals = useMemo(
    () => sumDeliveryCounters(deliveryByChannelRows),
    [deliveryByChannelRows],
  );

  const bombReasons = summary?.bomb_reasons ?? EMPTY_LIST;
  const bombTotal = useMemo(() => bombReasons.reduce((acc, r) => acc + r.count, 0), [bombReasons]);

  const returnByProductRows = summary?.return_rate_by_product ?? EMPTY_LIST;

  return {
    performanceRows,
    performanceTotals,
    totalsReachable,
    channelQualityRows,
    channelQualityTotals,
    carrierRows,
    carrierTotal,
    deliveryByStaffRows,
    deliveryByChannelRows,
    deliveryStaffTotals,
    deliveryChannelTotals,
    bombReasons,
    bombTotal,
    returnByProductRows,
  };
}
