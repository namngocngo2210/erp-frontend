import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * staleTime cho các báo cáo aggregate nặng (ads / tổng quan / sale): khi quay lại
 * tab chỉ refetch nếu dữ liệu cũ hơn 60s — thay cho `refetchOnWindowFocus:
 * "always"` gọi lại server mỗi lần alt-tab (audit 2026-09-23 P2-5).
 */
export const REPORT_FOCUS_STALE_MS = 60_000;
