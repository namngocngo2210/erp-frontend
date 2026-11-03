import { useQuery } from "@tanstack/react-query";

import {
  listChannels,
  listChannelsForKiotViet,
  listChannelStaff,
  listChannelTypes,
} from "@/lib/api/channels";

/**
 * Shell-level channel data hooks. queryFn delegates to the typed wrappers in
 * lib/api/channels; gating (which section needs the data) is driven by the
 * `enabled` flag passed from App so we keep the previous per-section
 * fetch-on-demand behaviour instead of fetching everything on mount.
 *
 * staleTime = 30s mirrors the old manual ref-cache TTL (FRONTEND_CACHE_TTL_MS).
 */

const SHELL_STALE_TIME_MS = 30_000;

export const channelKeys = {
  list: ["channels", "list"] as const,
  listForKiotViet: ["channels", "list-for-kiotviet"] as const,
  staff: ["channels", "staff"] as const,
  types: ["channels", "types"] as const,
};

/** GET /api/channels — full channel rows used across most sections. */
export function useChannelsQuery(enabled: boolean) {
  return useQuery({
    queryKey: channelKeys.list,
    queryFn: listChannels,
    enabled,
    staleTime: SHELL_STALE_TIME_MS,
  });
}

/** GET /api/channels/list-for-kiotviet — lightweight list (orders/landing/koc). */
export function useAllChannelsQuery(enabled: boolean) {
  return useQuery({
    queryKey: channelKeys.listForKiotViet,
    queryFn: listChannelsForKiotViet,
    enabled,
    staleTime: SHELL_STALE_TIME_MS,
  });
}

/**
 * GET /api/channels/types — danh mục loại kênh bán đang bật.
 *
 * Dùng cho ô lọc "Loại kênh" của trang đơn, nên BE cố ý mở cho cả section
 * đơn hàng chứ không chỉ `channels:view` (xem channel_views_impl._CT_VIEW).
 * Danh mục vài dòng và gần như không đổi nên staleTime dài hơn mặc định.
 */
export function useChannelTypesQuery(enabled: boolean) {
  return useQuery({
    queryKey: channelKeys.types,
    // Bọc lambda: react-query truyền QueryFunctionContext làm tham số đầu, mà
    // listChannelTypes nhận `includeInactive: boolean` -> truyền thẳng là bật
    // nhầm cờ include_inactive.
    queryFn: () => listChannelTypes(),
    enabled,
    staleTime: 5 * 60_000,
  });
}

/**
 * GET /api/channels/staff — staff users assignable to channels.
 * `department` cho BE scope danh sách theo trang; đưa vào queryKey để đổi phòng ban
 * (điều hướng giữa các section) sẽ refetch đúng danh sách thay vì trả cache cũ.
 */
export function useChannelStaffQuery(enabled: boolean, department?: number) {
  return useQuery({
    queryKey: [...channelKeys.staff, department ?? null],
    queryFn: () => listChannelStaff(department),
    enabled,
    staleTime: SHELL_STALE_TIME_MS,
  });
}
