import { useQuery } from "@tanstack/react-query";

import { listKiotVietChannels } from "@/lib/api/kiotviet";

/**
 * Shell-level KiotViet channel data hook. queryFn delegates to lib/api/kiotviet;
 * gating is driven by `enabled` from App (superuser + relevant section).
 *
 * staleTime = 30s mirrors the old manual ref-cache TTL (FRONTEND_CACHE_TTL_MS).
 */

const SHELL_STALE_TIME_MS = 30_000;

export const kiotvietKeys = {
  channels: ["kiotviet", "channels"] as const,
};

/** GET /api/channels/kiotviet — KiotViet channels (superuser only). */
export function useKiotVietChannelsQuery(enabled: boolean) {
  return useQuery({
    queryKey: kiotvietKeys.channels,
    queryFn: listKiotVietChannels,
    enabled,
    staleTime: SHELL_STALE_TIME_MS,
  });
}
