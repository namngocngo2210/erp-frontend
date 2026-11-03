import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { REPORT_FOCUS_STALE_MS } from "@/lib/query-client";

import {
  getOverviewReport,
  type OverviewReportParams,
  type OverviewReportSummary,
} from "@/lib/api/overview-report";

/** Chu kỳ tự refresh — đồng bộ hành vi trang Báo cáo Ads (useAdsReport). */
const OVERVIEW_REPORT_REFRESH_MS = 30 * 60 * 1000;

export const overviewReportKeys = {
  all: ["overview-report"] as const,
  report: (params: OverviewReportParams) => ["overview-report", "report", params] as const,
};

/**
 * GET /api/orders/reports/overview — báo cáo tổng theo khoảng ngày.
 * - keepPreviousData: giữ số liệu cũ hiển thị trong khi tải bộ lọc mới.
 * - refetchInterval 30' + refetchOnWindowFocus "always": như useAdsReport.
 */
export function useOverviewReport(params: OverviewReportParams) {
  return useQuery<OverviewReportSummary>({
    queryKey: overviewReportKeys.report(params),
    queryFn: ({ signal }) => getOverviewReport(params, signal),
    placeholderData: keepPreviousData,
    refetchInterval: OVERVIEW_REPORT_REFRESH_MS,
    // "always" (cũ) gọi lại aggregate nặng mỗi lần alt-tab; `true` + staleTime 60s
    // chỉ refetch khi dữ liệu đã cũ (audit 2026-09-23 P2-5).
    refetchOnWindowFocus: true,
    staleTime: REPORT_FOCUS_STALE_MS,
  });
}
