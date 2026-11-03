import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchOrderCallRecords, fetchWebphoneToken } from "@/lib/api/callcenter";

/** Key factory theo mẫu src/features/orders/queries.ts. */
export const callcenterKeys = {
  all: ["callcenter"] as const,
  token: () => [...callcenterKeys.all, "webphone-token"] as const,
  orderCallRecords: (orderId: number) =>
    [...callcenterKeys.all, "order-call-records", orderId] as const,
};

/**
 * Cuộc gọi Zenify của 1 đơn (ghi âm + transcript). 404 (ngoài scope / chưa có
 * đơn) không retry — coi như không có dữ liệu, block tự ẩn.
 */
export function useOrderCallRecords(orderId: number | null | undefined) {
  return useQuery({
    queryKey: callcenterKeys.orderCallRecords(orderId ?? 0),
    queryFn: () => fetchOrderCallRecords(orderId as number),
    enabled: !!orderId,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * Token Zenify cho webphone. BE cache theo email nên FE chỉ fetch 1 lần/phiên;
 * không retry — lỗi (503 chưa cấu hình, 400 thiếu email...) = tính năng tắt.
 */
export function useWebphoneToken(enabled: boolean) {
  return useQuery({
    queryKey: callcenterKeys.token(),
    queryFn: () => fetchWebphoneToken(),
    enabled,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * Lấy token MỚI (bỏ cache BE bằng ?refresh=1) và ghi đè vào React Query cache —
 * dùng khi Zenify từ chối token giữa phiên (forced logout, token hết hạn).
 */
export function useRefreshWebphoneToken() {
  const queryClient = useQueryClient();
  // useCallback: hàm trả về được dùng làm dep của recover() + timer TTL trong
  // WebphoneProvider. Không ổn định identity thì timer bị clear/set lại mỗi render
  // (audit 2026-07-15).
  return useCallback(
    () =>
      queryClient.fetchQuery({
        queryKey: callcenterKeys.token(),
        queryFn: () => fetchWebphoneToken(true),
        staleTime: Infinity,
      }),
    [queryClient],
  );
}
