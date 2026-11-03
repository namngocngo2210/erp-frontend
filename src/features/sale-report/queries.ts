import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { REPORT_FOCUS_STALE_MS } from "@/lib/query-client";

import { fetchJson } from "@/services/http";

/** Một hàng (ngày, nhân viên sale) từ backend — số tiền là chuỗi decimal. */
export type SaleStaffDailyRow = {
  date: string;
  staff_id: number | null;
  staff__username: string | null;
  staff__display_name: string | null;
  data_count: number;
  orders: number;
  total_revenue: string;
  closed_revenue: string;
  confirmed_revenue: string;
  /** Tổng thời gian xử lý data (giây), tính từ lúc chia data — chưa chia trung bình. */
  lead_time_seconds: number;
  /** Mẫu số DÙNG CHUNG của lead time và thời gian chờ chia. */
  lead_time_orders: number;
  /** Tổng thời gian data nằm chờ được chia (giây) — chặng trước lead time. */
  queue_wait_seconds: number;
};

export type SaleStaffReportPayload = {
  by_staff_daily: SaleStaffDailyRow[];
};

export type SaleStaffReportParams = {
  dateFrom?: string;
  dateTo?: string;
};

/** Cùng chu kỳ tự refresh với báo cáo ads — số liệu báo cáo không cần realtime. */
const SALE_REPORT_REFRESH_MS = 30 * 60 * 1000;

export const saleStaffReportKeys = {
  all: ["sale-staff-report"] as const,
  report: (params: SaleStaffReportParams) => ["sale-staff-report", "report", params] as const,
};

/**
 * GET /api/orders/reports/sale-by-staff — hàng phẳng (ngày, nhân viên sale).
 * Cùng chính sách cache/refetch với `useAdsReport` để 2 trang báo cáo hành xử
 * giống nhau khi đổi bộ lọc hoặc quay lại tab trình duyệt.
 */
export function useSaleStaffReport(params: SaleStaffReportParams) {
  return useQuery({
    queryKey: saleStaffReportKeys.report(params),
    queryFn: async ({ signal }): Promise<SaleStaffReportPayload> => {
      const query = new URLSearchParams();
      if (params.dateFrom) query.set("date_from", params.dateFrom);
      if (params.dateTo) query.set("date_to", params.dateTo);
      const qs = query.toString();
      const url = qs
        ? `/api/orders/reports/sale-by-staff?${qs}`
        : "/api/orders/reports/sale-by-staff";
      return (await fetchJson(url, { signal })) as SaleStaffReportPayload;
    },
    placeholderData: keepPreviousData,
    refetchInterval: SALE_REPORT_REFRESH_MS,
    // "always" (cũ) gọi lại aggregate nặng mỗi lần alt-tab; `true` + staleTime 60s
    // chỉ refetch khi dữ liệu đã cũ (audit 2026-09-23 P2-5).
    refetchOnWindowFocus: true,
    staleTime: REPORT_FOCUS_STALE_MS,
  });
}

/** Năm cặp rổ của tab Resale — tên khớp từng chữ với Báo cáo tổng. */
export type ResaleBucketsApi = {
  /** Mọi đơn đã lên hóa đơn KiotViet, trừ đơn huỷ. Mẫu số của mọi ô %. */
  total_revenue: string;
  total_orders: number;
  delivered_revenue: string;
  delivered_orders: number;
  /** Phần bù: chưa có kết quả giao (không phải giao xong / hoàn / rủi ro hoàn). */
  awaiting_revenue: string;
  awaiting_orders: number;
  returned_revenue: string;
  returned_orders: number;
  /** Đơn đã quay đầu một lần (mã 10) — nguy cơ thành hoàn cao hơn đơn đang giao. */
  return_risk_revenue: string;
  return_risk_orders: number;
};

export type ResaleStaffApiRow = ResaleBucketsApi & {
  staff_id: number | null;
  staff__username: string | null;
  staff__display_name: string | null;
};

export type SaleResaleReportPayload = {
  kpis: ResaleBucketsApi;
  by_staff: ResaleStaffApiRow[];
};

export const saleResaleReportKeys = {
  all: ["sale-resale-report"] as const,
  report: (params: SaleStaffReportParams) => ["sale-resale-report", "report", params] as const,
};

/**
 * GET /api/orders/reports/resale-by-staff — một hàng mỗi nhân viên sale.
 * Cùng chính sách cache/refetch với `useSaleStaffReport` để hai tab của cùng một
 * trang không hành xử khác nhau khi đổi bộ lọc hoặc quay lại tab trình duyệt.
 */
export function useSaleResaleReport(params: SaleStaffReportParams) {
  return useQuery({
    queryKey: saleResaleReportKeys.report(params),
    queryFn: async ({ signal }): Promise<SaleResaleReportPayload> => {
      const query = new URLSearchParams();
      if (params.dateFrom) query.set("date_from", params.dateFrom);
      if (params.dateTo) query.set("date_to", params.dateTo);
      const qs = query.toString();
      const url = qs
        ? `/api/orders/reports/resale-by-staff?${qs}`
        : "/api/orders/reports/resale-by-staff";
      return (await fetchJson(url, { signal })) as SaleResaleReportPayload;
    },
    placeholderData: keepPreviousData,
    refetchInterval: SALE_REPORT_REFRESH_MS,
    // "always" (cũ) gọi lại aggregate nặng mỗi lần alt-tab; `true` + staleTime 60s
    // chỉ refetch khi dữ liệu đã cũ (audit 2026-09-23 P2-5).
    refetchOnWindowFocus: true,
    staleTime: REPORT_FOCUS_STALE_MS,
  });
}
